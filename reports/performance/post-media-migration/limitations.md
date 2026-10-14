# Limitations and NOT RUN items

| Item | Status | Why |
|---|---|---|
| INP | **NOT MEASURED** | Lab Lighthouse has no user interaction. TBT is reported instead (not a substitute). |
| Warm-cache Lighthouse runs | **NOT RUN** | Time-boxed; the harness only ran cold (storage cleared). Cache-hit behaviour is evidenced by headers/`cf-cache-status` only, not repeat-visit measurements. |
| Chrome Performance traces / sanitised HAR / screenshots | **NOT RUN** | I used Lighthouse network logs instead (`request-waterfalls.csv`, sanitised: query strings truncated to 40 chars, no headers, no cookies). The `har/` and `screenshots/` folders are empty. Lighthouse HTML reports are in `lighthouse/`. |
| Console errors | **NOT MEASURED** | Performance-only category excludes `errors-in-console`. |
| Per-DNS/TLS timings | Partially | Lighthouse network-requests audit does not expose them; only start/end/priority/size. |
| Original-vs-variant bytes for all 1,324 images | **NOT RUN** | Needs full storage listing; avoided as high-volume on production. Per-card numbers are from real page loads only. |
| Legacy `.mp4` cache behaviour on GET | **NOT RUN** | HEAD said DYNAMIC (HEAD is unreliable for Cloudflare cache status; image GET showed HIT). Not downloaded (4 MB). |
| Authenticated/admin pages, checkout | **NOT RUN** | Out of scope; admin thumbnails still not verified. |
| Hover-image duplicate requests, search suggestions | **NOT RUN** | No hover/typing in Lighthouse. |
| In-browser (built-in pane) lazy image inspection | Failed to trigger lazy loads in the pane, so rendered-vs-natural-size data come from Lighthouse network logs and the DOM `srcset`/`sizes` of the unloaded cards (`400w,800w`, `sizes="(min-width:1024px) 25vw, 50vw"`). Decoded image dimensions were not captured. |
| Deployed release identity | Inferred | No version endpoint; see test-environment.md. |

## Validity caveats
- Single machine and single ISP; baseline was run on a different day and code version → comparisons are indicative, see `baseline-comparison.md`.
- Lighthouse mobile is *simulated* throttling: absolute LCP (e.g. 15 s) is a lab-projected value, not what a real 4G phone necessarily sees. Desktop runs (LCP ≈ 3 s) show the same page when bandwidth is not the constraint.
- Variance: home mobile score 37–53, prodB3 mobile 33–47, TBT outliers (1127, 1828 ms). Medians are used.
- Two invalidated run sets (concurrency, network outage) are kept in `discarded-*` for transparency; their `.html` files in the outage folder were deleted.
- Lighthouse reports contain public page content only; no cookies/auth. Reports hold third-party URLs with Meta Pixel ID (public).
