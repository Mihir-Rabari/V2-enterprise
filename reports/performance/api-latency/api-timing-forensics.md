# API timing forensics

Audit date 2026-10-14 (UTC 10:27-10:45). Production reads only: about 330 bounded GET/HEAD requests in total, 1 s apart, from one client in India to Cloudflare colo `SIN` (`CF-RAY ...-SIN`). No load test, no writes, no authenticated calls. Raw data: `raw/timing-decomposition.csv`, `raw/timing-decomposition-b.csv`, `raw/cold-connection-breakdown.csv`, `raw/parallel-connection-experiment.csv` (only the HTTP/1.1 part ran; the `--http2` flag is unsupported by this curl), `raw/h2-multiplex-experiment.json`; script in this report's commands below.

## 1. Evidence status of the previous claim ("API TTFB 0.44-0.91 s")
| Claim | Status |
|---|---|
| Median TTFB 0.44-0.91 s per endpoint, flat across payload sizes | **Reproduced as measured, but mis-interpreted.** `api-measure.sh` opens a **new connection per request**: DNS + TCP + TLS + request. The same machine now shows cold `/settings`: DNS 17 ms, connect 140 ms, TLS done 292 ms, TTFB 713 ms (median of 12; `raw/cold-connection-breakdown.csv`). The 0.44-0.91 s band is therefore mostly **handshake plus a slower cold-path wait**, not a per-request server floor. |
| No `Cache-Control`, `DYNAMIC` | **Reproduced** (`/health`, API 404 and settings all `cf-cache-status: DYNAMIC`, no `Cache-Control`). |
| Lab API durations of about 0.55-0.65 s in Lighthouse runs | **Reproduced as observed, but the harness inflates them** (see 3). |

## 2. Direct decomposition (warm connection, sequential, 1 request/s)
Same curl invocation reuses one TLS connection (`--next`), so DNS/connect/TLS are excluded. "Wait" = `time_starttransfer - time_pretransfer`. Batch A n=15 per target; batch B n=14 (round 1 dropped).

| Target | What it isolates | Status | Bytes | A: p50 / p95 / min (ms) | B: p50 / p95 / min (ms) |
|---|---|---|---|---|---|
| `/assets/vendor-react-*.js` | Cloudflare **edge HIT**; client<->edge floor | 200 | 17,837 | 131 / 187 / 112 | 158 / 373 / 107 |
| `/health` | Origin + Express, **no DB** (`app.ts:70`) | 200 | 51 | 235 / 450 / 174 | 254 / 1025 / 186 |
| `/api/v1/__nonexistent_probe` | Origin + Express + helmet/cors/body/rate-limit, 404, **no DB** | 404 | 49 | 181 / 249 / 155 | 234 / 407 / 177 |
| `/api/v1/settings` | 1 `findOne` | 200 | 2,154 | 199 / 245 / 160 | 243 / 354 / 165 |
| `/api/v1/categories` | `find` + `populate` | 200 | 919 | 179 / 256 / 165 | 230 / 342 / 177 |
| `/api/v1/content/TAGLINE` | `find` | 200 | 310 | n/a | 231 / 330 / 174 |
| `/api/v1/products?page=1&limit=20&...groupByColor` | 2 aggregations in parallel | 200 | 4,560 | n/a | 231 / 293 / 197 |
| `/api/v1/products?limit=300&groupByColor=true` | heavy aggregation + 50 KB wire / 440 KB JSON | 200 | 49.9-50.2 KB | 274 / 382 / 230 | 355 / 405 / 266 |

**Reading (measured):**
- Client<->edge floor about 130-160 ms. Origin hop + Express adds about 50-100 ms (`/health` and the API 404 are 181-254 ms).
- **DB-backed small endpoints are indistinguishable from the no-DB routes** (settings 199-243 vs 404 181-234 vs `/health` 235-254): single small Mongo queries cost at most tens of ms. MongoDB is **not** the floor for those.
- The only endpoint with a clear extra cost is the 300-product grouped list: +90 to +125 ms over settings (aggregation + serialization of 440 KB JSON). Which of the two is not separated.
- The 20-product list is as fast as settings (231 vs 243 ms): the aggregation itself is not slow at this size.
- Batch B is about 40-60 ms slower than A across the board (time-of-day drift), so differences below that are not interpretable. p95 reaches 1.0 s on a single `/health` call (outliers happen).

## 3. What actually adds the latency a browser sees
| Condition | Measured TTFB | Source |
|---|---|---|
| Cold connection (new TLS) | 713 ms median (292 ms handshake + 421 ms wait) | `raw/cold-connection-breakdown.csv`, n=12 |
| Warm connection, one request at a time | 180-250 ms wait | batches A/B |
| **6 requests at once on one warm HTTP/2 connection** (what a page does) | p50 416 ms, p95 636, range 175-640; the preceding `/health` took 311-484 ms | `raw/h2-multiplex-experiment.json`, n=30 |
| 6 requests at once on 6 new connections (HTTP/1.1 curl) | p50 523 ms, p95 838 | `raw/parallel-connection-experiment.csv` mode B, n=30 |

So a request's wait roughly doubles (about 200 -> about 420 ms) when several are in flight together, even though each is tiny. **Cause not established.** Candidate explanations, none verified: (a) Cloudflare opens additional origin connections for concurrent requests (extra origin TCP/TLS round trips); (b) Node single-process queueing or event-loop contention (PM2 `instances: 1`, fork); (c) per-request middleware cost (helmet, cors, body parsers, rate limiter) is small but serialised; (d) origin->MongoDB round trips queued on the connection pool.

**Harness implication:** the earlier lab runs proxied the API through a local Node server (`serve.js`) using `https.get`. Concurrent page requests each open a new upstream connection (keep-alive only helps sequential reuse), which reproduces the cold-connection regime (about 0.55-0.7 s). Real browsers multiplex on the connection already opened by the HTML request, so **lab API durations overstate real-world API latency by up to about 2x**. Relative A/B differences (request counts, ordering, bytes) remain valid; absolute API timings and "API wait" shares quoted in earlier reports should be treated as upper bounds. (Directly shown: cold vs warm numbers above; the proxy's behaviour is inferred from its code, not instrumented.)

## 4. Ranked hypotheses for the remaining server-side time
| # | Hypothesis | Evidence | Confidence |
|---|---|---|---|
| 1 | Client<->edge RTT (about 130 ms) plus edge->origin hop (about 50-100 ms) dominate small responses | edge HIT 131-158 ms; `/health` 235-254 ms | HIGH |
| 2 | Concurrency penalty (extra about 200 ms when 6 requests overlap) from origin connection setup and/or single-process queueing | h2 multiplex test, p50 416 | MEDIUM (effect HIGH, cause LOW) |
| 3 | Cold-connection handshake (about 300 ms) and a slower first/cold wait (about 420 ms) on first contact | cold test | HIGH for handshake, LOW for the wait component |
| 4 | Large list aggregation/serialization (+90-125 ms for 300 products) | products300 vs settings | MEDIUM |
| 5 | MongoDB round trips or pool queueing for small queries | not supported: settings about 404 about /health | LOW |
| 6 | Express middleware overhead beyond the 404-route cost | 404 route 181-234 ms already includes the whole stack | LOW (cannot separate edge->origin RTT from middleware without server timestamps) |

## 5. Measurement plan (what each layer needs)
| Layer | Available now | Needs |
|---|---|---|
| Browser TTFB | yes (Resource Timing, curl, Lighthouse) | - |
| Edge status / colo | `cf-cache-status`, `CF-RAY` headers | Cloudflare Analytics / Logs (Logpush) for edge time and origin response time (`OriginResponseDurationMs` in HTTP request logs) requires dashboard access, not available |
| Origin request duration | PM2 logs `logs/out.log` if request logging exists (none seen: no morgan/pino in `app.ts`) | Server-Timing + structured log (below), on staging |
| App vs DB vs serialization | no | Server-Timing marks around handler, Mongoose query, `res.json` |
| Pool queueing | no | `mongoose.connection.getClient().on('connectionCheckOutStarted'/...)` command-monitoring counters on staging |
| Residual | derived | `browser TTFB - (edge RTT estimate + origin duration)` |

## 6. Proposed staging-only `Server-Timing` (not applied)
- **Placement:** first middleware after `trust proxy`, before helmet (`app.ts:~34`), so the whole stack is inside the measure. Attach `res.locals.t0 = process.hrtime.bigint()` and a per-request id (`crypto.randomUUID()` or accept Cloudflare's `CF-Ray`).
- **Marks:** `app` (t0 -> handler start), `db` (sum of Mongoose op durations via a schema plugin or `mongoose.set('debug', fn)` replaced by a command-monitoring listener summing `commandSucceeded.duration` per request id using AsyncLocalStorage), `ser` (JSON.stringify duration inside `sendSuccess`, `utils/response.ts`), `tot` (t0 -> `res.on('finish')`; headers are set on `writeHead` so `tot` is only logged, not sent).
- **Header (staging only, gated by `NODE_ENV!=='production'` or an `X-Debug-Timing` token compared in constant time):** `Server-Timing: app;dur=3.1, db;dur=41.8, ser;dur=2.4` plus `X-Request-Id`. No query text, collection names, filters, or user data in the header.
- **Logs:** one JSON line per request: `{id, cfRay, method, route (pattern, not raw URL), status, app, db, dbOps, ser, tot, bytes, cache}`; correlate by `cfRay`/`id` with browser Resource Timing (`serverTiming` entries are visible via `performance.getEntriesByType('resource')`).
- **Overhead:** one hrtime call + a few additions per request (microseconds); do not enable Mongoose debug printing.
- **Experiment protocol (staging, 60 s per cell):** endpoints settings, categories, content/TAGLINE, products list (20), products/:id, products 300; each at concurrency 1 and 6; n >= 200 per cell; cold/warm connection; report median/p95 for `app`, `db`, `ser`, `tot` and browser TTFB; add an authenticated endpoint (`/auth/me`) with a staging test user. Also a `/health` cell (no DB) as the control. Required prerequisites: staging URL + database copy, admin/test credentials, permission for load up to the stated concurrency.

## 7. Endpoint timing table for this audit (production, public, warm connection)
See section 2 (counts, status, bytes, p50/p95/min). Cache state for all: `DYNAMIC`/no directive. Authenticated endpoint: **not measured** (no safe test credentials; do not use customer/admin tokens).

## 8. Commands (reproducible)
`bash`-style, from `reports/performance/api-latency/`: the loop in section 2 builds one curl command per round with `--next`, e.g. `curl -s -o /dev/null -w '...' URL1 --next -s -o /dev/null -w '...' URL2`; cold test: 12 separate `curl -w '%{time_namelookup},%{time_connect},%{time_appconnect},%{time_starttransfer}' https://v2enterprise.in/api/v1/settings`; h2 test: `node /tmp/h2probe.js` (Node `http2` client, 5 sessions x (1 warm `/health` + 6 parallel GETs); script saved as `raw/h2probe.js`).
