# API Inventory

Source: `backend/src/app.ts` (mounts), each `*.routes.ts`, frontend `frontend/lib/apiClient.ts`. Line numbers refer to commit `cd6a495`. All routes are under `/api/v1` unless noted. Auth: **P** = public, **U** = `protect` (any logged-in user, role re-read from DB), **A** = `protect + adminOnly`. Collections touched are from the Mongoose models. No route has rate limiting, request-ID logging, or `Cache-Control` (all observed `cf-cache-status: DYNAMIC`). There were no automated tests before the audit branch (`backend/test/audit-fixes.test.ts` covers only audit fixes).

| Method & path | Auth | Handler | Collections / external | Input validation | Notes (size/latency = single/10-sample lab measurements from one HKG vantage, see main report) |
|---|---|---|---|---|---|
| POST `/auth/register` | P | auth.service `registerService` | users | zod (`auth.schema.ts`); `adminCode` equal to `ADMIN_SECRET_CODE` grants ADMIN (B-10) | email not lowercased (B-20) |
| POST `/auth/login` | P | `loginService` | users | zod | bcrypt 12 rounds; JWT 7 d |
| GET `/auth/me` | U | `getMeService` | users | – | |
| PATCH `/auth/me` | U | `updateMeService` | users | **none** (B-01, fixed on branch) | |
| POST `/auth/forgot-password` | P | `forgotPasswordService` | users; SMTP (Gmail) | email only | awaits SMTP in request (B-11/B-19) |
| POST `/auth/reset-password/:token` | P | `resetPasswordService` | users | password ≥ 6 | sha256 token, 1 h expiry; old JWTs not revoked (B-24) |
| GET `/products` | P | products.controller `getProducts` | products | none → manual parse (B-05..B-08) | 12 default; `groupByColor` aggregation; `limit=300` 442 KB raw / 45 KB br, TTFB median 715 ms; `limit=0` returns whole catalog 1.3 MB |
| GET `/products/:id` | P | `getProductByIdService` | products (2 queries: doc + siblings by `styleCode`) | – | all errors → 404 (B-21) |
| POST/PATCH/DELETE `/products[/:id]` | A | create/update/delete | products, filtersuggestions (fire-and-forget sync) | none (raw body) | delete triggers full-catalog rebuild of filters (B-27) |
| GET `/categories` | P | categories.service | categories (+populate) | – | 887 B br, median 943 ms |
| POST/PATCH/DELETE `/categories[/:id]` | A | | categories | none | `findOneAndUpdate` without validators (B-26) |
| GET `/settings` | P | settings.routes | sitemetadata (SiteSettings, single doc) | – | 5.2 KB raw; 4 independent frontend callers (B-13) |
| PATCH `/settings` | A | | SiteSettings | none (raw body) | |
| GET `/sliders/hero`, `/sliders/promotional` | P | sliders.routes | heroslides, sliders | – | promotional runs an unused MARQUEE query (B-27) |
| POST/PATCH/DELETE `/sliders/hero\|promotional[/:id]` | A | | | none | |
| GET `/content/:type` | P | content.routes | contents | – | |
| GET `/content/admin/:type`, POST/PATCH/DELETE | A | | contents | none | |
| GET `/reviews/product/:id`, `/reviews/homepage` | P | reviews.routes | reviews, products (populate) | – | **exposed `customerEmail`** (B-09, fixed) |
| POST `/reviews` | U | | reviews, users | none; rating `parseInt` | auto-ACTIVE, unlimited per user/product (B-25) |
| GET/PATCH/DELETE `/reviews[/:id]` | A | | reviews | none | |
| POST `/orders` | U | orders.service `createOrderService` | products, coupons, orders, users; Razorpay (HMAC only); SMTP | manual (B-03 fixed; others open) | B-02, B-04, B-19 |
| GET `/orders/my` | U | | orders | – | unbounded list |
| GET `/orders`, PATCH `/orders/:id/status`, DELETE `/orders/:id` | A | | orders, users | status unvalidated (B-26) | list limit uncapped |
| POST `/payments/create-order` | U | payments.service | Razorpay API | `amount > 0` only (B-02) | client chooses amount |
| GET/POST/DELETE `/wishlist[/:productId]` | U | wishlist.service | users, products | ObjectId check after lookup | POST returns `data: undefined` on success |
| POST/PATCH/DELETE `/addresses[/:id[/default]]` | U | addresses.service | users.addresses | none | not used by checkout (order stores a free-text address string) |
| POST `/contacts` | P | contacts.routes | contactmessages | presence only | no rate limit/length cap (B-11) |
| GET/PATCH `/contacts[/:id]` | A | | | | |
| GET `/filters/suggestions` | P | filters.service | filtersuggestions (single doc, auto-created on GET) | – | GET can write (creates doc) |
| GET `/attributes`; admin CRUD | P / A | attributes.service | attributes | none | |
| GET `/admin/stats`, `/admin/customers`, `/admin/media` | A | admin.routes | orders, products, users, contactmessages; R2 list | limit uncapped | 9 sequential/parallel aggregates, no indexes on Order.status/createdAt |
| POST `/admin/upload`, `/upload-video`, `/upload-slider-media` | A | admin.routes (multer disk, 500 MB) | media; Cloudflare R2 | no type check | `readFileSync` of whole file (B-12) |
| GET `/health` | P | app.ts | – | – | no DB check |
| GET `/sitemap.xml`, `/robots.txt` | P | sitemap.controller | products, categories | – | unbounded `find` of all products |
| GET `/videos/*`, `/sliders/*` (static, non-API) | P | app.ts | filesystem `uploads/` | – | legacy local assets |
| GET `*` (production SPA fallback) | P | app.ts:~130 | products / categories for meta tags | – | HTML meta built by regex replace, unescaped (B-23) |

Not present (verified by grep): webhooks (no Razorpay webhook), cron/queues/scheduled jobs, rate limiting, helmet, request-ID middleware, compression middleware (Brotli is applied by Cloudflare), CI workflows, Docker/reverse-proxy config (only PM2 `ecosystem.config.js` + `deploy.sh`).

## Frontend call sites of note
- `/settings`: `Navbar.tsx:25`, `Footer.tsx:18`, `CustomerLayout.tsx:58`, `Home.tsx:342` (4×/page, unshared).
- `/products?limit=500&groupByColor=true`: `Navbar.tsx:159` (SearchBar, every page, on mount). `/products?limit=300&groupByColor=true`: `Home.tsx:246`. Shop: `Shop.tsx:151` (limit 20, filters in `fetchParams`). PDP related items: `ProductDetails.tsx:14` (sends unsupported `category` param, B-15).
- Admin list: `hooks/useAdminData.ts:89` (`status: 'ALL'` with admin token — still works after B-05 fix).
