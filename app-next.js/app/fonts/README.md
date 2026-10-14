# Self-hosted fonts

Variable woff2 fonts served via `next/font/local` from `app/layout.tsx`
(previously `next/font/google`, which fetches font metadata from
fonts.googleapis.com at compile time and 500s `next dev` when that fetch
fails — see the comment in `app/layout.tsx`).

Both families are licensed under the **SIL Open Font License 1.1**:

- **Inter** — Copyright (c) Rasmus Andersson (https://rsms.me/), OFL 1.1
  License: https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt
- **Playfair Display** — Copyright (c) Claus Eggers Sørensen, OFL 1.1
  License: https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/OFL.txt

The OFL 1.1 permits bundling, subsetting and redistribution of these files
in this repository.

## Files

| File | Family / style | Axis range | Size |
| --- | --- | --- | --- |
| `inter-variable-latin.woff2` | Inter, normal | wght 100–900 | 48,256 B |
| `playfair-display-variable-latin.woff2` | Playfair Display, normal | wght 400–900 | 38,404 B |
| `playfair-display-italic-variable-latin.woff2` | Playfair Display, italic | wght 400–900 | 38,804 B |

All three are the **latin subset** files that Google Fonts serves for these
families (the subset declared by the previous `subsets: ['latin']` config and
the only subset the site's English content needs). `app/layout.tsx`
re-declares Google's latin `unicode-range` on every `@font-face`, so
codepoint→font mapping is identical to the previous CDN/`next/font/google`
setup.

## Source URLs (fetched 2026-10-14)

Resolved via the Google Fonts CSS API (the same query
`frontend/index.html` used):

```
https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600&display=swap
```

with a modern-Chrome User-Agent (to receive woff2 responses), then downloaded
from fonts.gstatic.com:

- https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2
- https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgA.woff2
- https://fonts.gstatic.com/s/playfairdisplay/v40/nuFkD-vYSZviVYUb_rj3ij__anPXDTnogkk7.woff2

## Regenerating / re-fetching

```sh
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600&display=swap"
# pick the `/* latin */` @font-face src URLs for each family/style and curl them
```
