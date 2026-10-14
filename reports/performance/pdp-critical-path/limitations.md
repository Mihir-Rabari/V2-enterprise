# Limitations

- **Local harness, production API.** Pages are served locally; the API is production, proxied by my server (adds a small hop), images come from the real CDN. No Cloudflare HTML/JS edge. Absolute numbers are not production numbers; deploy and re-run to confirm.
- **Server-side API time not measured.** `api-timings.csv` includes network + proxy; no profiling or logs were available, so I make no database claims.
- **Lighthouse simulated metrics did not reflect the change** (PC-06); I do not know why. The effect is shown with DevTools throttling only (n=5 paired per page, one machine, one network).
- **TBT/score noise is large** (simulated A2 TBT 411-1291 ms; DevTools-throttled TBT 0.75-3.2 s). Another tool's Node/Chrome processes were running on the machine and could not be controlled; this adds noise to CPU-sensitive metrics, less to byte/ordering evidence.
- **HTTP/2 priority behaviour on real devices is untested** (DevTools throttling ignores it as measured), so `fetchpriority=low` is "no effect here", not "never useful".
- **Product data re-checked only for 3 PDPs** (2, 3 and 4 photos); products with many photos/videos untested. Network latency from other regions untested.
- Sanitized HAR files are derived from Lighthouse network records (no headers/cookies/queries), not browser HAR exports. Only run 1 traces of four labels are kept (size).
- INP, field data, hydration (none: client render), cold TLS from real clients: not measured.
- Not tested manually: thumbnail interaction, swatch navigation, zoom, video mode, screen-reader behaviour with empty `alt` before the main image loads.
- Harness defects found during the audit (v1 Brotli q11 per request; Git Bash path-mangled `VITE_API_URL`; overlapping runs) invalidated earlier local numbers, including the "9.6/8.9/8.8 s" medians quoted in the task brief (those came from harness v1; harness v2 baseline is 9.4/8.7/8.8 s simulated).
