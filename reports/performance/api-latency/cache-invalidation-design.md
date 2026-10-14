# Cache invalidation design (design only; not implemented)

Context: single Node process (PM2 `instances: 1`, fork mode, `max_memory_restart: 512M`), Cloudflare in front, R2 for media. No hook layer exists; every admin write is a route handler. The frontend sends the admin JWT as a Bearer header.

## Write paths that change public data (invalidation points)
| Event | Handler (file:line, from backend audit) | Public GETs affected |
|---|---|---|
| Settings PATCH | `settings.routes.ts:19-30` | `/settings` |
| Content POST/PATCH/DELETE | `content.routes.ts:34,44,55` | `/content/:type` |
| Hero slider POST/PATCH/DELETE | `sliders.routes.ts:44,52,61` | `/sliders/hero` |
| Promotional slider POST/PATCH/DELETE | `sliders.routes.ts:70,78,87` | `/sliders/promotional` |
| Category POST/PATCH/DELETE | `categories.routes.ts:17,24,31` -> `categories.service.ts:17,27,34` | `/categories`, sitemap, category HTML meta |
| Product POST/PATCH/DELETE | `products.routes.ts:10-12` -> `products.service.ts:205,215-253,255-265` | `/products*`, `/products/:id`, sibling responses, `/filters/suggestions` (async), sitemap, `/reviews/homepage` (product name/photo populated) |
| Review POST (customer) / PATCH / DELETE | `reviews.routes.ts:48,87,98` | `/reviews/product/:id`, `/reviews/homepage` |
| Attribute POST/PATCH/DELETE | `attributes.routes.ts:34,44,54` | `/attributes`, filters |
| Order creation (stock decrement, once fixed) | `orders.service.ts:130-137` | product `quantity` |
| Out-of-band: `scripts/seed.ts`, direct DB edits, media re-optimisation scripts | n/a | everything; these **bypass any in-process cache** |

## Principles
1. **Targeted keys, not global flush.** Name cache tags/keys by entity: `settings`, `content:<TYPE>`, `slider:hero`, `slider:promo`, `categories`, `product:<id>`, `product-list`, `filters`, `reviews:<productId>`, `reviews:home`, `sitemap`.
2. **Browser HTTP caching (class 3) needs no invalidation** beyond its TTL; declare the TTL as the freshness guarantee ("CMS edits are visible within 60 s") and use `stale-while-revalidate` for smoothness. This is the lowest-risk first step once headers can be validated on staging.
3. **Edge cache (class 4)**: Cloudflare cache rule keyed on path; purge by URL/tag from the backend after the write commits, using a Cloudflare API token held only in the server environment. Propagation is near-immediate but not atomic, so keep `s-maxage` short (<= 60-300 s) as the backstop when a purge fails; a failed purge must be logged and retried, never block the admin save.
4. **In-process cache (class 5)** only for `/filters/suggestions`, `/categories`, sitemap meta lookups: Map with TTL (<= 5 min) and size cap, cleared by the same handlers. Valid only while there is one process; any move to cluster/multi-instance requires a shared store or short TTLs only.
5. **Ordering:** invalidate **after** the database write resolves; for fire-and-forget side effects (filter sync after product writes, `products.service.ts:209,249,262`) invalidate again when that job completes or rely on the TTL.
6. **No public invalidation endpoint.** Do not add an unauthenticated purge route. If a webhook is ever needed (e.g. for a future Next.js app): require an admin JWT or an HMAC-signed body (`timestamp`, `nonce`, `tags[]`) with a 5-minute window and nonce replay cache, an allow-list of tag patterns (`^(settings|categories|filters|sitemap|content:[A-Z_]+|slider:(hero|promo)|product:[0-9a-f]{24}|reviews:[0-9a-f]{24})$`), rate limit and audit log. Never accept arbitrary paths/URLs from the caller.
7. **Auth boundaries:** only responses without `Authorization`-dependent content are cacheable by shared caches. Admin listing (`status=ALL|INACTIVE`) must be a different path or bypass rule; `private, no-store` on `/auth/*`, `/orders*`, `/wishlist`, `/admin/*`.
8. **Correctness blockers before any shared product caching:** `GET /products/:id` must return 404 for non-ACTIVE to the public; payment `amount` must be recomputed server-side.

## Future ISR mapping (Next.js; not a dependency of today's fixes)
The same events become `revalidateTag` calls: `product:<id>` / `product-list` on product writes (plus `categories`), `settings`/`content:*`/`slider:*` for layout/home data, `reviews:<id>`. Pages: `/product/[id]` (`revalidate` 60-300 s plus on-demand tag revalidation), `/shop` and category pages (tag `product-list`), home (tags `settings`, `slider:*`, `content:*`). On-demand revalidation would be called from the same Express handlers through the signed webhook in (6). Price and stock would need either a short revalidate window or a client-side `GET /products/:id/live` call so that stale HTML cannot misprice the cart.
