import { eachSeries } from 'async'
import Debug from 'debug'
import { NextFunction, Request, Response, Router } from 'express'
import createError from 'http-errors'
import { Passport } from 'passport'
import strategiesController from './strategies'

interface IConfig {
  strategies?: string[] | string,
  store?: any,
  modulesPath?: string,
  cluster?: boolean,
}

const debug = Debug(`dps:${process.pid}-authentication-worker`)

export class Authentication extends Passport {
  private reloadStrategies: boolean = true
  private routes: Router[] = []
  private cluster: boolean = false
  private modulesPath: string = './'
  constructor(config?: IConfig) {
    super()
    debug('Creating authentication controller')

    if (config) {
      this.configure(config)
    }

    this.serializeUser(
      (user, cb) => {
        cb(null, user)
      }
    )

    this.deserializeUser(
      (user, cb) => {
        cb(null, user)
      }
    )
  }

  public configure(config: IConfig) {
    if (config.strategies) {
      this.setStrategies(Array.isArray(config.strategies) ? config.strategies : [config.strategies])
    }

    if (config.modulesPath) {
      this.modulesPath = config.modulesPath
      strategiesController.setPath(this.modulesPath)
    }

    if (config.cluster && !this.cluster) {
      this.cluster = true
      strategiesController.setupCluster()
      strategiesController.onChange(() => {
        this.reloadStrategies = true
      })
    }
  }

  public setupCluster() {
    this.configure({
      cluster: true,
    })
  }

  public setupModulesPath(modulesPath: string) {
    this.configure({
      modulesPath,
    })
  }

  public setStrategies(strategies: string[], callTcp: boolean = true) {
    this.reloadStrategies = true
    this.loadedStrategies().forEach(this.unuse)
    strategiesController.setStrategies(strategies, this.cluster && callTcp)
  }

  public addStrategies(strategy: string | string[], callTcp: boolean = true) {
    this.reloadStrategies = true
    strategiesController.addStrategies(strategy, this.cluster && callTcp)
    return true
  }

  public removeStrategies(strategy: string | string[], callTcp: boolean = true) {
    this.reloadStrategies = true
    Array.isArray(strategy) ? strategy.forEach(this.unuse) : this.unuse(strategy)
    strategiesController.removeStrategies(strategy, this.cluster && callTcp)
    return true
  }

  public loadedStrategies() {
    return strategiesController.loadedStrategies()
  }

  // runs the login function from passport to register the user in the session
  public login(req: Request, res: Response, next: NextFunction, user: any) {
    req.login(
      user,
      (err) => {
        if (err) {
          next(err)
          return
        }
        res.locals = {
          ...res.locals,
          user,
        }
        next()
      }
    )
  }

  public logout(req: Request, res: Response, next: NextFunction) {
    req.logout()
    res.locals = {
      message: 'user logged out',
    }
    next()
  }

  public isAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.user && req.user.roles && req.user.roles.length > 0) {
      if (req.user.roles.find(
        (role: any) => role && role.name && role.name.includes('admin')
      )) {
        return next()
      }
    }
    return next(createError(401, 'Unauthorized'))
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

  public ensureLoggedIn(options?: string | {redirectTo?: string, setReturnTo?: boolean}) {
    if (typeof options === 'string') {
      options = { redirectTo: options }
    }
    options = options || {}

    const setReturnTo = options.setReturnTo === undefined ? true : options.setReturnTo

    return function(req: Request, res: Response, next: NextFunction) {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        if (setReturnTo && req.session) {
          req.session.returnTo = req.originalUrl || req.url
        }
        return next(createError(401, 'Unauthorized'))
      } else {
        next()
      }
    }
  }

  private moduleLoaderRoute() {
    const router = Router()

    router.get('/unload/:strategy', (req: Request, res: Response, next: NextFunction) => {
      const strategy = req.params.strategy
      if (strategiesController.has(strategy)) {
        this.removeStrategies(strategy)
        debug(`Removed stragety - ${strategy}`)
        res.json({message: `${strategy} authentication removed`, status: 'ok'})
      } else {
        res.json({message: `${strategy} authentication not found`, status: 'not found'})
      }
    })

    router.get('/load/:strategy', (req: Request, res: Response, next: NextFunction) => {
      const strategy = req.params.strategy
      if (!strategiesController.has(strategy)) {
        this.addStrategies(strategy)
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

const authentication = new Authentication()

export default authentication
export { default as authenticationCluster } from './cluster'
