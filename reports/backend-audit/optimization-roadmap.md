# Backend Optimization & Hardening Roadmap

Acceptance criteria are defined before implementation. Order = priority. ✔ = patched on the branch and unit-tested, not yet deployed.

## P0 — correctness/security (reason: money, privilege, or data exposure)
| Task | Finding | Acceptance criteria |
|---|---|---|
| ✔ Whitelist `PATCH /auth/me` | B-01 | A request with `role/password/resetPasswordToken` leaves them unchanged; name/phone update still works (integration test) |
| Bind payment to cart | B-02 | Server creates the Razorpay order from the computed total; order placement rejects a payment whose fetched amount ≠ total, a payment that is not `captured`, or a `razorpayPaymentId` already used (unique sparse index). Razorpay test-mode tests for success, underpay, replay |
| ✔ Validate order quantities | B-03 | −1, 0, 1.5, 51 and duplicates are rejected with 400; normal checkout unchanged |
| Real stock handling | B-04 | Concurrent orders for the last unit: exactly one succeeds; stock decremented atomically; cancelled orders restock |
| Remove public admin sign-up | B-10 | `adminCode` ignored/removed; admins created via CLI/seed; registering with the code yields CUSTOMER |

## P1 — high-impact API/DB
| Task | Finding | Acceptance criteria |
|---|---|---|
| ✔ Bound & sanitise product list params | B-05..B-08 | `limit=0/abc/-5/100000` → ≤500 docs; `page=-1` → page 1; `(` in search → 200 empty; anonymous `status=ALL` → ACTIVE only; `tag[$ne]` ignored |
| ✔ Strip PII from public reviews | B-09 | No `customerEmail`/`userId` in `/reviews/homepage` or `/reviews/product/:id` after deploy (re-run the reproduction command) |
| helmet + rate limits | B-11 | HSTS/nosniff/frame headers present; 429 after threshold on login/register/forgot/contact/payments; `x-powered-by` removed |
| Remove duplicate frontend fetches | B-13 | Home load: 1× `/settings`, 0× `limit=500`, ≤ 10 XHR; data freshness unchanged (a settings edit is visible after reload) |
| Index review with `explain` | B-17 | On a seeded staging DB, record `totalDocsExamined` before/after for the 5 hottest queries; add only indexes that cut docs examined ≥ 10× |

## P2 — efficiency & maintainability
| Task | Finding | Acceptance criteria |
|---|---|---|
| Upload hardening | B-12 | JSON body ≤ 1 MB; uploads streamed; MIME allow-list; temp file removed on failure; RSS stays flat for a 200 MB upload |
| Abort/stale-guard in `useProducts`; debounce search | B-14 | Typing "shirt" quickly: ≤2 requests, result matches the last query |
| Fix related-products param | B-15 | PDP related items all share the product's subCategory |
| Deterministic sort + honour `sort` | B-16 | Same query paged 1..N yields no duplicates/skips; sort param works on both paths |
| Projection + edge cache for public GETs | B-18, B-30 | `/products`, `/categories`, `/settings`: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`; second request `cf-cache-status: HIT`; admin change visible ≤ 60 s (or purge on write); never on authenticated/cart/order routes |
| Order flow robustness | B-19 | Idempotency key: a duplicate POST returns the same order; unique random order id; e-mail sent after the response |
| Normalise e-mail case | B-20 | A mixed-case registration can log in and reset its password |
| Error handling & shapes | B-21 | Production 5xx bodies contain no internal messages; a DB outage returns 503, not 404 |
| Graceful lifecycle | B-22 | `SIGTERM` drains and disconnects; `pm2 reload` shows zero failed requests under a 30 s curl loop; `/health` fails when the DB is down |

## P3 — cleanup
- B-23: escape meta tags.
- B-24: shorter JWT, plus refresh/revocation.
- B-25: review rules.
- B-26: `runValidators: true`.
- B-27: drop the unused query; make filter updates atomic.
- B-28: refresh `.env.example`; add CI running `tsc` and `npm test`.
- B-29: Razorpay webhook (needs dashboard access to confirm the need).

## Observability (smallest useful step)
Add one middleware:
- Request ID: accept `x-request-id`, else generate one; return it in a response header.
- One JSON log line per request: method, route pattern, status, duration, `contentLength`, userId. No headers or bodies.
- Log slow Mongoose queries (> 200 ms) with collection and op name only.
- Frontend: send `x-request-id` from the axios interceptor.

Acceptance: any slow or 5xx request can be found by ID in `pm2 logs`, and no tokens or passwords appear in the logs (grep test).
