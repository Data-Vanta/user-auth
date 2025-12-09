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
 # user-auth

 user-auth — authentication & authorization microservice

 This project is an Express + Sequelize (Postgres) microservice that implements user authentication, email verification, password reset, JWT-based auth, and role/permission-based access control.

 This README focuses on how to run the project and provides a full, detailed API reference for all available endpoints mounted under the base path `/api/v1`.

 ---

 ## Quick start

 Prerequisites
 - Node.js (>= 18)
 - Postgres instance reachable from your machine

 1. Clone and install:

 ```powershell
 git clone <repo-url>
 cd user-auth
 npm install
 ```

 2. Create a `.env` file (example values):

 ```env
 PORT=3000
 URL=http://localhost:3000
 NODE_ENV=development
 DB_STRING=postgres://postgres:password@localhost:5432/user_auth
 JWT_SECRET=replace-with-secure-string
 EMAIL_USER=your@email.com
 APP_PASS=email-app-password
 ```

 3. Start the server (development):

 ```powershell
 npm start
 ```

 Note: the app runs `sequelize.sync({ alter: true })` on boot (development convenience). Use migrations for production.

 ---

 ## API basics

 - Base path: `/api/v1`
 - Authentication: protected endpoints require a JWT passed in header `x-auth-token`.
 - Permissions: some routes enforce role/permission checks (middleware). Where applicable the required check is noted.

 Response shape: success responses use a utility `success(res, message, data, statusCode?)`. Error responses use standard HTTP status codes with JSON messages.

 ---

 ## Full API Reference (detailed)

 Auth (public)
 - POST /api/v1/auth/signup
   - Description: Register a new user and send verification email.
   - Body: { name: string, email: string, password: string }
   - Response: created user (isVerified=false) and email sent.

 - POST /api/v1/auth/signin
   - Description: Sign in a user.
   - Body: { email: string, password: string }
   - Response: { token, user } and sets `x-auth-token` header.

 - GET /api/v1/auth/verify-email?token=TOKEN
   - Description: Verify email address (renders EJS view).

 - POST /api/v1/auth/forget-password
   - Description: Request a password reset email.
   - Body: { email: string }

 - GET /api/v1/auth/reset-password?token=TOKEN
   - Description: Render reset password form (EJS view).

 - POST /api/v1/auth/change-password?token=TOKEN
   - Description: Complete password reset using token.
   - Body: { password: string }

 Users
 - GET /api/v1/user/
   - Description: List users.
   - Auth: `x-auth-token` (Admin only).

 - GET /api/v1/user/:id
   - Description: Get a user by id.
   - Auth: `x-auth-token` (Admin or the user themselves).

 - PUT /api/v1/user/:id
   - Description: Update user profile (name/email/etc.).
   - Auth: `x-auth-token` (user updating own profile).
   - Body: fields to update (e.g., { name, email }). Password updates may be restricted by repository code.

 - DELETE /api/v1/user/:id
   - Description: Delete a user.
   - Auth: `x-auth-token` (Admin or the user themselves).

 Profiles
 - POST /api/v1/profile
   - Description: Create a profile record for a user.
   - Auth: `x-auth-token`.
   - Body: fields validated by `createProfileSchema`.

 - GET /api/v1/profile/me
   - Description: Get the authenticated user's profile.
   - Auth: `x-auth-token`.

 - GET /api/v1/profile/:id
   - Description: Get profile by id (role check applies).
   - Auth: `x-auth-token`.

 - POST /api/v1/profile/:id
   - Description: Update profile by id (role-check applies).
   - Auth: `x-auth-token`.
   - Body: validated by `updateProfileSchema`.

 - PUT /api/v1/profile/:id/password
   - Description: Change a user's password (role-check applies).
   - Auth: `x-auth-token`.
   - Body: { password }

 - POST /api/v1/profile/:id/profile-picture
   - Description: Upload profile picture (multipart/form-data).
   - Auth: `x-auth-token`.
   - Form field: `file` (handled by upload middleware).

 Roles (Admin-only router)
 - POST /api/v1/role
   - Description: Create a role.
   - Auth: `x-auth-token` (Admin)
   - Body: { name: string }

 - GET /api/v1/role
   - Description: List roles (includes permissions)
   - Auth: `x-auth-token` (Admin)

 - GET /api/v1/role/:role_id
   - Description: Get a role and its permissions
   - Auth: `x-auth-token` (Admin)

 - PUT /api/v1/role/:role_id
   - Description: Update a role
   - Auth: `x-auth-token` (Admin)
   - Body: { name }

 - DELETE /api/v1/role/:role_id
   - Description: Delete a role
   - Auth: `x-auth-token` (Admin)

 Role permissions (Admin)
 - POST /api/v1/role/:role_id/permissions
   - Description: Attach a permission to a role.
   - Auth: `x-auth-token` (Admin)
   - Body: { perm_id: number }

 - POST /api/v1/role/:role_id/permissions/bulk
   - Description: Attach multiple permissions to a role.
   - Auth: `x-auth-token` (Admin)
   - Body: { perm_ids: number[] }

 - DELETE /api/v1/role/:role_id/permissions/:perm_id
   - Description: Remove a permission from a role.
   - Auth: `x-auth-token` (Admin)

 Permissions (Admin-only router)
 - POST /api/v1/permission
   - Description: Create a permission
   - Auth: `x-auth-token` (Admin)
   - Body: { name: string }

 - GET /api/v1/permission/:perm_id
   - Description: Get a permission by id
   - Auth: `x-auth-token` (Admin)

 - PUT /api/v1/permission/:perm_id
   - Description: Update a permission
   - Auth: `x-auth-token` (Admin)

 - DELETE /api/v1/permission/:perm_id
   - Description: Delete a permission
   - Auth: `x-auth-token` (Admin)

 Teams
 - POST /api/v1/team
   - Description: Create a team. The authenticated user becomes the owner by default.
   - Auth: `x-auth-token`.
   - Body: { name: string, description?: string, roleName?: string }
   - Notes: Frontend may pass a hidden `roleName` value (e.g. "Owner"). If `roleName` is omitted, the service will use the default role name `Owner`. The service will find-or-create the role and add the authenticated user to the team with that role.

 - GET /api/v1/team
   - Description: List all teams (each team will include its members and each member's role within that team)
   - Auth: `x-auth-token`.

 - GET /api/v1/team/:team_id
   - Description: Get details for a single team (includes members with their roles)
   - Auth: `x-auth-token`
   - Permission: `team_view` (checked by middleware)

 - PUT /api/v1/team/:team_id
   - Description: Update team details
   - Auth: `x-auth-token`
   - Permission: `team_update`
   - Body: { name?, description? }

 - DELETE /api/v1/team/:team_id
   - Description: Delete a team
   - Auth: `x-auth-token`
   - Permission: `team_delete`

 Team members
 - POST /api/v1/team/:team_id/members
   - Description: Add a member to a team by user email and assign role by id
   - Auth: `x-auth-token`
   - Permission: `member_add`
   - Body: { email: string, role_id: number }

 - GET /api/v1/team/:team_id/members
   - Description: List members of a team. Each item is { user, role } — `user` contains user fields and `role` contains role fields.
   - Auth: `x-auth-token`
   - Permission: `team_view`

 - PUT /api/v1/team/:team_id/members/:user_id/role
   - Description: Update a member's role within a team
   - Auth: `x-auth-token`
   - Permission: `member_role_update`
   - Body: { role_id: number }

 - DELETE /api/v1/team/:team_id/members/:user_id
   - Description: Remove a member from a team
   - Auth: `x-auth-token`
   - Permission: `member_remove`

 ---

 ## Examples (curl / PowerShell)

 Sign in (get token):

 ```powershell
 curl -Method POST -Uri "http://localhost:3000/api/v1/auth/signin" -Body (ConvertTo-Json @{ email='admin@example.com'; password='password123' }) -ContentType 'application/json'
 ```

 Create a team (authenticated):

 ```powershell
 curl -Method POST -Uri "http://localhost:3000/api/v1/team" -Body (ConvertTo-Json @{ name='My Team'; description='Example'; roleName='Owner' }) -ContentType 'application/json' -Headers @{ Authorization = 'Bearer <token>'; 'x-auth-token' = '<token>' }
 ```

 Add a member by email:

 ```powershell
 curl -Method POST -Uri "http://localhost:3000/api/v1/team/1/members" -Body (ConvertTo-Json @{ email='user@example.com'; role_id=2 }) -ContentType 'application/json' -Headers @{ 'x-auth-token' = '<token>' }
 ```

 ---

 ## Useful scripts

 - `npm start` — start the server (dev: syncs DB schema)
 - `npm run seed` — run seeder to create example roles/permissions
 - `npm run check:associations` — quick association smoke-check

 ---

 ## Troubleshooting

 - DB connection failure — check `.env` `DB_STRING` and Postgres availability.
 - Missing tables — run the server or `npm run seed` in development; migrations are recommended for production.
 - Unauthorized / token expiry — supply a valid JWT in `x-auth-token` header and ensure user `isVerified`.

 ---

 If you'd like, I can generate a Postman collection or an OpenAPI (Swagger) spec for these endpoints. I can also add example request/response bodies for each endpoint if you want more detail.
