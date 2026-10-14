# Root-cause register (ranked by measured impact)

Labels: **[M]** measured, **[H]** hypothesis, **[U]** untested. Evidence paths are relative to this directory.

## RC-01 Product-detail pages download every image at 1600 px (mobile LCP 13–18 s)
- Severity: HIGH. Pages: all product-detail routes (`/product/:id`, `/:cat/:sub/:id`).
- [M] Mobile median: prodA2 LCP 15.4 s / 3.6 MB images; prodB3 17.8 s (range 11.3–18.8) / 4.27 MB; prodC4 13.0 s / 1.15 MB. Desktop is fine (2.6–3.1 s). All 9–11 images are `…/1600.webp`, up to 896 KB each; thumbnails and related products also at 1600 (`image-delivery-audit.csv`, rows `prodB3,mobile`).
- [M] LCP breakdown prodB3 run 1: TTFB 1347 ms, load delay 2539 ms, load duration 1988 ms, render delay 86 ms; LCP is the main gallery `<img>`, "not discoverable in initial document", no `fetchpriority`.
- Cause (code, HIGH): `frontend/pages/ProductDetails.tsx` renders `src={galleryImages[activeImage]}` (≈l.361), thumbnails `<img src={img}>` (≈l.411), colour options `opt.photo` (≈l.478) with the stored canonical 1600 URL. The variant-aware helper (`src/utils/mediaUtils.ts`: `getImageSrcSet`, `pickVariantWidth`) is only used by `ProductCard.tsx`. Related-product cards on this page evidently bypass it too (3 of the 1600 requests are low-priority).
- Estimated gain (assumption: 400w ≈ 46 KB, 800w ≈ 121 KB, 1600w ≈ 311–896 KB, from the sampled CDN files): images −70 to −85% (≈ 4 MB → 0.6–1.2 MB); mobile LCP −4 to −9 s. Confidence: cause HIGH, magnitude MEDIUM.
- Effort S, risk low (visual: zoom loupe needs 1200–1600 only on hover). Validate: rerun prodA2/B3/C4 ×5 mobile.

## RC-02 Shop LCP image is `loading="lazy"` and waits for the product API
- Severity HIGH for Shop/category (mobile LCP 9.1 s / 8.5 s).
- [M] LCP element = first product card `<img … loading="lazy" decoding="async">`; "eagerlyLoaded: false", not discoverable in initial HTML. Breakdown run 1: TTFB 842, load delay 3158, load duration 634, render delay 60 ms.
- Cause: first-row cards are lazy and are only created after `GET /products?limit=20` returns (client-side render). Fix: first ~4 cards `loading="eager" fetchPriority="high"` (`components/ProductCard.tsx` + a `priority` prop from `Shop.tsx`).
- Gain estimate 1.5–3 s LCP (removes lazy deferral; API wait remains). MEDIUM. Effort S.

## RC-03 Home hero is a 1080p `<video>` and is the LCP element; ≈10.5 MB of unoptimised mp4s
- Severity HIGH on Home. [M] Home mobile LCP 10.6 s; LCP element is `<video … width=1920 height=1080 preload=metadata|auto>`; render delay 1.3–3.1 s (varies by run). Media = 10.5 MB (4 range responses: 3.96, 3.88, 3.41, 1.07 MB, all in-the-fold-adjacent promo/product videos) vs 0.55 MB of images. `.mp4` files are the original uploads (`sliders/*.mp4`, `products/*.mp4`), never touched by the image migration.
- [H] Poster + re-encoded (≤1 MB, 720p, `faststart`) hero and `preload="none"`/in-view loading for promotional sliders would cut Home transfer by ≈ 8–9 MB and move LCP to the poster. Not tested. Effort M (needs admin poster field, `HeroSlide.poster` exists but is empty in production [U: depends on data]).
- Also [M] Home still requests `products?limit=300&groupByColor=true`: 52 KB compressed / 440 KB decoded, 1.28 s in lab.

## RC-04 API latency floor ≈ 0.5–0.8 s per call; zero edge caching; many calls on the critical path
- [M] 5 reps each (`api-performance.csv`): `/settings` (2 KB) TTFB 0.59–0.83 s; `categories` 0.44–0.68; `products?limit=20` 0.60–1.15; `products?limit=300` (50 KB) 0.54–0.94; product detail 0.47–0.60. TTFB is ~constant regardless of payload → dominated by origin/network RTT + app, **not** payload size. Every response: no `Cache-Control`, `cf-cache-status: DYNAMIC`.
- [M] Home: 11 API calls (`settings`, products300, `sliders/hero`, `categories`, FEATURE_ITEM, TAGLINE, `reviews/homepage`, `sliders/promotional`, MARQUEE, `filters/suggestions`, LOOKBOOK_ITEM). Shop: `/settings` is fetched **twice** (still duplicated) plus `categories`, `filters/suggestions`, content ×2.
- [H] Origin processing vs network distance is unseparated. To prove DB-bound: need server-side timing (`Server-Timing`/log) per route and a same-region `curl` from the origin host. I did not label MongoDB as the cause.
- Fix: public `Cache-Control: public, s-maxage=60–300, stale-while-revalidate` on settings/categories/sliders/content/filters + Cloudflare cache rule (requires production config change, not done). Gain estimate: −0.3 to −0.6 s on critical-path fetches; MEDIUM.

## RC-05 Main-thread: TBT 316–654 ms mobile (vs 13–50 ms desktop), Meta Pixel dominates long tasks
- [M] Top 3 long tasks on home/shop/PDP are `fbevents.js` / `signals/config/…` (445, 274, 261–308 ms simulated); `index-*.js` 76–173 ms. `bootup-time` attributes 6.3 s (4× throttled) of scripting to `vendor-motion-*.js` on Home vs 0.8–1.1 s on Shop/PDP.
- [H] The Home figure is animation/marquee work running in the framer-motion chunk; unproven without a Performance trace (**not collected**, see limitations).
- Total JS ≈ 586 KB, of which Meta 278 KB + GTM 119 KB ≈ 68% (first-party ≈ 190 KB). Mobile TBT spread on prodB3: 480–1828 ms (outlier = noise).

## RC-06 Third-party scripts load unconditionally
- [M] `connect.facebook.net/en_US/fbevents.js` 114 KB + `signals/config/1887679655474555` 164 KB + GTM `gtm.js` 119 KB + Cloudflare beacon 10 KB; Facebook main-thread 112–256 ms (throttled); no banner/consent gate seen.
- Fix: load after `window.load` + idle (or first interaction), only where consistent with consent rules. Gain: TBT −100…−250 ms mobile (MEDIUM). Business/analytics approval required.

## RC-07 Shop/category CLS 0.09 mobile, 0.24 desktop (unchanged from baseline)
- [M] Culprit: the product-grid container `div.relative` (3765 px tall) appears after the fetch; the footer logo is the displaced element. Home/PDP CLS = 0.
- Fix: skeleton grid with reserved rows (S, low risk). Target ≤ 0.05.
- Note: desktop 0.24 is rated "poor" (> 0.25 borderline), user-visible.

## RC-08 Render-blocking CSS and fonts
- [M] One render-blocking stylesheet `index-Czm-KyDM.css` ≈ 460–610 ms estimated wasted; Google Fonts 135–196 KB (4 woff2, 22–85 KB each). No font-display issues flagged. FCP 3.0–3.3 s mobile is mostly this plus JS parse (client-rendered SPA: HTML 3–6 KB). Gain 0.3–0.6 s FCP (LOW–MEDIUM).

## RC-09 Category route request carries no category filter (needs verification)
- [M] `/mens/tshirt` issues `products?page=1&limit=20&status=ACTIVE&groupByColor=true&sort=Newest&search=` — identical to `/shop` (same 51 requests, 1.70 MB, 22 images). [U] Whether the filter is applied client-side after fetch or not at all; a possible functional bug. Not performance-attributed; verify before relying on category results.

## Verified healthy (no action)
- CDN: `cdn.v2enterprise.in/media/v1/*/{400,800,1200,1600}.webp` → `image/webp`, `Cache-Control: public, max-age=31536000, immutable`, `cf-cache-status: HIT` on GET (HEAD shows DYNAMIC; HEAD is not cached by Cloudflare, do not read it as a miss). Sizes for one sample: 47 / 121 / 209 / 311 KB.
- Hashed JS/CSS served with `immutable`; HTML cached at edge (`max-age=14400, must-revalidate`, HIT). 
- No first-party failed requests, no HTML-for-image, no duplicate image URLs, no legacy full-resolution originals in any tested page's image requests (only legacy `.mp4` videos on Home). Only failures: Meta Pixel self-reporting beacons (`connect.facebook.net//log/error`, status -1) in 2 runs (home-mobile-4, prodC4-mobile-4). **Console errors: NOT MEASURED** (the `errors-in-console` audit is not in the performance-only category).
- Network/origin latency for HTML: document TTFB 125–480 ms.
