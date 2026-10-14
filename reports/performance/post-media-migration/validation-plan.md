# Validation plan

Reuse the identical harness: `run-lighthouse.sh` (Lighthouse 13.5.0, default mobile / `--preset=desktop`, sequential, 5 mobile + 3 desktop per URL) + `summarize.js`, `waterfalls.js`. Same six URLs. Always check that the operator's connection is stable and that no other test runs concurrently (two earlier attempts in this audit were invalidated that way).

| Fix | Rerun | Pass thresholds (median of 5 mobile) | Also check |
|---|---|---|---|
| P1-1 PDP images | prodA2/B3/C4 | image bytes ≤ 1.2 MB; LCP ≤ 6 s; no `1600.webp` except zoom | `image-delivery-audit.csv` variants column; zoom sharpness manually |
| P1-2 first-row priority | shop, category, home | LCP ≤ 6 s (shop); `lcp-discovery-insight` priorityHinted true, eagerlyLoaded true | below-fold cards still lazy (count requests ≤ 12 at load) |
| P1-3 video | home | media ≤ 2.5 MB; transfer ≤ 4 MB; LCP ≤ 4 s | hero plays, poster shown, no CLS regression |
| P1-4 CLS | shop, category | CLS ≤ 0.1 in 5/5 mobile & desktop runs | CLS=0 on home/PDP unchanged |
| P2-1 API cache | all | 2nd request `cf-cache-status: HIT`; TTFB < 150 ms; Home API payload ≤ 10 KB gz for products | admin edits reflect within TTL; no stale prices at checkout |
| P2-2 defer pixel | all | TBT ≤ 200 ms; Pixel PageView still fires (Meta Events Manager) | consent rules |
| P2-3 fonts/CSS | all | FCP −0.3 s | no FOIT/CLS |

Rules: compare medians and ranges with the same aggregation as `baseline-comparison.md`; report regressions; if a run fails, document it (as in `test-environment.md`) and retry ≤ 2 times. After each release capture a new `reports/performance/<release>/` folder rather than overwriting this one. Add warm-cache runs (user-data-dir persisted, `--disable-storage-reset`) and a Performance trace for Home to close gaps listed in `limitations.md`.
