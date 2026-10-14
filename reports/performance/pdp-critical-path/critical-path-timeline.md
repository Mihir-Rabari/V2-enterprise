# PDP critical-path timeline

Source: `timeline.csv`, `lcp-breakdown.csv`, `api-timings.csv`, sanitized HARs in `raw/har/`, traces for run 1 in `raw/artifacts/<label>/<page>-1/trace.json.gz`. Times in ms from the first request. Medians of the paired runs.

## A. Fast-network view (observed, no throttle; label `ab-sim-base`, n=5/page)
| Event | prodA2 | prodB3 | prodC4 |
|---|---:|---:|---:|
| HTML complete | 3 | 3 | 3 |
| `index-*.js` complete | 29 | 25 | 28 |
| Route chunk `ProductDetails-*.js` requested | 81 | 86 | 92 |
| `/settings` requested | 95 | 100 | 110 |
| **Product API requested** | 404 | 404 | 441 |
| **Product API complete** (550-650 ms) | 989 | 1017 | 1026 |
| **Main image requested** (priority High, 800.webp) | 999 | 1029 | 1036 |
| Main image complete | 2059 | 1891 | 1550 |
| Observed LCP | 2104 | 1956 | 1606 |

Causal reading: the main `<img>` does not exist until `GET /products/:id` returns and React renders; the image request starts 8-12 ms after the API response. JS (done in about 0.45-0.5 s, route chunk requested at about 85 ms) is not on the critical path here; the product API starts only after the lazy route chunk loads and React mounts (about 300 ms after the chunk, 0.3-0.4 s in total). So on a fast connection the delay is: boot (about 0.4 s) + API (about 0.6 s) + image (about 0.5-1.0 s).
Per-run LCP sub-parts (observed): TTFB 11-20 ms, resource load delay 1.7-2.2 s in the v1 harness but 0.95-1.1 s in v2, load duration 0.7-0.9 s, render delay 40-65 ms (`lcp-breakdown.csv`).

## B. Real throttling view (DevTools throttling 150 ms RTT, 1.6 Mbps, 4x CPU; `ab-dt-base`, n=5)
| Event | prodA2 | prodB3 | prodC4 |
|---|---:|---:|---:|
| FCP | 4354 | 4409 | 4260 |
| Main image requested | 5114 | 5224 | 5039 |
| Main image complete = LCP | 9598 / 9651 | 9574 / 9647 | 6991 / 7052 |
| Main image download time | about 4.5 s | about 4.4 s | about 2.0 s |

The 120-160 KB main image needs about 0.7-0.9 s on this link when alone, but took 4.4-4.5 s. **What overlapped it (bytes in flight during its download, `ab-dt-base prodB3-1` / `prodA2-2`):** 8-9 other CDN images 454-502 KB (thumbnails, swatches), Meta/GTM scripts 164 KB, fonts 156 KB, API 3 KB. Total about 0.8-0.9 MB shared with a 122-162 KB file.

## C. Which events block LCP and which only coincide
| Event | Verdict | Evidence |
|---|---|---|
| Product API response | Blocks image *discovery* (image request starts 8-12 ms after it) but is **not the limiter under throttling** | `abc-dt-combo`: API done at 1.3-1.4 s (vs 4.9-5.1 s), image starts 0.5-0.8 s earlier, LCP unchanged (7.3 vs 7.3, 7.1 vs 7.2, 6.9 vs 6.7 s) |
| Route-chunk waterfall / JS boot | Gates React render (FCP 4.3 s throttled) and thus image request time, but again does not move the finish line when the pipe is full | same A/B |
| Bandwidth contention from secondary images | **Blocks the LCP download** | deferring them: main image duration 4.0-4.5 s -> 2.0-2.2 s, LCP -2.1..-2.4 s (`ab-dt-*`) |
| Remaining overlap: Meta/GTM scripts (164 KB), 3 font files (156 KB) | Likely the next limiter (hypothesis, not yet tested alone) | still 320 KB concurrent with a 122-162 KB image after the fix; main image still takes about 2.0-2.2 s vs about 0.8 s alone |
| `fetchpriority=low` on secondary images | Merely suspected; **no effect** in this lab | `dt-lowprio-thumbs`: LCP 9.4/9.5/7.1 s vs 9.4/9.3/6.9 s. DevTools throttling shares bandwidth between flows without honouring HTTP/2 priorities; real devices might differ (not proven) |
| `loading=lazy` on thumbnails | No effect: they are inside the viewport, so they load immediately | thumbnails requested at the same instant as the main image |
