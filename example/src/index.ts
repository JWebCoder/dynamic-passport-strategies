import cluster from 'cluster'
import Debug from 'debug'
import { authenticationCluster } from 'dynamic-passport-strategies'
import osType from 'os'
import AppType from './app'

function loadMaster() {
  const debug = Debug('example:master')

  authenticationCluster()

  const os: typeof osType = require('os')
  const NUM_CPUS = os.cpus().length

  // Fork workers.
  let i

  debug('Running in ' + NUM_CPUS / 2 + ' CPUS')

  for (i = 0; i < NUM_CPUS / 2; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker: any) => {
    debug(`worker ${worker.process.pid} died`)
    cluster.fork()
  })
}

function loadWorker() {
  const workedPid = cluster.worker.process.pid
  const debug = Debug(`example:worker-${workedPid}`)
  debug(`worker ${workedPid} starting`)
  const App: typeof AppType = require('./app').default
  const app = new App(workedPid)
  app.start()
}

if (cluster.isMaster) {
  loadMaster()
} else {
  loadWorker()
}
