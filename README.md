# IT-Support-Dashboard

An IT support ticket system built from scratch as a portfolio project. It creates tickets from a support mailbox, routes them by category, assigns tickets to agents, tracks working time against an SLA, and keeps a complete audit trail of every change.

This repository contains the backend API. The project is in active development; see the [roadmap](#roadmap) for what is done and what comes next.

## Tech stack

- **Runtime:** Node.js, Express 5, plain JavaScript (CommonJS)
- **Database:** PostgreSQL on [Neon](https://neon.tech), queried with `pg` using raw SQL
- **Schema and migrations:** Prisma 6 (used for the schema only, not for queries)
- **Auth:** bcrypt password hashing, JWT stored in an httpOnly cookie

## Getting started

### Prerequisites

- Node.js
- A PostgreSQL database 

### Installation

```powershell
git clone https://github.com/Hadzipasic-Denis/IT-Support-Dashboard.git
cd IT-Support-Dashboard
npm install
```

### Environment variables

Copy the example file and replace the placeholder values:

```powershell
Copy-Item .env.example .env
```

| Variable              | Description                                       |
| --------------------- | ------------------------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection string                      |
| `JWT_SECRET`          | Secret used to sign and verify login tokens       |
| `PORT`                | Port the API listens on (default `8080`)          |
| `SEED_ADMIN_EMAIL`    | Email of the admin created by the seed script     |
| `SEED_ADMIN_PASSWORD` | Password of the admin created by the seed script  |

### Seed the database

```powershell
npm run seed
```

This creates the data the app needs to start:

- **System user:** the author of automatic changes such as email intake, category routing and SLA breaches. It is inactive and cannot log in.
- **Admin:** created from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. Use it to log in and register further users.
- **Lookup data:** one location, one call type and one category.

The script is safe to run more than once: existing entries are skipped. Run it once on every new database, including production.

### Run

```powershell
npm run dev   # with nodemon, restarts on file changes
npm start     # plain node
```

The API runs on `http://localhost:8080` by default.

## API

All protected routes read the JWT from the `access_token` cookie, which is set on login. On every request the user is loaded from the database, so deactivated users and role changes take effect immediately.

Roles: `REQUESTER`, `AGENT`, `ADMIN`.

### Auth (`/auth`)

| Method | Path             | Access | Description                              |
| ------ | ---------------- | ------ | ---------------------------------------- |
| POST   | `/auth/register` | Admin  | Create a user                            |
| POST   | `/auth/login`    | Public | Log in and receive the auth cookie       |
| PUT    | `/auth/logout`   | Public | Clear the auth cookie                    |
| GET    | `/auth/getProfile` | Authenticated | Get the logged-in user's profile |

### Users (`/user`)

| Method | Path                | Access        | Description                                |
| ------ | ------------------- | ------------- | ------------------------------------------ |
| GET    | `/user/getAllUsers` | Admin         | List all users                             |
| GET    | `/user/:id`         | Admin         | Get one user                               |
| PATCH  | `/user/:id`         | Admin         | Update one or more fields of a user        |
| DELETE | `/user/:id`         | Admin         | Deactivate a user (users are never deleted)|

### Locations (`/location`)

| Method | Path                         | Access | Description           |
| ------ | ---------------------------- | ------ | --------------------- |
| POST   | `/location/create`           | Admin  | Create a location     |
| PUT    | `/location/update/:id`       | Admin  | Rename a location     |
| DELETE | `/location/delete/:id`       | Admin  | Deactivate a location |
| GET    | `/location/getAllLocations`  | Admin  | List all locations    |
| GET    | `/location/getLocation/:id`  | Admin  | Get one location      |

### Categories (`/category`)

| Method | Path                           | Access        | Description                                 |
| ------ | ------------------------------ | ------------- | ------------------------------------------- |
| POST   | `/category/create`             | Admin         | Create a category                           |
| PATCH  | `/category/update/:id`         | Admin         | Update one or more fields of a category     |
| DELETE | `/category/delete/:id`         | Admin         | Deactivate a category                       |
| GET    | `/category/getAllCategories`   | Agent, Admin  | List all categories                         |
| GET    | `/category/getCategory/:id`    | Agent, Admin  | Get one category                            |

Category fields:

- `name`: required, unique
- `slaHours`: whole number from 1 to 720, defaults to 120
- `defaultAssigneeId`: optional, must be an active agent or admin. New tickets in this category are assigned to this user.

### Call types (`/callType`)

| Method | Path                          | Access | Description            |
| ------ | ----------------------------- | ------ | ---------------------- |
| POST   | `/callType/create`            | Admin  | Create a call type     |
| PUT    | `/callType/update/:id`        | Admin  | Update a call type     |
| DELETE | `/callType/delete/:id`        | Admin  | Deactivate a call type |
| GET    | `/callType/getAllCallTypes`   | Admin  | List all call types    |
| GET    | `/callType/getCallType/:id`   | Admin  | Get one call type      |

### Tickets (`/ticket`)

| Method | Path                         | Access        | Description                                  |
| ------ | ---------------------------- | ------------- | -------------------------------------------- |
| POST   | `/ticket/create`             | Authenticated | Create a ticket                              |
| GET    | `/ticket/getAllTickets`      | Agent, Admin  | List all tickets that are not `DONE`         |
| GET    | `/ticket/getTicket/:id`      | Agent, Admin  | Get any ticket                               |
| GET    | `/ticket/getUserTickets`     | Authenticated | List the logged-in user's own tickets        |
| GET    | `/ticket/getUserTicket/:id`  | Authenticated | Get one of the logged-in user's own tickets  |

#### Creating a ticket

Request body:

| Field          | Required | Description                                                                 |
| -------------- | -------- | --------------------------------------------------------------------------- |
| `subject`      | Yes      | Non-empty text                                                              |
| `description`  | Yes      | Non-empty text                                                              |
| `categoryId`   | Yes      | Id of an active category                                                    |
| `callTypeId`   | Yes      | Id of an active call type                                                   |
| `contactEmail` | No       | Agents and admins only. Creates the ticket on behalf of someone else, for example after a phone call. Defaults to the logged-in user's email. |
| `priority`     | No       | Agents and admins only. `LOW`, `MEDIUM` or `HIGH`, defaults to `MEDIUM`.     |

Requesters always create tickets for themselves with priority `MEDIUM`. Values they send for `contactEmail` or `priority` are ignored.

When a ticket is created:

- `createdById` is the logged-in user, and `requesterId` is the active user whose email matches `contactEmail` (or empty for external contacts).
- The creation is logged in the ticket history as a status change to `NEW`.
- If the category has an active default assignee, the ticket is assigned to that user. This assignment is logged separately, with the System user as author.
- The ticket, its assignment and its history are written in one database transaction, so a ticket never exists without its history.

#### Viewing tickets

- Agents and admins work as one team and can see every ticket.
- Every other user only sees tickets where they are the requester. Asking for someone else's ticket returns `404`, the same as for a ticket that does not exist, so ticket ids of other users cannot be probed.
- The user endpoints return a fixed set of columns: `id`, `ticketNumber`, `subject`, `description`, `status`, `priority`, `categoryId`, `callTypeId`, `contactEmail`, `requesterId`, `createdById`, `source` and `submittedAt`.

### Errors

Errors go through a central error handler and are returned with an HTTP status code and a message:

| Status | Meaning                                                        |
| ------ | -------------------------------------------------------------- |
| `400`  | Invalid input, for example a malformed id or a failed validation |
| `401`  | Not logged in, or the token is missing                         |
| `403`  | Logged in, but the role is not allowed                         |
| `404`  | Resource not found                                             |
| `409`  | Already exists, for example a duplicate email or category name |
| `500`  | Unexpected server error                                        |

## Design decisions

- **Soft delete:** users and lookup entries (locations, categories, call types) are deactivated with `isActive` instead of being deleted, because tickets and their history reference them.
- **Audit log:** every ticket change is stored as a save action (`ticket_change`) with one row per changed field (`ticket_change_item`).
- **Pausable SLA clock:** SLA time only runs while a ticket is `IN_PROGRESS`. The limit comes from the ticket's category (default 120 hours).
- **Category routing:** each category can have a default assignee for new tickets. Automatic changes like this are authored by a seeded System user, so the history always shows who or what made a change.
- **Service layer:** ticket logic lives in `services/ticket-service.js`, separate from the HTTP controllers, so dashboard requests and the later mailbox ingestion share the same rules.
- **Email intake:** tickets are created from a support mailbox; the message id prevents duplicates and allows reply threading.

## Project structure

```
index.js              # app setup: middleware, routers, error handler
db.js                 # PostgreSQL connection pool
controllers/          # request handlers (auth, user, location, category, call type, ticket)
services/             # business logic shared across entry points (ticket service)
routes/               # Express routers
middlewares/          # authenticate, authorize, central error handler
utils/                # asyncWrapper, ErrorResponse, shared constants
scripts/seed.js       # seeds the System user, admin and lookup data
```

## Roadmap

- [x] Database schema (10 tables) on Neon
- [x] Central error handling (`asyncWrapper`, `ErrorResponse`, error handler)
- [x] User management: get, list, partial update, deactivate
- [x] Auth: register with bcrypt, login with JWT cookie, logout
- [x] Route protection and role-based authorization
- [x] Location management
- [x] Categories and call types
- [x] Seed script: System user, admin, one location, category and call type
- [x] Ticket creation with audit history and category routing
- [x] Ticket list and detail endpoints
- [ ] Ticket updates with audit history and SLA clock
- [ ] Mailbox ingestion and reply threading
- [ ] Tests
- [ ] Frontend (React + Vite) wired to the API
- [ ] Deployment
