# Methodology

## State preserved
Branch `perf/pdp-responsive-images`, HEAD `68984e7`. Starting uncommitted diff (ProductDetails responsive images + `mainImageLoaded` gate) saved as `raw/starting-working-tree.patch` and verified byte-identical to the previous audit's final patch. Nothing was stashed, reset, committed or deployed. The one change made by this task (GTM deferral, `frontend/index.html`, +3/-3 lines) is in the working tree as `raw/gtm-deferral.patch`; combined diff: `raw/final-working-tree.patch`.

## Harness (validated in `reports/performance/pdp-critical-path/methodology.md`)
Local static server (`serve.js`, Brotli q9 cached, read-only GET proxy to the production API, images from the real CDN), Lighthouse 13.5.0, headless Chrome 154, mobile profile. Two modes: `dt` (DevTools throttling applied for real: 150 ms RTT, 1.6 Mbps, 4x CPU) and `sim` (Lighthouse simulated, headline metrics). Same three PDPs as before (2/3/4 photos).

## Design
Three builds served at once: `ctl` (:3100, current tree), `meta` (:3101, only Meta Pixel injection deferred), `gtm` (:3102, only GTM injection deferred). The variants were made by editing only `index.html` of copies of the control build (`raw/variants/make-variants.js`), so fonts, ProductDetails, API and images are byte-identical across variants. `run-tp.sh`: for each of 5 iterations, 3 pages and 2 modes the three variants run back-to-back in a rotating order (5 different orderings) to cancel drift; strictly sequential. 90 runs, 0 failures, all valid (`runs.csv`).

Deferral mechanism (same for both): the stub, `dataLayer`, `fbq('init')` and `fbq('track','PageView')` calls stay immediate (queued); the vendor script is injected via `requestIdleCallback` (timeout 3 s) after `window.load`.

## Metrics and sources
`runs.csv` (per run) and `before-after.csv` (median/min/max per mode, variant, page): LCP sub-parts, request start/end/size for `gtm.js`, `fbevents.js`, `signals/config`, the `facebook.com/tr` PageView beacon and the birchub gateway, long tasks (total and Meta/GTM-attributable), script evaluation, TBT. Traces (run 1 per page, dt mode) and devtools logs: `raw/artifacts/`; Lighthouse JSON: `raw/lighthouse/`; sanitized HAR-like files (no headers/cookies/queries): `raw/har/`.

## Tracking behaviour checks
Manual check in the built-in browser against `:3100` (control) and `:3102` (GTM variant): `dataLayer` events, number of `gtm.js`/`fbevents.js` script tags, `fbq` queue drain, console errors. GTM container contents and Meta Events Manager were not accessible.

## Reproduce
`MSYS_NO_PATHCONV=1 VITE_API_URL=/api/v1 npx vite build`; copy `backend/public` three times; `node raw/variants/make-variants.js <dir> meta|gtm`; serve each; `bash run-tp.sh`; `node analyze-tp.js`.
