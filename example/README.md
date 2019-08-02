# EXAMPLE SERVER

## Installation

`npm i`

## Starting the server

`npm run dev`

## Endpoints

`POST /login`

Logs in a user or creates a new account with the passed parameters

**Body**
- username: string
- password: string

---

`GET /me`

Retrieves the logged in user information

---

`GET /logout`

Logs out the user

---

`GET /load/:strategy`

Activates a currently deactivated strategy

---

`GET /unload/:strategy`

Deactivates a currently active strategy
