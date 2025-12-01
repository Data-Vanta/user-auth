# user-auth
User Authentication Service – A backend service for secure user authentication using JWT (JSON Web Tokens). Supports user signup, login, access token generation, refresh tokens for session renewal, and token validation for protected routes.

# User Auth API

A Node.js authentication API with user registration, login, email verification, password reset, and user management.

---

## API Message Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data or null */ }
}
```

For errors:

```json
{
  "success": false,
  "message": "Error message",
  "data": null
}
```

---

## API Endpoints

### Auth

| Method | Endpoint                       | Description                        | Auth Required | Roles         |
|--------|------------------------------- |------------------------------------|-------------- |-------------- |
| POST   | `/api/v1/auth/signup`          | Register a new user                | No           | -             |
| POST   | `/api/v1/auth/signin`          | Login and get JWT token            | No           | -             |
| GET    | `/api/v1/auth/verify-email`    | Verify email via token             | No           | -             |
| POST   | `/api/v1/auth/forget-password` | Send password reset email          | No           | -             |
| GET    | `/api/v1/auth/reset-password`  | Show reset password form (EJS)     | No           | -             |
| POST   | `/api/v1/auth/change-password` | Change password via reset token    | No           | -             |

### User Management

| Method | Endpoint                | Description           | Auth Required | Roles         |
|--------|------------------------ |---------------------- |-------------- |-------------- |
| GET    | `/api/v1/user/`         | Get all users         | Yes           | Admin         |
| GET    | `/api/v1/user/:id`      | Get user by ID        | Yes           | Admin, User   |
| PUT    | `/api/v1/user/:id`      | Update user           | Yes           | User          |
| DELETE | `/api/v1/user/:id`      | Delete user           | Yes           | Admin, User   |

---

## Example `.env` File

```
PORT=3000
URL=http://localhost:3000
NODE_ENV=development
DB_STRING=postgres://postgres:1234@localhost:5432/user_auth
DB_STRING_PROD=postgres://postgres:1234@localhost:5432/user_auth
JWT_SECRET=your_jwt_secret
EMAIL_USER=email@gmail.com
APP_PASS=pass
```

---

## Notes

- Email verification and password reset links are sent via email and open EJS pages for user interaction.
- All protected endpoints require a valid JWT token in the `Authorization` header as  'x-auth-token' : token.
- Roles: `Admin`, `User` (with `isAdmin` boolean in user model).

---

# user-auth

user-auth — authentication & authorization microservice

This project is a minimal, production-minded Node.js service that provides user authentication and role/permission based access control using Express and Sequelize (Postgres). It implements:
- User signup / signin, email verification, password reset
- JWT authentication and middleware to protect routes
- Role and Permission models with many-to-many associations
- Files and code structure following controller → service → repository → model

---

## Table of contents

1. Quick start
2. Configuration (.env)
3. Available Scripts
4. Architecture & key modules
5. Database & models
6. Seeding & verification scripts
7. API Reference (short) — Auth, Users, Roles, Permissions, Teams, Profiles
8. Typical Postman examples
9. Troubleshooting
10. Recommendations (migrations / tests)
11. Contributing
12. License

---

## Quick start

Prerequisites
- Node.js >= 18
- Postgres instance accessible using a connection string in `.env`

1. Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd user-auth
npm install
```

2. Create and fill a `.env` file (see next section – DB_STRING and JWT_SECRET are required).

3. Start the server (development):

```bash
npm start
```

While the app uses `sequelize.sync({ alter: true })` to create/update tables on boot (useful for development), it's recommended to use migrations for production (see Recommendations section).

---

## Pre-test configuration (.env and DB)

Create a `.env` file in the project root with at minimum these values (example):

```env
PORT=3000
URL=http://localhost:3000
NODE_ENV=development
DB_STRING=postgres://postgres:password@localhost:5432/user_auth
DB_STRING_PROD=postgres://postgres:password@yourprod:5432/user_auth
JWT_SECRET=replace-with-secure-string
EMAIL_USER=your@email.com
APP_PASS=email-app-password
```

Make sure your Postgres server is running and reachable using the connection string. The app uses `sequelize` to manage connections.

---

## Pre-test & helper scripts


Common tasks you will run when preparing to test the application:

- npm start — start the server (runs sequelize.sync by default)
- npm run seed — create sample roles & permissions (Admin & User and example permissions)
- npm run check:associations — quick smoke-check for Role <-> Permission linking

Run scripts from the project root. Example:

```bash
npm run seed
npm run check:associations
```

The seed and check scripts call `sequelize.sync({ alter: true })` if tables are missing. This is convenient for local testing only.

---

## Project structure (where to look)

Primary code locations:

- Routes: `src/api/*/*.route.js`
- Controllers: `src/api/*/*.controller.js`
- Services: `src/api/*/*.service.js`
- Repositories: `src/api/*/*.repository.js`
- Models: `src/api/*/*.model.js`

Configuration and runtime:

- `src/config/database.js` — Sequelize connection
- `src/index.js` — startup, model loader and sequelize.sync
- `src/app.js` — Express initialization and middleware

Typical flow: routes → controller → service → repository → model

---

## Pre-test checklist (brief)

Before testing endpoints:

1. Create `.env` and set DB_STRING & JWT_SECRET.
2. Start Postgres and ensure the DB is accessible.
3. Run `npm start` once so `sequelize.sync({ alter: true })` can create tables, or run `npm run seed` to both sync and populate sample roles/permissions.
4. Use `npm run check:associations` to verify Role ↔ Permission associations work.

Use `psql` or your DB GUI to inspect created tables (`users`, `roles`, `permissions`, `rolepermissions`, ...).

Important models and relationships:

- User
  - Fields: id (UUID), name, email, password, isVerified, role (enum: Admin|User), isAdmin
- Role
  - Fields: role_id, name
- Permission
  - Fields: perm_id, name
- RolePermission (join table)
  - Fields: role_id, perm_id — acts as the many-to-many join table

Associations:
- Role.belongsToMany(Permission, { through: RolePermission })
- Permission.belongsToMany(Role, { through: RolePermission })

The project currently loads the join model on startup to ensure associations are registered before the app syncs the database.

---

## 6) Seeding & verification scripts

- Seed: `npm run seed` creates example permissions and roles and associates Admin with all permissions and User with `read:user`.
- Smoke-check: `npm run check:associations` will create temporary resources and verify Role-Permission linking (useful to confirm association are functional in your DB/environment).

If `rolepermissions` or other tables are missing, start the server or run the seeder. These scripts create tables in development mode.

---

## API endpoints (compact)

Base path: `/api/v1`

Auth (public)
- POST /auth/signup — register user. Body: { name, email, password }
- POST /auth/signin — login. Body: { email, password } → returns token and sets `x-auth-token` header
- GET /auth/verify-email?token=TOKEN — verify account (EJS render)
- POST /auth/forget-password — request reset email. Body: { email }
- GET /auth/reset-password?token=TOKEN — render reset form (EJS)
- POST /auth/change-password?token=TOKEN — change via reset token. Body: { password }

Users (protected)
- GET /user/ — list users (Admin)
- GET /user/:id — get user by id (Admin or self)
- PUT /user/:id — update user (self)
- DELETE /user/:id — delete (Admin or self)

Roles (admin)
- POST /role — create role. Body: { name }
- GET /role — list roles (includes permissions)
- GET /role/:role_id — get role (includes permissions)
- PUT /role/:role_id — update role
- DELETE /role/:role_id — delete role

Role permissions
- POST /role/:role_id/permissions — attach single permission. Body: { perm_id }
- POST /role/:role_id/permissions/bulk — attach multiple. Body: { perm_ids: [1,2] }
- DELETE /role/:role_id/permissions/:perm_id — remove permission

Permissions (admin)
- POST /permission — create permission. Body: { name }
- GET /permission/:perm_id — get permission
- PUT /permission/:perm_id — update permission
- DELETE /permission/:perm_id — delete permission

Profile
- POST /profile — create profile (body validated)
- GET /profile/me — get own profile (auth)
- GET /profile/:id — get profile (role-check applies)
- POST /profile/:id — update profile (role-check applies)
- PUT /profile/:id/password — change password
- POST /profile/:id/profile-picture — upload picture

Team
- POST /team — create team
- GET /team — list teams
- GET /team/:team_id — get single team (team_view check)
- PUT /team/:team_id — update team (team_update check)
- DELETE /team/:team_id — delete team (team_delete check)

Team members
- POST /team/:team_id/members — add member (member_add)
- GET /team/:team_id/members — list members (team_view)
- PUT /team/:team_id/members/:user_id/role — update member role (member_role_update)
- DELETE /team/:team_id/members/:user_id — remove member (member_remove)

Auth header reminder: protected routes require a valid JWT in `x-auth-token`. Auth middlewares also require `isVerified` user.

---

## Example requests (Postman / curl)

Sign in (get token)

POST http://localhost:3000/api/v1/auth/signin
Body:
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

2. Create a new permission (Admin token required)

POST http://localhost:3000/api/v1/permission
Headers: x-auth-token: <ADMIN_TOKEN>
Body:
```json
{ "name": "read:user" }
```

3. Create a role

POST http://localhost:3000/api/v1/role
Headers: x-auth-token: <ADMIN_TOKEN>
Body:
```json
{ "name": "Manager" }
```

Add permission to role (single)

POST http://localhost:3000/api/v1/role/:role_id/permissions
Headers: x-auth-token: <ADMIN_TOKEN>
Body: { "perm_id": <ID> }

Add permissions to role (bulk)

POST http://localhost:3000/api/v1/role/:role_id/permissions/bulk
Headers: x-auth-token: <ADMIN_TOKEN>
Body:
```json
{ "perm_ids": [1, 2, 3] }
```

---

## Troubleshooting — quick

• DB connection failure — check `.env` and Postgres availability.
• Missing tables — run server or `npm run seed` (dev only) to create them.
• Eager-loading error (Permission is not associated to Role) — restart server; model loader ensures associations before sync.
• Unauthorized / token expiry — use `x-auth-token` header with a current JWT; ensure user `isVerified`.

---

## Notes and next steps

• For production: replace `sequelize.sync({ alter: true })` with Sequelize migrations and CI-driven schema deployments.
• Add automated integration tests and a CI pipeline.
• Use explicit permission checks (RBAC) where necessary.

---

If you want, I can generate a Postman collection and a lightweight OpenAPI (Swagger) spec next.

---

## 11) Contributing

Contributions are welcome — please open issues or PRs. For major changes (migrations, tests, new endpoints), add tests and documentation updates to this README.

---

## 12) License

This repository is available under the project license in the repository root (see `LICENSE`).

---

Thanks for using the project — if you'd like, I can also add a complete Postman collection file and a set of automated integration tests to help with CI runs.
