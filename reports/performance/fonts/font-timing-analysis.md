# Font timing analysis (DevTools throttling, control `f-dt-ctl`, n=5/page; also `third-party-scripts` control runs)

Source: `runs.csv`, `before-after.csv`, `raw/har/f-dt-ctl-prodB3-1.sanitized.har.json`, traces in `raw/artifacts/`.

## What the traces show (control, medians; times in ms from first request)
| Event | A2 | B3 | C4 |
|---|---:|---:|---:|
| Font CSS complete | 1376 | 1363 | 1377 |
| FCP | 4260 | 4149 | 4123 |
| First font file requested | 4236 | 4130 | 4096 |
| Last font file complete | 6887 | 6740 | 6365 |
| Main image requested | 5071 | 4875 | 4982 |
| Main image complete (= LCP) | 7433 | 6678 | 6585 |
| Font bytes | 155,724 | 156,441 | 155,724 |

Representative request detail (B3, run 1, third-party-scripts control): Inter latin 4017-5170 ms, Playfair italic 4962-5905, Inter latin-ext 4963-6584, all priority VeryHigh, while the main image (priority High) is in flight 4723-6611 ms.

## Measured facts
1. **Fonts never block rendering.** The stylesheet finishes at about 1.37 s but the font files are not requested until text is first painted (`font_first_start` is within about 100 ms of FCP; exactly one file starts before FCP). With `display=swap`, text shows in the fallback font and FCP does not wait for font bytes.
2. **Fonts do overlap the main image download** on every PDP: 156 KB at VeryHigh priority share the throttled link with a 46-162 KB High-priority image for about 1.5-2.5 s.
3. **Layout shift from font swap is negligible**: CLS 0-0.0001 in all variants.
4. **Upper bound on what fonts cost** (diagnostic variant with no web fonts at all, not shippable): paired against control over 15 page/iteration pairs: LCP median -459 ms (better in 12/15), main image end -456 ms (11/15), FCP -158 ms (12/15), TBT -124 ms (11/15). Per-page medians: LCP A2 7514 -> 7103 (-5.5%), B3 6774 -> 6290 (-7.2%), C4 6667 -> 6110 (-8.3%); ranges overlap on every page.
5. **Preloading the critical font makes things worse**: Inter latin preloaded from 0.62 s competes with the JS bundles: FCP +163 ms median (worse in 13/14 pairs), LCP +247 ms (worse in 10/14), main image requested 0.2-0.4 s later, per-page LCP +0.4% / +3.0% / +6.6%. TBT improved in 9/14 pairs but within noise.

## Hypotheses (not tested)
- The 85 KB latin-ext file is 55% of font bytes and exists only for `₹`; removing it (self-hosting a latin + U+20B9 subset, or rendering `₹` in a fallback face) could recover roughly half of the upper bound, i.e. about 0.2-0.25 s LCP: below what this lab can resolve with n=5 (noise about 0.5-1 s).
- Delaying font activation until the main image has painted would capture most of the upper bound but needs page-specific gating (a generic LCP-observer gate would also delay typography on Shop/Home) and risks visible FOUT; not tested.
