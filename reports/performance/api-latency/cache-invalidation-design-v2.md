# Cache invalidation design v2

(The required name `cache-invalidation-design.md` already exists from the previous task and was not overwritten; this file supersedes and extends it.)

## 1. Mutation -> affected surface map
Handlers verified by grep (routes) this session; services per previous static audit.

| Mutation (route:line) | API responses affected | Pages / derived outputs affected |
|---|---|---|
| `PATCH /settings` (`settings.routes.ts:19`) | `/settings` | Navbar, Footer, Shop/Category grid columns, Login/Contact branding, About copy (SettingsProvider) |
| content POST/PATCH/DELETE (`content.routes.ts:34,44,55`); publish/unpublish = `status` PATCH | `/content/:type` for that `type` | Tagline bar (all pages), Footer features, Home marquee, lookbook |
| hero slider writes (`sliders.routes.ts:44,52,61`) | `/sliders/hero` | Home hero (LCP element) |
| promotional slider writes (`:70,78,87`) | `/sliders/promotional` | Home promo/new-arrival/best/category blocks |
| category writes (`categories.routes.ts:17,24,31`; `categories.service.ts:17,27,34`) | `/categories`; **product listings filtered by category name** (rename/delete orphans `mainCategory`/`subCategory` strings on products: there is no cascade, so a rename changes nothing in `Product` and listings keyed by the old name go empty) | nav, Home categories, Shop sidebar, `/:category`, sitemap, category HTML meta (`app.ts:148-223`) |
| product create/update/delete (`products.routes.ts:10-12`; `products.service.ts:205,215-253,255-265`) | `/products*` (every filter/sort/page combination), `/products/:id` for that id **and sibling responses of every product with the same `styleCode`**, `/filters/suggestions` (async), `/reviews/homepage` (populated name/photo) | Home Essentials/trending/new, Shop, Category, search suggestions (Navbar), PDP related, sitemap, PDP HTML meta |
| review POST (customer)/PATCH/DELETE (`reviews.routes.ts:48,87,98`) | `/reviews/product/:id`, `/reviews/homepage` | PDP reviews, Home reviews |
| attribute writes (`attributes.routes.ts:34,44,54`) | `/attributes`, `/filters/suggestions` | Shop filters |
| order creation (stock decrement, currently ineffective, `orders.service.ts:130-137`) | product `quantity` | PDP availability |
| out-of-band: `scripts/seed.ts`, media migration/optimisation scripts, direct DB edits | everything | no invalidation hook exists |

## 2. Options compared
| Option | How | Pros | Cons / failure behaviour |
|---|---|---|---|
| **A. Bounded browser TTL only** (`max-age` 60 s) | No invalidation; staleness bound = TTL | Zero infrastructure, zero failure modes, works for Vite and Next.js clients; correct by construction | Edits visible after <= TTL (+swr); no help for first load; admin sees own edits late unless admin reads bypass |
| **B. Cloudflare edge cache + purge-by-URL/tag from the backend after write** | Cache Rule + API purge (`POST /zones/{id}/purge_cache`) with a token only in server env | Removes origin hop for public CMS GETs; shared across visitors | Needs Cloudflare change + token; purge can fail after DB commit -> stale until `s-maxage` expires (so keep `s-maxage` <= 60-300 s as the backstop); purge propagation not atomic; purge limits per plan; wildcard/tag purge needs Enterprise (URL purge is available on all plans, listing every `/products?...` combination is impractical -> products stay out) |
| **C. In-process app cache (Map+TTL) cleared by the write handlers** | same process | trivial, no network | only valid for one process; restart clears; **invisible to Next.js**; out-of-band writers bypass it |
| **D. Signed internal invalidation event (HMAC webhook / queue message)** | Backend emits `{tags[], ts, nonce}` to consumers (Next.js `revalidateTag`, Cloudflare purge worker) | consumer-agnostic; works across instances | delivery can fail; needs retries and replay protection |
| **E. Durable outbox** | Write handler inserts an `invalidations` document in the same Mongo write (or right after) and a worker delivers with retry | at-least-once, observable, survives restarts | most moving parts; needs a worker; only justified once there are >=2 consumers or ISR |

## 3. Recommendation (least complexity that meets the freshness need)
1. **Phase 1 (now, staging then prod):** Option A for the public CMS GETs: `Cache-Control: public, max-age=60` (omit `stale-while-revalidate` for hero/promotional/content so unpublish takes effect within 60 s; allow `swr=300` for settings/categories/filters). Freshness guarantee: "CMS edits are visible to visitors within 60 s". Failure behaviour: none (there is nothing to fail); the TTL **is** the invalidation. Admin UI reads of those endpoints use `cache: 'no-store'` so editors see their own change.
2. **Phase 2 (only if measured need, needs authorization):** Option B for the same endpoints with `s-maxage` <= 60-300 s, URL purge on write, **bypass when `Authorization` present**. Purge is best-effort: log failure with the entity, **do not roll back or block the CMS save**, retry 3x with backoff (1 s, 5 s, 30 s) in-process, and fall back to TTL expiry. Metric: `purge_failures_total`, `purge_latency_ms`.
3. **Products, price, stock: no invalidation design is needed because they stay uncached** until the blockers in `remediation-roadmap.md` (security workstream) are done. If product pages move to ISR later, use short `revalidate` plus on-demand tags (section 5).
4. Option C only for `/sitemap.xml` and the SPA meta lookups, cleared by the same write handlers, accepting restart loss. Option E is deferred: nothing in the evidence needs durability.

## 4. Failure modes and behaviour
| Failure | Effect | Behaviour |
|---|---|---|
| DB write succeeds, purge/emit fails | stale edge/ISR copy until TTL | log + retry + TTL backstop; surface a warning in the admin response (`cacheInvalidation: 'deferred'`) |
| Purge succeeds, edge repopulates from a read replica/lagging origin | stale again | single primary: not applicable |
| Duplicate/replayed webhook | harmless extra revalidation | HMAC over `{ts, nonce, tags}`; reject `ts` older than 5 min; nonce cache; tag allow-list pattern; rate limit; no arbitrary paths/URLs |
| Multiple Node instances | in-process caches diverge | do not use Option C outside a single fork; or TTL <= 60 s |
| Out-of-band edits (seed/migration) | no hook | run a documented "purge all CMS URLs" step in those runbooks; TTL backstop |
| Category rename | listings by name go empty (no cascade, existing issue) | block rename or cascade update (data-model task) before caching listings |
| Cache poisoning via admin response | admin data cached for public | admin data never on public paths; bypass on `Authorization` |
| Observability gaps | cannot prove freshness | `Server-Timing`/log `cache=HIT|MISS|BYPASS`, `age`, per-tag last-invalidated timestamp endpoint for admins only |

## 5. Next.js App Router / ISR compatibility
- The backend and Next.js do not share memory. Invalidation must therefore be an **event or HTTP call**, never a shared in-process Map. Tags mirror the previous design: `settings`, `content:<TYPE>`, `slider:hero|promo`, `categories`, `filters`, `product:<id>`, `product-list`, `reviews:<productId>`, `reviews:home`, `sitemap`.
- Next fetches the Express API with `fetch(url, { next: { tags: [...], revalidate: N } })`; Express write handlers call a signed `POST /api/revalidate` (Next route handler) with the tag list -> `revalidateTag`. Authenticated/personalised routes use `cache: 'no-store'` and dynamic rendering.
- Product pages: ISR with `revalidate` 60-300 s plus on-demand `product:<id>`/`product-list`; **price and stock rendered client-side from a `no-store` endpoint** so that a stale HTML shell cannot misprice the cart.
- Two cache layers (Next data cache + Cloudflare) must not both hold the same document without agreed TTLs; keep Cloudflare out of HTML for ISR pages, or purge both from the same event.

## 6. Prerequisites that block any shared caching
Public `GET /products/:id` returning INACTIVE products; admin-dependent output on `/products`; categories returned regardless of status; write-on-read in `/filters/suggestions`. See `remediation-roadmap.md` (security workstream).
