# V2 Enterprise — Performance Forensic Report

Target: https://v2enterprise.in/ · Repo commit `cd6a495` (main, clean tree at start) · Report date: 2026-10-09
Supporting artifacts: `reports/performance-audit/` (raw Lighthouse JSON, API captures, image analysis, scripts). Roadmap: `reports/performance-audit/optimization-roadmap.md`.

## 1. Executive summary

The site is a React 19 + Vite SPA served by an Express/Mongo backend behind Cloudflare. Lab results are very poor, and the cause is overwhelmingly **media delivery**, not application code:

| Page (Lighthouse, Moto-G-class mobile emulation, median of 3) | Score | LCP | CLS | Transferred |
|---|---|---|---|---|
| Home | **9** | **16.3 s** | **1.11** | **19.9 MB** (12.5 MB video, 6.1 MB images) |
| Shop (`/shop`, 20 products) | **38** | **48.8 s** (range 20–65 s) | 0.09 | **135 MB** (all images) |

Desktop: Home 38 / LCP 4.6 s / CLS 0.92 / 16.4 MB; Shop 48 / LCP 6–40 s / 103 MB (2 runs).

Root cause of the primary bottleneck (**Verified**): product, hero and category images are uploaded to Cloudflare R2 (`cdn.v2enterprise.in`) as original camera JPEGs (up to 3024×4032, 4 MB) and served untouched. The frontend helper `getOptimizedImageUrl` (`frontend/src/utils/mediaUtils.ts:25`) only rewrites URLs containing `ik.imagekit.io`, a host no current product uses, so every "optimized" `width:400, quality:70` call is a silent no-op. A 3:4 card rendered at ~360×455 CSS px downloads 1.2–4 MB.

Highest-impact actions: (1) generate resized WebP variants and use them in cards (sample: 58.6 MB → 1.7 MB, −97%); (2) fix hero video (invalid poster, 4 videos preloaded, 3.9 MB mobile file); (3) stop shipping 300+500-product catalog fetches on every page; (4) reserve space to kill CLS 1.1.

## 2. Investigation scope

- Tools: Lighthouse 13.5.0 (CLI, Chrome headless, Windows 11), curl 8, Pillow 12.3 (re-encoding experiments), in-app Chromium 152 for Resource Timing. Run date 2026-10-09 from a single residential-network vantage (Cloudflare edge HKG).
- URLs: `/`, `/shop`. Discovered from `frontend/App.tsx`, `sitemap.xml`. Network: Lighthouse default simulated Slow-4G/4× CPU (mobile) and desktop preset. Cache: cold (Lighthouse fresh profile). Runs: Home 3+3, Shop mobile 3, Shop desktop 2 (third run did not complete).
- **Not measured** (gaps): product detail, search, cart, checkout (not run, to avoid touching session/checkout flows; next step below); warm-cache runs; INP (no field data/instrumentation); CrUX field data (PageSpeed Insights API not queried — obtain from https://pagespeed.web.dev/ or CrUX API); WebPageTest; real-device traces. Lighthouse runs are **lab data**, not real-user data. Shop scores have very high variance (LCP 20–65 s) because the run is dominated by multi-megabyte image downloads on a throttled link.
- Source: available and read (frontend, backend `app.ts`, `utils/r2.ts`). Database/query plans not examined (no DB access).

## 3. Baseline scorecard (lab)

Individual runs in `lighthouse/*.json`; summary in `lighthouse/summary.txt`; reproduce with `run-lighthouse.sh` + `summarize-lighthouse.py`.

| Scenario | Score (runs) | FCP | LCP (runs) | TBT | CLS | Bytes | Reqs |
|---|---|---|---|---|---|---|---|
| Home mobile | 10, 9, 8 | 3.96 s | 15.2, 17.9, 16.3 s | 1049 ms | 1.11 | 19.9 MB | 75 |
| Home desktop | 38, 38, 35 | 1.70 s | 4.6, 4.5, 4.8 s | 47 ms | 0.92 | 16.4 MB | 77 |
| Shop mobile | 34, 41, 38 | 3.92 s | 64.5, 48.8, 20.2 s | 811 ms | 0.09 | 135 MB | 73 |
| Shop desktop | 49, 48 | 1.92 s | 40.3, 6.1 s | 58 ms | 0.23 | 103 MB | 72 |

TTFB for the HTML document: 122–290 ms in Lighthouse (server-response-time); Cloudflare HIT, `Cache-Control: max-age=14400, must-revalidate` on `/` via curl (note: app code sets `no-store` for index.html, so Cloudflare is overriding — see F-12). INP/field: unavailable.

## 4. Media delivery report

**Totals.** Home mobile: 19 images / 6.1 MB + 12 media requests / 12.5 MB. Shop mobile: 43 images / 135 MB (≈3.1 MB average). Home page also issued 18 `<video>` fetches in one load (Resource Timing, repeated for the same URLs).

**Largest assets (Shop/Home, mobile run 1):** `sliders/…577003.mp4` 3.9 MB; `sliders/…580743.mp4` 3.4 MB; `products/1786273671350-…-917136.jpg` 3.4 MB (3024×3783 displayed at 637×849); hero mobile video `…573960.mp4` 3.96 MB file (fetched as 0.65 + 3.2 MB ranges); product JPEGs 230–370 KB for 400-px cards on home.

**Catalog sample (40 random product JPEGs from the live API, `raw/image_analysis.json`):**

| | Bytes |
|---|---|
| Original (as served) | 58,645,969 (median 340 KB, max 4.0 MB, mean 1.47 MB) |
| WebP 600 px wide q75 (card size) | 1,666,338 (**−97.2%**) |
| WebP 1200 px wide q80 (PDP size) | 7,791,800 (−86.7%) |
| JPEG q82 progressive, full dimensions | 29,187,532 (−50.2%) |

Method: Pillow, EXIF-transposed, `method=4`. **Visual quality has not yet been reviewed** (no side-by-side/SSIM done) — must be checked before rollout. 17/40 files carry EXIF metadata; 3 byte-identical groups indicate the same upload stored under multiple filenames (duplicate storage). The API lists 1,260 distinct image URLs for 300 products (hover/gallery images included).

**LCP diagnosis.**
- Home: LCP element is the hero `<video>` (mobile). Breakdown: TTFB 355 ms, resource-load delay 1.33 s, load 0.57 s, render delay 1.10 s (lab; later runs 15–18 s due to the video/img contention on Slow-4G). The `poster` attribute is set to the **.mp4 URL** (`poster="…577374.mp4"`), so no poster is ever displayed (Verified from Lighthouse DOM snippet; source `pages/Home.tsx:119`: `getOptimizedImageUrl(slide.url…)` where `slide.url` is a video for video slides). `preload="auto"` on both current and next slide (Home.tsx:116) pulls two videos at once. The element is not discoverable from HTML: it only exists after JS → `/sliders/hero` API → render (resource load delay).
- Shop: LCP is a product card `<img loading="lazy">` (`ProductCard.tsx`); load delay 1.9 s + load duration 5.2 s (one 3 MB JPEG), with 43 images (all above the fold on a tall mobile viewport) competing.

**Responsive/lazy-loading.** No `srcset/sizes` anywhere; `width="600" height="800"` attrs exist on cards but transforms don't apply. `loading="lazy"` is used correctly on below-fold cards but also on the first-row cards that are the LCP. Hover images (`ProductCard.tsx`) are rendered as a second `<img>` for every card, doubling card image requests as the viewport nears them. Footer logo has no dimensions (CLS).

**Caching/CDN.** `cdn.v2enterprise.in` = Cloudflare in front of R2; images return `Cache-Control: max-age=604800` (7 d, not `immutable`) with `cf-cache-status: HIT` observed (curl; one MP4 MISS). HTTP/3 advertised and used by the browser. No edge image transformation: `/cdn-cgi/image/...` returns 404 and `?width=` is ignored (full 2.88 MB returned), `Accept: image/webp` does not change the response. Filenames are unique timestamped names, so long immutable caching would be safe. Videos support range requests (206).

## 5. Root-cause register

Severity: S1 severe / S2 high / S3 medium / S4 low.

| ID | Where | Sev | Symptom & evidence | Cause (confidence) | Source | Remediation | Expected benefit | Effort / risk | Validation |
|---|---|---|---|---|---|---|---|---|---|
| F-01 | All pages with product/category images | S1 | Shop 103–135 MB; avg 3.1 MB/img; LH image-delivery est. savings 133 MB | R2 originals served unresized; `getOptimizedImageUrl` no-ops for non-ImageKit hosts (**Verified**: code + 40-sample test) | `frontend/src/utils/mediaUtils.ts:25`, `ProductCard.tsx`, home sections, `backend/src/utils/r2.ts` | Create resized WebP variants at upload (and backfill) or enable Cloudflare Image Resizing; emit `srcset` | Shop images ≈ −95% in sample (58.6→1.7 MB) | M / low–med | LH Shop bytes, per-image bytes |
| F-02 | Home hero | S1 | LCP element is `<video>`, poster = .mp4 URL | Wrong poster source (**Verified**) | `pages/Home.tsx:119` | Use dedicated poster image (field on slide) or first-frame JPEG; remove invalid attr | LCP/FCP visible image earlier | S / low | LH LCP element/time |
| F-03 | Home hero + promo videos | S1 | 12.5 MB media on mobile; 18 video fetches; 3.96 MB mobile file; 4 videos in flight | `preload="auto"` on current+next, uncompressed uploads, multiple sliders autoplay (**Verified** transfer; encoding cause **Strongly indicated**) | `Home.tsx:116`, `PromotionalSlider.tsx:64` | `preload="metadata"` for next slide, poster-first, re-encode mobile ≤~700 KB (H.264 720p/CRF~28 + faststart), load promo video only when in view | −8–11 MB on mobile home | M / low | LH media bytes, LCP |
| F-04 | Home mobile | S1 | CLS 1.11 (footer 0.85) | Footer and lazy sections render late; unsized `v2_logo.webp` (**Verified** by LH culprit list) | `components/Footer.tsx:78`, `Home.tsx` lazy sections | Add width/height; `min-height`/skeleton for lazy sections | CLS ≤0.1 plausible | S / low | LH CLS |
| F-05 | Shop LCP | S2 | LCP on `loading="lazy"` image, 20–65 s | Lazy on above-fold cards + F-01 (**Verified** snippet) | `ProductCard.tsx:~84` | `loading="eager"`+`fetchpriority="high"` for first ~2 cards only (after F-01) | LCP seconds→~2–3 s est. (unproven) | S / low | LH |
| F-06 | Every page | S2 | `/products?limit=500` (68 KB br) + `/products?limit=300` (48 KB) + 4× `/settings` fire at load | Navbar fetches 500 products for search; Home fetches 300; no shared cache (**Verified**) | `components/Navbar.tsx:159`, `Home.tsx:246`, `CustomerLayout.tsx:58`, `Footer.tsx:18` | Server-side search endpoint / on-demand fetch; share settings via context; paginate home | −~110 KB, fewer main-thread JSON parses | M / med | Network log |
| F-07 | Products API | S3 | 442 KB raw JSON for 300 products (45 KB br); `cf-cache-status: DYNAMIC`; TTFB 0.6–1.4 s from HKG | No response caching, full documents returned incl. `__v`, long descriptions (**Verified** headers; per-field bloat **Hypothesis**) | `backend/src/modules/products` | Projection for list endpoints; `Cache-Control: s-maxage` + SWR on public GETs | TTFB↓ on repeat | M / med | curl timing |
| F-08 | Home mobile | S2 | TBT ~1.0–1.4 s, JS 389 KB transferred in 15 scripts, `fbevents.js` 113 KB + GTM | Main-thread work: React+framer-motion+third parties (**Strongly indicated**) | `index.html` GTM, Meta pixel | Defer tag loading until idle/consent; trim unused JS (LH flags unused/legacy JS) | TBT↓ (unquantified) | M / med | LH TBT |
| F-09 | Hover images | S3 | Second `<img>` per card | Eager-ish render of hover image (**Verified** in source) | `ProductCard.tsx` | Load hover image on first hover/pointerenter | Halves card image requests when F-01 not yet done | S / low | Network count |
| F-10 | R2 caching | S3 | `max-age=604800`, not immutable; unique filenames | Default upload headers (**Verified**) | `backend/src/utils/r2.ts:56` (sets ContentType only) | Set `CacheControl: public, max-age=31536000, immutable` on upload; Cloudflare cache rule for existing | Fewer revalidations | S / low | curl -I |
| F-11 | Storage | S4 | Byte-identical uploads under different names | No dedupe on upload (**Verified** in sample, 3 groups) | admin upload route | Hash-based dedupe | Storage only | S / low | — |
| F-12 | HTML caching | S4 | Express sets `no-store` for HTML but edge returned `max-age=14400` + HIT, `Last-Modified` May 2026 | Cloudflare rule overrides origin, or `/` served by static `index.html` before SPA fallback (`express.static` serves `/` with `maxAge:1d`) (**Hypothesis**) | `backend/src/app.ts:120` | Confirm; ensure HTML is not cached stale after deploy while hashed assets stay immutable | Risk reduction (stale HTML) | S / med | curl -I after deploy |
| F-13 | Third parties | S3 | Fonts via render-deferred Google CSS, GTM, Meta Pixel; preconnect to unused `ik.imagekit.io` | Stale hints (**Verified**) | `index.html` | Preconnect `cdn.v2enterprise.in` (is present for `v2enterprise.cloud`, a different host) | Minor | S / low | waterfall |

Not found / ruled out: HTML TTFB is not the bottleneck (122–290 ms lab); Brotli is enabled at the edge (45 KB for 443 KB JSON); DNS/TLS minor (h3).

## 6. Prioritized action plan

- **P0** F-01 (resized WebP variants/srcset) — ~95% of bytes, safest big win. F-02 + F-03 (hero video poster/preload/encoding) — 12.5 MB and the Home LCP.
- **P1** F-04 (CLS), F-05 (LCP image priority; only after F-01), F-06 (duplicate catalog/settings fetches).
- **P2** F-07, F-08, F-09, F-10.
- **P3** F-11, F-12, F-13, field monitoring (web-vitals RUM/CrUX).

## 7. Expected improvement (to be proven)

Baselines are in §3. Defensible only for bytes: card images −95% (sample 40, measured). LCP/score gains cannot be honestly estimated until F-01–F-03 are implemented and re-measured under identical Lighthouse conditions; targets are in the roadmap. No improvement is claimed.

## 8. Architecture recommendations

Smallest intervention: keep R2 + Cloudflare + Express. Option A (recommended): Cloudflare Image Resizing/Transformations on `cdn.v2enterprise.in` (URL-based, no code in backend; paid/plan-gated — currently returns 404, so it is not enabled). Option B: generate fixed WebP widths (e.g. 400/800/1200) with `sharp` at upload in `backend/src/utils/r2.ts` plus a one-time backfill script that writes new keys and never overwrites originals (rollback = original kept). Option C: revive ImageKit (`ik.imagekit.io` already preconnected, helper already written) — needs a CDN origin mapping to R2 and adds a vendor. A vs B decision depends on plan/cost; B has no recurring cost. Do not migrate frameworks.

## 9. Reproducibility

```bash
cd reports/performance-audit
bash run-lighthouse.sh               # 12 runs, ~25 min
python -I summarize-lighthouse.py    # medians
curl -s -o /dev/null -w '%{size_download}\n' "https://v2enterprise.in/api/v1/products?limit=300&groupByColor=true"
```
Image experiment inputs: `raw/product_image_urls.txt`, `raw/sample40.txt`; results `raw/image_analysis.json`. Resource Timing capture was run in the browser pane at `/` (cold; viewport 0 so lazy images did not load — hence only Lighthouse is used for image totals).

## 10. Limitations and open hypotheses

PDP/cart/checkout/search not measured; no warm-cache or field/INP data; single vantage point; Shop LCP has extreme variance; WebP quality unreviewed; F-07 payload bloat and F-12 cache override unverified; no DB access for query analysis.
