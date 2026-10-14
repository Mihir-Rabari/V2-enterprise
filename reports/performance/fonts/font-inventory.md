# Font inventory

Source of truth: `frontend/index.html` (lines 44-50) and `frontend/index.css` (`--font-sans: "Inter"`, `--font-serif: "Playfair Display"`). No local `@font-face`, no font files in `frontend/public`, no self-hosting.

## Delivery
- One Google Fonts stylesheet: `https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600&display=swap`.
- Already well-behaved: `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com`, `rel=preload as=style`, stylesheet attached with `media="print" onload="this.media='all'"` (non-render-blocking), `display=swap`, `<noscript>` fallback. Weights are already slimmed (Inter 400/500/600, Playfair 400/700 + italic 400).
- Google serves Inter as a **variable** font per unicode-range subset, so Inter 400/500/600 map to the **same** woff2 URLs (no extra bytes per weight). `document.fonts` on the PDP lists 7 loaded FontFace objects but only 3 files are fetched.

## Files actually downloaded (woff2, transfer bytes, from the tested PDPs; `font-timing-analysis.md`)
| File | Family / style | Subset | Bytes | Why requested |
|---|---|---|---|---|
| `inter/v20/UcC73…SjIa1ZL7W0Q5nw.woff2` | Inter normal 400-600 | latin | 48,464-48,983 | body text |
| `inter/v20/UcC73…SjIa25L7W0Q5n-wU.woff2` | Inter normal 400-600 | **latin-ext** | 85,311-85,435 | **only because the page contains `₹` (U+20B9)**: it is the only code point on the PDP outside the latin range (6 occurrences; checked with `document.body.innerText`) |
| `playfairdisplay/v40/nuFRD…tHA-X-oE0o.woff2` | Playfair Display italic 400 | latin | 21,949-22,047 | italic serif headings (`font-serif italic`) |
| stylesheet `css2?...` | | | 1,396 | font-face rules |
Total per PDP: 3 files, 155.7-156.5 KB (+1.4 KB CSS). Home also fetches Playfair normal (38 KB) -> 195 KB; Shop: Inter latin + latin-ext only (135 KB) (from `reports/performance/post-media-migration` Lighthouse runs).

## Unnecessary variants?
No unused weight files are downloaded (variable font), no unused Playfair 700 or normal file on PDPs. The one questionable item is the 85 KB Inter latin-ext file used for a single currency glyph.
