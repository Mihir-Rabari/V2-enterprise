# Executive summary v2: API latency forensics and cache readiness

Audit window 2026-10-14 10:27-10:50 UTC. Repository state: branch `perf/pdp-responsive-images`, HEAD `68984e78b78799f33b06b439b24ee2ee07278ddf` (matches the starting commit), index empty, 8 modified frontend files + untracked `reports/performance/`. No application file was modified, nothing committed/pushed/stashed/deployed; production access was bounded read-only GETs (about 330, one client, 1 s apart; no auth, no writes, no load test). Only new files were added under `reports/performance/api-latency/`.

## The big correction
The earlier headline "API TTFB floor 0.44-0.91 s regardless of payload" was a **measurement artifact of cold connections**, not a server floor.
- Cold connection to `/settings`: 713 ms median (DNS 17, connect 140, TLS done 292, then 421 wait), n=12.
- Warm connection, one request at a time: **180-250 ms** wait for every small endpoint, including `/health` (no DB, 235-254 ms) and a 404 route (181-234 ms); the Cloudflare edge-HIT asset gives a client<->edge floor of 131-158 ms. DB-backed small endpoints are indistinguishable from the no-DB routes. Only the 300-product grouped list adds about 90-125 ms. (Directly measured; `api-timing-forensics.md`.)
- A page-like burst (6 parallel requests on one HTTP/2 connection) has p50 416 ms (175-640): a real concurrency penalty of about +200 ms whose cause is **unknown** (origin connection setup, Node queueing, or pool), needing staging `Server-Timing`.
- The lab harness's proxy makes concurrent upstream connections, so lab API durations of 0.55-0.7 s overstate production; request-count/ordering results (Category 2 -> 1 product requests, Shop/Category `/settings` 2 -> 1, Home waterfall) remain valid.

## Evidence classification
| Class | Items |
|---|---|
| Directly reproduced here | no `Cache-Control`, all `DYNAMIC`; cold vs warm latency; no-DB vs DB endpoints; concurrency penalty; `/mens/tshirt` filtered request and single `/settings`; **`/mens/co-ord-set` ends unfiltered (all products)** |
| Verified by code reading | admin-dependent `/products` output; `GET /products/:id` serves INACTIVE; client-controlled payment amount; stock decrement on a non-existent field; category writes do not cascade; admin UI reuses public GETs |
| Reported earlier, not re-run | Category LCP 11.4 -> 9.6 s, bytes -30%, Home waterfall 6.44 -> 5.67 s, Shop LCP unchanged (5 paired runs each; request counts consistent with what I saw) |
| Hypotheses needing instrumentation | cause of the concurrency penalty; origin share of TTFB; DB vs serialization cost of the large list |

## Top three actions
1. **Close the security/correctness blockers (S1-S4)**, separate from performance: hide inactive products from `GET /products/:id`, compute/verify the Razorpay amount server-side, split admin product listing, make stock decrement real. These also unblock any shared caching. (staging access for tests)
2. **Instrument staging with `Server-Timing` + request log** (P1) and rerun the same endpoints at concurrency 1 and 6 to find where the +200 ms concurrency cost and the 50-100 ms origin hop come from. (staging + test accounts)
3. **Ship browser-TTL caching (60 s) for the public CMS endpoints with an admin read bypass** (P2) and prove the warm-visit benefit; hold the Cloudflare rule (P7) until P1/P2 data justify it (Cloudflare change needs explicit authorization).

## Quantified benefits supported by evidence
Request reductions already in the working tree (Category products 2 -> 1; `/settings` 2 -> 1; Home secondary requests start about 0.8 s earlier) and the reported Category LCP -16% (lab). **No benefit is claimed for caching or Next.js**: cold-load API wait is about 0.2 s warm, so HTTP caching helps repeat navigation, not first LCP; PDP/Home LCP are bound by media, bandwidth contention and JS (earlier audits).

## Remaining uncertainty and required access
Server-side timing and Cloudflare analytics (origin response duration, cache rules, plan, origin region); authenticated endpoint timings; field (RUM) data; product-owner tolerance for stale price/stock and CMS publish delay; GTM Preview validation; dynamic confirmation of S1-S4 on staging.

## Next.js / ISR
Not justified yet (gates G1-G6 in `architecture-decision.md`). Different page classes need different strategies; none is recommended wholesale.

## Companion reports
`api-timing-forensics.md`, `endpoint-cache-matrix.md`, `cache-invalidation-design-v2.md` (the required `cache-invalidation-design.md` already existed and was not overwritten), `frontend-regression-review.md`, `architecture-decision.md`, `remediation-roadmap.md`.

## Confirmation
No application code, production data, deployment, Git history or existing working-tree change was modified; `git diff` hash before/after: see end-of-audit check below.
