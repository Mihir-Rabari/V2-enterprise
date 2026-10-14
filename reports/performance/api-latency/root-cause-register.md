# Root-cause register

| ID | Finding | Status | Evidence | Confidence | Action |
|---|---|---|---|---|---|
| AP-01 | API TTFB floor 0.44-0.91 s per call independent of payload/query | **Measured**; cause unproven (origin RTT vs app overhead) | `payload-audit.csv`, HTML TTFB 0.12-0.48 s from the same client | HIGH (exists) / LOW (cause) | Add `Server-Timing` on staging; do not blame MongoDB yet |
| AP-02 | No API caching: no `Cache-Control`, all `DYNAMIC`, ETag only; Express has no `compression` (Cloudflare brotli-compresses) | **Measured** | `api-performance.csv`; `app.ts:78,142,150` | HIGH | Roadmap P1 |
| AP-03 | Duplicate `/settings` (SettingsProvider + page-local fetches in Shop, SubCategories, Categories, Contact, Login) | **Fixed (C1)** | requests 2 -> 1 on Shop/Category | HIGH | About page still fetches its own copy (needs `aboutContent`; left) |
| AP-04 | Category route sends unfiltered `/products` first, then repeats after `/categories`; slug URLs never filter (case-sensitive match) | **Fixed (C2)**; hyphenated slugs still unmapped | requests 2 -> 1; LCP -16%, CLS 0.24 -> 0.0001, bytes -30% | HIGH | Slug<->name mapping needs `slug` in params or a server-side slug filter |
| AP-05 | Home secondary requests wait for hero+categories (about 0.8 s waterfall) | **Fixed (C3)** | last API end 6.44 -> 5.67 s | HIGH (timing), LOW (user impact: below fold / video LCP) | |
| AP-06 | Home `limit=300&groupByColor=true`: 440 KB decoded, 300 of 436 products, full documents; client-side filtering over a truncated set | Measured, **not changed** | `payload-audit.csv`; `Home.tsx:268,442-505` | HIGH | Needs server-side filtering for Essentials; roadmap |
| AP-07 | Backend: `/products` no projection / not lean / `sort` ignored on non-grouped path (`products.service.ts:152`); grouped path groups all matches before skip/limit; no indexes on status/createdAt/price | Static finding, **not measured against a DB** | backend audit | MEDIUM | Prove with `explain()` on staging before adding indexes |
| AP-08 | `/sliders/promotional` runs a second, unused query (`sliders.routes.ts:26`); `/reviews/*` unbounded | Static | backend audit | MEDIUM | small cleanup |
| AP-09 | `GET /products/:id` returns INACTIVE products publicly (`products.service.ts:164-203`) | **Security/correctness** | code | HIGH | fix before any shared caching |
| AP-10 | `POST /payments/create-order` trusts client `amount` (`payments.controller.ts:7-13`) | **Security** | code | HIGH | recompute server-side |
| AP-11 | `GET /products?status=ALL|INACTIVE` varies by admin `Authorization` on the same URL; axios sends the token on every GET | Cache-safety blocker | `products.controller.ts:11-20`, `apiClient.ts:47-53` | HIGH | separate admin path or bypass rule |
| AP-12 | Stock decrement targets `variants.$` which is not in the schema (`orders.service.ts:130-137`) | Correctness | code | MEDIUM | fix independently |
| AP-13 | PDP product API moved earlier does not improve LCP under bandwidth saturation | From earlier audit; PDP unchanged here | `../pdp-critical-path/` | HIGH | none |
