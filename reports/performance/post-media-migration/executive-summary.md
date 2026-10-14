# Executive summary: production performance after the media migration

Audit of `https://v2enterprise.in`, 2026-10-13, audit-only (no deploys, data changes, purges or migration commands). Sources: [lighthouse-results.csv](lighthouse-results.csv) (48 valid sequential Lighthouse 13.5.0 runs), [image-delivery-audit.csv](image-delivery-audit.csv), [request-waterfalls.csv](request-waterfalls.csv), [api-performance.csv](api-performance.csv), baseline [raw/baseline-summary.txt](raw/baseline-summary.txt). Method and invalid runs: [test-environment.md](test-environment.md).

## Answers
1. **Faster?** Yes, a lot on Shop, moderately on Home, and PDPs are now the slowest page. Mobile medians ([baseline-comparison.md](baseline-comparison.md)): Shop LCP 48.8 → 9.1 s (−81%), score 38 → 49; Home LCP 16.3 → 10.6 s (−35%), score 9 → 52, CLS 1.11 → 0. Mobile scores are still only 45–53 everywhere; no page is "good".
2. **Bytes.** Shop transfer 134.9 MB → 1.70 MB (−98.7%); Shop images 134.1 → 0.95 MB (−99.3%). Home 19.9 → 11.9 MB (−40%): images −91% but 10.5 MB of untouched mp4 remains. Caveat: part of the Shop drop comes from earlier code changes (`limit=20`, srcset), not the migration alone.
3. **New vitals (mobile median, cold):** see table below. INP **not measured** (lab only; TBT given).
4. **What dominates now:** on Home, 4 legacy mp4 range downloads (≈12.3 MB, [image-delivery-audit.csv](image-delivery-audit.csv)) and the hero video as LCP element; on Shop, a lazy-loaded first card gated on the product API; on PDPs, 1600 px images for everything; everywhere, Meta Pixel + GTM (397 KB, top long tasks) and ≈0.5–0.8 s per API call.
5. **Are optimised images selected?** Product cards: yes. 20/20 Shop images are `400.webp` (45.7 KB mean), `image/webp`, no duplicates. Home product images use 400/800. **PDPs: no**, all 9–11 images are `1600.webp` (3.6–4.3 MB).
6. **Original full-res images still delivered?** No legacy original JPEGs appeared in any tested page. The "oversized" delivery now is the 1600 variant on PDPs, plus legacy mp4 videos.
7. **Main bottleneck:** by page: PDP = image sizing and late discovery; Shop = lazy LCP image + API latency; Home = video weight; all = 3rd-party/main-thread (mobile TBT 316–654 ms vs 13–50 ms desktop). Backend is a latency floor (~0.5–0.8 s/call, uncached), **not proven DB-bound**.
8. **Root cause of slow pages:** [root-cause-register.md](root-cause-register.md) RC-01 (PDP), RC-02 (Shop), RC-03 (Home).
9/10. **Fix first:** P1-1 PDP responsive images, P1-2 eager/priority first row, P1-4 Shop skeleton (all small frontend changes), then P1-3 video re-encode, then API caching and deferring the Pixel ([optimization-roadmap.md](optimization-roadmap.md), proof steps in [validation-plan.md](validation-plan.md)).

## Current mobile medians (5 runs, cold; range in `raw/medians-table.md`)
| Page | Score | LCP | CLS | TBT | Transfer | Image bytes |
|---|---:|---:|---:|---:|---:|---:|
| Home | 52 | 10.6 s | 0 | 388 ms | 11.9 MB | 0.55 MB (+10.5 MB mp4) |
| Shop | 49 | 9.1 s | 0.091 | 373 ms | 1.70 MB | 0.95 MB |
| Category (`/mens/tshirt`) | 53 | 8.5 s | 0.092 | 316 ms | 1.70 MB | 0.95 MB |
| PDP 2 photos | 51 | 15.4 s | 0 | 460 ms | 4.37 MB | 3.60 MB |
| PDP 3 photos | 45 | 17.8 s | 0 | 654 ms | 5.04 MB | 4.27 MB |
| PDP 4 photos | 53 | 13.0 s | 0 | 317 ms | 1.92 MB | 1.15 MB |

Desktop is much healthier (LCP 2.6–3.1 s, scores 60–75), which shows the remaining problem is bytes/latency on slow mobile networks. FCP is 3.0–3.3 s mobile on every page.

## Things that are fine
CDN images: `image/webp`, `immutable` 1-year cache, edge HIT on GET; hashed JS/CSS immutable; HTML edge-cached; no first-party failed requests.

## Caveats you should not skip
- Baseline and current are different days/code; attribute image-byte numbers to the migration (mechanical), not LCP/score ([baseline-comparison.md](baseline-comparison.md)).
- Lab (simulated mobile) values are pessimistic absolutes. Not run: warm-cache, traces, HAR, console errors, INP ([limitations.md](limitations.md)).
- Possible functional issue: `/mens/tshirt` issues an unfiltered product query identical to `/shop` (RC-09, unverified).
- My first two launches of the test matrix were invalid (overlapping processes; the operator's internet outage) and were discarded, not blended in.
