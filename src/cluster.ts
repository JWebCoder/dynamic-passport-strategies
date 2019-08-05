import Debug from 'debug'
import dotenv from 'dotenv'
import net from 'net'
import shortid from 'shortid'

dotenv.config()

const debug = Debug(`dps:authentication-cluster`)

const clients: {
  [key: string]: net.Socket
} = {}

let strategies: Set<string> = new Set()

export default function() {
  let port = parseInt(process.env.CLUSTER_PORT || '', 10)
  if (!process.env.CLUSTER_PORT) {
    port = 4321
    debug('defaulting cluster port to 4321')
  }

  debug('starting the authentication tcp server')
  const server = net.createServer(
    (socket) => {
      socket.setNoDelay(true)
      const id = shortid.generate()
      clients[id] = socket
      debug(`new connection established - ${id}`)

      // Now that a TCP connection has been established, the server can send data to
      // the client by writing to its socket.
      // socket.write('Hello, client.')

      // The server can also receive data from the client by reading from its socket.
      socket.on('data', function(chunk: any) {
        const chunkArray: string[] = chunk.toString().split('${}')
        let strategiesChanged = false
        let finalData: [] = []
        chunkArray.filter((e) => e).forEach(
          (stringChunk: string) => {
            const data = JSON.parse(stringChunk)
            if (strategies.size !== data.length) {
              strategies = new Set(data)
              strategiesChanged = true
            } else {
              data.forEach(
                (receivedStrategy: string) => {
                  for (const savedStrategy of strategies) {
                    if (receivedStrategy.indexOf(savedStrategy) < 0) {
                      strategies.delete(savedStrategy)
                      strategiesChanged = true
                    }
                  }
                  if (!strategies.has(receivedStrategy)) {
                    strategies.add(receivedStrategy)
                    strategiesChanged = true
                  }
                }
              )
            }
            finalData = data
          }
        )
        if (strategiesChanged) {
          Object.keys(clients).forEach(
            (clientId) => {
              if (clientId !== id) {
                clients[clientId].write(JSON.stringify(finalData) + '${}')
              }
            }
          )
        }
      })

      socket.on('end', function() {
        debug(`closing client connection - ${id}`)
      })

      socket.on('error', function(err) {
          debug(`Error: ${err}`)
      })
    }
  )

  server.listen(port, 'localhost')
}
