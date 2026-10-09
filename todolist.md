# Todo List (remaining work from the performance + backend audits)

Details, evidence and acceptance criteria: `reports/performance-audit.md`, `reports/performance-audit/optimization-roadmap.md`, `reports/backend-audit/root-cause-register.md`, `reports/backend-audit/optimization-roadmap.md`.

## Backend — P0 (needs your decision)
- [ ] B-02 Bind Razorpay payment to the server-computed cart total; reject reused `razorpayPaymentId` (needs Razorpay test keys)
- [ ] B-04 Real stock handling: atomic decrement per SKU, restock on cancel (decide stock semantics first)
- [ ] B-10 Remove public `adminCode` admin sign-up; add rate limit

## Backend — P1
- [x] B-11 helmet + express-rate-limit (login, register, forgot-password, contact, payments); remove `x-powered-by`
- [ ] B-13 (settings + navbar search done; Home still fetches limit=300) Remove duplicate frontend fetches (`/settings` x4, navbar `limit=500`, home `limit=300`) — server-side search endpoint, shared settings context
- [ ] B-17 Run `explain("executionStats")` on staging, then add compound indexes (products `{status,createdAt}`, orders `{userId,createdAt}`, `{status,createdAt}`)

## Backend — P2
- [ ] B-12 Upload hardening: JSON limit ~1 MB, stream uploads, MIME allow-list, delete temp file on failure
- [ ] B-14 AbortController / stale guard in `useProducts`; debounce Shop search
- [ ] B-15 Related products: send `subCategory` instead of unsupported `category`
- [ ] B-16 Honour `sort` on non-grouped path; add `_id` tie-breaker
- [ ] B-18/B-30 Projection for list views + `s-maxage` / stale-while-revalidate on public GETs
- [ ] B-19 Order idempotency key, random order id, send e-mail after response
- [ ] B-20 Lowercase/trim e-mail on register/login
- [ ] B-21 Central error handling; no internal messages in production
- [ ] B-22 SIGTERM graceful shutdown, `pm2 reload`, DB ping in `/health`

## Backend — P3
- [ ] B-23 Escape meta tags in SPA fallback
- [ ] B-24 Shorter JWT / revocation
- [ ] B-25 Review rules (one per user/product, purchase check)
- [ ] B-26 `runValidators: true` on findOneAndUpdate calls
- [ ] B-27 Remove unused marquee query; atomic filter-suggestion updates
- [ ] B-28 Refresh `.env.example`; add CI (`tsc` + `npm test`)
- [ ] B-29 Razorpay webhook (confirm need first)
- [ ] Request-ID + JSON request logging middleware
- [ ] Add automated test for public review field stripping (B-09); integration tests per `reports/backend-audit/test-plan.md`

## Performance / media (frontend)
- [ ] F-01 Resized WebP variants + `srcset` for product/category/hero images (decide: Cloudflare Image Resizing vs `sharp` at upload + backfill); visual QA first
- [x] F-02 Hero `<video poster>` must be an image, not the .mp4
- [ ] F-03 (hero preload done; remaining) Hero/promo videos: `preload="metadata"` for next slide, re-encode (mobile <= ~1 MB), load promo video only in view
- [x] F-04 CLS: size footer logo, reserve space for lazy home sections
- [ ] F-05 First 1-2 shop cards eager + `fetchpriority=high` (after F-01)
- [ ] F-08 Defer GTM / Meta Pixel; trim unused JS
- [x] F-09 Load hover image on first hover
- [ ] F-10 `Cache-Control: immutable` on R2 uploads
- [ ] F-11 Hash-based upload dedupe
- [ ] Rewrite 152 legacy `pub-*.r2.dev` image URLs in products to `cdn.v2enterprise.in` (DB backfill, dry-run first)
- [ ] Fix `og:image` (`/og-image.jpg` returns HTML); make missing static files return 404 instead of SPA fallback
- [ ] Remove unused 3.7 MB `frontend/public/The_Dior_...mp4` (confirm rights) 
- [ ] Bundle: LazyMotion for framer-motion, move react-dom into vendor chunk, defer Meta Pixel
- [ ] F-12 Verify HTML caching (origin no-store vs edge max-age)
- [x] F-13 Fix preconnect hints (`cdn.v2enterprise.in`)
- [ ] Measure PDP, search, cart, checkout, warm cache; add RUM (web-vitals); pull CrUX data

## Housekeeping
- [ ] Deploy `fix/backend-audit-hardening`, then re-run the reproduction commands in `reports/backend-audit/backend-audit.md` §D to confirm B-05..B-09 are closed

## Done on branch perf/frontend-quick-wins
See `reports/performance-audit/optimization-results.md` (F-02, F-04, F-09, F-13, B-11, B-13 partial, F-03 partial). Remaining: add admin UI field for hero `poster`; re-measure on production after deploy.
