# Test environment

| Item | Value |
|---|---|
| Audit window | 2026-10-13, 07:23–07:45 UTC (valid matrix); probes 07:45–08:00 UTC |
| Production origin | `https://v2enterprise.in` (HTTP 200, Cloudflare). Media host `https://cdn.v2enterprise.in` |
| Deployed release | Not directly verifiable (no version endpoint). Evidence the current code is live: helmet headers on responses, hashed bundle `index-Dk3ow02O.js` / `index-Czm-KyDM.css`, product cards emit `srcset` 400w/800w (code from `mediaUtils.ts`), `/shop` fetches `limit=20`. `origin/main` and `origin/dev` are both `68984e7`. |
| Lighthouse | 13.5.0 (same version as the historical audit), installed into an isolated directory outside the repo (`C:\Users\mihir\lhtool`), nothing global |
| Browser | Headless Chrome 154.0.0.0 (`--headless=new --no-sandbox`), Windows 11, operator's home machine/ISP (benchmarkIndex ≈ 2750) |
| Mobile config | Lighthouse default mobile: 412×823 @1.75 DPR, simulated throttling rtt 150 ms / 1.6 Mbps down / 4× CPU. Identical to the historical `home-mobile-1.json` config |
| Desktop config | `--preset=desktop`: 1350×940, rtt 40 ms / 10 Mbps, 1× CPU |
| Cache state | Lighthouse default = cold (storage cleared each run). **Warm-cache Lighthouse runs: NOT RUN** (see limitations) |
| Runs | 6 URLs × (5 mobile + 3 desktop) = 48 valid runs, strictly sequential. Script: `run-lighthouse.sh`; every JSON/HTML in `lighthouse/` |
| Consent / cookies | No consent banner was observed in the lab runs; Meta Pixel and GTM load unconditionally (see RC-06) |
| Redirects | None observed on the tested URLs (HTTP 200 directly) |

## URLs tested
| Key | Path | Notes |
|---|---|---|
| home | `/` | |
| shop | `/shop` | 20 cards (`limit=20`) |
| category | `/mens/tshirt` | `tshirt` is a valid slug in `/categories` |
| prodA2 | `/mens/tshirt/6a785fb5114b201c76906b57` | 2 photos |
| prodB3 | `/product/6a785e05114b201c76906af8` | 3 photos |
| prodC4 | `/combo-offers/bottom-wear-combo/6a5b0ecd3ade3ec2e3b30b13` | 4 photos |

Gallery sizes were chosen from one `GET /products?limit=100` (2/3/4 images per product were all that existed in that page).

## Invalid runs (documented, quarantined, not used)
1. `discarded-concurrent-runs/`: my first launch left several overlapping runner processes, so runs competed for CPU/network. Discarded.
2. `discarded-network-outage-runs/`: the operator's internet dropped mid-run (16 "Chrome prevented page load with an interstitial" errors + 1 `NO_FCP`). Discarded. (I deleted the `.html` copies of this set; the JSON remains.)
3. In the valid matrix, 2 runs failed on first attempt and succeeded on retry: `home mobile 3` (07:24:13) and `prodC4 mobile 2` (07:38:39). See `lighthouse/run.log`.

## Other probes
- Public GET/HEAD requests to the CDN and read-only API: ≤ 5 repetitions per endpoint, 1 s apart (`api-performance.csv`). One catalogue request of `limit=100`.
- Built-in browser pane (412×823, DPR 2) used for DOM inspection of `/shop`.
- No authentication, no cookies, no writes, no purge, no deploy.
