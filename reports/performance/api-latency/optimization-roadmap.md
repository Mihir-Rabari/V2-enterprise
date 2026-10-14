# Optimization roadmap (not implemented unless marked)

## Done in working tree (uncommitted)
C1 shared settings, C2 category fetch fix, C3 Home waterfall. See [validation.md](validation.md).

## P0: correctness/security blockers (independent of performance)
1. `GET /products/:id`: 404 for non-ACTIVE to public callers (AP-09). Test: unit test with INACTIVE fixture.
2. `POST /payments/create-order`: compute/compare amount server-side (AP-10).
3. Admin product listing on a separate path or `private, no-store` (AP-11).

## P1: evidence needed first, then low-risk wins
1. **Server-side timing on staging** (`Server-Timing` or request log with route, DB time, total) to split the 0.4-0.9 s floor: network/origin vs middleware vs Mongo. Success: a breakdown for the 15 endpoints. Decides whether caching, a closer origin, or query work matters.
2. **Browser HTTP caching for public CMS endpoints** (`settings`, `categories`, `content/*`, `sliders/*`, `filters/suggestions`): `Cache-Control: public, max-age=60, stale-while-revalidate=300` (+ ETag already). Needs staging backend; validate with warm-cache A/B and CMS-edit visibility test. Expected: removes repeat-navigation requests (Home -> Shop re-fetches categories/filters/content today); no effect on cold LCP.
3. **Cloudflare cache rule** for the same endpoints with `s-maxage` and purge-on-write per [cache-invalidation-design.md](cache-invalidation-design.md); bypass on `Authorization` and `/api/v1/admin/*`. Production config change: needs explicit sign-off.
4. Tiny in-memory dedupe in the API client for GET `/categories`, `/filters/suggestions`, `/content/:type` across SPA navigations (class 2, 60 s TTL) if P1-2 is not adopted.

## P2
1. Home Essentials: server-side filter/search/sort with `limit` 12-24 instead of 300 truncated client-side (changes UX semantics: needs product-owner decision).
2. `/products`: projection for list responses (omit `description`, `materialCare`, `videoUrls` etc.), `.lean()`, honour `sort` on the non-grouped path, `allowDiskUse`/early `$sort`+`$limit` in grouped path. Prove with `explain()` before indexes.
3. Remove the unused query in `/sliders/promotional`, bound `/reviews/*`, `/reviews/homepage` limit.
4. PDP: reviews effect keyed on `product.id`, QuickView/PDP fetch dedupe; AbortController in `useProducts`.
5. About page: reuse `SettingsContext`.

## P3
Slug-aware category filtering (`categorySlug` param or slug in category list used for mapping), bundle layout requests (tagline + feature items) into one bootstrap endpoint, Next.js + ISR evaluation (see executive summary for missing evidence), compression middleware only if traffic bypasses Cloudflare.

## Validation plan
Same harness (paired, rotated, DevTools throttling, 5+ runs); endpoint-level: request counts, TTFB median/range, cache status on repeat; page-level: LCP subparts, TBT, CLS, bytes. Functional: CMS edit visible within TTL, category filters, pagination, cart/checkout, auth isolation (needs staging).
