import path from 'path'
import request from 'supertest'
import { Authentication } from '../src'
import server from './server'

const config = {
  strategies: 'local',
  modulesPath: '',
  cluster: false,
  roles: {
    adminRole: 'admin',
    property: 'name',
  },
}
const application = new Authentication(config)

describe('Start dynamic controller', () => {
  const agent = request.agent(server)

  beforeAll((done) => {
    agent
    .post('/login')
    .send({
      username: 'test',
      password: 'password',
    })
    .then((res) => {
      agent.jar.setCookie(res.header['set-cookie'][0])
      done()
    })
  })

  it('setupCluster should activate the cluster', () => {
    application.setupCluster()
    expect(application.getConfig().cluster).toEqual(true)
  })

  it('setupModulesPath should set the modules path', () => {
    application.setupModulesPath(path.join(__dirname, './server/authentication'))
    expect(application.getConfig().modulesPath).toEqual(path.join(__dirname, './server/authentication'))
  })

  it('active strategies should be local', () => {
    const strategies = application.loadedStrategies()
    expect(strategies).toEqual(['local'])
  })

  it('strategies should be empty after removing the only strategy loaded', () => {
    let removed = application.removeStrategies('local')
    expect(removed).toEqual(true)
    let strategies = application.loadedStrategies()
    expect(strategies).toEqual([])

    application.setStrategies(['local', 'facebook'])
    removed = application.removeStrategies(['local', 'facebook'])
    strategies = application.loadedStrategies()
    expect(strategies).toEqual([])
  })

  it('strategies should be "local" after adding the strategy again', () => {
    let added = application.addStrategies('local')
    expect(added).toEqual(true)
    let strategies = application.loadedStrategies()
    expect(strategies).toEqual(['local'])

    added = application.addStrategies(['local', 'facebook'])
    expect(added).toEqual(true)
    strategies = application.loadedStrategies()
    expect(strategies).toEqual(['local', 'facebook'])
  })

  it('should load the strategy facebook, multi strategy cluster test', () => {
    application.setStrategies(['local', 'facebook'])
    const strategies = application.loadedStrategies()
    expect(strategies).toEqual(['local', 'facebook'])
  })

  it('/unload/facebook should unload the strategy facebook, multi strategy cluster test', (done) => {
    agent.get(
      '/unload/facebook'
    ).then(
      (response) => {
        expect(response.status).toBe(200)
        expect(response.body.message).toBeTruthy()
        expect(response.body.message).toBe('facebook authentication removed')
        done()
      }
    )
  })

  it('should replace local strategy with facebook one, multi strategy cluster test', () => {
    application.setStrategies(['facebook'])
    const strategies = application.loadedStrategies()
    expect(strategies).toEqual(['facebook'])
    application.setStrategies(['local'])
  })

  it('login should return status:ok', (done) => {
    agent.post(
      '/login'
    ).send({
      username: 'test',
      password: 'password',
    }).then(
      (response) => {
        expect(response.status).toBe(200)
        expect(response.body.status).toEqual('ok')
        done()
      }
    )
  })

  it('/me should return the currently logged in user', (done) => {
    agent.get(
      '/me'
    ).then(
      (response) => {
        expect(response.status).toBe(200)
        expect(response.body.user).toBeTruthy()
        expect(response.body.user.username).toBe('test')
        expect(response.body.user.password).toBe('password')
        done()
      }
    )
  })

  it('/unload/local should unload the strategy local', (done) => {
    agent.get(
      '/unload/local'
    ).then(
      (response) => {
        expect(response.status).toBe(200)
        done()
      }
    )
  })

  it('/load/local should load the strategy local', (done) => {
    agent.get(
      '/load/local'
    ).then(
      (response) => {
        expect(response.status).toBe(200)
        done()
      }
    )
  })

  it('/unload/facebook should return a message saying that the strategy was not found', (done) => {
    agent.get(
      '/unload/facebook'
    ).then(
      (response) => {
        expect(response.status).toBe(200)
        expect(response.body.message).toBeTruthy()
        expect(response.body.message).toBe('facebook authentication not found')
        done()
      }
    )
  })

  it('/unload/local remove all possible authentications', (done) => {
    agent.get(
      '/unload/local'
    ).then(
      (response) => {
        expect(response.status).toBe(200)
        expect(response.body.message).toBeTruthy()
        expect(response.body.message).toBe('local authentication removed')
        done()
      }
    )
  })

  it('logout should return message:user logged out', (done) => {
    agent.get(
      '/logout'
    ).then(
      (response) => {
        expect(response.status).toBe(200)
        expect(response.body.message).toEqual('user logged out')
        done()
      }
    )
  })

  it('/load/local should return 401 error if user not admin', (done) => {
    agent.get(
      '/load/local'
    ).then(
      (response) => {
        expect(response.status).toBe(401)
        done()
      }
    )
  })

  it('/me should return 401 error if user not loggedin', (done) => {
    agent.get(
      '/me'
    ).then(
      (response) => {
        expect(response.status).toBe(401)
        done()
      }
    )
  })

  it('/time should run even if the route is set after the authentication router', (done) => {
    agent.get(
      '/time'
    ).then(
      (response) => {
        expect(response.status).toBe(200)
        done()
      }
    )
  })

  it('without active authentications, the routes should be empty', (done) => {
    agent.get(
      '/time'
    ).then(
      (response) => {
        expect(response.status).toBe(200)
        done()
      }
    )
  })
})
