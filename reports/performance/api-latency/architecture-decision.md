# Architecture decision: Next.js / ISR / caching / staying on Vite

**Decision gate result: the current evidence does not justify starting a Next.js migration for performance reasons. It supports (1) fixing the security/correctness blockers, (2) measuring server-side timing on staging, (3) short browser caching of public CMS endpoints, and (4) targeted frontend fixes. ISR becomes reasonable for specific page classes only if the gates below are met.**

## What the evidence supports
- API wait on a warm connection is 180-250 ms, of which about 130-160 ms is client<->edge RTT (measured via an edge-HIT asset) and about 50-100 ms is origin hop + Express; small DB queries add approximately nothing (`api-timing-forensics.md` section 2). The previously reported "0.44-0.91 s floor" was mostly cold-connection handshake. Server rendering cannot remove client<->edge RTT or the need to fetch data; it moves the fetch to the server (near the origin, so fewer round trips).
- PDP LCP in earlier audits was bound by bandwidth contention, JS boot and image size, not by the API (starting the API fetch earlier did not move LCP; deferring secondary images did). Third-party scripts (Meta, GTM) and fonts compete for bandwidth regardless of framework.
- Home LCP is the 1080p hero video; framework-independent.
- Concurrency (6 parallel requests) roughly doubles per-request wait (p50 416 ms vs about 200 ms); server rendering that collapses N client requests into one HTML response would help this specific cost, but a **single bootstrap endpoint** or HTTP caching achieves part of it with far less change (hypothesis, untested).

## What remains unknown
1. Server-side breakdown (app/db/serialization/origin hop) and the cause of the concurrency penalty: needs staging `Server-Timing`.
2. Real-user (field) LCP/TTFB distributions; lab throttling is not field data.
3. Cloudflare plan/config (cache rules, Argo, tunnel vs direct origin), origin region relative to Cloudflare colos and to MongoDB.
4. Business tolerance for stale price/stock and for CMS publication delay.
5. Whether crawlers/SEO depend on server-rendered HTML (the Express SPA fallback already injects meta for `/product/:id` and categories, `app.ts:148-223`).

## Per page class (strategy under consideration, not a recommendation to migrate)
| Class | Candidate strategy | Freshness | Cache owner | Invalidation | Limitations / gate |
|---|---|---|---|---|---|
| Public stable CMS (home sections, hero, footer, settings, content) | Keep Vite + browser TTL 60 s now; later SSG/ISR `revalidate` 60-300 s with tags | minutes | browser (now), Next data cache (later) | TTL; later signed tag event | Gate: staging data showing server fetch removes >= X ms of LCP/FCP vs TTL caching |
| Public product & category pages | ISR (`revalidate` 60-300 s) + on-demand `product:<id>`, `product-list`, `categories` | minutes for text/images | Next (+ optionally Cloudflare) | admin write -> signed revalidate call | **Blockers:** inactive-product exposure fixed; category rename cascade; siblings change with any SKU; per-page HTML must not embed price/stock |
| Volatile price / inventory | Dynamic: client fetch `no-store`/30 s `GET /products/:id/live`, or request-time render | seconds | none/browser | n/a | Requires server-side payment amount recompute and working stock decrement first |
| Search & filtered listings | Request-time (dynamic) or client-side fetch; not ISR (unbounded key space) | per request | none | n/a | `limit=300`/regex search cost; server-side filtering needed |
| Authenticated account, wishlist | Dynamic, client or request-time, `private, no-store` | exact | none | n/a | JWT currently in localStorage (not readable by a Next server): moving to server rendering needs cookie sessions (security redesign) |
| Cart, checkout, payment | Dynamic, client | exact | none | n/a | Razorpay amount must be server-derived; keep out of any shared cache |
| Admin CMS | Keep SPA (Vite) behind login; no SEO value | exact | none | n/a | Admin reads of public endpoints must bypass caches |

## Decision gates (all must be answered with data before committing to Next.js)
1. **G1 Staging `Server-Timing` results:** if origin/app time is < 30% of browser TTFB, server rendering will not fix latency; look at edge/geography first (Argo/Smart Placement/origin region).
2. **G2 Cache experiment:** measure browser-TTL + (authorized) Cloudflare cache rule on settings/categories/content/sliders/filters in staging; if repeat-navigation and warm-visit LCP gains are enough, ISR for those is unnecessary.
3. **G3 PDP/Category prototype on real network:** a minimal SSR/ISR product page vs the current Vite page, same CDN images, WebPageTest/field-like throttling, 20+ runs; require a material LCP gain (suggest >= 15% median with non-overlapping ranges) after third-party and font parity.
4. **G4 Security prerequisites closed:** inactive-product exposure, payment amount, admin separation, stock decrement.
5. **G5 Auth plan:** cookie-based session design if any authenticated page is server-rendered.
6. **G6 SEO need confirmed** (Search Console data: are product pages indexed by the meta-injection fallback?).

Until G1-G4 are met, continue on Vite. Not recommended: a blanket static or blanket dynamic strategy.
