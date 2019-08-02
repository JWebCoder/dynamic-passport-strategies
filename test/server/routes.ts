import { Router } from 'express'
import authentication from '../../src'
import userController from './controllers/userController'

const router = Router()

router.get(
  '/me',
  authentication.ensureLoggedIn(),
  (req, res, next) => {
    userController.getUser(req, res, next)
  }
)

router.get(
  '/logout',
  authentication.logout,
  (req, res, next) => {
    res.json(res.locals)
  }
)

export default router
