import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import Debug from 'debug'
import express from 'express'
import core from 'express-serve-static-core'
import session from 'express-session'
import path from 'path'
import authentication from '../../src'
import routes from './routes'

let debug: Debug.Debugger

export default class App {
  public server: core.Express | undefined
  constructor(workerPid: number) {
    debug = Debug(`example:${workerPid}-setup`)
    debug('construting')

    authentication.configure({
      cluster: true,
      modulesPath: path.join(__dirname, './authentication'),
      strategies: ['local'],
      roles: {
        property: 'name',
        adminRole: 'admin',
      },
    })
  }

  public start() {
    debug('creating appplication')
    const app = express()

    debug('setting up middleware')
    app.use([
      cookieParser(),
      bodyParser.json(), // for parsing application/json
      bodyParser.urlencoded({ // for parsing application/x-www-form-urlencoded
        extended: true,
      }),
      cors({credentials: true}),
      session({
        secret: 'stuff thats cool',
        saveUninitialized: true,
        resave: true,
        cookie: {},
      }),
      authentication.initialize(),
      authentication.session(),
    ])

    debug('adding routes')
    app.options('*', cors())

    app.use('/', routes)

    app.use('/', authentication.router)

    app.use('/time', (req, res) => {
      res.json({
        time: new Date().toLocaleDateString(),
      })
    })

    app.listen(9000, function() {
      debug('Process ' + process.pid + ' is listening on port 9000')
    })

    this.server = app
  }
}
