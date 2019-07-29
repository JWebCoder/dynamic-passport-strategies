import Debug from 'debug'
import { Router } from 'express'
import net from 'net'
import { Passport } from 'passport'

const debug = Debug(`dsp:${process.pid}-authentication-worker`)

class StrategiesController extends Passport {
  private strategies: Set<string> = new Set()
  private modules: {[key: string]: any} = {}
  private tcpClient: net.Socket | undefined = undefined
  private connectedToTcpCluster: boolean = false
  private callbacks: Array<() => void> = []

  constructor(config?: {
    strategies?: string[] | string,
  }) {
    super()
    if (config && config.strategies) {
      this.strategies = new Set(config.strategies)
    }
  }

  public setupCluster() {
    // The port number and hostname of the server.
    let port = parseInt(process.env.CLUSTER_PORT || '', 10)
    if (!process.env.CLUSTER_PORT) {
      port = 4321
    }
    const host = 'localhost'

    // Create a new TCP client.
    this.tcpClient = new net.Socket()
    // Send a connection request to the server.

    const tcpClientSocket = this.tcpClient

    this.tcpClient.connect({ port, host }, () => {
      debug('TCP connection established with the server.')
      this.connectedToTcpCluster = true
      tcpClientSocket.setNoDelay(true)
      const strategies = this.loadedStrategies()
      if (strategies.length) {
        tcpClientSocket.write(JSON.stringify(this.loadedStrategies()))
      }
    })

    this.tcpClient.on('data', (chunk) => {
      this.setStrategies(JSON.parse(chunk.toString()), false)
      this.triggerCallbacks()
    })

    this.tcpClient.on('end', () => {
      debug('Requested an end to the TCP connection')
    })
  }

  public setStrategies(strategies: string[], callTcp: boolean = true) {
    strategies.forEach(
      (strategy) => this.unloadModule(strategy)
    )
    this.strategies = new Set(strategies)
    if (callTcp) {
      this.callTcp()
    }
  }

  public addStrategies(strategy: string | string[], callTcp: boolean = true) {
    Array.isArray(strategy) ? strategy.forEach((s) => this.strategies.add(s)) : this.strategies.add(strategy)
    if (callTcp) {
      this.callTcp()
    }
    return true
  }

  public removeStrategies(strategy: string | string[], callTcp: boolean = true) {
    const unloadStrategy = (s: string) => {
      this.unloadModule(s)
      this.strategies.delete(s)
    }

    if (Array.isArray(strategy)) {
      strategy.forEach(unloadStrategy)
    } else {
      unloadStrategy(strategy)
    }

    if (callTcp) {
      this.callTcp()
    }
    return true
  }

  public onChange(cb: () => void) {
    this.callbacks.push(cb)
  }

  public has(strategy: string) {
    return this.strategies.has(strategy)
  }

  public loadedStrategies() {
    const strategies: string[] = []
    for (const strategy of this.strategies) {
      strategies.push(strategy)
    }

    return strategies
  }

  public getStrategiesRoutes() {
    const modules: any = []
    const toSave: string[] = []
    const routes: Router[] = []
    for (const strategy of this.strategies) {
      if (!this.modules[strategy]) {
        modules.push(import('./' + strategy))
        toSave.push(strategy)
      }
    }
    return Promise.all(modules).then(
      (modulesLoaded) => {
        modulesLoaded.forEach(
          (module: any, index: number) => {
            this.modules[toSave[index]] = new module.default(this)
          }
        )
        for (const strategy of this.strategies) {
          if (this.modules[strategy]) {
            routes.push(this.modules[strategy].routes())
          }
        }

        return routes
      }
    )
  }

  private triggerCallbacks() {
    this.callbacks.forEach((cb) => {
      cb()
    })
  }

  private callTcp() {
    if (this.connectedToTcpCluster && this.tcpClient) {
      this.tcpClient.write(JSON.stringify(this.loadedStrategies()))
    }
  }

  private unloadModule(strategy: string) {
    if (this.modules[strategy]) {
      delete this.modules[strategy]
    }
  }
}

const strategiesController = new StrategiesController()

export default strategiesController
