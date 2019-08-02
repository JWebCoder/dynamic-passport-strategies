# Dynamic Passport Strategies

Dynamically add and remove passport strategies in your express application during runtime

Supports NodeJS cluster by spreading the configuration across the multiple NodeJS instances

**Check the example folder for a fully working application**

## Installation

`npm i dynamic-passport-strategies`

## Usage

```js
import express from 'express'
import session from 'express-session'
import path from 'path'
import authentication from 'dynamic-passport-strategies'

// set the folder containing your strategies, authentication for example
authentication.configure({
  modulesPath: path.join(__dirname, './authentication')
  strategies: ['facebook'],
})

const app = express()
app.use([
  session({
    secret: 'stuff thats cool',
    saveUninitialized: true,
    resave: true,
  }),
  authentication.initialize(),
  authentication.session(),
])

// setup the strategies to use and add them to the application middleware
app.use('/', authentication.router)

app.listen(9000, function() {
  debug('Process ' + process.pid + ' is listening on port 9000')
})
```

## Using Cluster Module

**On the worker node**
```js
...
// just activate it
authentication.configure({
  cluster: true,
  modulesPath: path.join(__dirname, './authentication'),
  strategies: ['facebook'],
})

const app = express()
app.use([
...
```

**And on the master node**

```js
import cluster from 'cluster'
import { authenticationCluster } from 'dynamic-passport-strategies'

if (cluster.isMaster) {
  // initialize the authentication control
  authenticationCluster()
  loadMaster()
} else {
  loadWorker()
}

```

## Adding a strategy

Create a new file called [strategy].[js,ts] inside the folder `./authentication` like we set above

All strategies inside the folder `./authentication` used on this example can be activated or deactivated

```js
import { Router } from 'express'
import { PassportStatic } from 'passport'
import passportFacebook from 'passport-facebook'

const Strategy = passportFacebook.Strategy

class FacebookAuth {
  private passport: PassportStatic

  // constructor is required and it should add the strategy into passport middleware
  constructor(passport: PassportStatic) {
    this.passport = passport
    this.passport.use(
      new Strategy(/* check passport-facebook module for a complete description https://github.com/jaredhanson/passport-facebook */)
    )
  }

  // routes must return an express.Router with the desired endpoints for authentication
  public routes() {
    const router = Router()

    router.get('/login/facebook',
      this.passport.authenticate('facebook', { scope: ['email'], failureRedirect: '/login' })
    )

    router.get('/login/facebook/return',
      this.passport.authenticate('facebook', { scope: ['email'], failureRedirect: '/login' }),
      function(req, res) {
        res.render('facebook/loggedIn.html', {username: req.user.name})
      }
    )

    return router
  }
}

export default FacebookAuth
```

## De/Activating Strategies On Request

Authenticate with the administration role into the application with one of the currently active authentication systems, and use

`/load/:strategy` - activates a currently deactivated strategy
`/unload/:strategy` - deactivates a currently active strategy

