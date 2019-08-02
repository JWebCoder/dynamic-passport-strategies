import path from 'path'
import request from 'supertest'
import { Authentication } from '../src'
import server from './server'

const config = {
  strategies: 'local',
  modulesPath: path.join(__dirname, './server/authentication'),
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

  it('active strategies should be local', () => {
    const strategies = application.loadedStrategies()
    expect(strategies).toEqual(['local'])
  })

  it('strategies should be empty after removing the only strategy loaded', () => {
    const removed = application.removeStrategies('local')
    expect(removed).toEqual(true)
    const strategies = application.loadedStrategies()
    expect(strategies).toEqual([])
  })

  it('strategies should be "local" after adding the strategy again', () => {
    const added = application.addStrategies('local')
    expect(added).toEqual(true)
    const strategies = application.loadedStrategies()
    expect(strategies).toEqual(['local'])
  })

  it('login should return status:ok', (done) => {
    request(
      server
    ).post(
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
})
