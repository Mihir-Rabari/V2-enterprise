# Executive summary: PDP critical path

Source revision: `68984e7` + uncommitted `frontend/pages/ProductDetails.tsx` (image change preserved, one further change added; `raw/final-working-tree.patch`). Nothing committed, deployed, or written to production. Method: [methodology.md](methodology.md). Numbers: [before-after.csv](before-after.csv), [lcp-breakdown.csv](lcp-breakdown.csv), [timeline.csv](timeline.csv), [api-timings.csv](api-timings.csv).

## What the data proves
1. **Why LCP stayed at 8.8-9.6 s after the image bytes dropped 81-85%:** under real throttling the 120-160 KB main image needs about 0.8 s alone but took 4.4-4.5 s because 8-9 secondary images (thumbnails + swatches, 450-500 KB), Meta/GTM scripts (164 KB) and fonts (156 KB) were downloading at the same time ([critical-path-timeline.md](critical-path-timeline.md)). LCP equals the main image's completion time in every run.
2. **The product API is a gate but not the limiter.** The image request starts 8-12 ms after the API response (about 1.0 s on a fast link), yet starting the API fetch 0.4-3.5 s earlier moved the image start earlier by 0.5-0.8 s without changing LCP (7.3 vs 7.3, 7.1 vs 7.2, 6.9 vs 6.7 s): the link was already saturated.
3. **One fix moved LCP:** loading thumbnails and swatches only after the main image has loaded. Paired A/B (n=5 per page, DevTools throttling): A2 9.65 -> 7.62 s (-21%), B3 9.65 -> 7.29 s (-24%), C4 7.05 -> 6.82 s (-3%, its main image is only 46 KB). CLS unchanged (max 0.0001).

## What did not hold up
- Lighthouse's simulated (headline) LCP/score did not change (8.87 -> 8.87, 8.97 -> 8.75, 8.22 -> 8.28 s) and is noisier than the effect; I cannot show a headline-score win and do not claim one. Cause unexplained.
- Early product fetch, `fetchpriority=low` on thumbnails: no LCP effect. Rejected (patches kept).
- TBT: not improved; noise dominates.
- My earlier "9.6/8.9/8.8 s" local medians came from a flawed harness (per-request Brotli q11); corrected baseline is 9.4/8.7/8.8 s simulated.

## Files changed (working tree, uncommitted)
`frontend/pages/ProductDetails.tsx` only (responsive images from before + deferred secondary images). Experiments (`raw/early-fetch.patch`, touching `frontend/index.html`, `frontend/hooks/useProducts.ts`) were reverted.

## Checks
`tsc` clean, `vite build` OK, frontend media tests 6/6, backend tests 9/9 ([validation.md](validation.md)). No UI interaction tests exist; manual check of thumbnails/swatches/zoom/video is still needed.

## Ranked remaining bottlenecks
1. Meta/GTM scripts + fonts still overlap the main image (about 320 KB vs a 122-162 KB image; image still takes about 2.0-2.2 s vs about 0.8 s alone). MEDIUM confidence, untested in isolation. -> roadmap item 04, then fonts.
2. Product API 0.55-0.65 s uncached: matters once bandwidth is no longer saturated (about 0.4 s on fast links). MEDIUM.
3. JS boot (FCP 4.3 s throttled), Meta Pixel long tasks (251 ms and 188 ms). Proven for FCP/TBT, not shown for LCP.

## Next step
Neither API optimisation, prefetching nor SSR is supported yet. The evidence points to **third-party script/font deferral next**, validated with the same DevTools-throttled A/B; revisit early product fetch only after that ([optimization-decision.md](optimization-decision.md)).
