# Limitations

- Local harness: HTML/JS served locally; API is production via a read-only proxy; images from the real CDN. Absolute LCP is not production LCP; throttled DevTools lab on one machine/ISP.
- No server-side timing, DB profiling, or `explain()`: the cause of the 0.4-0.9 s API floor is unproven; MongoDB is not implicated or cleared.
- No backend/edge cache was implemented or measured; every cache recommendation is a design, validated only by reading code.
- The A/B compares before vs after of three combined changes; intermediate builds (C1 only, C1+C2) exist but their runs were cancelled for time, so per-change attribution of the Category gain is inferred from request counts, not measured. The Category and Shop wins are not visible on Home or Shop LCP.
- The Category benchmark used the name URL `/MENS/TSHIRT`; the slug URL fix was verified functionally in a browser, not benchmarked. Two sequences of 4-variant/ctl-only runs were discarded for time (kept under `raw/discarded-*`).
- `vite build` and the test suites ran for about 40 s while the PDP regression pair was in progress (CPU contention); the PDP ranges stayed tight.
- Unverified flows: admin CMS publishing, cart, checkout, auth/private data, Shop infinite scroll/filter interactions, Home visual regression. No credentials or staging backend were available.
- Hyphenated or otherwise non-matching category slugs remain unmapped (frontend has only names).
- Agent findings (backend audit, caching audit) are static reads; I spot-checked the load-bearing ones but not every line reference.
- Test traffic loaded production GTM/Pixel from `127.0.0.1` pages (see earlier audit disclosure); filter that hostname in analytics.
- Home `limit=300` and its client-side filtering were deliberately not changed (semantics).
