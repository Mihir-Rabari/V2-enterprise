# Validation

Data: `runs.csv`, `before-after.csv`, `duplicate-requests.csv`, `request-inventory.csv`. DevTools throttling, 5 paired runs per page and variant, 0 invalid runs. ctl = before, c123 = after (C1+C2+C3).

## Page level (medians, min-max)
| Page | Metric | ctl | c123 | Verdict |
|---|---|---|---|---|
| Category `/MENS/TSHIRT` | LCP | 11431 (11051-11622) | 9575 (8852-9833) | **improved** (ranges disjoint) |
| | score | 27 (24-37) | 41 (32-43) | improved |
| | CLS | 0.2435 (0.0001-0.2435) | 0.0001 (0-0.2435) | improved (median; one after-run still shifted) |
| | TBT | 910 (650-1139) | 702 (585-818) | within noise |
| | API requests / products requests | 8 / 2 | 6 / 1 | **improved** |
| | total bytes / image bytes | 1,896,659 / 1,131,796 | 1,336,093 / 582,020 | -30% / -49% |
| | last API response end | 5900 (5303-6800) | 5163 (5015-5249) | improved |
| Shop `/shop` | LCP | 10068 (9289-11317) | 10352 (9497-11157) | no change |
| | API requests / `/settings` | 7 / 2 | 6 / 1 | improved |
| | API bytes | 14,099 | 11,581 | -18% |
| | TBT / CLS | 678 / 0.0001 | 717 / 0.0001 | unchanged |
| Home `/` | LCP | 10759 (10115-12585) | 10868 (10307-11042) | no change (hero video) |
| | last API response end | 6439 (5642-6572) | 5666 (5522-5777) | **improved** (-12%) |
| | API requests | 11 | 11 | unchanged |
| | TBT | 1054 (710-1274) | 642 (539-956) | ranges overlap; not claimed |
| PDP B3 (regression check) | LCP / TBT / CLS / requests | 6922 / 705 / 0.0001 / 6 | 6889 / 715 / 0.0001 / 6 | no regression |

Caveats: the Category result combines C1 and C2 (the intermediate builds were not run); the LCP element on the Category route changes (before: a wrong unfiltered first page, after: the filtered list), so part of the gain is "correct content, fewer images" rather than a faster identical page. Home total bytes vary by 3-7 MB from video range requests and are not used.

## Endpoint level
Production endpoints are unchanged (no backend changes): see `api-performance.csv`/`payload-audit.csv`. Request-count reductions: `/settings` 2 -> 1 (Shop, Category), `/products` 2 -> 1 (Category), duplicate requests table in `duplicate-requests.csv`. Cache hit ratio: 0% (all DYNAMIC) before and after. DB operations: not measurable (no server-side access).

## Functional checks
| Check | Result |
|---|---|
| `tsc --noEmit` | pass |
| `vite build` (production) | pass |
| `npm run test:media` | 6/6 |
| backend `npm test` | 9/9 |
| `/mens/tshirt` filtering (browser, final build) | pass: one request with `subCategories[]=tshirt`, only T-shirts listed, one `/settings` |
| Settings/navigation/footer still populated (Navbar/Footer use the same provider) | not re-verified visually beyond Lighthouse runs rendering; **unverified** manually |
| Shop pagination, filters, infinite scroll after C2 | **unverified** (code path for user-selected filters unchanged apart from case-insensitive match) |
| Hyphenated category slugs | known not handled |
| Home sections after C3 (hero, promo, marquee, reviews, lookbook) | request set unchanged (11 requests, same endpoints); visual check **unverified** |
| Admin CMS edit visibility, cart/checkout, auth/private data | **unverified** (no credentials/staging; no backend change made, so only the frontend settings sharing could affect them: Login/Contact now read the provider's settings loaded at page start, so an admin settings edit appears after a reload, as for Navbar before) |
