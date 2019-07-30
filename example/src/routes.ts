import authentication from 'dynamic-passport-strategies'
import { Router } from 'express'
import userController from './controllers/userController'

// const holidays = require('./controllers/holidays-controller.js')

const router = Router()

router.get(
  '/me',
  authentication.ensureLoggedIn(),
  (req, res, next) => {
    userController.getUser(req, res, next)
  }
)

export default router
