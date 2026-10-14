# Endpoint cache matrix

Observed (production, 2026-10-14): **no** API route sets `Cache-Control` or `Vary`; Express's default weak ETag is present; `cf-cache-status: DYNAMIC` on every API response tested (settings, categories, products, content, `/health`, 404). Cloudflare does not cache JSON by default and no cache rule is known to exist (dashboard not accessible). File:line refs are under `backend/src/modules/` unless noted; routes verified by grep this session.

## Ownership vocabulary
- **Browser cache**: `Cache-Control: max-age` sent by the origin; works with no Cloudflare configuration; per-visitor; cannot be purged.
- **Cloudflare edge cache**: needs `s-maxage`/`Edge TTL` honoured by a **Cache Rule** (Cloudflare ignores `Cache-Control` for JSON unless a rule marks the path "eligible for cache"). That is a Cloudflare configuration change, separate from any origin header. Shared across all users, purgeable.
- **App cache**: in-process Map in the single PM2 fork instance (`ecosystem.config.js`: `instances: 1`); lost on restart; invisible to a future Next.js server.

## Public read endpoints
| Route (file:line) | Data / source | Varies by auth/cookie/query/user? | Volatility and stale-data consequence | Recommended | Max staleness | Invalidation trigger | Risks |
|---|---|---|---|---|---|---|---|
| `GET /settings` (`settings/settings.routes.ts:10`) | 1 `SiteSettings` doc | No (public). Axios sends `Authorization` if logged in but the handler ignores it | Low; stale logo/contact text/grid columns: cosmetic | **Browser `max-age=60, stale-while-revalidate=300`** now; edge after rule + purge | 60 s (browser), 300 s (edge) | `PATCH /settings` (`:19`) | None found (no secrets in fields grepped) |
| `GET /categories` (`categories/categories.routes.ts:10`) | `Category.find().populate('parentId')` | No | Low-medium; stale category tree: wrong nav, missing new category | Browser 60 s; edge later | 60-300 s | POST/PATCH/DELETE (`:17,24,31`) | Returns **INACTIVE categories** publicly (model has `status`; sitemap filters it); fix before sharing |
| `GET /filters/suggestions` (`filters/filters.routes.ts:8`) | `FilterSuggestion.findOne()`; **creates the doc if missing** (write on GET) | No | Low; stale option list | Browser 300 s | 300 s | async after product writes (`products.service.ts:209,249,262`) | Write-on-read race on cold DB; cache only after that is removed or ignore |
| `GET /content/:type` (`settings/content.routes.ts:10`) | `Content.find({type, status:'ACTIVE'})` | No (admin variant is a different path `/content/admin/:type:22`) | Low-medium; stale marquee/tagline/lookbook | Browser 60 s | 60 s | content POST/PATCH/DELETE (`:34,44,55`) | Unpublish must disappear within TTL |
| `GET /sliders/hero` (`settings/sliders.routes.ts:11`) | `HeroSlide.find(active)` | No | Medium: stale hero after unpublish shows a retired campaign | Browser 60 s | 60 s | hero POST/PATCH/DELETE (`:44,52,61`) | Status regex means no index; fine at size |
| `GET /sliders/promotional` (`:24`) | `Slider.find` (+ unused marquee query) | No | Same | Browser 60 s | 60 s | promo POST/PATCH/DELETE (`:70,78,87`) | |
| `GET /reviews/homepage` (`reviews/reviews.routes.ts:29`) | ACTIVE + homepageVisible, populate product name/photo | No (PII stripped by `toPublicReview`) | Low-medium; moderation lag | Browser 120 s | 120-300 s | review POST/PATCH/DELETE (`:48,87,98`); product name/photo edits | Unbounded query |
| `GET /reviews/product/:id` (`:18`) | ACTIVE reviews of one product | No | Medium: user expects own review to appear immediately | **None** (or browser 0-60 s with refetch on submit) | 0-60 s | review writes | per-user surprise |
| `GET /attributes` (`attributes/attributes.routes.ts:14`) | active definitions | No (`/attributes/all:24` is admin) | Low | Browser 300 s | 300 s | attribute writes (`:34,44,54`) | |
| `GET /sitemap.xml`, `/robots.txt` (`sitemap/sitemap.routes.ts:6-7`) | built per request from Product/Category | No | Low | Edge 1 h (SEO crawlers) | 1 h | product/category writes | rebuilt every request today |
| `GET /health` (`app.ts:70`) | none | No | n/a | `no-store` | 0 | - | useful as latency control |

## Products (explicitly excluded from the first caching experiment)
| Route | Behaviour | Why excluded |
|---|---|---|
| `GET /products` (`products/products.routes.ts:8`; `products.controller.ts:38-98`) | List, `limit` clamp 1..500, `status` param, `groupByColor` aggregation. **Output depends on the Authorization header**: `resolveListStatus` (`:11-20`) honours `status=ALL|INACTIVE` only for a valid ADMIN JWT; everyone else gets ACTIVE. The cache key (URL) does not contain the token. | (A) Shared cache poisoning/leak: if Cloudflare/any shared cache stores the admin response for `/products?status=ALL`, anonymous users requesting the same URL get INACTIVE products; conversely an admin could be served the public list and think inactive items vanished. Browser caches are per user, so they are not affected; a CDN is. (B) price/discount/quantity/status share the response; `groupByColor` takes price/quantity from the first row of a group. (C) non-grouped path ignores `sort` (`products.service.ts:152`). |
| `GET /products/:id` (`:9`; `products.service.ts:164-203`) | `findById` (+ fallback `findOne`) + siblings query. **No status check**: INACTIVE products are returned to anyone; only siblings are filtered to ACTIVE. | Access-control defect (section D below). Never cache until fixed. |

### A. `/products?status=ALL` in detail
`resolveListStatus(req.headers.authorization, req.query.status)`: if `status` is not `ALL|INACTIVE|ACTIVE` -> `ACTIVE`; if the Bearer token verifies (`verifyToken`) and `role === 'ADMIN'` -> the requested status; any failure/no header -> `ACTIVE`. Covered by `backend/test/audit-fixes.test.ts` (F-03). The admin UI calls it with `status:'ALL'` (`frontend/hooks/useAdminData.ts:89`) and the axios interceptor attaches the token to **every** request including public ones (`frontend/lib/apiClient.ts:47-53`). No `Vary: Authorization` is sent, and Cloudflare largely ignores `Vary` except `Accept-Encoding`.
**Recommended separation (not implemented):** (1) move admin listing to `GET /api/v1/admin/products` (already behind `protect, adminOnly`) with `Cache-Control: private, no-store`; (2) make the public route ignore `status` entirely; (3) add a Cloudflare rule "bypass cache if `Authorization` header present or path starts `/api/v1/admin`"; (4) add a regression test asserting the public route never returns INACTIVE, with and without an admin token.

### B. Price and inventory
Keep `GET /products*` uncached (class: dynamic) until: payment amount is recomputed server-side, stock decrement works, and an explicit staleness tolerance exists. Consequences of staleness: displayed price != charged price (the order total uses the DB price, `orders.service.ts:40-68`, but the Razorpay charge uses the client amount, see security section), customers may add out-of-stock SKUs (no stock check at order time), oversell. A later "live price" mini-endpoint (`/products/:id/live`, `no-cache`/30 s) is the least risky way to cache the rest of the product.

### D. Inactive products
Verified by reading `getProductByIdService`: `Product.findById(id)` then `toObject`; the only `status: 'ACTIVE'` filter is on the siblings `find`. Order creation re-checks ACTIVE so they cannot be bought, but the data (including price) is public. Not dynamically exercised (would require a known INACTIVE product id and is production read of unpublished data; not done).

## Authenticated / private (never shared-cacheable; `Cache-Control: private, no-store`)
| Route | Notes |
|---|---|
| `GET /auth/me` (`auth/auth.routes.ts:11`), `PATCH /auth/me` (`:12`) | profile + wishlist + addresses in one object |
| `GET /orders/my` (`orders/orders.routes.ts:18`), `POST /orders` (`:10`) | customer orders; `POST` is a write |
| `GET /wishlist` (`wishlist/wishlist.routes.ts:9`), POST/DELETE | uses `protect` (router-level) |
| `/addresses/*` (`addresses/addresses.routes.ts:8-13`) | `router.use(protect)` |
| `POST /payments/create-order` (`payments/payments.routes.ts:8`) | authenticated; **amount from client** |
| `POST /auth/login|register|forgot-password|reset-password/:token` | never cache |

## Administrative (`protect, adminOnly`; `private, no-store`; Cloudflare bypass `/api/v1/admin/*` and any `Authorization` request)
`GET /orders` (`orders.routes.ts:26`), `PATCH /orders/:id/status` (`:35`), `DELETE /orders/:id` (`:43`), `GET /reviews` (`reviews.routes.ts:67`), `GET/PATCH /contacts` (`contacts.routes.ts:23,32`), `/admin/stats|customers|media|upload*` (`admin/admin.routes.ts:38,193,214,249,293,333`), `GET /attributes/all` (`attributes.routes.ts:24`), `GET /content/admin/:type` (`content.routes.ts:22`), and all POST/PATCH/DELETE listed above.

## Evaluation of the proposed 60-second browser cache
- **Safe for**: settings, categories, content/*, sliders/*, filters, attributes (public, no per-user variance, low volatility), **after** the INACTIVE-category leak is decided (browser cache does not leak across users, but a later edge cache would).
- **Effect:** removes repeat requests on SPA navigation and repeat visits within 60 s (e.g. Home -> Shop re-fetches categories, filters, content today); **no effect on a cold first load** (the LCP-relevant case) and no effect on the product requests that dominate the page.
- **CMS freshness:** an admin edit is visible to a given visitor within <= 60 s (plus `stale-while-revalidate` window: with `swr=300` the visitor may see content up to 60+300 s old once; choose `swr` consciously, or omit it for hero/promo where unpublishing matters). An admin editing the CMS sees stale data in their own browser for up to 60 s unless the admin UI bypasses the cache (`cache: 'no-store'` fetches for admin screens or `Cache-Control: no-cache` on admin paths; the admin uses different paths for list-all variants but **verified**: `components/AdminDashboard.tsx:372-375` loads hero, promotional, settings and categories from the same public GETs, so an admin reload after saving could show a stale list for up to the TTL unless those calls bypass the cache).
- **Not a Cloudflare rule:** adding `max-age` changes nothing at the edge; edge caching additionally needs a Cache Rule (cache eligibility + Edge TTL/respect origin), purge-by-URL/tag integration and bypass conditions. That is a production configuration change requiring separate authorization.
