import { NextFunction, Request, Response } from 'express'

class UserController {
  public getUser(req: Request, res: Response, next: NextFunction) {
    return res.json({
      user: req.user,
    })
  }
}

const userController = new UserController()
export default userController
