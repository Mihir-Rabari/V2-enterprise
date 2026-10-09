# Optimization Roadmap

Baselines (Lighthouse, cold, 2026-10-09; see `performance-audit.md` §3). Re-measure with `run-lighthouse.sh` under identical conditions. Nothing below is implemented yet.

Global acceptance criteria for every task: cart, checkout, auth, pricing and inventory untouched unless a task says otherwise; no new layout shift (CLS not worse than baseline); alt text and responsive layout preserved; originals/rollback path retained.

## 1. Quick wins (low regression risk)

| Task | Finding | Acceptance criteria |
|---|---|---|
| Fix hero `<video poster>` to use an image, not the .mp4 | F-02 | `poster` attr resolves to an image/jpeg; mobile Home LCP element becomes poster/video with visible paint earlier than 16.3 s median baseline |
| `preload="metadata"` for non-current hero slide | F-03 | Only 1 hero video requested at load on Home; media bytes < 6 MB on mobile Home (baseline 12.5 MB) |
| Width/height or aspect-ratio on footer logo; min-height on lazy Home sections | F-04 | Home mobile CLS ≤ 0.1 (baseline 1.11), desktop ≤ 0.1 (0.92) |
| Hover image loaded on first hover | F-09 | Initial Shop load issues no hover-image requests |
| Preconnect `cdn.v2enterprise.in`; drop unused `ik.imagekit.io` hints | F-13 | Waterfall shows reused connection for first CDN request |
| `CacheControl: public, max-age=31536000, immutable` on new R2 uploads | F-10 | `curl -I` on a new upload shows immutable header |

## 2. High-impact media optimization

| Task | Finding | Acceptance criteria |
|---|---|---|
| Choose pipeline: Cloudflare Image Resizing (A) vs `sharp` variants at upload (B) — decision needs plan/cost check | F-01 | Written decision with cost; prototype on 20 images |
| Visual QA of WebP q75 @ 400–800 px vs originals (side-by-side, SSIM ≥ ~0.95 or reviewer sign-off) | F-01 | Reviewer approves 20 samples across dark/light/detailed garments |
| Make card/section/hero image components emit `srcset`/`sizes` against variants; rename or replace `getOptimizedImageUrl` no-op | F-01 | Each card image ≤ 60 KB median (sample baseline 340 KB median, 1.47 MB mean); Shop mobile image bytes < 10 MB (baseline 135 MB); no image upscaled |
| Backfill existing catalog (new keys, originals retained) | F-01 | Script is idempotent, dry-run mode, rollback = originals untouched; 100% of API image URLs resolve to variants |
| LCP image: first 1–2 Shop cards eager + `fetchpriority=high` (after variants live) | F-05 | Shop LCP element is not `loading=lazy`; Shop mobile LCP median < 4 s (baseline 48.8 s) — target to be re-based after variants |
| Re-encode hero/promo videos (H.264, faststart, ≤ ~700 KB mobile / ≤ 2 MB laptop); promo video loads only in view | F-03 | Mobile hero file ≤ 1 MB (baseline up to 3.96 MB); promo videos 0 bytes until scrolled near |
| Hash-based upload dedupe | F-11 | Identical re-upload returns existing URL |

## 3. Frontend and rendering

| Task | Finding | Acceptance criteria |
|---|---|---|
| Defer GTM/Meta Pixel to idle/after interaction (consent-aware; do not disable tracking) | F-08 | Home mobile TBT < 600 ms (baseline 1049 ms); events still arrive in GTM preview |
| Remove unused/legacy JS flagged by Lighthouse; check framer-motion usage on cards | F-08 | JS transferred < 300 KB on Home (baseline 389 KB); no visual regressions |
| Single settings fetch shared through context | F-06 | `/settings` requested once per page load (baseline 4) |

## 4. Backend and caching

| Task | Finding | Acceptance criteria |
|---|---|---|
| Server-side search endpoint replacing the Navbar `limit=500` prefetch | F-06 | No `limit=500` request on page load; search results parity on 10 sample queries |
| Home uses a bounded query (e.g. sections need ~20–40 products), not `limit=300` | F-06 | Home catalog request < 20 KB br (baseline 48 KB) |
| List projection (drop `__v`, long text) and `Cache-Control: public, s-maxage=60, stale-while-revalidate` for public product/category/settings GETs | F-07 | Repeat requests show `cf-cache-status: HIT`; admin edits visible within ≤ 60 s |

## 5. Infrastructure / architectural

| Task | Finding | Acceptance criteria |
|---|---|---|
| Verify HTML caching path (origin `no-store` vs edge `max-age=14400`) | F-12 | Documented cause; after deploy, new bundle reachable within the agreed window |
| Enable Image Resizing if option A chosen | F-01 | `/cdn-cgi/image/...` returns 200 with `image/webp` |

## 6. Validation and monitoring

| Task | Acceptance criteria |
|---|---|
| Measure unmeasured pages: PDP, search, cart, checkout entry (test session only), warm cache, 3 runs each | Baseline table extended and committed |
| Re-run full Lighthouse matrix after each stage and write `optimization-results.md` with per-run values and medians | Each stage compared individually (bytes, LCP, CLS, TBT) |
| Add RUM (`web-vitals` → GA4/GTM or CrUX dashboard) | Field LCP/INP/CLS p75 visible; review after 28 days |
| Pull CrUX/PageSpeed field data for `/` and `/shop` | Recorded as field baseline |

Suggested order: Quick wins → variants pipeline + component changes (P0) → video re-encode → API/search changes → third-party deferral → monitoring.
