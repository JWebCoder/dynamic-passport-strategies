import Debug from 'debug'
import { NextFunction, Request, Response, Router } from 'express'
import createError from 'http-errors'
import { Passport } from 'passport'
import Routes from './routes'
import strategiesController from './strategies'

interface IRolesConfig {
  property?: string,
  adminRole?: string
}

export interface IConfig {
  strategies?: string[] | string,
  modulesPath?: string,
  cluster?: boolean,
  roles?: IRolesConfig
}

const debug = Debug(`dps:${process.pid}-authentication-worker`)

export class Authentication extends Passport {
  private cluster: boolean = false
  private modulesPath: string = './'
  private rolesProperty: string = ''
  private adminRole: string = 'admin'
  private routes: Routes
  constructor(config?: IConfig) {
    super()
    debug('Creating authentication controller')

    this.routes = new Routes(this)
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
        this.routes.reloadStrategies = true
      })
    }

    if (config.roles) {
      this.configureRoles(config.roles)
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
    this.routes.reloadStrategies = true
    this.loadedStrategies().forEach((s) => this.unuse(s))
    strategiesController.setStrategies(strategies, this.cluster && callTcp)
  }

  public addStrategies(strategy: string | string[], callTcp: boolean = true) {
    this.routes.reloadStrategies = true
    strategiesController.addStrategies(strategy, this.cluster && callTcp)
    return true
  }

  public removeStrategies(strategy: string | string[], callTcp: boolean = true) {
    this.routes.reloadStrategies = true
    Array.isArray(strategy) ? strategy.forEach((s) => this.unuse(s)) : this.unuse(strategy)
    strategiesController.removeStrategies(strategy, this.cluster && callTcp)
    return true
  }

  public loadedStrategies() {
    return strategiesController.loadedStrategies()
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
        (role: any) => {
          let currentRole: string = role
          if (this.rolesProperty) {
            currentRole = role[this.rolesProperty]
          }
          return currentRole.includes(this.adminRole)
        }
      )) {
        return next()
      }
    }
    return next(createError(401, 'Unauthorized'))
  }

  public router = (req: Request, res: Response, next: NextFunction) => {
    this.routes.router(req, res, next)
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

  private configureRoles(rolesConfig: IRolesConfig) {
    if (rolesConfig.property) {
      this.rolesProperty = rolesConfig.property
    }
    if (rolesConfig.adminRole) {
      this.adminRole = rolesConfig.adminRole
    }
  }
}

const authentication = new Authentication()

export default authentication
export { default as authenticationCluster } from './cluster'
