# Executive summary: font loading

Data: [before-after.csv](before-after.csv), [runs.csv](runs.csv). Method: [methodology.md](methodology.md). 44 valid DevTools-throttled runs (plus 1 invalid, excluded) (control, no-fonts diagnostic, one preload candidate; 3 PDPs x 5 runs, rotated order).

## Decision: no font change. Reject the preload; keep fonts as they are; look at other bottlenecks.

| Question | Answer (evidence) |
|---|---|
| Do fonts delay FCP or block text? | No. Font files are requested at FCP, text uses the swap fallback, CLS is 0-0.0001 ([font-timing-analysis.md](font-timing-analysis.md)). |
| Do font downloads delay PDP LCP? | A little. All fonts removed (diagnostic upper bound): LCP -459 ms median (-5.5%, -7.2%, -8.3% per page), better in 12/15 pairs, but per-page ranges overlap. |
| Does preloading the critical font help? | **No, it hurts**: FCP +163 ms, LCP +247 ms (+0.4%, +3.0%, +6.6%), worse in 13/14 and 10/14 pairs. Rejected. |
| Unnecessary files/weights? | No. Inter is variable (400/500/600 share files); 3 files, 156 KB per PDP. The notable item: 85 KB of that is Inter latin-ext fetched only for the rupee sign `₹` ([font-inventory.md](font-inventory.md)). |
| Is `font-display` an issue? | Already `swap`; the stylesheet is already non-blocking, preconnected and preloaded. |

## What this means
The best conceivable font optimisation is worth at most about 0.46 s of LCP (about 6.5%), the same order as the GTM deferral. The only concrete byte saving is dropping the latin-ext file (hypothesis: about 0.2-0.25 s), which would require self-hosting a latin + `₹` subset or rendering `₹` in a fallback face: a visual change and a lab gain too small to measure here. I did not force it.

## Not changed
Source tree is identical to the start (`raw/final-working-tree.patch` == `raw/starting-working-tree.patch`): ProductDetails image work and the separate GTM patch are intact and uncommitted. `tsc` clean, `vite build` OK, frontend media tests 6/6, backend tests 9/9.

## Recommendation
1. Reject preload; make no font change now.
2. Next bottleneck to investigate: the remaining LCP contributors measured so far are Meta Pixel (278 KB, two long tasks, GTM deferral already tested) and the product API/JS boot gate (about 4 s of throttled FCP). Candidates: (a) Meta delivery without the TBT and PageView-delay regressions found earlier, (b) FCP/JS startup (`vendor-motion`, 677 ms under 4x CPU), (c) the API latency work (item 05).
3. Optional later, low priority: self-host a latin + `₹` Inter subset (FN-07) if the owner accepts a design check.
