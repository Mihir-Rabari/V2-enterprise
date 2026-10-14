# JavaScript and main-thread findings

Source: Lighthouse audits in `raw/lighthouse/ab-sim-base/prodB3-1.json` (4x CPU slowdown, simulated) and `timeline.csv`. Numbers are throttled-CPU milliseconds unless stated.

| Item | Measured |
|---|---|
| Main-thread work (B3 run 1) | Script evaluation 1150, other 611, style/layout 574, rendering 275, parse/compile 98, GC 29 |
| First-party JS startup | `index-*.js` 505 total (447 script), `vendor-motion` 677 total (197 script; the 677 includes work attributed to the document), route chunk <10 |
| Third-party | Facebook (`fbevents.js` + `signals/config`) 281 KB, 113 ms main thread, long tasks 251 ms and 188 ms; GTM 119 KB, 18 ms |
| Long tasks (>50 ms), B3 run 1 | 7: Meta signals 251, `fbevents` 188, `vendor-motion` 83 and 63, `index` 81, GTM 67, `fbevents` 55 |
| Long tasks per page (observed, `timeline.csv`, medians) | A2 7 tasks / 813 ms, B3 9 / 1355 ms, C4 8 / 946 ms |
| Render-blocking | `index-*.css`, about 456 ms estimated |
| TBT | simulated 440-860 ms (very noisy: 411-1291 ms on A2 across runs); DevTools-throttled 0.75-1.8 s. Not improved or worsened by the change (differences within run-to-run noise) |
| FCP | 2.3 s simulated; about 4.3 s DevTools-throttled |

## Reading
- JS execution is the reason React renders only at about 4.3 s on a throttled phone (FCP), and Meta Pixel scripts account for the largest long tasks. But on the measured LCP, JS is **not the limiter**: moving the product fetch ahead of JS (so the API finishes at 1.3 s) did not change LCP.
- `vendor-motion` (framer-motion) appears with 677 ms attributed under 4x CPU on PDP; whether this is parse/eval of the library or animation work (the main image itself uses `motion.img`) was **not isolated** (would need a Performance trace with call trees; traces for run 1 are saved for that).
- No hydration step (client-rendered SPA). No repeated product fetch observed (one `/products/:id`, one `/settings`, one related, one reviews request per load).
