# Car Repair Shop Management System (CLD 376)

Backend of a car repair shop as 9 Node.js microservices behind one API Gateway that enforces JWT role-based access. Each service runs in its own Docker container with its own MongoDB Atlas database, spread across 3 EC2 instances.

## Services

| Service | Owner | EC2 | Port | Gateway path | Database |
| --- | --- | --- | --- | --- | --- |
| api-gateway | M1 | EC2-1 | 3000 | entry point | none |
| registration | M2 | EC2-1 | 3001 | `/api/auth/register`, `/api/users` | `auth_db` |
| login | M3 | EC2-1 | 3002 | `/api/auth/login`, `/api/auth/me`, `/api/auth/verify` | `auth_db` (read only) |
| booking | M1 | EC2-2 | 3003 | `/api/bookings` | `bookings_db` |
| vehicles | M1 | EC2-2 | 3004 | `/api/vehicles` | `vehicles_db` |
| work-orders | M2 | EC2-2 | 3005 | `/api/work-orders` | `workorders_db` |
| repair-notes | M2 | EC2-3 | 3006 | `/api/notes` | `notes_db` |
| billing | M3 | EC2-3 | 3007 | `/api/invoices` | `billing_db` |
| service-catalog (x2) | M3 | EC2-2, EC2-3 | 3008 | `/api/catalog` | `catalog_db` |

## Layout

```text
services/<name>/
├── src/
│   ├── index.js            # app setup, /health, error handler, DB connect, listen (shared, don't edit)
│   ├── routes.js           # your five endpoints, mounted at their full path
│   ├── model.js            # your Mongoose schema
│   └── middleware/user.js  # identity middleware (identical everywhere, don't edit)
├── Dockerfile              # identical everywhere except EXPOSE
├── .dockerignore
├── .env.example            # committed; copy to .env (gitignored) and fill in
└── package.json
deploy/ec2-1|2|3/           # compose file per instance + gitignored env/ (M3)
scripts/                    # seed-users.js, seed-catalog.js (M2)
postman/                    # collection + environment (M3)
```

**Starting your service:** copy `src/index.js`, `src/middleware/user.js`, `Dockerfile` and `.dockerignore` from `services/vehicles/`, changing only `SERVICE` and the default port in `index.js` and `EXPOSE` in the Dockerfile. Then `npm init -y`, `npm install express@^5 mongoose@^8` (plus `bcryptjs`/`jsonwebtoken` if the PRD lists them for your service), and write your own `model.js`, `routes.js` and `.env.example`. Commit `package-lock.json`; Docker's `npm ci` needs it.

## Run one service on its own

```bash
cd services/vehicles
npm ci
cp .env.example .env        # fill in MONGO_URI from the group chat
npm run dev                 # node --watch --env-file=.env src/index.js
```

Without the gateway, stand in for it with two headers in Postman or curl:

```bash
curl localhost:3004/api/vehicles -H "x-user-id: 66f1c2a9e4b0a1b2c3d4e5f6" -H "x-user-role: customer"
```

No Atlas yet? A throwaway local Mongo works the same way: `docker run -d --name mongo -p 27017:27017 mongo:8`, then `MONGO_URI=mongodb://localhost:27017/vehicles_db`.

## Conventions (all services)

- Libraries: `express` 5 and `mongoose` 8 only, plus `bcryptjs`/`jsonwebtoken` where the PRD lists them. Built-in `fetch` with `AbortSignal.timeout(5000)` for cross-service calls; `--env-file` instead of `dotenv`.
- Identity comes from `x-user-id` and `x-user-role` (set by the gateway). Never trust `role`, `ownerId`, `customerId` or `authorId` from the body.
- Routes are `async`; just `throw` or let Mongoose throw. The shared error handler in `index.js` turns `ValidationError` into 400, a bad `ObjectId` into 404, duplicate key into 409, anything else into 500.
- Every error uses one shape: `{ "error": { "code": "FORBIDDEN", "message": "..." } }`, with codes from the PRD's error table only.
- Single records return the document with `_id`; lists return a plain array; create returns 201; delete returns 204 with no body. Money is integer cents.
- Each new endpoint needs a row in `services/api-gateway/src/policy.js`, or the gateway denies it (403).

## Git workflow

Edit only your own service folders. Work on a branch, open a pull request into `main` once it runs. Secrets (`MONGO_URI`, `JWT_SECRET`) live only in gitignored `.env` files and the group chat.
