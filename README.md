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

🚀 A lightweight Node.js user authentication & authorization service using Express and Sequelize (Postgres). Built-in features: user signup/signin, email verification, password reset, JWT-based authentication, roles, permissions and many-to-many role-permission associations.

This README contains everything you need to run, extend, and test the project locally (including seeding, association setup, API reference, example requests and troubleshooting tips).

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

## 1) Quick start

Prerequisites
- Node.js >= 18
- Postgres instance accessible using a connection string in `.env`

Clone and run locally

```bash
git clone <repo-url>
cd user-auth
npm install
```

Create `.env` at the project root (see section 2).

Run the server:

```bash
npm start
```

While the app uses `sequelize.sync({ alter: true })` to create/update tables on boot (useful for development), it's recommended to use migrations for production (see Recommendations section).

---

## 2) Configuration (.env)

Create a `.env` file in the project root with the minimal values below (example values shown):

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

The server reads `.env` automatically. Ensure the Postgres DB is running and reachable by the DB connection string.

---

## 3) Available scripts

- npm start — run server with nodemon (default entry `src/index.js`) as a dev convenience
- npm run seed — run `src/seeds/seedRolesPermissions.js` to create sample roles and permissions and set associations
- npm run check:associations — run `src/seeds/checkAssociations.js` smoke test to validate Role <-> Permission associations

Run scripts from the project root. Example:

```bash
npm run seed
npm run check:associations
```

Note: `npm run seed` expects the DB configured and available. If tables are missing, the seeder calls `sequelize.sync({ alter: true })` before seeding.

---

## 4) Architecture & key modules

- Express-based routing in `src/api/`.
- Sequelize for Postgres ORM in `src/config/database.js`.
- Models: `src/api/{user,role,permission,team,profile}` each with model/service/repository/controller/route layers.
- Middlewares: auth, role-based restrictions, validation, upload handling, async handlers and error handler.
- Utilities: `src/utils/ApiResponse.js` for consistent JSON responses, `bcrypt.js`, `mailer.js`.

Typical flow: routes → controller → service → repository → model

---

## 5) Database & models (overview)

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

If you see errors about missing tables (e.g., "relation \"rolepermissions\" does not exist"), ensure you have the DB configured and either start the server (which runs `sequelize.sync`) or run the seed script which also calls `sequelize.sync({ alter: true })`.

---

## 7) API reference (short)

The base path for all endpoints is `/api/v1`.

1) Auth (no auth required)
  - POST /api/v1/auth/signup — create a new user (sends verification email)
  - POST /api/v1/auth/signin — login; returns a JWT token and sets `x-auth-token` header
  - GET /api/v1/auth/verify-email?token=TOKEN — verify account via email token
  - POST /api/v1/auth/forget-password — send reset email
  - GET /api/v1/auth/reset-password?token=TOKEN — render reset form
  - POST /api/v1/auth/change-password?token=TOKEN — change password

2) Users (protected; Admin/User depending on endpoint)
  - GET /api/v1/user/ — list users (Admin)
  - GET /api/v1/user/:id — get by id (Admin + allowed user)
  - PUT /api/v1/user/:id — update (User for own account)
  - DELETE /api/v1/user/:id — delete (Admin + user)

3) Roles (Admin only by default — enforced by middleware)
  - POST /api/v1/role — create role
  - GET /api/v1/role — list roles (includes permissions)
  - GET /api/v1/role/:role_id — get role (includes permissions)
  - PUT /api/v1/role/:role_id — update role
  - DELETE /api/v1/role/:role_id — delete role

  Role permission management:
  - POST /api/v1/role/:role_id/permissions — attach single permission (body: { perm_id })
  - POST /api/v1/role/:role_id/permissions/bulk — attach multiple (body: { perm_ids: [1,2] })
  - DELETE /api/v1/role/:role_id/permissions/:perm_id — remove permission

4) Permissions (Admin)
  - POST /api/v1/permission — create permission
  - GET /api/v1/permission/:perm_id — get permission
  - PUT /api/v1/permission/:perm_id — update permission
  - DELETE /api/v1/permission/:perm_id — delete permission

5) Profiles / Teams / Others
  - See `src/api/profile`, `src/api/team` for endpoints and validations. They follow the same controller → service → repository pattern.

Auth & headers
- The app uses JWTs; pass token in header `x-auth-token: <token>` when hitting protected endpoints.
- Users must be `isVerified` to access protected routes.

---

## 8) Postman examples (quick)

1. Sign in (get token)

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

4. Add permission to role (single)

POST http://localhost:3000/api/v1/role/:role_id/permissions
Headers: x-auth-token: <ADMIN_TOKEN>
Body: { "perm_id": <ID> }

5. Add permissions to role (bulk)

POST http://localhost:3000/api/v1/role/:role_id/permissions/bulk
Headers: x-auth-token: <ADMIN_TOKEN>
Body:
```json
{ "perm_ids": [1, 2, 3] }
```

---

## 9) Troubleshooting & common errors

- Sequelize DB connection issues: confirm `.env` `DB_STRING` is correct and DB is running.
- Missing join table errors (e.g. "relation \"rolepermissions\" does not exist"): make sure you run the server or seeder so `sequelize.sync` creates tables. In dev you can run `npm start` (server runs sync) or `npm run seed` which calls `sync` before seeding.
- "Permission is not associated to Role" eager-loading errors: ensure the join model is loaded before sync (this project requires `rolePermission.model` on startup). Restart the server after changing models.
- JWT / auth errors: make sure the `x-auth-token` header contains a valid token; the user must be `isVerified` and have the required role for restricted routes.

---

## 10) Recommendations (production hardening)

1. Replace `sequelize.sync({ alter: true })` with proper Sequelize migrations (`sequelize-cli`) for deterministic schema changes in production.
2. Add integration tests for authentication, role/permission flows. Use a test DB and fixtures.
3. Consider RBAC middleware to check not just role name but explicit permission checks (e.g., `can('create:user')`) for fine-grained control.
4. Add rate-limiting and strong password policies for security.

---

## 11) Contributing

Contributions are welcome — please open issues or PRs. For major changes (migrations, tests, new endpoints), add tests and documentation updates to this README.

---

## 12) License

This repository is available under the project license in the repository root (see `LICENSE`).

---

Thanks for using the project — if you'd like, I can also add a complete Postman collection file and a set of automated integration tests to help with CI runs.
