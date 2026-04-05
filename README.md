# Finance Data Processing Backend

## Badges

![Build Passing](https://img.shields.io/badge/build-passing-brightgreen)
![License ISC](https://img.shields.io/badge/license-ISC-blue)
![Node 20](https://img.shields.io/badge/node-20.x-green)

This backend powers a finance dashboard with role-based access control, structured user management, persistent financial records, and SQL-driven analytics. It is built to be predictable under audit, easy to extend, and explicit about validation, security, and data ownership.

## Core Features

- JWT authentication with logout-based token invalidation.
- Viewer, Analyst, and Admin roles with middleware-enforced RBAC.
- User management for admin-created accounts, role assignment, and active/inactive status.
- Financial record CRUD with soft delete, filtering, pagination, and search.
- Dashboard summary and analytics endpoints computed in PostgreSQL.
- Zod validation on all input-bearing endpoints.
- Transactional writes for consistent multi-step changes.

## Architecture & Tradeoffs

- PostgreSQL vs MongoDB
  - Options Considered: PostgreSQL, MongoDB
  - Choice Made: PostgreSQL
  - Why: Financial data is relational, benefits from joins, constraints, and aggregate queries.
  - Tradeoff Accepted: More schema discipline and migration overhead.

- JWT vs Sessions
  - Options Considered: Stateless JWT, server-side sessions only
  - Choice Made: JWT with a sessions table for invalidation
  - Why: Keeps authentication lightweight while still supporting logout revocation.
  - Tradeoff Accepted: Token invalidation is not as simple as pure stateless JWT.

- Zod for Validation
  - Options Considered: Manual validation, Joi, Zod
  - Choice Made: Zod
  - Why: Strong runtime validation with a small, clear API and good TypeScript compatibility if needed later.
  - Tradeoff Accepted: Validation rules are centralized in code rather than auto-generated from schema.

- Repository Pattern
  - Options Considered: SQL in services, SQL in repositories
  - Choice Made: Repository layer
  - Why: Services stay focused on business rules while database access is isolated.
  - Tradeoff Accepted: Slightly more files and indirection.

- Soft Delete
  - Options Considered: Hard delete, soft delete
  - Choice Made: Soft delete for records
  - Why: Financial records should be recoverable and auditable.
  - Tradeoff Accepted: Queries must always filter out deleted rows.

## Tech Stack

- Node.js: runtime for the API server and test execution.
- Express.js: minimal HTTP framework with simple middleware composition.
- PostgreSQL: relational database with constraints and aggregate performance.
- pg: native PostgreSQL driver used for query execution and transactions.
- jsonwebtoken: JWT signing and verification.
- bcrypt: password hashing with proven server-side storage protection.
- Zod: request validation and safe parsing.
- Jest: test runner for unit and integration coverage.

## Folder Structure

```text
backend/
  migrations/
  scripts/
  src/
    app.js
    server.js
    config/
    constants/
    db/
    middlewares/
    modules/
      auth/
      categories/
      dashboard/
      records/
      users/
    repositories/
  tests/
  .env
  package.json
```

## DB Schema

`roles`

```text
+------------+---------------------+----------------------------------+
| Column     | Type                | Notes                            |
+------------+---------------------+----------------------------------+
| id         | uuid                | Primary key                      |
| name       | varchar(255)        | Viewer / Analyst / Admin         |
| created_at  | timestamp           | Row creation timestamp           |
+------------+---------------------+----------------------------------+
```

`users`

```text
+--------------+---------------------+----------------------------------+
| Column       | Type                | Notes                            |
+--------------+---------------------+----------------------------------+
| id           | uuid                | Primary key                      |
| name         | varchar(255)        | User display name                |
| email        | varchar(255)        | Unique login identifier          |
| password_hash| text                | bcrypt hash                      |
| role_id      | uuid                | FK to roles                      |
| status       | varchar(50)         | active / inactive                |
| created_at   | timestamp           | Row creation timestamp           |
| updated_at   | timestamp           | Row update timestamp             |
+--------------+---------------------+----------------------------------+
```

`sessions`

```text
+------------+---------------------+----------------------------------+
| Column     | Type                | Notes                            |
+------------+---------------------+----------------------------------+
| id         | uuid                | Primary key                      |
| user_id    | uuid                | FK to users                      |
| token      | text                | JWT token used for invalidation  |
| is_valid   | boolean             | false after logout               |
| expires_at | timestamp           | Session expiry                   |
| created_at | timestamp           | Row creation timestamp           |
+------------+---------------------+----------------------------------+
```

`categories`

```text
+-------------+---------------------+----------------------------------+
| Column      | Type                | Notes                            |
+-------------+---------------------+----------------------------------+
| id          | uuid                | Primary key                      |
| name        | varchar(255)        | Category name                    |
| is_system   | boolean             | System or user-defined           |
| created_by  | uuid                | FK to users                      |
| created_at  | timestamp           | Row creation timestamp           |
| updated_at  | timestamp           | Row update timestamp             |
+-------------+---------------------+----------------------------------+
```

`records`

```text
+-------------+---------------------+----------------------------------+
| Column      | Type                | Notes                            |
+-------------+---------------------+----------------------------------+
| id          | uuid                | Primary key                      |
| amount      | numeric(15,2)       | Exact decimal, never float       |
| type        | varchar(50)         | income / expense                 |
| category_id | uuid                | FK to categories                 |
| date        | date                | Business date                    |
| notes       | text                | Optional notes                   |
| created_by  | uuid                | FK to users                      |
| deleted_at  | timestamp           | Soft delete marker               |
| created_at  | timestamp           | Row creation timestamp           |
| updated_at  | timestamp           | Row update timestamp             |
+-------------+---------------------+----------------------------------+
```

## Getting Started

1. Clone the repository.
2. Install dependencies in `backend/`:
   ```bash
   npm install
   ```
3. Copy `.env` into `backend/.env`.
4. Set `DATABASE_URL`, `JWT_SECRET`, and `PORT`.
5. Run migrations and seed data:
   ```bash
   npm run migrate
   npm run seed
   ```
6. Start the API:
   ```bash
   npm run dev
   ```

## Environment Variables

| Key | Example Value | Description |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://user:pass@localhost:5433/zorvyn` | PostgreSQL connection string |
| `JWT_SECRET` | `super-secret-value` | JWT signing key |
| `PORT` | `3000` | HTTP port used by the server |

## Demo Credentials

Run `npm run seed` to load the fixed demo accounts below.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@zorvyn.com` | `admin123` |
| Analyst | `analyst@zorvyn.com` | `analyst123` |
| Viewer | `viewer@zorvyn.com` | `viewer123` |

## API Documentation

### Authentication

- `POST /auth/register` | Access: public | Request: `{"name":"Test User","email":"test@example.com","password":"password123"}` | Response: `{"data":{"id":"uuid","email":"test@example.com"}}`
- `POST /auth/login` | Access: public | Request: `{"email":"test@example.com","password":"password123"}` | Response: `{"data":{"token":"<jwt>"}}`
- `POST /auth/logout` | Access: authenticated | Request: none | Response: `{"message":"Logged out"}`
- `GET /auth/me` | Access: authenticated | Request: none | Response: `{"data":{"id":"uuid","email":"test@example.com","role":"viewer"}}`

### Users

- `GET /users?page=1&limit=10&search=alex&role=analyst&status=active` | Access: admin | Request: none | Response: `{"data":[{"id":"uuid","name":"Alex","email":"alex@example.com","role":"Analyst","status":"active"}],"pagination":{"page":1,"limit":10,"total":1,"pages":1}}`
- `GET /users/:id` | Access: admin | Request: none | Response: `{"data":{"id":"uuid","name":"Alex","email":"alex@example.com","role":"Analyst","status":"active"}}`
- `POST /users` | Access: admin | Request: `{"name":"Alex","email":"alex@example.com","password":"password123","role":"viewer","status":"active"}` | Response: `{"data":{"id":"uuid","name":"Alex","email":"alex@example.com","role":"Viewer","status":"active"}}`
- `PATCH /users/:id` | Access: admin | Request: `{"role":"analyst","status":"inactive"}` | Response: `{"data":{"id":"uuid","name":"Alex","email":"alex@example.com","role":"Analyst","status":"inactive"}}`
- `PATCH /users/:id/status` | Access: admin | Request: `{"status":"inactive"}` | Response: `{"data":{"id":"uuid","name":"Alex","email":"alex@example.com","role":"Analyst","status":"inactive"}}`
- `DELETE /users/:id` | Access: admin | Request: none | Response: `{"data":{"deleted":true}}`

### Records

- `GET /records?page=1&limit=10&type=expense&category_id=<uuid>&from=2024-01-01&to=2024-01-31` | Access: analyst/admin | Request: none | Response: `{"data":[{"id":"uuid","amount":"1200.00","type":"expense","category_name":"Expenses"}],"pagination":{"page":1,"limit":10,"total":1,"pages":1}}`
- `GET /records/search?q=rent&page=1&limit=10` | Access: analyst/admin | Request: none | Response: `{"data":[{"id":"uuid","notes":"Office rent"}],"pagination":{"page":1,"limit":10,"total":1,"pages":1}}`
- `GET /records/:id` | Access: analyst/admin | Request: none | Response: `{"data":{"id":"uuid","amount":"1200.00","type":"expense","category_name":"Expenses","notes":"Office rent"}}`
- `POST /records` | Access: admin | Request: `{"amount":250,"type":"income","category_id":"uuid","date":"2024-02-01","notes":"Monthly salary"}` | Response: `{"data":{"id":"uuid","amount":"250.00","type":"income","category_name":"Salary"}}`
- `PATCH /records/:id` | Access: admin | Request: `{"notes":"Updated note"}` | Response: `{"data":{"id":"uuid","notes":"Updated note"}}`
- `DELETE /records/:id` | Access: admin | Request: none | Response: `{"data":{"deleted":true}}`

### Categories

- `GET /categories?page=1&limit=10&search=salary&is_system=true` | Access: admin | Request: none | Response: `{"data":[{"id":"uuid","name":"Salary","is_system":true}],"pagination":{"page":1,"limit":10,"total":1,"pages":1}}`
- `GET /categories/:id` | Access: admin | Request: none | Response: `{"data":{"id":"uuid","name":"Salary","is_system":true}}`
- `POST /categories` | Access: admin | Request: `{"name":"Projects","is_system":false}` | Response: `{"data":{"id":"uuid","name":"Projects","is_system":false}}`
- `PATCH /categories/:id` | Access: admin | Request: `{"name":"Projects Updated"}` | Response: `{"data":{"id":"uuid","name":"Projects Updated","is_system":false}}`
- `DELETE /categories/:id` | Access: admin | Request: none | Response: `{"data":{"deleted":true}}`

### Dashboard

- `GET /dashboard/summary?from=2024-01-01&to=2024-01-31` | Access: authenticated | Request: none | Response: `{"data":{"total_income":"5000.00","total_expenses":"1200.00","net_balance":"3800.00","total_records":2,"categories_used":2}}`
- `GET /dashboard/analytics?from=2024-01-01&to=2024-01-31` | Access: analyst/admin | Request: none | Response: `{"data":{"category_breakdown":[],"monthly_trends":[],"weekly_trends":[],"recent_activity":[],"top_spending_categories":[],"range":{"from":"2024-01-01","to":"2024-01-31"}}}`

## Postman Collection

- The full collection is available in [`postman_collection.json`](./postman_collection.json).
- It includes example headers, request bodies, and sample responses for every endpoint.

## Swagger / OpenAPI

- Live docs are served from `GET /docs`.
- The OpenAPI spec is available at `GET /openapi.json`.
- The Swagger UI reads directly from the spec, so it stays aligned with the current API surface.

## Security & Validation

- JWTs are signed with `JWT_SECRET` and have explicit expiry.
- Logout writes a session row so tokens can be invalidated.
- Auth middleware rejects inactive users.
- Role checks are enforced through middleware before handlers run.
- Zod validation rejects malformed POST/PATCH payloads with `400`.
- Financial totals and trends are computed in SQL using aggregates, not in memory.
- Records use soft delete so deleted financial data remains auditable.
- Rate limiting is applied globally at the app level.

## Assumptions Made

- PostgreSQL is the target database.
- Roles are exactly `viewer`, `analyst`, and `admin`.
- Record amounts are stored as `numeric(15,2)` for exact decimal arithmetic.
- Logout invalidation is sufficient for session control in this assignment.
- Analytics are computed on demand rather than cached.

## Future Enhancements

- OpenAPI/Swagger documentation.
- Refresh tokens.
- Distributed rate limiting.
- Field-level audit logging.
- Background jobs for analytics caching.
- Search indexing for larger datasets.
