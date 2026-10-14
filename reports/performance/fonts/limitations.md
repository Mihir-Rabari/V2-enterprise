# Limitations

- The `nofonts` variant is an upper bound, not a design: it also removes font CSS request and glyph rendering work, so part of its gain would not be reachable by any real font optimisation.
- Per-page effects are small relative to run-to-run noise (control LCP ranges 0.7-1.6 s wide). Conclusions rely on 15 rotated pairs per comparison; per-page ranges overlap.
- n=4 for `preload` on A2 (one failed run), and one control run (`ctl prodC4-2`) was re-run out of rotation after a failure. The machine clock jumped about 20 minutes mid-run (suspend/resume), which could have affected the surrounding runs; no outlier was removed.
- DevTools throttling only; Lighthouse simulated runs were not repeated for fonts. Real-device behaviour (HTTP/2 priorities, system fallback metrics, font cache across pages/visits) not measured; repeat visits with warm font cache not tested.
- No visual regression test was needed (no change shipped), so `nofonts` and `preload` typography was not reviewed visually; the only rendering evidence is CLS.
- The `₹` explanation (FN-03) is based on a code-point scan of one rendered PDP; other pages may need latin-ext for other reasons. Product names or descriptions with non-latin characters would trigger it too.
- Subset-size estimates (FN-07) are arithmetic, not measured. Self-hosting and licensing (Inter/Playfair are OFL) not evaluated beyond that.
- Local harness (no Cloudflare edge for HTML/JS, production API proxied).
- Test traffic loaded the real GTM/Pixel (see previous audit's disclosure).
