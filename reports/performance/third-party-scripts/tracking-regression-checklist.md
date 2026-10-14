# Tracking regression checklist (GTM deferral)

PASS = verified here. MANUAL = must be verified by the owner (not possible from this environment). N/A = not applicable.

| Check | Result | How |
|---|---|---|
| `dataLayer` initialised before app code | PASS | snippet still creates it and pushes `gtm.start` synchronously (`index.html`) |
| `gtm.js` loaded exactly once | PASS | 1 script tag in control and variant |
| GTM lifecycle events (`gtm.js`, `gtm.dom`, `gtm.load`) still fire | PASS | `dataLayer` identical in control and variant (browser check) |
| Meta Pixel unchanged | PASS | Meta block not modified; `fbevents.js` once, `fbq.queue` empty, `fbq.loaded` true |
| Meta PageView still sent | PASS | beacon and gateway requests observed in every Lighthouse run; about 0.3-0.7 s earlier on the throttled phone in the GTM variant (`pageview_hit_start`) |
| Console errors | PASS (none in the browser check). Lighthouse errors-in-console audit not collected. | read_console_messages |
| Consent behaviour | N/A: no consent mechanism exists in the repo; scripts still load unconditionally, as before | repo grep |
| Page-view, product-view, ecommerce/purchase tags defined inside the GTM container | **MANUAL** | Use GTM Preview/Tag Assistant on a staging build: confirm each tag/trigger fires once, especially "Container Loaded", "Window Loaded" and "Page View" triggers and any purchase/add-to-cart tags. App code contains none. |
| Meta Events Manager receives PageView / server events | **MANUAL** | Test Events tab |
| GA/Ads attribution on landing (gclid, UTM) | **MANUAL** | Open a landing URL with parameters; confirm session source |
| Fast-bounce visitors (leave before load + idle) | **Behaviour change** | GTM now starts at about 0.6 s on a fast link (about 6.4 s on a throttled phone) instead of about 0.02 s / 0.63 s. Compare session counts on staging vs production over a day. |
| Side effect of this audit | **Disclosure** | Lighthouse runs and browser checks loaded the real GTM container and Pixel from `127.0.0.1` pages (a few hundred page loads across the whole audit), sending PageView/container events to production tags. Filter hostname `127.0.0.1` out of GA/Meta reports if that matters. |
