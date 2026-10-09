# Test Plan

## Run now (done)
```bash
cd backend && npm ci
npx tsc --noEmit -p .        # type-check: passes
npm test                     # node:test, 6 tests: query bounds, operator rejection, regex escaping, order quantities, profile whitelist, admin-only status
node ../reports/backend-audit/raw/verify-mass-assignment.cjs ./node_modules/mongoose   # offline Mongoose behaviour proof
```

## Environment for integration/failure tests (not yet built)
- MongoDB: `docker run -d -p 27017:27017 mongo:7` (single node; use `--replSet` if transactions are added), with `MONGODB_URI=mongodb://localhost/v2test`.
- Seeding: `backend/src/scripts/seed.ts`, against the test DB only.
- Stubs: Razorpay **test** keys; SMTP replaced by a stub.
- Tooling: `supertest` + `mongodb-memory-server` (new devDependencies — needs approval) or the Docker DB.

## Regression cases per finding
| ID | Case | Expected |
|---|---|---|
| B-01 | Log in as a customer, `PATCH /auth/me {role:'ADMIN'}`, then `GET /admin/stats` | 403; DB role unchanged |
| B-02 | Create a payment for ₹1, then place a ₹5,000 order with it; replay the same payment | Both rejected |
| B-03 | Order with qty −1 / 0 / 1.5 / 2 | 400, 400, 400, 201 |
| B-04 | 5 parallel orders for a SKU with quantity 1 | 1 success, 4 rejected, quantity 0 |
| B-05 | Anonymous `?status=ALL`; admin token `?status=ALL` | ACTIVE only; all |
| B-06 | `limit=0,abc,-1,100000`, `page=-3` | 200, ≤500 docs, never 500 |
| B-07/08 | `search=(`, `mainCategory=(`, `tag[$ne]=x` | 200 empty / operator ignored; no internal message |
| B-09 | GET public reviews | No `customerEmail`/`userId`/`__v`; admin list still includes them |
| B-10 | Register with the correct `adminCode` | Role CUSTOMER (after fix) |
| B-11 | 20 rapid login attempts | 429 after threshold |
| B-13 | Load `/` in a production build with network capture | ≤1 `/settings`, no `limit=500` |
| B-14 | Type "abc" then "abcd" with a delayed first response | UI shows "abcd" results |
| B-16 | Page through sort=price asc | No duplicate IDs across pages |
| B-19 | Same POST /orders twice with one Idempotency-Key | One order |
| B-22 | Stop the DB; request `/health` and `/products/:id`; `SIGTERM` during a request | 503; the request completes |

## Failure injection (local only)
- Stop the Mongo container mid-request.
- Stub SMTP to hang 30 s (after the fix, order response time should not include it).
- Stub Razorpay to return 429/500.
- Abort the client mid-upload (the temp file must be removed).
- Send the same webhook twice (once a webhook exists).

## Benchmarks (local/staging only, never production)
- `autocannon -c 20 -d 30` against `/api/v1/products?limit=20` and `/products?limit=300&groupByColor=true`, on a seeded 900-doc DB.
- Record rps, p50/p95/p99, errors, process RSS and event-loop delay (`perf_hooks.monitorEventLoopDelay`).
- Safety limits: max 50 connections, 60 s, localhost only.
- Repeat before/after the index and projection changes.
