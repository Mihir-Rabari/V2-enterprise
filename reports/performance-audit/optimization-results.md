# Optimization Results — frontend quick wins + helmet/rate limits

Branch `perf/frontend-quick-wins` (built on `fix/backend-audit-hardening`). Date 2026-10-09.

## Method and caveats
Before = production Lighthouse runs (`lighthouse/home-mobile-{1,2,3}.json`, cold, mobile preset, Lighthouse 13.5.0). After = same Lighthouse command against `vite preview` of this branch on 127.0.0.1 with `/api/v1` proxied read-only to production (`run-lighthouse-after.sh`, `lighthouse-after/`). **Not identical conditions**: the local preview has no Cloudflare edge/Brotli/HTTP3 and no network RTT to the origin, so LCP, FCP, score and byte numbers are not directly comparable with production. Request counts and layout shift are deterministic enough to compare. Re-measure on production after deploy before claiming real-world gains.

## Results (home, mobile, 3 runs each)
| Metric | Before (production) | After (local preview) | Verdict |
|---|---|---|---|
| CLS | 1.113 / 1.113 / 1.113 | **0 / 0 / 0** | achieved (target ≤ 0.1). An intermediate build with only the logo/min-height fix still showed 0.853 in 2 of 3 runs, which is why the hero/marquee placeholders were added |
| `/settings` requests | 4 | **1** (all runs) | achieved |
| `/products?limit=500` requests | 1 | **0** | achieved |
| API requests total | 15 | **11** | achieved |
| Lighthouse score | 10 / 9 / 8 | 38 / 40 / 40 | not comparable (environment); CLS accounts for a large part |
| LCP | 15.2 / 17.9 / 16.3 s | 11.9 / 11.8 / 11.6 s | not comparable; still far above 2.5 s |
| Media bytes | 12.1–12.9 MB | ≈11.5 MB | **not achieved**: below-the-fold promotional slider videos (3.9 MB + 3.4 MB) and hero files still load; needs the video re-encode / in-view loading tasks |

## Changes (finding → change → files)
- F-02: hero video no longer gets an .mp4 as `poster` or fallback `<img>`; optional `poster` field on hero slides (admin must set it to get a poster) — `frontend/pages/Home.tsx`, `frontend/types.ts`, `backend/src/models/HeroSlide.ts`. **The hero still plays video.**
- F-03 (partial): only the current hero video autoplays with `preload="auto"`; the next slide uses `preload="metadata"` and is paused until shown — `HeroVideo` in `Home.tsx`.
- F-04: logo `width/height`, `min-h-screen` main, hero/section placeholders, marquee min-height — `Footer.tsx`, `Navbar.tsx`, `CustomerLayout.tsx`, `Home.tsx`, `MarqueeSection.tsx`.
- F-09: hover image is only requested after first hover — `ProductCard.tsx` (not separately measured; the home capture does not hover).
- F-13: `index.html` preconnect/dns-prefetch now targets `cdn.v2enterprise.in`.
- B-13 (part): `SettingsProvider` (`context/SettingsContext.tsx`) fetches settings once; navbar search is server-side, debounced 250 ms, stale responses ignored — `Navbar.tsx`, `App.tsx`, `Home.tsx`. Home still requests `limit=300` for the Essentials section (open).
- B-11: `helmet` (CSP off on purpose: inline GTM/Pixel and Google Fonts), `x-powered-by` removed, per-IP rate limits for login/register/reset (30 per 15 min), forgot-password (5/h), contact (10/h), payments (30 per 15 min), global API (1500 per 15 min); IP from `CF-Connecting-IP` — `backend/src/app.ts`, `backend/src/middlewares/rateLimit.middleware.ts`.

## Checks run
- `backend`: `npx tsc --noEmit` clean; `npm test` 8/8 pass (adds rate-limit behaviour and app-boot/security-header tests).
- `frontend`: `npx tsc --noEmit` clean; `vite build` succeeds.
- Not run: ESLint (none configured), browser interaction tests of search/hover/video (manual check needed: search suggestions, hover image swap, hero slide rotation with autoplay), checkout/cart flows (untouched), production verification.

## Risks / things to watch
- Rate limits are per-IP; shops behind shared NAT could hit the auth limit (30/15 min). Behind Cloudflare the key is `CF-Connecting-IP`, which is only trustworthy if the origin is reachable only via Cloudflare.
- Search suggestions now match on name/description/styleCode/categories/tags (server regex) instead of name/subCategory/styleCode/tags client-side; results capped at 5.
- Hero poster appears only after an admin sets `poster` on the slide (no UI field yet).
