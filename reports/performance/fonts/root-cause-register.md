# Root-cause register (fonts)

| ID | Finding | Status | Evidence | Confidence |
|---|---|---|---|---|
| FN-01 | Fonts do not delay FCP or block text rendering: file requests begin at FCP (swap), CLS about 0 | **Proven** | `font_first_start` vs `fcp`; CLS 0-0.0001 | HIGH |
| FN-02 | The three font files (156 KB, VeryHigh priority) overlap the main image download and cost at most about 0.46 s LCP (about 6.5%, better in 12/15 pairs) | **Measured upper bound** (diagnostic variant, ranges overlap per page) | `nofonts` vs `ctl` | MEDIUM |
| FN-03 | 85 KB (55%) of font bytes is Inter latin-ext, requested solely for the rupee sign `₹` | **Proven** (only non-latin code point on the PDP; file list) | code-point scan, network log | HIGH |
| FN-04 | Preloading Inter latin hurts: FCP +163 ms, LCP +247 ms, main image requested later | **Proven negative** (worse in 13/14 FCP and 10/14 LCP pairs) | `preload` vs `ctl` | MEDIUM-HIGH |
| FN-05 | Extra weights/variants being downloaded | **Disproved** (variable Inter; 3 files only) | font inventory | HIGH |
| FN-06 | `font-display` change would help | **Not supported**: already `swap`; `optional` would not remove the bytes and risks never showing the brand font on first visit | analysis | MEDIUM |
| FN-07 | Self-hosting a latin + `₹` subset (about 25-30 KB less, estimated) would save about half of FN-02 (about 0.2-0.25 s) | **Hypothesis, untested**; below this lab's detectability; needs font tooling and design QA | arithmetic from FN-02/FN-03 | LOW-MEDIUM |
