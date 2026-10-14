# PDP responsive images: before/after (item 01)

Change: `frontend/pages/ProductDetails.tsx` only (branch `perf/pdp-responsive-images`, uncommitted, not deployed).
- Main image: `src` = 800 variant, `srcSet` 800/1200/1600, `sizes="(min-width:1024px) 50vw, 100vw"`, `width/height` 800x1000, `loading="eager"`, `fetchPriority="high"`. The container already had `aspect-[4/5]`.
- Thumbnails and colour-option swatches: 400 variant, explicit width/height, `loading="lazy"`.
- Zoom loupe still uses the stored 1600 URL, but only on desktop hover.

## Method
Local build served by `serve.js` (outside the repo, `C:\Users\mihir\lhtool`), API proxied read-only to production, images from the production CDN. Lighthouse 13.5.0 default mobile, 5 sequential runs per page. Control = same harness with the unmodified code (git stash), so only the change differs. Production numbers are not comparable to these (no Cloudflare edge for HTML/JS, local server). Dirs: `w-control/`, `w-after2/`. Discarded invalid attempts (kept for transparency): `after/`, `run-after*/`, `run-control/`, `v-*/` (server path bug, then API base URL mangled by Git Bash path conversion, so no product loaded), `w-after/` (build raced). Only `w-*` are valid.

## Results (median of 5; mobile, simulated)
| Page | Image bytes before to after | Image requests | Main image | LCP before to after | Score | TBT | CLS |
|---|---|---|---|---|---|---|---|
| prodA2 (2 photos) | 3.56 to 0.62 MB (-83%) | 8 to 9 | 1600 to 800 | 10.1 to 9.6 s | 52 to 54 | 312 to 222 ms | 0 to 0 |
| prodB3 (3 photos) | 4.23 to 0.62 MB (-85%) | 9+2 to 10 | 1600 to 800 | 9.7 to 8.9 s | 51 to 55 | 332 to 228 ms | 0 to 0 |
| prodC4 (4 photos) | 1.13 to 0.22 MB (-81%) | 6 to 7 | 1600 to 800 | 9.3 to 8.8 s | 55 to 54 | 233 to 242 ms | 0 to 0 |

Verified in real requests: main image `800.webp` (about 122-162 KB, was 312 KB to 896 KB at 1600), all other images `400.webp` (47-66 KB), all `image/webp`, `fetchpriority=high applied`, LCP element = main image, eager. Previously `fetchpriority` was not applied.

## Honest reading
- Acceptance met: no PDP image downloads at 1600 by default; image bytes down 81-85%; no layout shift.
- **LCP improved only ~0.5-0.8 s in this lab, not the 4-9 s I predicted** (that estimate was wrong). The LCP breakdown shows the image itself now takes about 0.9 s; the rest is the critical path before it: FCP ≈ 4.5 s (JS parse and render under 4x CPU) then `GET /products/:id` returning at about 1.9 s before the image request can even start (resource load delay ≈ 1.8-1.9 s). Prior production LCP (13-18 s) was inflated by bandwidth contention among 9-11 large images; that part is fixed, the remainder is the client-render + API chain.
- Control B3 has one 18.6 s outlier run; medians are used.
- Not measured: visual sharpness on a real DPR-2 phone (srcset will pick 1200 there), and production numbers after deploy.

## Next bottleneck for PDP LCP
Image discovery waits on the API call (not in HTML) and on the JS bundle; addressing that is item 05 (API latency/duplicates) and, longer-term, prefetching or SSR.
