# Validation

## Final A/B (paired, alternating order, strictly sequential; harness v2; builds `dist-base` = images-only, `dist-defer` = final working tree)
Data: `before-after.csv` (labels `ab-dt-base/defer`, `ab-sim-base/defer`), `lcp-breakdown.csv`. 15 valid runs per label, 0 failures.

### DevTools throttling (real 150 ms RTT / 1.6 Mbps / 4x CPU)
| Page | Metric | Before median (range) | After median (range) | Change |
|---|---|---:|---:|---:|
| A2 | LCP | 9651 (9454-10179) | 7620 (7109-7781) | -21% |
| A2 | main image duration | about 4.5 s | about 2.0 s | |
| B3 | LCP | 9647 (9287-10441) | 7286 (6734-9785) | -24% |
| B3 | main image duration | about 4.4 s | about 2.2 s | |
| C4 | LCP | 7052 (6247-7546) | 6820 (6707-6978) | -3% (within noise) |
| all | FCP | 4354 / 4409 / 4260 | 4354 / 4286 / 4378 | unchanged |
| all | TBT | 1299 / 1152 / 1118 | 1172 / 1213 / 1368 | within noise (ranges overlap) |
| all | CLS | max 0.0001 | max 0.0001 | unchanged |
A repeat of the defer build in the later `abc` pair gave LCP 7283 (7067-10861) / 7237 (6890-7545) / 6704 (6452-7851): same medians, one 10.9 s outlier on A2.

### Lighthouse simulated (headline, default)
| Page | LCP before -> after (ms) | Score before -> after | TBT before -> after |
|---|---|---|---|
| A2 | 8871 -> 8865 | 57 -> 48 | 463 -> 860 |
| B3 | 8974 -> 8747 | 50 -> 49 | 800 -> 815 |
| C4 | 8220 -> 8282 | 54 -> 52 | 569 -> 667 |
**The simulated headline does not show the improvement** and the score is noisier than the effect (ranges 43-59 / 46-58). I do not claim a headline score win. The scores in this table fall slightly; TBT ranges overlap fully (A2 after 411-1291 vs before 439-782), so I attribute this to noise but could not rule out a small TBT cost from the extra state update. Observed (unthrottled) LCP: A2 2104 -> 1795, B3 1956 -> 1976, C4 1606 -> 1672 ms.

## Checks run on the final tree
- `npx tsc --noEmit` (frontend): exit 0.
- `npx vite build` (frontend, plain production build): succeeded.
- `npm run test:media` (frontend): 6/6 pass. `npm test` (backend): 9/9 pass.
- No ESLint config; no component/browser tests exist for ProductDetails. **Not run:** manual interaction (thumbnail switching, swatch navigation, zoom loupe, video mode), real-device DPR-2 sharpness.

## Run validity
- Valid: all labels above. Invalid/superseded (not used): `superseded/` (harness v1 with per-request Brotli q11), earlier `reports/performance/pdp-images/{after,run-*,v-*,w-after}` (server/API-URL bugs).
- Failures recorded: `dt-baseline prodC4-1` (Chrome protocol error, excluded: n=2), `dt-lowprio-thumbs` and `dt-defer-secondary` (1-2 failures each, "interstitial"/"session closed"; those labels only used as exploratory data).
- Artifacts: traces kept only for run 1 of `ab-dt-base`, `ab-dt-defer`, `ab-sim-base`, `abc-dt-combo` (`raw/artifacts/*/*-1/trace.json.gz`); devtools logs for every run.

## Reproduce
1. `cd frontend; MSYS_NO_PATHCONV=1 VITE_API_URL=/api/v1 npx vite build`, copy `backend/public` to a dist dir.
2. `node raw/serve.js <dist> 3100` (and second build on 3101).
3. `bash run-ab.sh` (about 35 min) then `node analyze.js <labels>; node summarize-cmp.js <labels>`.
