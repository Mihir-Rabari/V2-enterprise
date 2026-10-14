# Limitations

- **GTM container and Meta Events Manager were not inspectable.** I could not confirm which tags/triggers/conversions exist or that they still fire; see the MANUAL rows in `tracking-regression-checklist.md`. This is the main reason the change is "supported by performance evidence, not cleared for release".
- **No consent system exists** to test; consent-dependent behaviour is untested by construction.
- **Local harness, production API and CDN; no Cloudflare edge for HTML/JS.** Absolute numbers are not production numbers. One machine, one network, 5 paired runs per page and mode.
- **Effects are small relative to noise on some pages.** Control B3 has a 10.6 s outlier; A2 meta range 6402-7721 ms. Medians and rotated order were used; the GTM LCP gain is consistent in sign on all three pages but only A2's ranges are cleanly disjoint.
- **Lighthouse simulated metrics disagree** with the real-throttling result (TP-04). My explanation is a hypothesis; I did not run a separate experiment on Lantern.
- **TBT**: Meta deferral raised it; the mechanism (TP-05) is hypothesised. Another tool's processes were present on the machine and could not be controlled, adding CPU noise.
- **Fonts were deliberately not changed** (per instructions); their 156 KB overlap remains in every variant.
- **INP, real-user data, GTM Preview, Meta Test Events**: not measured. Late-load behaviour after in-app navigation and attribution parameters: not tested.
- Sanitized HARs are derived from Lighthouse network records. Traces only for run 1 of the dt runs; sim traces were discarded for size.
- Test traffic reached production analytics (see checklist).
