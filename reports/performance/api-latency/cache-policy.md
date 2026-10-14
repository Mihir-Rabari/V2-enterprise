# Endpoint cache policy (proposal; nothing here is deployed)

Evidence: [request-inventory.csv](request-inventory.csv), [api-performance.csv](api-performance.csv), [payload-audit.csv](payload-audit.csv); code references from the static audits (backend `app.ts:78,142,150`, `products.controller.ts:11-20,38-98`, `products.service.ts:33-203`, `settings.routes.ts`, `content.routes.ts`, `sliders.routes.ts`, `categories.service.ts`, `reviews.routes.ts`, frontend `lib/apiClient.ts:47-53`).

## Measured current state (production, 15 public GETs x 5, `api-performance.csv`)
- **No API response carries `Cache-Control`; every one is `cf-cache-status: DYNAMIC`.** All have a weak ETag (Express default). Cloudflare compresses (brotli); the Express app does not use `compression`.
- Time to first byte is 0.44-0.91 s median per endpoint **regardless of payload or query complexity** (2 KB `/settings` 914 ms vs 440 KB-decoded `limit=300` list 832 ms). That points to a per-request floor (origin round trip + app overhead) rather than database work; it is not proven which part (no server-side timing available). The static HTML from the same machine/edge answers in 0.12-0.48 s.
- Auth interplay: the axios interceptor sends `Authorization` on every request including public GETs (`apiClient.ts:47-53`), and `GET /products?status=ALL|INACTIVE` returns different data for an admin token on the same URL (`products.controller.ts:11-20`).

## Classes
1 dynamic / no-store · 2 in-page-load memory dedupe · 3 browser HTTP cache (short, revalidate) · 4 Cloudflare edge `s-maxage` (needs a Cloudflare cache rule = production config change) · 5 in-process server cache (single PM2 fork instance, `ecosystem.config.js`) · 6 future ISR.

| Endpoint | Data | Freshness need | Recommended class / TTL | Notes / blockers |
|---|---|---|---|---|
| `GET /settings` | logo, contact, grid columns, about copy | minutes-hours | **2 now (done: one fetch per page load via `SettingsContext`)**; later 3: `max-age=60, stale-while-revalidate=300` | Singleton doc; CMS PATCH invalidates (see invalidation design) |
| `GET /categories` | tree, images, parent | hours | 2 (dedupe across Home/Shop/Subcategories) then 3 `max-age=300, swr=600` | Returns INACTIVE categories publicly (model has `status`); fix before edge caching |
| `GET /filters/suggestions` | distinct attribute values | hours | 3 `max-age=300, swr=900`; 5 optional | Updated asynchronously after product writes; GET creates doc if missing (write on read) |
| `GET /content/:type` (TAGLINE, FEATURE_ITEM, MARQUEE, LOOKBOOK_ITEM) | ACTIVE content | minutes | 3 `max-age=60, swr=300` | |
| `GET /sliders/hero`, `/sliders/promotional` | slides | minutes | 3 `max-age=60, swr=300` | promotional runs an unused marquee query (`sliders.routes.ts:26`) |
| `GET /reviews/homepage` | ACTIVE homepage reviews | tens of minutes | 3 `max-age=120, swr=600` | unbounded find, no limit |
| `GET /reviews/product/:id` | ACTIVE reviews | minutes | 1 (refetch after submit) or 3 `max-age=60` | |
| `GET /products` (public, status ACTIVE) | **mixed**: text/images stable; `price`, `discount`, `quantity`, `status` freshness-sensitive in the same object | price/stock: minutes | **1 now.** Later 3/4 `s-maxage=60, swr=300` only after the blockers below | Blockers: (a) admin `status` variants share the URL, so any shared cache must bypass on `Authorization` or on `status` (or admin moves to `/admin/products`); (b) `groupByColor` merges price/quantity from the first row; (c) non-grouped path ignores `sort` (`products.service.ts:152`) |
| `GET /products/:id` | full product + `siblings` (price, quantity) | price/stock: minutes | **1 now.** Later 4 `s-maxage=30-60, swr=300` | Blockers: serves INACTIVE products publicly (`products.service.ts:164-203`); siblings change when another SKU is edited |
| `GET /auth/me`, `/orders/my`, `/wishlist`, cart, checkout, addresses | private | exact | **1 `private, no-store`** | never in a shared cache |
| `GET /orders`, `/reviews` (admin), `/contacts`, `/admin/*`, `/attributes/all`, `/content/admin/:type` | admin/PII | exact | **1 `private, no-store`**; Cloudflare must bypass `/api/v1/admin/*` and any request with `Authorization` | |
| `POST/PATCH/DELETE *` | writes | - | never cached | |

## Why not cache product price/stock aggressively
- Order creation re-reads price from the DB (`orders.service.ts:40-68`), so a stale storefront price cannot change the **order** total...
- ...but `POST /payments/create-order` takes `amount` from the client (`payments.controller.ts:7-13`) and the server never compares it with the order total. A stale or tampered amount is therefore charged. This pre-existing gap makes a short TTL (<= 60 s) the maximum acceptable for any price-bearing response and should be fixed independently (security/correctness, out of scope here).
- Inventory decrement does not currently take effect (`orders.service.ts:130-137` updates a `variants.$` path that is not in the schema), so `quantity` is only changed by admin edits today; this changes the staleness risk once that is fixed.

## What was implemented (frontend only; no new cache layer)
Class 2 request sharing for `/settings`, and removal of one wasted `/products` request on category routes, and a flattened Home request waterfall (see [validation.md](validation.md)). No browser-HTTP, Cloudflare, server-side or ISR caching was added: end-to-end validation of backend headers needs a staging backend + database and a Cloudflare rule, neither available without touching production.

## Next.js + ISR
Product pages and category pages would be the ISR candidates (the Express SPA fallback already performs a per-request DB read to inject meta tags, `app.ts:148-223`). Evidence still missing: a measured share of PDP LCP attributable to client rendering + API wait on a *real* network (field data) and the price-staleness tolerance for product pages. See [optimization-roadmap.md](optimization-roadmap.md).
