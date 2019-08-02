import { eachSeries } from 'async'
import Debug from 'debug'
import { NextFunction, Request, Response, Router } from 'express'
import { Authentication } from './'
import strategiesController from './strategies'

const debug = Debug(`dps:${process.pid}-routes-worker`)

export class Routes {
  public reloadStrategies: boolean = true
  private routes: Router[] = []
  private authentication: Authentication
  constructor(auth: Authentication) {
    debug('Creating loader routes')
    this.authentication = auth
  }

  public router = (req: Request, res: Response, next: NextFunction) => {
    let routes: Promise<Router[]> | undefined
    if (this.reloadStrategies) {
      debug('Reloading strategies')
      this.reloadStrategies = false
      routes = this.getRoutes()
    } else {
      routes = Promise.resolve(this.routes)
    }

    routes.then(
      (authenticationRouters: Router[]) => {
        eachSeries(
          authenticationRouters,
          (route, callback) => {
            // call route with req, res, and callback as next
            route(req, res, callback)
          },
          // final callback
          (err) => {
            if ( err ) {
              next(err)
            } else {
              next()
            }
          }
        )
      }
    )
  }

  private moduleLoaderRoute() {
    const router = Router()

    router.get('/unload/:strategy', this.authentication.isAdmin, (req: Request, res: Response, next: NextFunction) => {
      const strategy = req.params.strategy
      if (strategiesController.has(strategy)) {
        this.authentication.removeStrategies(strategy)
        debug(`Removed stragety - ${strategy}`)
        res.json({message: `${strategy} authentication removed`, status: 'ok'})
      } else {
        res.json({message: `${strategy} authentication not found`, status: 'not found'})
      }
    })

    router.get('/load/:strategy', this.authentication.isAdmin, (req: Request, res: Response, next: NextFunction) => {
      const strategy = req.params.strategy
      if (!strategiesController.has(strategy)) {
        this.authentication.addStrategies(strategy)
        debug(`Added stragety - ${strategy}`)
      }
      res.json({message: `${strategy} authentication enabled`, status: 'ok'})
    })

    return router
  }

  private getRoutes() {
    return strategiesController.getStrategiesRoutes().then(
      (routes) => {
        routes.push(this.moduleLoaderRoute())
        this.routes = routes
        return this.routes
      }
    )
  }
}

export default Routes
