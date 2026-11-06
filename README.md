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

### Test

```powershell
npm test
```

Runs the unit tests in `tests/` with Node's built-in test runner. No database is needed.

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
| PATCH  | `/ticket/updateTicket/:id`   | Agent, Admin  | Update one or more fields of a ticket        |
| GET    | `/ticket/getTicketHistory/:id` | Authenticated | Get the change history of a ticket         |

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
- The staff endpoints (`getAllTickets`, `getTicket`) return every column of the ticket.
- The user endpoints return a fixed set of columns: `id`, `ticketNumber`, `subject`, `description`, `status`, `priority`, `categoryId`, `callTypeId`, `contactEmail`, `requesterId`, `createdById`, `source`, `submittedAt` and the [SLA fields](#sla-clock).
- Every ticket response, from the list, detail, create and update endpoints, also contains the category's `slaHours` and the calculated [SLA state](#sla-state).

#### Updating a ticket

Request body (all fields optional, at least one is required):

| Field        | Description                                               |
| ------------ | --------------------------------------------------------- |
| `status`     | `NEW`, `IN_PROGRESS`, `WAITING_FOR_FEEDBACK` or `DONE`    |
| `priority`   | `LOW`, `MEDIUM` or `HIGH`                                 |
| `categoryId` | Id of an active category                                  |
| `callTypeId` | Id of an active call type                                 |

Other fields are ignored. Subject and description stay as the requester wrote them.

When a ticket is updated:

- All values are validated before the database transaction starts. An invalid value returns `400` and nothing is saved.
- The ticket row is locked while it is read and updated, so two agents saving at the same time cannot overwrite each other's history.
- Only fields whose value actually changed are saved. If nothing changed, the ticket is returned unchanged and no history is written.
- Each save is logged as one entry in the ticket history, with the logged-in user as author and one row per changed field holding the old and the new value.
- Changing the category does not reassign the ticket. Category routing only applies to new tickets.
- A status change starts, pauses or stops the [SLA clock](#sla-clock) in the same transaction. A category change applies the new category's limit: a running clock gets a new breach forecast.
- The response is the updated ticket, including the SLA fields and the SLA state.

#### SLA clock

Every ticket has a time limit, taken from its category (`slaHours`, default 120 hours). The limit counts working time, not calendar time: the clock only runs while the ticket is `IN_PROGRESS`.

| Status change                      | Effect on the clock                                                        |
| ---------------------------------- | -------------------------------------------------------------------------- |
| To `IN_PROGRESS`                   | The clock starts. The breach forecast is set to now plus the remaining time. |
| From `IN_PROGRESS` to any other    | The clock pauses. The time of this run is added to the worked time.         |
| To `DONE`                          | `resolvedAt` is set.                                                       |
| From `DONE` back to another status | The ticket is reopened: `resolvedAt` is cleared, the worked time is kept.   |

Fields on the ticket:

| Field               | Meaning                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `slaWorkedSeconds`  | Working time used so far, from all previous runs of the clock                                   |
| `slaClockStartedAt` | When the current run started. Empty while the clock is paused.                                  |
| `slaBreachAt`       | Forecast: when the limit will be reached if the clock keeps running. Empty while paused.        |
| `slaBreachedAt`     | Fact: when the limit was exceeded. Set once and never changed afterwards.                       |
| `resolvedAt`        | When the ticket was set to `DONE`                                                               |

#### SLA state

The server calculates the SLA state of each ticket at the moment of the request and adds it to every ticket response as `sla`. The frontend only displays it.

```json
"sla": { "state": "RUNNING", "remainingSeconds": 10800 }
```

| State      | When                                                                    | `remainingSeconds`             |
| ---------- | ----------------------------------------------------------------------- | ------------------------------ |
| `RUNNING`  | The clock is running and the limit has not been reached                 | Seconds until the forecast     |
| `PAUSED`   | The clock is not running and the ticket is not resolved                 | Working time left of the limit |
| `MET`      | The ticket is `DONE` without a breach                                   | `null`                         |
| `BREACHED` | A breach was recorded, or the forecast has passed while the clock runs  | `0`                            |

`BREACHED` wins over every other state, so a ticket resolved after its limit stays `BREACHED`. A ticket without a category uses the default of 120 hours.

Both calculations, the clock and the state, live in `services/sla-service.js` as pure functions, so they can be tested without a database. SLA fields are derived values and are not written to the ticket history; the status change that caused them is.

Known limitations:

- A breach is recorded when the clock is paused or stopped. A ticket that stays `IN_PROGRESS` past its limit is only marked once its status changes. Until then, its SLA state already shows `BREACHED`.

#### Ticket history

`GET /ticket/getTicketHistory/:id` returns every change of a ticket, oldest first. Each change is one save action with its author, an optional comment and the fields it changed:

```json
[
  {
    "id": 4,
    "changedAt": "2026-10-28T20:28:05.527Z",
    "comment": null,
    "author": { "id": 6, "name": "ph" },
    "items": [
      { "field": "status", "oldValue": null, "newValue": "NEW", "oldLabel": null, "newLabel": null }
    ]
  },
  {
    "id": 5,
    "changedAt": "2026-10-28T20:28:05.527Z",
    "comment": "Assigned by category routing",
    "author": { "id": 7, "name": "System" },
    "items": [
      { "field": "assignee", "oldValue": null, "newValue": "6", "oldLabel": null, "newLabel": "ph" }
    ]
  }
]
```

- The visibility rule is the same as for the ticket itself: agents and admins see the history of every ticket, everyone else only of their own tickets. Any other ticket returns `404`.
- Changes are sorted by time and then by id. Changes saved in the same transaction share one timestamp, and the id keeps their real order.
- `oldValue` and `newValue` are stored as text. For fields that hold an id (`assignee`, `categoryId`, `callTypeId`), `oldLabel` and `newLabel` contain the readable name of the user, category or call type. For other fields they are empty, because the value is already readable.
- The history is loaded with two queries in total, one for the changes and one for all their items, regardless of how many changes a ticket has.

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
- **Audit log:** every ticket change is stored as a save action (`ticket_change`) with one row per changed field (`ticket_change_item`). Values are stored as text so one pair of columns can hold any field; ids are resolved to names when the history is read.
- **Pausable SLA clock:** SLA time only runs while a ticket is `IN_PROGRESS`. The limit comes from the ticket's category (default 120 hours). The server calculates the SLA state, and the frontend only displays it.
- **Category routing:** each category can have a default assignee for new tickets. Automatic changes like this are authored by a seeded System user, so the history always shows who or what made a change.
- **Service layer:** ticket logic lives in `services/ticket-service.js`, separate from the HTTP controllers, so dashboard requests and the later mailbox ingestion share the same rules.
- **Email intake:** tickets are created from a support mailbox; the message id prevents duplicates and allows reply threading.

## Project structure

```
index.js              # app setup: middleware, routers, error handler
db.js                 # PostgreSQL connection pool
controllers/          # request handlers (auth, user, location, category, call type, ticket)
services/             # business logic shared across entry points (ticket service, SLA clock)
routes/               # Express routers
middlewares/          # authenticate, authorize, central error handler
utils/                # asyncWrapper, ErrorResponse, shared constants
scripts/seed.js       # seeds the System user, admin and lookup data
tests/                # unit tests, run with npm test
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
- [x] Ticket updates with audit history
- [x] SLA clock: pausable working-time limit per category
- [x] Ticket history endpoint with readable names
- [x] SLA state in every ticket response
- [ ] Ticket detail: assignee changes, comments
- [ ] Mailbox ingestion and reply threading
- [ ] Tests (SLA clock and SLA state unit tests done)
- [ ] Frontend (React + Vite) wired to the API
- [ ] Deployment
