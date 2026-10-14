# Executive summary: API latency and data fetching

State: branch `perf/pdp-responsive-images`, HEAD `68984e7`, nothing committed/pushed/deployed. Uncommitted: your PDP image work (`ProductDetails.tsx`), the separate GTM deferral (`index.html`), and this task's frontend changes (`raw/api-changes.patch`). No production writes; production reads were bounded (15 public GETs x 5 plus Lighthouse through a read-only local proxy).

## Proven findings
1. **Every API call has a 0.44-0.91 s median TTFB floor regardless of payload** ([payload-audit.csv](payload-audit.csv)): 2 KB `/settings` 914 ms vs 440 KB-decoded `limit=300` list 832 ms. Nothing is cached anywhere: no `Cache-Control`, all `cf-cache-status: DYNAMIC`. Whether the floor is origin distance or app overhead is **not proven** (no server-side timing available); it is not database-shaped.
2. **Duplicate/wasted requests** ([duplicate-requests.csv](duplicate-requests.csv)): `/settings` fetched twice on Shop and category pages (SettingsProvider + page-local fetch; same pattern in 5 pages); category routes send an **unfiltered `/products` request first and a second one after `/categories` arrives** (2 per navigation); Home starts 5 independent requests only after hero + categories finish (a waterfall of about 0.8 s).
3. **Oversized**: Home `products?limit=300&groupByColor=true` = 440 KB decoded / 50 KB wire, 0.83-1.08 s, and shows only 300 of 436 grouped products, so Essentials search/filters already miss 136 products. Not changed (needs server-side filtering to do correctly).
4. **Functional bug confirmed**: `/mens/tshirt` (slug) sent the same unfiltered query as `/shop` (case-sensitive name match on `'tshirt'` vs `'TSHIRT'`). In-app links use exact names (`/MENS/TSHIRT`) so they worked, but slug URLs showed every product.

## Changes (frontend only, one cache class: in-page-load sharing; no new cache layer)
| # | Change | Files |
|---|---|---|
| C1 | Shop, SubCategories, Categories, Contact, Login read settings from the existing `SettingsContext` instead of fetching `/settings` again | `pages/Shop.tsx`, `SubCategories.tsx`, `Categories.tsx`, `Contact.tsx`, `Login.tsx` |
| C2 | Shop: category lookup is case-insensitive; on `/:category/:subcategory` the first product request is already filtered, so it runs in parallel with `/categories` instead of before it (and is not repeated) | `pages/Shop.tsx` |
| C3 | Home: the 5 secondary requests start together with hero/categories instead of after them | `pages/Home.tsx` |

## Results (DevTools throttling, local build, production API proxied; 5 paired runs each; [before-after.csv](before-after.csv), [validation.md](validation.md))
| Page | Metric | Before | After |
|---|---|---|---|
| Category `/MENS/TSHIRT` | API requests / `/products` requests | 8 / 2 | 6 / 1 |
| | LCP | 11.43 s (11.05-11.62) | 9.58 s (8.85-9.83) = -16% |
| | total / image bytes | 1.90 / 1.13 MB | 1.34 / 0.58 MB (-30% / -49%) |
| | CLS | 0.2435 | 0.0001 |
| | Lighthouse score | 27 | 41 |
| Shop | API requests / `/settings` | 7 / 2 | 6 / 1; API bytes 14.1 -> 11.6 KB |
| | LCP | 10.07 s | 10.35 s (no change; ranges overlap) |
| Home | last API response completes | 6.44 s (5.64-6.57) | 5.67 s (5.52-5.78) = -12% |
| | LCP | 10.76 s | 10.87 s (no change; hero video) |
| PDP (3 photos) | LCP / requests | 6.92 s / 6 | 6.89 s / 6 (no regression) |

The Category gain is mostly C2: the filtered page no longer loads a wrong first page of 20 products (and its images) and then swaps it. C1 removes 1 request / 2.7 KB per page but does not move LCP. C3 shortens the Home request chain; LCP stays video-bound. I could not attribute the Category gain between C1 and C2 separately (the 4-variant ladder run was cut for time); C1 cannot cause a change in products requests.

## Verification
`tsc` clean, production `vite build` OK, frontend media tests 6/6, backend tests 9/9. In-browser check on the final build: `/mens/tshirt` now issues one `products?...&subCategories[]=tshirt` request and lists only T-shirts; one `/settings`.

## Not done / not proven
No backend/edge caching was implemented (needs staging backend + DB and a Cloudflare rule). Unverified: admin CMS edit visibility, cart/checkout, auth flows, hyphenated category slugs (`/mens/co-ord-set` still cannot map to `CO-ORD SET`), real-device behaviour.

## Remaining bottlenecks (ranked)
1. Per-request API floor and zero caching (HIGH confidence it exists, cause unproven). 2. Home 300-product payload and client-side filtering. 3. PDP chain (JS boot, product API, bandwidth contention; see earlier audits). 4. Meta Pixel.

## Pre-existing security/correctness issues found (out of scope, should be handled)
`GET /products/:id` returns INACTIVE products to the public; `POST /payments/create-order` trusts the client-supplied amount; `GET /products?status=ALL` differs by admin token on the same URL (blocks shared caching); stock decrement path does not match the schema. Details in [root-cause-register.md](root-cause-register.md).

## Next.js + ISR?
Not yet justified by evidence. Missing: server-side timing to show where the 0.4-0.9 s goes (if it is origin RTT, a CDN rule or moving the API next to Cloudflare may beat ISR), field LCP data, and an agreed price-staleness tolerance. Recommended next task: add `Server-Timing` instrumentation on staging and test short browser/edge caching for the public CMS endpoints (settings, categories, content, sliders, filters) with a Cloudflare cache rule.
