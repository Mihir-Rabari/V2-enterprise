# V2 Enterprise — Backend, API & Database Forensic Audit

Date: 2026-10-09 · Baseline commit `cd6a495` (clean tree) · Fix branch `fix/backend-audit-hardening` (uncommitted working-tree changes, see §9) · Companion files: `api-inventory.md`, `root-cause-register.md`, `optimization-roadmap.md`, `test-plan.md`, raw evidence in `raw/`.

## A. Executive summary

The backend is a small (≈4,200 lines) Express 4 + Mongoose 9 monolith that also serves the built React app, running under PM2 (single fork process) behind Cloudflare. It has **no automated tests, no rate limiting, no security headers, no request logging/IDs and no webhooks or background jobs**. The audit found 30 issues. The most important, all verified from source and, where safe, from read-only requests to production:

1. **B-01 Critical – privilege escalation.** `PATCH /auth/me` passes `req.body` straight to Mongoose, so `role` and `password` are accepted (offline proof in `raw/verify-mass-assignment.out`). *Fixed on branch.*
2. **B-02 Critical – payment not bound to cart.** The Razorpay order amount is chosen by the client and never compared with the server-computed total; payment IDs can be reused. *Open.*
3. **B-05/B-06/B-07/B-08 – the public catalog endpoint is unsafe.** Anonymous callers can list INACTIVE products (14 live); `limit=0` or `limit=abc` returns the entire 869-document catalog (1.3 MB, 5 s and 38 s); regex metacharacters give HTTP 500 with internal error text; `tag[$ne]=x` injects Mongo operators. *Fixed on branch.*
4. **B-09 – PII leak.** Public review endpoints return reviewers' e-mail addresses. *Fixed on branch.*
5. **B-04 – inventory is never decremented** (the code targets a `variants` array that the schema does not have). *Open (needs owner decision).*

Performance side (confirming the earlier frontend audit): the home page issues 16 XHRs, including `/settings` ×4, `/products?limit=500` (Navbar search, on every page) and `/products?limit=300`; none are cached at the edge. A trivial `/settings` call has about the same median TTFB (722 ms) as the 300-product aggregation (715 ms), so from the measured vantage the dominant latency is the path to the origin, not MongoDB. Database timings themselves remain unmeasured.

## B. System architecture (verified)

Browser (axios, JWT in `localStorage`, 120 s timeout, no retries; `lib/apiClient.ts`) → Cloudflare (Brotli, HTTP/3, `DYNAMIC` for all API routes) → PM2 `v2-app` (1 fork; `ecosystem.config.js`) → Express: `cors` (allow-list from `FRONTEND_URL`, credentials) → `express.json(500mb)` → routers → controllers/services → Mongoose (default pool) → MongoDB (`MONGODB_URI`; hosting not visible).

- **Auth:** stateless JWT (HS256, 7 d). `protect` re-reads the user and role from the DB on each request; `adminOnly` checks the role.
- **External services:** Cloudflare R2 (S3 SDK; uploads and listing), Razorpay (order create, HMAC verify), Gmail SMTP via nodemailer, and ImageKit/Cloudinary (config only).
- **Static files:** the SPA is built to `backend/public`; `/assets` is immutable for 1 y, other static files 1 d, `index.html` no-store (the edge showed a different policy, see performance audit F-12).
- **Async work:** only fire-and-forget promises (`syncFiltersFromProducts`, `rebuildFiltersFromAllProducts`), which are not durable. No cron, queue, webhook or retry logic exists.

## C. API inventory

See `api-inventory.md` (about 45 endpoints in 15 groups).

- **Excess traffic:** `/settings` ×4 per page; the product catalog ×2 per home load.
- **Large responses:** `/products` at `limit≥300` (442 KB raw / 45 KB br) and `limit=0` (1.3 MB).
- **Slowest measured:** median TTFB ≈ 0.7 s everywhere (table below).
- **Coverage:** no route had tests.

## D. Findings

The complete table (evidence, source lines, root cause, confidence, fix) is in `root-cause-register.md`. Reproduction commands for the live-verified items:

```bash
B=https://v2enterprise.in/api/v1
curl -s "$B/products?limit=1&status=INACTIVE"             # B-05: returns INACTIVE items (before fix)
curl -s -o /dev/null -w '%{size_download}B %{time_total}s\n' "$B/products?limit=0"   # B-06 (heavy: run once)
curl -s "$B/products?search=("                            # B-07: 500 + regex message
curl -s -g "$B/products?tag[\$ne]=zzz&limit=1"            # B-08: operator accepted
curl -s "$B/reviews/homepage" | python -I -c "import sys,json;print(sorted(json.load(sys.stdin)['data'][0]))"   # B-09: keys only
node reports/backend-audit/raw/verify-mass-assignment.cjs <path-to-mongoose>          # B-01, B-04, B-26 (offline)
```

Production still runs the **old** code until the branch is deployed, so these reproduce today.

## E. Performance and correctness tables

Latency from one vantage (Hong Kong edge, residential network, 2026-10-09, sequential requests, `raw/latency_samples.txt`). TTFB is in ms. This is not a load test and not p95/p99; sample sizes are 5–10.

| Endpoint | n | TTFB median | TTFB max | TTFB min | Body (br) | Status |
|---|---|---|---|---|---|---|
| `/settings` | 10 | 722 | 2142 | 462 | 2.1 KB | 200 |
| `/categories` | 10 | 943 | 2190 | 417 | 0.9 KB | 200 |
| `/sliders/hero` | 10 | 724 | 1090 | 427 | 0.5 KB | 200 |
| `/products?limit=20` | 10 | 711 | 1217 | 482 | 3.9 KB | 200 |
| `/products?limit=300&groupByColor=true` | 5 | 715 | 1056 | 562 | 45 KB | 200 |
| `/products?limit=0` (abuse, single run) | 1 | – | – | – | 1.30 MB raw | 200, 5.2 s total |
| `/products?limit=abc` (abuse, single run) | 1 | – | – | – | 1.30 MB raw | 200, 38.3 s total |

Request count per home load (browser Resource Timing, cold, one run): 16 XHR (`/settings`×4, `/products`×2, hero, categories, content×4, reviews, promotional, filters).

**Unavailable:** error rate, p95/p99, throughput, pool utilisation, CPU/memory, event-loop lag, and query `explain` statistics. There are no production metrics and no DB access, load-testing production is out of bounds, and no local MongoDB was available. Next step: run the stack locally with `docker run mongo`, seed with `backend/src/scripts/seed.ts`, and execute `test-plan.md`.

## F. Security findings

- **Confirmed:**
  - Live: B-01 (offline proof), B-05, B-06 (unauthenticated resource abuse), B-07, B-08, B-09.
  - By code: B-02, B-03, B-10.
- **Hardening:** B-11 (helmet, rate limits), B-12 (upload/body limits), B-23, B-24, B-25, B-26.
- **Unverified:**
  - Exploitability of B-10 brute force.
  - Regex ReDoS timing (neither was attempted, to avoid abusing production).
  - How often B-29 loses a payment.
- **Checked and not found:**
  - SSRF: there is no server-side URL fetch.
  - Webhook signature gaps: there are no webhooks.
  - IDOR on orders, addresses and wishlist: all are scoped by `req.user.userId`.
  - Admin routes: every mutating route carries `protect, adminOnly`.
  - Password reset: the token is hashed (sha256) with a 1 h expiry.

## G. Prioritized roadmap

See `optimization-roadmap.md`.

- **P0:** B-01 (fixed), B-02, B-03 (fixed), B-04, B-10. Reason: money, privilege or data exposure.
- **P1:** B-05..B-09 (fixed), B-11, B-13, B-17.
- **P2:** B-12, B-14..B-16, B-18..B-22.
- **P3:** B-23..B-30.

## H. Evidence limitations

- **No access to:**
  - MongoDB: no `explain`, index list, data-quality or duplicate checks.
  - PM2 and application logs.
  - Cloudflare analytics and rules.
  - The Razorpay dashboard.
  - SMTP logs.
- **Not exercised on production, by design:** all writes (login, register, orders, uploads, payments), brute-force tests and load tests.
- **No runtime failure injection** (DB down, upstream 429/5xx, client abort, duplicate webhook). Only code review was done; these are listed as test-plan cases.
- **Frontend:** it was not run in a debugger. Duplicate-request counts come from one cold browser capture plus source reading.
- **Deployment:** assumed to match `deploy.sh` and `ecosystem.config.js`; the actual host was not inspected.

## 9. Remediation performed (branch `fix/backend-audit-hardening`, not committed or deployed)

| Finding | Change | Files |
|---|---|---|
| B-01 | whitelist profile fields | `backend/src/utils/profile.ts`, `backend/src/modules/auth/auth.service.ts` |
| B-03 | order item validation (integer qty 1–50, no duplicate lines) | `backend/src/utils/orderItems.ts`, `backend/src/modules/orders/orders.service.ts` |
| B-05 | non-ACTIVE catalog only for an admin JWT | `backend/src/modules/products/products.controller.ts` |
| B-06 | `limit` 1–500 (default 12), `page` ≥ 1, NaN-safe | `backend/src/utils/query.ts`, controller |
| B-07 | `escapeRegex` for search/category/status | `backend/src/modules/products/products.service.ts` |
| B-08 | reject non-string query params | controller, `asString` |
| B-09 | strip `customerEmail`, `userId`, `__v` from public reviews | `backend/src/modules/reviews/reviews.routes.ts` |
| tests | 6 `node:test` cases + `npm test` script | `backend/test/audit-fixes.test.ts`, `backend/package.json` |

Contract notes:
- The product list response shape is unchanged.
- `limit` above 500 is now clamped; the frontend uses ≤500.
- The admin UI keeps `status:'ALL'` because `apiClient` always sends the token (`useAdminData.ts:89`).
- Admin review lists are unchanged.

**Test results actually obtained:**
- `npx tsc --noEmit -p .` → no errors.
- `npm test` → 6 passed, 0 failed.

**Not run:**
- Integration tests against a real MongoDB or the HTTP layer (none available).
- An automated test for the review-field stripping (manual check in the test plan).
- Frontend build and lint.
- Anything against production after the change (nothing is deployed).
