# Methodology

## Repository state
`git status`: modified `frontend/index.html` (GTM deferral, separate candidate), `frontend/pages/ProductDetails.tsx` (responsive images + deferred thumbnails); this task added edits to `pages/{Shop,SubCategories,Categories,Contact,Login,Home}.tsx`. Starting diff: `raw/starting-working-tree.patch`; this task's diff: `raw/api-changes.patch`; combined: `raw/final-working-tree.patch`. No reset/stash/commit/push/deploy; GTM patch preserved (`raw/gtm-deferral.patch` in `../third-party-scripts/raw/`).

## Agents
Three read-only agents ran in parallel: A frontend request audit, B backend/API audit, C caching/correctness classification; they edited nothing. I verified their key claims against the code before use (Shop category mapping, SettingsContext, `resolveListStatus`, `getProductByIdService`, `createRazorpayOrder`) and against measurements (duplicate `/settings`, 2 product requests on category routes). Agent D (measurement) was done by me with the validated harness.

## Production endpoint probe
`api-measure.sh`: 15 public GETs x 5, 0.7 s apart, read-only, Accept-Encoding br/gzip, plus one decoded-size fetch per endpoint. First attempt discarded (`raw/baseline/`: `bc` missing, timing columns empty).

## Page-level harness (validated in earlier audits)
Local static server (`raw/../serve.js` copy in `../pdp-critical-path/raw/serve.js`, Brotli q9 cached) serving a branch build built with `MSYS_NO_PATHCONV=1 VITE_API_URL=/api/v1`, `/api/v1` proxied read-only to production, images/media from the real CDN. Lighthouse 13.5.0, Chrome 154, mobile profile, **DevTools throttling** (150 ms RTT, 1.6 Mbps, 4x CPU). Paired and rotated: `run-ab-api.sh "ctl:3100 c123:3103" "home shop category" dt 5` (30 runs) and a PDP regression pair (10 runs, `prodB3`). Control = current tree before this task's edits, GTM reverted in the built HTML only. Variant = control + C1+C2+C3. Two further intermediate builds (C1 only; C1+C2) were built (`raw/variants/`) but their runs were cancelled for time (`raw/discarded-4way-partial/`), as were a ctl-only baseline (`raw/discarded-ctl-only-baseline/`).
Known harness cautions applied: no overlapping runs; path-conversion safe API URL; Brotli cached. During the PDP pair I ran `vite build` and tests concurrently for about 40 s (CPU contention); PDP ranges are tight, so no visible effect, but noted.

## Analysis
`analyze-api.js` reads Lighthouse network records: API requests per navigation by endpoint, per-request start/end/size, LCP sub-parts, bytes by type. Outputs: `runs.csv`, `before-after.csv`, `request-inventory.csv` (run 1 per variant/page), `duplicate-requests.csv`, `payload-audit.csv`, `api-performance.csv`.
Raw: `raw/lighthouse/` (JSON), `raw/artifacts/` (devtools logs; traces for run 1), `raw/har/`.

## Reproduce
Build (`MSYS_NO_PATHCONV=1 VITE_API_URL=/api/v1 npx vite build`), copy `backend/public` per variant, `node raw/variants/make-font-variants.js <dir> ctl`, `node serve.js <dir> <port>`, `bash run-ab-api.sh ...`, `node analyze-api.js ab dt ctl,c123 home,shop,category 5`.
