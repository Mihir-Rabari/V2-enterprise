# V2 Enterprise — Final Acceptance Report: Vite → Next.js Migration

**Date:** 2026-10-14 · **Auditor:** Hermes orchestration (principal-agent + 2 validation subagents)
**Baseline:** `dev` @ `4f4de7f` (all migration PRs merged) · **Repo:** `Mihir-Rabari/V2-enterprise`

---

## 1. Executive Verdict

# ✅ PASS WITH EXPLICIT EXCEPTIONS

The Next.js App Router migration in `app-next.js/` is **code-complete, functionally validated against a real backend + real MongoDB, and safe to keep as the release candidate** — with four explicitly-blocked areas that require either user-supplied dependencies (Razorpay TEST keys, staging R2 credentials) or out-of-tooling verification (mobile device-width pass). Production deployment remains unauthorized and untouched.

**What PASS WITH EXCEPTIONS means:** every migration-scoped requirement executed and passed on evidence (§§ 2–7). The exceptions (§ 8) are **not migration defects** — they are blocked staging integrations, inherited Vite-parity behaviors pending a product verdict, and tooling limitations. Nothing was mocked and reported as real; every blocked item names exactly what is missing.

---

## 2. Exact Git / PR / Branch State (verified live 2026-10-14 ~19:05 UTC)

| Item | Value | Evidence |
|---|---|---|
| `origin/dev` HEAD | `4f4de7f` | `git rev-parse origin/dev` after fetch |
| `origin/main` HEAD | `68984e78` (untouched throughout) | `git rev-parse origin/main` |
| main/dev ancestry | main strictly behind dev; dev contains PR #13 + #14 pre-migration work | merge-base = `68984e78` |
| Working tree | clean (0 modified, 0 untracked) | `git status --porcelain` = empty |
| Migration scope since baseline `c059abfa` (PR #14) | **134 files, 100% inside `app-next.js/`** | `git diff --name-only c059abfa..dev \| grep -v '^app-next\.js/'` → empty |
| `frontend/` + `backend/` touched by migration | **NO** — zero diffs since `c059abfa` | `git diff --name-only c059abfa..dev -- frontend/ backend/` → empty |
| Migration PRs | **16/16 merged into `dev`** (#15–#30), 0 open | GitHub REST `GET /pulls?state=all` |
| Non-dev-base PRs | #1–#12 (pre-migration, base `main`) — out of scope, untouched | same listing |

Pre-existing `main..dev` differences are the merged PR #13 (frontend performance) and PR #14 (security/correctness) — both merged **before** this engagement's baseline. The migration added nothing outside `app-next.js/`.

---

## 3. Automated Check Matrix — rerun at HEAD `4f4de7f` (chain executed 19:08–19:10, all logs in `/opt/data/work/acceptance/`)

| # | Check | Exact command (cwd) | Result | Evidence |
|---|---|---|---|---|
| 1 | Next.js production build | `bash buildq.sh app-next.js npm run build` (repo root) | **PASS** rc=0 | `Compiled successfully in 22.6s`, 26 static pages generated |
| 2 | TypeScript typecheck | `bash buildq.sh app-next.js npm run typecheck` (`tsc --noEmit`) | **PASS** rc=0 | zero errors, zero output |
| 3 | Unit tests | `npm test` (vitest run, app-next.js) | **PASS** — **62/62 tests, 6/6 files** | `Test Files 6 passed (6) · Tests 62 passed (62)`, 9.38s |
| 4 | Media/asset policy tests | `npm run test:media` (`node --test test/mediaUtils.test.ts`) | **PASS** — **6/6** | `# tests 6 · # pass 6 · # fail 0` |
| 5 | Route smoke harness | `SKIP_BUILD=1 SMOKE_PORT=3999 bash test/smoke-routes.sh` (fresh server from the §-3.1 build) | **PASS** — **22/22 routes** | `Result: 22/22 routes passed, 0 failed` |
| 6 | Vite production build (rollback app intactness) | `bash buildq.sh frontend npm run build` | **PASS** rc=0 | vite build completed, no errors |
| 7 | Vite media tests | `npm run test:media` (frontend) | **PASS** — 6/6 | `# pass 6 · # fail 0` |
| 8 | Lint | — | **NOT APPLICABLE** | No ESLint config or lint script exists in `app-next.js/`, `frontend/`, or root (verified by file listing + package.json). Nothing was skipped that exists. |

Rerun discipline: every check above was executed fresh against HEAD `4f4de7f` during this audit; no prior-run results were reused.

---

## 4. Route Acceptance Matrix (production build, live backend, cache-busted)

**Static storefront (18/18 = 200 with correct SSR titles):** `/` · `/shop` · `/categories` · `/new-arrivals` · `/about` · `/contact` · `/size-guide` · `/privacy` · `/returns` · `/shipping` · `/terms` · `/login` · `/signup` · `/forgot-password` · `/reset-password/:token` · `/cart` · `/checkout` · `/admin/login` — each SSRs its own `<title>` (legal routes have four DISTINCT titles — verified no shared-policy bug).

**Dynamic routes (full breadth, not one static example):**
| Family | Coverage | Result |
|---|---|---|
| `/product/[id]` | **all 9 seeded product docs** | 9/9 → 200, correct per-product `<title>`, self-canonical, real og:image + JSON-LD Product |
| `/[category]` | **all 6 categories** (MENSWEAR, WOMENSWEAR, Denim, Tailoring, Essentials, Outerwear) | 6/6 → 200 with category titles |
| `/[category]/[subcategory]` | `/MENSWEAR/Denim`, `/WOMENSWEAR/Essentials` | 200 |
| `/[category]/[subcategory]/[id]` | nested product route | 200, same PDP behavior (no duplicate implementation) |
| `/liked` | redirect | **307 → /account/wishlist** (server redirect; Vite used client-side Navigate to same target) |
| Unknown single segment `/totally-bogus-route` | soft-404 → 200 category shell | Vite-parity (see § 8-E) |
| Unknown deep path `/deep/bogus/path/here` | **404** (genuine) | PASS |

**Viewport coverage:** desktop verified throughout; mobile = CSS-evidence only (§ 8-C).

**Console/hydration:** **0 errors, 0 hydration warnings on every audited page** — storefront (16 pages, prior visual audit) and admin (login, dashboard, products, orders, OrderDetailsModal — this audit + subagent). Only benign info log: `[V2-API] Base URL … Mock Mode: DISABLED`.

---

## 5. End-to-End Workflow Results (real backend :5000 + real MongoDB :27017, seeded data)

| Workflow | Result | Evidence |
|---|---|---|
| Register → auto-login → token | **PASS** | 201, `v2_token` set, role CUSTOMER (fresh boundary user), `/auth/me` 200 |
| Login (customer + admin) | **PASS** | JWT 7-day lifetime, `v2_token`/`v2_user` keys — byte-identical shape to Vite |
| Logout | **PASS** | clears `v2_token`+`v2_user`, keeps `v2_cart` (test-suite contract, Vite parity) |
| Protected account routes | **PASS** | /account hub + orders/wishlist/addresses tabs; unauthenticated → login |
| Catalog: shop/filters/sort | **PASS** | "4 DESIGNS FOUND", 11 filter sections, sort options — identical to Vite (A/B parity) |
| PDP: variants/gallery/add-to-cart | **PASS** | size/color selection, add-to-cart, wishlist heart, related products |
| Cart: qty/remove/persistence/math | **PASS** | ₹3,299×2=₹6,598 live-DOM math, persistence across reload, `v2_cart` shape byte-compatible with Vite |
| **Checkout → real COD order (via UI)** | **PASS** | Order `#V2-1792002786130` placed through the Next.js checkout UI: COD, PENDING, ₹3,299, Fluid Midi Dress S/Ivory; confirmation screen rendered; order retrievable via `/orders/my` and admin |
| **Server-side pricing (PR #14 contract)** | **PASS** | client sends `{items, couponCode?}` only — no client-authoritative amount anywhere in the ported flow; order totals computed by `priceCart()` on the server |
| **Coupon E2E** | **PASS** | `V2FIRST` (10%, min ₹999) on Merino ₹3,599 → **discount ₹359.90, total ₹3,239.10** (exact `priceCart()` math), stored on order (`couponCode`, `discount`), rendered in admin OrderDetailsModal as **"DISCOUNT (V2FIRST)"**. Invalid coupon `BOGUS99` → **discount 0** (ignored server-side, order still placed) |
| **Inventory reservation** | **PASS** | Two atomic decrements verified in MongoDB: Fluid S **14→13** (UI order), Merino **12→11** (coupon order) |
| Wishlist CRUD | **PASS** | add → 1 item, remove → 200 (customer token) |
| Profile edit | **PASS** | `PATCH /auth/me` name edit persisted, then restored |
| Contact form | **PASS** (rendered + fields) | prior A/B parity sweep; submission receipt from seeded inquiries (INQUIRY INBOX 1) |
| Password recovery routes | **PASS** (route + form) | `/forgot-password`, `/reset-password/:token` render; reset E2E not exercised against mail (no SMTP in local env — see § 8) |
| **Admin login** | **PASS** | UI login (subagent, trusted-flow receipt): redirect to `/admin`, `v2_admin_session`/`v2_token`/`v2_user.role=ADMIN` set. Session-token path API-verified: login → 200 with token |
| **Admin dashboard** | **PASS** | Stats cards + Recharts paint with real data, cross-checked vs `/admin/stats`: revenue ₹2,499 (DELIVERED-only definition), growth 100.0%, customers 2 (live-updated), inquiries 1, category donut 5/4, monthly revenue single Oct point — **all match** |
| **Admin products + CRUD** | **PASS** | 9/9 rows; edit price ₹3,299→₹3,499 via UI → **persisted to Mongo (curl receipt)** → **restored ₹3,299** (verified, data left as found) |
| **Admin orders view + OrderDetailsModal** | **PASS** | deep-link `/admin?page=orders` renders table of all 5 orders (2 demo + 3 real test orders), AWB/tracking editors, status dropdowns; OrderDetailsModal renders items/totals/**DISCOUNT (V2FIRST)** |
| Admin deep-link refresh | **PASS** | `?page=` query-param semantics verified on hard load; unknown admin path segments fall back to dashboard (harmless, same as Vite) |
| **Authorization boundaries** | **PASS** | fresh CUSTOMER-role token: `GET /orders` (adminOnly) → **403**; `PATCH /products/:id` (admin write) → **403**; own `/orders/my` → 200. No-auth → 401. Backend enforces; client guards are UX only |
| Razorpay prepaid flow | **BLOCKED** | § 8-A |

**Data hygiene:** all test writes were made in the local staging DB only (3 orders, 1 boundary user, price edit round-tripped). Product price restored to ₹3,299 (verified). Production data untouched.

---

## 6. Real Integration & Staging Results

- **Environment:** real `mongod` 7.0.14 binary (OpenSSL-3/amzn2023 build), backend compiled from `backend/dist` with zod-validated env (MONGODB_URI, JWT_SECRET, JWT 7-day expiry, ADMIN_SECRET_CODE, **placeholder Razorpay keys**), CORS allowing both :3000 and :3001. Next :3001 = production build (`next start`), Vite :3000 = untouched original, both running simultaneously — **no port conflicts, no config interference** (§ 9).
- **API battery (admin token):** `/orders?page=1&limit=15`, `/admin/customers`, `/admin/stats`, `/admin/products`, `/reviews`, `/contacts`, `/categories`, `/settings`, `/auth/me`, `/sliders/hero`, `/sliders/promotional`, `/content/MARQUEE`, `/attributes` → **all 200** (tested from both Python and browser origin contexts).
- **Razorpay boundary (real request, placeholder keys):** `POST /api/v1/payments/create-order` with `{items:[{productId, quantity, size, color}]}` + Bearer token → **HTTP 500 "Failed to initialize payment with Razorpay"** — the flow prices the cart server-side first, then dies at Razorpay SDK init. This is the exact point where real TEST keys unblock the full matrix (§ 8-A). No mocks were used at any point.
- **Media manager:** `/admin/media` → **500** (R2 credentials intentionally absent locally). Real receipt, no fake uploads. See § 8-B.

---

## 7. Visual, SEO & Performance

- **Visual:** 16 storefront pages + admin interior audited — design system renders (typography, gold/charcoal palette, Recharts), **all product images load from CDN (pexels), favicon 200, self-hosted Inter/Playfair fonts (OFL)**. 11 screenshots on file (`/opt/data/cache/screenshots/`).
- **SEO:** sitemap **28 URLs generated live from DB** (13 static + 6 categories + 9 products, with lastmod) vs Vite's static 6 hardcoded — Next strictly better; robots exact (`Disallow /admin /account /checkout /cart`); per-route canonicals correct and distinct incl. shop-variant PDPs; PDP og:title/og:image + JSON-LD Product from real data; `/liked` 307; open-redirect guard holds on the real build.
- **Performance (method disclosed):** warm-loopback TTFB medians on the Next production server — `/` 2.4ms, `/shop` 2.2ms, PDP 18.7ms. These are local-network numbers, **not** Core Web Vitals; no CWV claims are made. Build output healthy (26 static pages, 22.6s compile). Vite TTFB measured only as a dev-server shell (not a production baseline) — comparison intentionally not claimed.

---

## 8. Known Issues, Blockers & Owners

| # | Sev | Issue | Status / Owner |
|---|---|---|---|
| A | **BLOCKED** | **Razorpay staging matrix** (success/failure/retry/duplicate-verification/inventory-rollback on prepaid) — requires TEST-mode keys (`rzp_test_…` + secret) which were requested twice and not yet supplied. Boundary pinned with a real 500 receipt; everything upstream of Razorpay SDK init is proven (server pricing, order creation, inventory, coupon math). | **User** — supply TEST keys |
| B | **BLOCKED** | **Media manager / uploads** — R2 credentials absent from local env; `/admin/media` 500s (real receipt). UI upload flow not exercisable without staging R2 config. | **User** — staging R2 config (or accept deferred) |
| C | **BLOCKED** | **Mobile device-width pass** — browser tooling lacks viewport control; responsive verified via CSS evidence only (viewport meta, Tailwind breakpoints, `lg:hidden` hamburger, backend `gridSettings.mobile:2`). Manual pass on a real phone required. | **User** — 10-min manual pass |
| D | MAJOR (pre-existing, seed-data) | Hero slide S3 video URL 404s — broken URL in seeded data; affects Vite identically. Not a migration defect. | **User** — fix seed/CDN URL at leisure |
| E | MAJOR (inherited parity, needs verdict) | **Soft-404 catch-all**: unknown single-segment paths → 200 + fabricated title + self-canonical (indexable). Exact Vite behavior (React Router `:category`). Suggested fix: `noindex` on unmatched categories — small validation-fix PR with user sign-off. | **User verdict** |
| F | Low (inherited) | `og:image` missing on non-PDP routes (repo-wide dangling `/og-image.jpg` reference); noindex pages inherit a canonical; sitemap lists noindex routes; case-sensitive category dupes. | Optional cleanup PR |
| G | Low (pre-existing) | `/api/v1/health` → 404 (endpoint absent in backend). Deployment prerequisite suggestion, not migration scope. | Optional backend PR |
| H | Info (seed quirk) | Seeded demo customer has `role: ADMIN` — test-data issue affecting both apps; real boundary tests used a fresh CUSTOMER user (403 receipts captured). | Test-data note |
| I | Info (harness) | Ref-based synthetic clicks/typing sometimes fail to commit React state (this browser harness); worked around via native-event dispatch; **all UI flows ultimately verified through working interactions** (subagent + orchestrator). Admin-session wipe observed once mid-audit did not reproduce and no 401 was reproducible against any endpoint with a valid token — flagged for the manual pass to confirm refresh-persistence once. | Monitor in manual pass |
| J | Info | PDP has no quantity selector — source-accurate port (Vite identical). | None (parity) |

**Zero migration-caused functional regressions found.** The A/B parity sweep (25-route matrix, both apps, same backend) found **no control, page, or behavior present on Vite but missing on Next**; cart `localStorage` keys + JSON shapes byte-compatible (cross-app cart interoperable on same-origin deploy).

---

## 9. Compatibility & Release Readiness

- **Env contract (documented, `.env.example` committed):** `NEXT_PUBLIC_API_URL` (preserves `/api/v1` prefix exactly once), `NEXT_PUBLIC_USE_MOCK_API`, `NEXT_PUBLIC_SITE_URL` (canonical origin — set to `https://v2enterprise.in` for production). No secrets in client vars; local `.env` is git-ignored (mode 600).
- **Independent commands:** Vite — root `frontend/`: `npm run dev` (:3000). Next — `app-next.js/`: `npm run dev` / `npm start` (:3001, pinned in package.json). Both verified running simultaneously.
- **Asset policy honored:** Dior campaign MP4 + bundled media excluded (6/6 media tests pass on both apps); runtime catalog/CDN media fully functional.
- **Deployment prerequisites:** production `next build` with `NEXT_PUBLIC_API_URL` → backend origin + `NEXT_PUBLIC_SITE_URL=https://v2enterprise.in`; image config already restricted to actual CDN hosts; a `/health` endpoint recommended (G) before cutover; Razorpay TEST matrix (A) and R2 staging (B) strongly recommended first.
- **Rollback procedure:** `frontend/` is untouched and independently runnable — rollback = point the edge at the Vite build (`npm run build` in `frontend/`, serve `dist/`). Git-level: `app-next.js/` is purely additive to `dev`; reverting the deployment requires no history rewrite. `main` was never touched and remains the pre-migration stable ref +2 (PR #13/#14).

---

## 10. Unverified Areas (explicit)

1. Razorpay prepaid success/failure/retry/duplicate-verification/inventory-rollback (BLOCKED — A)
2. Admin media-manager upload flow with real R2 (BLOCKED — B)
3. Real device-width mobile rendering (BLOCKED — C)
4. Password-reset email delivery (no SMTP configured locally; routes + token flow verified structurally)
5. Production network characteristics / Core Web Vitals (no production deploy, by mandate)
6. One non-reproducing admin-session-wipe observation during harness automation (I) — confirm refresh persistence in the manual pass

---

## 11. Criteria Outstanding Before Final Sign-Off

1. Supply Razorpay TEST keys → run the prepaid matrix (est. <1 h against this same local stack)
2. 10-minute manual mobile pass (any real phone, 4–5 routes)
3. Verdict on soft-404 indexing (E) — one small PR if desired
4. (Optional) staging R2 config for the media manager, `/health` endpoint PR, og-image cleanup (F/G)
5. Explicit deployment approval from the product owner — **not given, not assumed**

---

**Bottom line:** The migration delivered a complete, buildable, tested Next.js App Router application with verified feature parity, real-data workflows (orders, coupons, inventory, admin CRUD), and zero hydration/console defects, while preserving the Vite app as a fully functional rollback. The remaining items are blocked external dependencies and manual passes — none is a code defect introduced by the migration.
