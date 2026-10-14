# Methodology

## Source state
- Repository `K:\Projects\V2-enterprise`, branch `perf/pdp-responsive-images`, HEAD `68984e78b78799f33b06b439b24ee2ee07278ddf` (= `origin/main` = `origin/dev`).
- Uncommitted work preserved and never reset/stashed/committed: the responsive-image change to `frontend/pages/ProductDetails.tsx` (patch: `raw/pdp-images.patch`, sha256 prefix `1876df308420ea05`). During A/B builds I temporarily rebuilt from `git show HEAD:... + git apply raw/pdp-images.patch` and then restored the working file from a backup (`raw/ProductDetails.defer-secondary.tsx`); `git diff --stat` was checked after each swap.
- Experiments were applied as small patches and reversed with `git apply -R` (`raw/early-fetch.patch`). See `optimization-decision.md` for which one remains in the working tree.

## Harness (all local, audit-safe)
- `C:\Users\mihir\lhtool\serve.js` (copy in `raw/serve.js`): static server for a Vite build + **read-only GET proxy** of `/api/v1/*` to production; images come straight from `cdn.v2enterprise.in`. Non-GET returns 405. Builds use `MSYS_NO_PATHCONV=1 VITE_API_URL=/api/v1 npx vite build` (Git Bash otherwise rewrites `/api/v1` into a Windows path, which silently broke earlier attempts).
- **Harness defect found and fixed** (v1 -> v2): the first server re-compressed every JS/CSS response with Brotli quality 11 on each request (hundreds of ms of fake server latency), inflating asset timings and the simulated metrics (FCP 4.4 s vs 2.3 s). v2 pre-compresses once (Brotli q9, cached) and forwards `accept-encoding` to the API. v1 results are kept only in `superseded/` and not used for conclusions.
- Lighthouse 13.5.0 (installed in `C:\Users\mihir\lhtool`, nothing global), headless Chrome 154, default mobile profile (412x823 @1.75 DPR, rtt 150 ms, 1.6 Mbps, 4x CPU). Two throttling modes:
  - `sim` (default, "simulate"): Lantern model. Produces the headline Lighthouse metrics comparable with earlier reports.
  - `dt` (`--throttling-method=devtools`): throttling really applied in the browser, so observed timings are ground truth for ordering/causality.
- `-GA=<dir>` keeps `trace.json`, `devtoolslog.json`, `artifacts.json` per run (gzipped after the audit).
- Strictly sequential runs, one machine, no other audit work running. (An unrelated process family from another tool was present on the machine; it could not be controlled; see limitations.)
- Commands: `bash run-trace.sh <label>` (sim, 5 runs/page), `bash run-trace-devtools.sh <label>` (dt, 3 runs/page), `bash run-ab.sh` (paired A/B, both modes, alternating order). Analysis: `node analyze.js <labels...>`, `node summarize-cmp.js <labels...>`.

## Pages
prodA2 `/mens/tshirt/6a785fb5114b201c76906b57` (2 photos), prodB3 `/product/6a785e05114b201c76906af8` (3), prodC4 `/combo-offers/bottom-wear-combo/6a5b0ecd3ade3ec2e3b30b13` (4).

## What each CSV contains
- `lcp-breakdown.csv`: per run score/FCP/LCP/CLS/TBT, observed FCP/LCP, LCP sub-parts (from Lighthouse's `lcp-breakdown-insight`, *observed* times), priority hint flag.
- `api-timings.csv`: product/settings/related/reviews request start, TTFB (send-end to headers), end, size, relative to first request.
- `timeline.csv`: HTML end, JS end, route-chunk start/end, product API start/end, main-image start/end/variant/bytes, long tasks.
- `before-after.csv`: median/min/max per label/page/metric.

## Run validity rules
A run is valid if Lighthouse returned no `runtimeError`. Failed runs are listed in `limitations.md`/`validation.md` and excluded, never silently dropped. Labels in `superseded/` are invalid for conclusions.

## Not measurable here
Server-side processing time of the API (no profiling access; the proxy hop and production network are included in every API time), INP, field data.
