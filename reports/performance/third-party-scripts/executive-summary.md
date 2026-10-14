# Executive summary: Meta Pixel and GTM loading (item 04)

Data: [before-after.csv](before-after.csv), [runs.csv](runs.csv). Method: [methodology.md](methodology.md). 90 valid runs (3 variants x 3 PDPs x 5 runs x 2 throttling modes), rotated order, no failures.

## Result
| Change (tested alone) | Real throttling (DevTools) | Lighthouse simulated | Verdict |
|---|---|---|---|
| **Defer GTM** until load + idle | LCP -6.6% / -9.9% / -7.3% (A2/B3/C4: 7178->6706, 7109->6408, 6440->5967 ms); FCP -9..-12% (4.03->3.64 s); main image starts 0.3-0.8 s earlier; TBT within noise (+1%, +10%, +2%) | LCP -1.0% / -3.7% / +9.8%: no consistent effect | **Keep (conditionally)** |
| Defer Meta Pixel until load + idle | LCP -5.3% / -7.8% / +4.8%; FCP -10..-12%; **TBT +23..+48%**; PageView beacon moves from about 6.0 s to about 12.5 s | -17.9% / -3.3% / +6.9% (very wide ranges) | **Reject** |

What improved: FCP (both), LCP (GTM, all three pages, real throttling). What did not: TBT, the simulated Lighthouse headline/score, any improvement from the Meta change that is not offset by a TBT regression and a doubled PageView delay. GTM's own cost is small (about 18 ms CPU); the gain comes from taking 119 KB off the throttled link while the JS bundles and main image load.

## Evidence supports keeping the GTM deferral, with a caveat
The change is in the working tree (`frontend/index.html`, +3/-3 lines, [raw/gtm-deferral.patch](raw/gtm-deferral.patch)); not committed. The `dataLayer` and `gtm.start` are still created immediately; in a control-vs-variant browser check the `dataLayer` events (`gtm.js`, `gtm.dom`, `gtm.load`), single `gtm.js`/`fbevents.js` loads, drained `fbq` queue and empty console were identical ([tracking-regression-checklist.md](tracking-regression-checklist.md)). **It must not ship until the GTM container's tags and triggers are verified in GTM Preview on staging** (I could not inspect them; application code sends no events itself, so every conversion event lives in the container). There is no consent mechanism in the codebase, so none could be bypassed.

## Findings about current loading ([script-loading-audit.md](script-loading-audit.md))
Both scripts are async and load once; no duplicate init. The app fires no tracking events. Meta's chain (fbevents -> signals/config -> gateway/beacon) is what makes it heavy (278 KB, two long tasks).

## Checks
`tsc` clean; production `vite build` OK; frontend media tests 6/6; backend tests 9/9. Existing PDP changes preserved.

## Disclosure
Lighthouse runs and browser checks loaded real GTM/Pixel from `127.0.0.1` pages, so production analytics received test events (filter that hostname).

## Next
Hypothesis (untested): after this change the main image still overlaps Meta (278 KB) and fonts (156 KB); fonts are the next isolated experiment, then Meta delivery by a different route (e.g. on first interaction or via GTM) only if the PageView-timing risk is accepted by the owner.
