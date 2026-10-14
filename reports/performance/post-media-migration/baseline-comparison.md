# Before / after comparison

**Baseline** = `reports/performance-audit/lighthouse/summary.txt` (3 runs, Lighthouse 13.5.0, Chrome 154, same default mobile throttling, production, early Oct 2026). **Current** = median of 5 valid mobile (3 desktop) runs in `lighthouse-results.csv`.
Reduction % = (baseline − current) / baseline × 100; negative = regression. Score is shown as point change.

## Comparability warning
This is a before/after of **production as a whole**, not of the image migration alone. Between the baseline and now, the deployed frontend also changed (hero/CLS fixes, single `/settings` fetch, `limit=20` shop pagination, canonical-URL srcset on product cards, helmet). Also the test machine's connection differs per day (Lighthouse's simulated throttling reduces but does not remove this; baseline LCP on shop ranged 20–65 s across 3 runs). Read the image-attributable part in the "Image bytes" rows, which are mechanical, not in the LCP/score rows.

## Mobile
| Metric | Baseline | Current median (range) | Abs change | Reduction % |
|---|---:|---:|---:|---:|
| **Home** score | 9 | 52 (37–53) | +43 pts | n/a |
| Home LCP | 16.26 s | 10.6 s (9.7–12.0) | −5.7 s | 34.8% |
| Home CLS | 1.113 | 0 | −1.113 | 100% |
| Home TBT | 1049 ms | 388 ms (315–1127) | −661 ms | 63% |
| Home FCP | 3.96 s | 3.1 s | −0.9 s | 22% |
| Home TTFB | 149 ms | 125 ms | −24 ms | 16% (noise-level) |
| Home total transfer | 19.88 MB | 11.93 MB | −7.95 MB | 40.0% |
| Home image bytes | 6.09 MB (19 img) | 0.55 MB (13 img) | −5.54 MB | 91% |
| Home media (mp4) bytes | 12.50 MB | 10.52 MB | −1.98 MB | 16% |
| **Shop** score | 38 | 49 (47–53) | +11 pts | n/a |
| Shop LCP | 48.77 s (20.2–64.5) | 9.1 s (8.5–9.7) | −39.7 s | 81.3% |
| Shop CLS | 0.091 | 0.091 | 0 | 0% (**unchanged**) |
| Shop TBT | 811 ms | 373 ms (308–450) | −438 ms | 54% |
| Shop FCP | 3.92 s | 3.2 s | −0.7 s | 18% |
| Shop TTFB | 416 ms | 344 ms | −72 ms | 17% |
| Shop total transfer | 134.95 MB | 1.70 MB | −133.25 MB | 98.7% |
| Shop image bytes | 134.13 MB (43 img) | 0.95 MB (22 img) | −133.18 MB | 99.3% |
| Shop requests | 73 | 51 | −22 | 30% |

## Desktop (baseline had 3 home / 2 shop runs)
| Metric | Baseline | Current | Reduction % |
|---|---:|---:|---:|
| Home score | 38 | 70 | +32 pts |
| Home LCP | 4.63 s | 3.0 s | 35% |
| Home CLS | 0.916 | 0 | 100% |
| Home transfer | 16.44 MB | 9.85 MB | 40% |
| Shop score | 48.5 | 61 | +12.5 pts |
| Shop LCP | 23.2 s (2 runs: 40.3, 6.1) | 2.9 s | 87% (baseline is highly unstable) |
| Shop CLS | 0.23 | 0.24 | −4% (regression within noise) |
| Shop transfer | 102.97 MB | 1.70 MB | 98.3% |

## Product detail & category pages
**NOT COMPARABLE**: no historical measurement exists. Current values are the new baseline (see `lighthouse-results.csv`, `raw/medians-table.md`).

## Per-card image delivery (actual browser traffic, Shop mobile run 1)
- Current: 20 product-card images, all `400.webp`, `image/webp`, 914,747 B total → **45.7 KB mean per card**. No duplicates, no HTML-instead-of-image responses.
- Baseline per-image mean: 134.13 MB / 43 images ≈ 3.1 MB (includes non-card images, so treat as an upper-bound ratio, not a clean per-card figure). Original-asset medians from `reports/media-and-bundle-investigation.md`: 340 KB (max 4 MB) per original JPEG. Per-card reduction vs the median original ≈ 87% (340→45.7 KB); the 99% shop figure is mostly because the old Shop requested far more/bigger files.
- Original-bytes-represented vs stored-variant bytes for all 1,324 images: **NOT RUN** (needs a full storage listing; out of scope for a low-volume audit).

## What can be attributed to what
| Effect | Supported by |
|---|---|
| Shop/Home image bytes −91…−99% | Mechanical: variants + srcset + pagination. Image migration is necessary but not alone sufficient (srcset and `limit=20` were also needed) |
| Home CLS 1.11 → 0 | Layout-reservation fixes, not images |
| TBT −54…−63% | Not image-related; likely fewer images/DOM and the settings/product fetch removal. Cause **not proven** |
| LCP improvements | Mixed; environment variance is large. Directional only |
