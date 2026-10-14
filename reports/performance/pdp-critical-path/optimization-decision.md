# Optimization decision

## Candidates tested individually (same harness, DevTools throttling, medians)
| Candidate | Change | Main image start | LCP vs control | Verdict |
|---|---|---|---|---|
| 1. Early product fetch (inline script in `index.html` + `useProduct` consumes it) | API starts at about 20 ms instead of about 400 ms | -0.7 s (4.8 -> 4.1 s) | 9.36 -> 9.30, 9.34 -> 9.33, 6.87 -> 6.56 s (n=3): none | Rejected (also adds a request path to maintain). Patch kept: `raw/early-fetch.patch` |
| 2. `fetchPriority="low"` on thumbnails/swatches | priority hint | none | 9.36 -> 9.42, 9.34 -> 9.52, 6.87 -> 7.13 s (n=3): none | Rejected |
| 3. Defer thumbnails/swatches until the main image fires `onLoad`/`onError` | removes about 450-500 KB from the LCP window | unchanged | **-21%, -24%, -3%** (paired n=5 each, ranges mostly disjoint) | **Chosen** |
| 4. 3 + 1 combined | | -0.5..-0.8 s | 7.28 -> 7.31, 7.24 -> 7.09, 6.70 -> 6.87 s (paired n=5): none | Not adopted |

## Chosen change (only file touched by this task beyond the earlier image work): `frontend/pages/ProductDetails.tsx`
- New state `mainImageLoaded`; `secondaryImagesReady = mainImageLoaded || isVideoActive`.
- Main `<motion.img>` gets `onLoad`/`onError` that set it (error path ensures thumbnails still show).
- Thumbnails and colour swatches render `src` only when `secondaryImagesReady` (otherwise `src` undefined, empty alt, reserved size from the existing width/height + container, so no layout shift; CLS max 0.0001).
- Existing responsive-image behaviour (800/1200/1600 srcset, eager + `fetchPriority="high"` main image, 400 px thumbnails, 1600 zoom on hover) is unchanged. Final diff: `raw/final-working-tree.patch` (1 file, +16/-3 vs HEAD, includes the earlier image change).

Why it should help the measured sub-part: it reduces the resource load *duration* of the LCP image (4.4-4.5 s -> 2.0-2.2 s) by removing competing bytes; load delay is untouched.

## Not justified by the evidence (explicit)
- **SSR / prerender:** no test shows server rendering would remove the contention; boot/API are not the throttled-LCP limiter.
- **API caching / prefetching:** API is a gate but not the limiter (`abc-dt-combo`); product-detail prefetch would also add bandwidth on slow links.
- **Reducing JS startup:** moves FCP, not demonstrated to move LCP.

## Recommended next step (ordered)
1. Defer/delay Meta Pixel + GTM initialization (PC-02, roadmap item 04) and re-run the same DevTools-throttled A/B; this is the only remaining measured overlap with the main image besides fonts.
2. Self-host/preload/subset fonts (156 KB, 3 files) as a separate A/B.
3. Only after those, reconsider early product fetch (it becomes useful once bandwidth is no longer saturated).
