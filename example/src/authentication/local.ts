import Debug from 'debug'
import { Router } from 'express'
import { PassportStatic } from 'passport'
import localStrategy from 'passport-local'
import User from '../models/user'

const debug = Debug(`example:${process.pid}-facebook-strategy`)

const Strategy = localStrategy.Strategy

class FacebookAuth {
  private passport: PassportStatic
  constructor(passport: PassportStatic) {
    this.passport = passport
    debug('Creating facebook authentication strategy')
    this.passport.use(new Strategy(
      (username, password, done) => {
        const userLogging = User.findOrCreate(username, {username, password})
        if (userLogging.data.password !== password) {
          return done(null, false)
        }
        return done(null, userLogging.data)
      }
    ))
  }

  public routes() {
    const router = Router()

    router.post('/login',
      this.passport.authenticate('local'),
      (req, res) => {
        res.json({status: 'ok'})
      }
    )

    return router
  }
}

export default FacebookAuth
