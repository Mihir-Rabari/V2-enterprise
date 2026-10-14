# Methodology

## State preserved
Branch `perf/pdp-responsive-images`, HEAD `68984e7`. Uncommitted work (ProductDetails responsive images + `mainImageLoaded` gate, and the separate GTM deferral in `frontend/index.html`) is untouched: `raw/final-working-tree.patch` is byte-identical to `raw/starting-working-tree.patch` (and to the previous audit's final patch). The GTM patch is kept separately in `raw/gtm-deferral.patch`. Nothing committed, stashed, reset, or deployed.

## Control
The built current tree with the **GTM deferral reverted in the built `index.html` only** (restored to HEAD's original snippet, `raw/variants/make-font-variants.js ... ctl`), so the control is "ProductDetails changes only" and the font experiments do not interact with the separate GTM candidate. Meta, images, API and app code identical across variants.

## Variants (each differs from control in `index.html` of a copy of the built dist only)
| Variant | Change | Purpose |
|---|---|---|
| `ctl` (:3100) | none | control |
| `nofonts` (:3101) | removes the Google Fonts preload + stylesheet links | **diagnostic upper bound** (what all font traffic costs); not a shippable design |
| `preload` (:3102) | one `<link rel=preload as=font crossorigin>` for Inter latin woff2 | the one realistic "preload only the genuinely critical font" candidate |

## Harness
Same validated local harness as the previous audits (Lighthouse 13.5.0, Chrome 154, mobile profile, **DevTools throttling** 150 ms RTT / 1.6 Mbps / 4x CPU, Brotli-cached local server, production API read-only proxy, CDN images). Paired and rotated: 5 iterations x 3 PDPs x 3 variants, 5 different orderings, sequential (`run-fonts.sh`). Simulated-throttling runs were not repeated because earlier audits showed they do not capture bandwidth contention.
Run validity: 45 runs, 2 failed (`ctl prodC4-2`: "connection closed", `preload prodA2-3`: page load failure) after the machine's clock jumped about 20 minutes mid-run (probably sleep/resume). `ctl prodC4-2` was re-run once, out of rotation (logged in its `run.log`); `preload prodA2-3` was not re-run, so `preload` A2 has n=4. No other run was excluded.

## Analysis
`node analyze-fonts.js dt` -> `runs.csv`, `before-after.csv` (median/min/max). Paired per-iteration deltas computed in-line (page x iteration pairs of variant vs control). Font bytes/timing from the Lighthouse network records; typography checks from the document (`document.fonts`, code-point scan of the rendered text) in the built-in browser.

## Reproduce
Build `MSYS_NO_PATHCONV=1 VITE_API_URL=/api/v1 npx vite build`, copy `backend/public` three times, `node raw/variants/make-font-variants.js <dir> ctl|nofonts|preload`, serve on 3100-3102, `bash run-fonts.sh`, `node analyze-fonts.js dt`.
