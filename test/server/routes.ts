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

export default router
