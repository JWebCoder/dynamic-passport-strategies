import Debug from 'debug'
import cluster from '../../src/cluster'
import App from './app'

cluster()
const workedPid = process.pid
const debug = Debug(`example:worker-${workedPid}`)
debug(`worker ${workedPid} starting`)
const app = new App(workedPid)
app.start()

export default app.server
