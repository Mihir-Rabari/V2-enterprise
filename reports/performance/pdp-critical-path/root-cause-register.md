# Root-cause register (PDP LCP, after the responsive-image change)

| ID | Finding | Status | Evidence | Confidence | Est. impact |
|---|---|---|---|---|---|
| PC-01 | Secondary images (thumbnails + swatches, 8-9 files, 450-500 KB) download at the same moment as the main image and share the throttled link, stretching the main download from about 0.8 s to 4.4-4.5 s | **Proven**; fixed in working tree (defer until main image loads) | `ab-dt-*`: LCP A2 9.65 -> 7.62 s (-21%), B3 9.65 -> 7.29 s (-24%); main image duration 4.5 -> 2.0 s; bytes in flight table in `critical-path-timeline.md` | HIGH | -2.1..-2.4 s on 2/3 pages with 120-160 KB main images; about 0 on the page with a 46 KB main image |
| PC-02 | Meta Pixel/GTM scripts (about 280+119 KB) and 3 font files (156 KB) still overlap the main image download | **Probable, untested in isolation** | 320 KB still concurrent after PC-01; image still takes about 2.0-2.2 s vs about 0.8 s alone | MEDIUM | up to -1 s (assumption: removes about 320 KB from the window); item 04 |
| PC-03 | Product API (0.55-0.65 s observed through proxy; production, uncached, `DYNAMIC`) gates image discovery | **Proven as a gate, disproven as the limiter under throttling** | `abc-dt-combo` vs defer: image starts 0.5-0.8 s earlier, LCP unchanged | HIGH | about 0 for slow links; about -0.4 s observed on fast links (`early-fetch`: observed LCP 2.06 -> 1.60 s) |
| PC-04 | Product fetch waits for the lazy route chunk and React mount (API starts at 0.40 s instead of about 0.02 s) | Proven (timeline), low value | `timeline.csv` | HIGH | as PC-03 |
| PC-05 | JS boot makes FCP 4.3 s on throttled mobile | Proven as FCP cost; not shown to move LCP | FCP, main-thread table | MEDIUM | unknown |
| PC-06 | Lighthouse *simulated* LCP (about 8.7-9.0 s) does not reflect PC-01 | **Unexplained**: Lantern headline unchanged by the fix (A2 8.87 -> 8.87 s, B3 8.97 -> 8.75 s, C4 8.22 -> 8.28 s) while observed and DevTools-throttled LCP drop | `ab-sim-*` | n/a | Affects what the headline Lighthouse score can show; use DevTools-throttled runs for these changes |
| PC-07 | `fetchpriority="low"` on secondary images | **Suspected, not supported** | `dt-lowprio-thumbs` | MEDIUM | none measured |

Ruled out: duplicate product fetches (1 per load), sequential API chains (reviews/related/product are parallel after render), image selection/size (main 800 variant 122-162 KB), CLS (max 0.0001).
