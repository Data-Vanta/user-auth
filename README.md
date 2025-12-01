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

## Notes

- Email verification and password reset links are sent via email and open EJS pages for user interaction.
- All protected endpoints require a valid JWT token in the `Authorization` header as  'x-auth-token' : token.
- Roles: `Admin`, `User` (with `isAdmin` boolean in user model).

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

## 7) API reference (full)

Base path: /api/v1

Important note on auth: protected endpoints require a valid JWT sent in the header `x-auth-token`. The middleware also enforces `isVerified === true` on the user and role restrictions (Admin/User) where applicable.

---

AUTH (public)

- POST /api/v1/auth/signup
  - Description: Register a new user and send verification email.
  - Body (JSON): { "name": "string", "email": "string", "password": "string" }
  - Response: created user (no token)

- POST /api/v1/auth/signin
  - Description: Sign in and get a JWT token.
  - Body (JSON): { "email": "string", "password": "string" }
  - Response: { token, user } and token is also set in `x-auth-token` response header.

- GET /api/v1/auth/verify-email?token=TOKEN
  - Description: Verify account using the emailed token; renders a confirmation EJS view (browser flow).

- POST /api/v1/auth/forget-password
  - Description: Request password reset email for the provided email address.
  - Body: { "email": "string" }

- GET /api/v1/auth/reset-password?token=TOKEN
  - Description: Render password reset form (EJS page) for token.

- POST /api/v1/auth/change-password?token=TOKEN
  - Description: Change password after reset. Body: { password: 'newpassword' }

---

USERS (protected)

- GET /api/v1/user/
  - Description: List all users
  - Auth: x-auth-token required — restricted to Admin

- GET /api/v1/user/:id
  - Description: Get user details by ID
  - Auth: x-auth-token required — Admin or the user themselves (User) allowed

- PUT /api/v1/user/:id
  - Description: Update an existing user
  - Auth: x-auth-token required — only the user themselves (User)
  - Body: any of user's updatable fields (name, email, password, etc.)

- DELETE /api/v1/user/:id
  - Description: Delete a user
  - Auth: x-auth-token required — Admin or the user themselves (User)

---

ROLES (Admin by default)

- POST /api/v1/role
  - Description: Create a new role
  - Auth: x-auth-token required — Admin
  - Body: { name: 'string' }

- GET /api/v1/role
  - Description: List roles, each role includes its permissions (joined through RolePermission)
  - Auth: x-auth-token required — Admin

- GET /api/v1/role/:role_id
  - Description: Get a role by ID (includes permissions)
  - Auth: x-auth-token required — Admin

- PUT /api/v1/role/:role_id
  - Description: Update role name
  - Auth: x-auth-token required — Admin
  - Body: { name: 'string' }

- DELETE /api/v1/role/:role_id
  - Description: Delete a role
  - Auth: x-auth-token required — Admin

Role permissions management (Admin)

- POST /api/v1/role/:role_id/permissions
  - Description: Attach a single permission to a role
  - Body: { "perm_id": <permission id> }

- POST /api/v1/role/:role_id/permissions/bulk
  - Description: Attach multiple permissions in one request
  - Body: { "perm_ids": [1,2,3] }

- DELETE /api/v1/role/:role_id/permissions/:perm_id
  - Description: Remove a permission from a role

---

PERMISSIONS (Admin)

- POST /api/v1/permission
  - Description: Create a permission
  - Body: { "name": "string" }

- GET /api/v1/permission/:perm_id
  - Description: Get permission by id

- PUT /api/v1/permission/:perm_id
  - Description: Update permission
  - Body: { "name": "string" }

- DELETE /api/v1/permission/:perm_id
  - Description: Delete permission

---

PROFILE

- POST /api/v1/profile
  - Description: Create user profile (or initial profile data)
  - Body: validate with `createProfileSchema` found in `src/api/profile/profile.validation.js`

- GET /api/v1/profile/me
  - Description: Get current user's profile (authenticated)
  - Auth: x-auth-token required

- GET /api/v1/profile/:id
  - Description: Get a user's profile by id (Admin or allowed role access controlled by roleCheck middleware)

- POST /api/v1/profile/:id
  - Description: Update profile by id (protected via roleCheck middleware)
  - Body: validated by updateProfileSchema

- DELETE /api/v1/profile/:id
  - Description: Delete profile by id

- PUT /api/v1/profile/:id/password
  - Description: Change password for a user (roleCheck applies)
  - Body: { password: '<new-password>' }

- POST /api/v1/profile/:id/profile-picture
  - Description: Upload profile picture; uses upload middleware and error handling

---

TEAMS

- POST /api/v1/team
  - Description: Create a new team
  - Body: validated by createTeamSchema

- GET /api/v1/team
  - Description: Get a list of teams

- GET /api/v1/team/:team_id
  - Description: Get a single team by id
  - Authorization: uses `checkTeamPermission('team_view')`

- PUT /api/v1/team/:team_id
  - Description: Update team
  - Authorization: `checkTeamPermission('team_update')`

- DELETE /api/v1/team/:team_id
  - Description: Delete team
  - Authorization: `checkTeamPermission('team_delete')`

Team membership endpoints

- POST /api/v1/team/:team_id/members
  - Description: Add a member to a team
  - Authorization: `checkTeamPermission('member_add')`
  - Body: validated by addMemberSchema

- GET /api/v1/team/:team_id/members
  - Description: List team members
  - Authorization: `checkTeamPermission('team_view')`

- PUT /api/v1/team/:team_id/members/:user_id/role
  - Description: Update member role inside the team
  - Authorization: `checkTeamPermission('member_role_update')`
  - Body: validated by updateMemberRoleSchema

- DELETE /api/v1/team/:team_id/members/:user_id
  - Description: Remove member from team
  - Authorization: `checkTeamPermission('member_remove')`


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
