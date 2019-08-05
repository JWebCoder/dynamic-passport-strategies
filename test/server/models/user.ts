interface IUserData {
  username: string,
  password: string,
  roles?: Array<{
    name: string,
  }>
}

interface IUser {
  [name: string]: IUserData
}
const users: IUser = {}

export default class User {
  public static findOrCreate(username: string, data: IUserData) {
    let created = false
    if (username) {
      if (users[username]) {
        return {
          created,
          data: users[username],
        }
      } else {
        data.roles = [{
          name: 'admin',
        }]
        users[username] = data
        created = true
      }
    }
    return {
      created,
      data,
    }
  }
}
