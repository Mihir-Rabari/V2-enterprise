# Optimization roadmap (proposal only; nothing implemented or deployed)

Ranked by measured impact. Each item must be separately authorised.

## P0: none
No broken pages, failed first-party requests or regressions versus baseline were found. (Shop desktop CLS 0.24 vs 0.23 is within noise but remains "poor"; handled in P1-4.)

## P1: highest measured gains

### P1-1 Responsive images on product-detail pages (RC-01)
- Files: `frontend/pages/ProductDetails.tsx` (main `<motion.img>` ≈l.355, thumbnails ≈l.402–411, colour options ≈l.478, related products), reuse `getImageSrcSet` / `getOptimizedImageUrl` from `frontend/src/utils/mediaUtils.ts`.
- Change: main image `srcSet` 800/1200/1600 with `sizes="(min-width:1024px) 50vw, 100vw"` and `fetchPriority="high"`, `loading="eager"`; thumbnails 400w, `loading="lazy"`; related products via `ProductCard`; keep 1600 only for the zoom loupe, loaded on first hover.
- Expected: PDP images 3.6–4.3 MB → ≈0.6–1.2 MB; mobile LCP −4…−9 s (MEDIUM; assumes sampled variant sizes hold).
- Test: rerun prodA2/B3/C4 × 5 mobile + 3 desktop; confirm network shows 800/400 variants, zoom still sharp.
- Rollback: revert the commit. Success: PDP image bytes ≤ 1.2 MB, mobile LCP median ≤ 6 s. Independent.

### P1-2 Shop first-row eager/priority (RC-02)
- Files: `components/ProductCard.tsx`, `pages/Shop.tsx` (pass `priority` for index < 4; also on Home product rails above the fold).
- Expected: LCP −1.5…−3 s on Shop/category (MEDIUM). Test: shop/category ×5 mobile, LCP element should show `eagerlyLoaded: true`, `priorityHinted: true`. Success: mobile LCP ≤ 6 s. Independent; combine with P1-1 in one release if wished.

### P1-3 Home video weight and hero LCP (RC-03)
- Re-encode hero/promotional mp4s (≈ ≤ 1 MB each, 720p H.264 `faststart`), set `HeroSlide.poster`, `preload="none"` + in-view start for promotional sliders (`pages/Home.tsx` `HeroVideo`, promo slider component).
- Expected: Home transfer −8…−9 MB (HIGH that bytes fall; the LCP gain is MEDIUM/uncertain, LCP is a video frame). Needs content/admin work and rights check. Test: home ×5 mobile; success: media ≤ 2.5 MB, LCP ≤ 4 s, no autoplay regression. Coordination: admin data + media re-encode. Rollback: keep old URLs until verified.

### P1-4 Reserve Shop grid space (RC-07)
- `pages/Shop.tsx`: skeleton cards (20 × same aspect ratio as card) while loading. Expected CLS 0.09/0.24 → ≤ 0.05 (HIGH). Success: shop/category CLS ≤ 0.1 desktop and mobile in 5/5 runs. Independent, tiny risk.

## P2: secondary

- **P2-1 Public API edge cache + dedupe (RC-04).** Add `Cache-Control: public, s-maxage=60–300, stale-while-revalidate=600` on `settings`, `categories`, `sliders/*`, `content/*`, `filters/suggestions`, `reviews/homepage` (backend controllers/routes) and a matching Cloudflare cache rule; remove the second `/settings` call on Shop; replace Home `limit=300` with a server-side limit (~24) + field projection. Expected: −0.3…−0.6 s on the critical chain; −45 KB gz on Home. Requires production config change, so needs separate sign-off. Proof it worked: `cf-cache-status: HIT` and API TTFB < 150 ms on rep 2+. Rollback: remove the rule/headers.
- **P2-2 Defer Meta Pixel + GTM (RC-05/06).** Load after `load`+idle or first interaction (`index.html`). Expected TBT −100…−250 ms mobile (MEDIUM); requires marketing/consent sign-off. Success: TBT ≤ 200 ms median.
- **P2-3 Render-blocking CSS and fonts (RC-08).** Subset/preload the two used Playfair/Inter weights, `font-display: swap`, evaluate inlining critical CSS. FCP −0.3…−0.6 s (LOW–MEDIUM).

## P3: needs more evidence / architectural

- **P3-1 Trace-based JS investigation (RC-05):** capture Chrome Performance traces for Home to attribute `vendor-motion` scripting (6.3 s throttled) and decide on removing framer-motion from public cards/marquee.
- **P3-2 Prove origin vs network latency (RC-04):** add `Server-Timing` per route / log timings, measure from origin host. Only then consider DB indexes or a regional origin.
- **P3-3 SSR / pre-rendering of Shop, PDP shells** so the LCP image is discoverable in HTML (RC-01/02 residual: ~1–1.3 s TTFB + discovery delay remain). Large effort; evaluate only after P1.
- **P3-4 Real-user monitoring** (web-vitals → analytics) to obtain INP/field LCP (not obtainable in the lab).
- **P3-5 Verify the category route filter (RC-09).**

## Expected combined outcome (estimate, not a promise)
If P1-1…P1-4 land: mobile LCP Shop ≈ 5–6 s, PDP ≈ 5–8 s, Home depends on P1-3; Lighthouse mobile score ≈ 65–80 (extrapolated from the observed ~45–55 band; LOW–MEDIUM confidence).
