# Migration Status

Living status file for the Vite → Next.js App Router migration. Updated by each phase's PR.

## Baseline (verified 2026-10-14, at branch creation)

| Ref | SHA | Notes |
| --- | --- | --- |
| `origin/dev` (branch point) | `c059abfafba99b140aaddca4a93db6032ba16469` | PR #14 squash — "Security and correctness remediation S1-S4" (2026-10-14) |
| parent of `origin/dev` | `e55121fa8f2f5a29295929fcd8de3e3d0c8ffd7c` | PR #13 squash — "Frontend performance: responsive images and request reductions" |
| `origin/main` | `68984e78b78799f33b06b439b24ee2ee07278ddf` | 2026-10-10 |
| `merge-base(main, dev)` | `68984e78b78799f33b06b439b24ee2ee07278ddf` | = main HEAD |

### Branch comparison

- `main` is **strictly behind** `dev` by exactly **2 commits** (`git rev-list --count
  origin/main..origin.dev` = 2); **0** main-only commits (`origin/dev..origin/main` = 0).
- `main` remained **untouched** throughout the migration — no syncing, no PRs to it,
  no fast-forwards.
- Open PRs #4 and #5 are stale drafts from March 2026 and irrelevant to this migration.

## Phase checklist — ALL COMPLETE (2026-10-14)

- [x] **Phase 1 — foundation** (PR #15): scaffold, leaf module ports, root chrome,
      `(storefront)` route group + placeholder home, docs.
- [x] **Phase 2 — shared infra** (PR #16): `context/*` + `hooks/*` (hydration-safe
      cart/localStorage), extended `app/providers.tsx`, 62-test vitest suite (PR #20).
- [x] **Phase 3 — shell** (PR #17): `app/(storefront)/layout.tsx` (exact CustomerView
      provider nesting) + Navbar/Footer/CustomerLayout/ProductCard/QuickView/Modal/
      Accordion/LoadingBar/Toast/PromotionalSlider.
- [x] **Phase 4 — storefront/catalog** (PR #22 shop-side, PR #24 product-detail,
      PR #25 home): home + 8 sections (no bundled video), shop×3, categories,
      `[category]` tree, product/[id] with Product JSON-LD; duplicate-canonical bug fixed.
- [x] **Phase 5 — customer workflows** (PR #23 auth, PR #26 cart+checkout,
      PR #27 account): login/signup/forgot/reset, cart, PR#14-faithful checkout,
      account hub (profile/orders/wishlist/addresses), /liked redirect.
- [x] **Phase 6 — admin** (PR #18): `app/admin/login`, `app/admin/[[...path]]` with
      guard, full 2,963-line AdminDashboard 1:1 + all admin components, uploads intact.
- [x] **Phase 7 — SEO/testing/hardening** (PR #19 SEO, PR #20 tests, PR #28 fonts,
      PR #29 smoke re-baseline): robots.ts, sitemap.ts, favicon, self-hosted fonts
      (repairs `next dev`), 22/22 route smoke harness.

## Migration PR ledger (all merged into `dev`, all merge-guard verified)

| PR | Content |
| --- | --- |
| #15 | Next.js 16.4 foundation scaffold + leaf modules + docs |
| #16 | Shared providers + hooks (hydration-safe storage) |
| #17 | Storefront shell + (storefront) layout |
| #18 | Full admin experience (login + dashboard + components) |
| #19 | SEO: robots/sitemap/favicon + root metadata + audit |
| #20 | Vitest infra + 62 context/hook regression tests + smoke harness |
| #21 | Informational + legal pages (4 distinct routes verified) |
| #22 | Catalog shop-side (Shop×3, Categories, SubCategories, canonical fix) |
| #23 | Auth pages (login/signup/forgot/reset) |
| #24 | Product detail pages + Product JSON-LD |
| #25 | Home page + sections (no bundled video) |
| #26 | Cart + checkout (PR#14 payment-contract fidelity) |
| #27 | Account hub (profile/orders/wishlist/addresses) + /liked redirect |
| #28 | Self-hosted fonts — repairs `next dev` font 500s |
| #29 | Smoke harness re-baseline (Vite-parity route rows) |

## Final verification (integrated `dev`, 2026-10-14)

- `npm run typecheck` → **0 errors**
- `npm run build` → **green** (static + dynamic routes)
- `npm test` → **62/62 passed** (6 files)
- `npm run test:media` → **6/6 passed**
- Route smoke (production build): **22/22 PASS** — all storefront, auth, account,
  admin, informational, legal, dynamic category/product routes; `/liked` 307 →
  `/account/wishlist`; unknown deep path → 404
- `next dev` + `next start` both verified 200s (self-hosted fonts)
- Vite app (`frontend/`, port 3000) still runs unchanged alongside Next (port 3001)

## Known limitations / follow-ups (documented, not blockers)

1. **No backend available in the build sandbox** (no MongoDB): runtime flows that
   need live data — payment E2E, admin data views, dynamic sitemap populated-path,
   API-driven sections — are verified at build/render/contract level. A staging
   pass against a live backend is the remaining integration step.
2. **PR #14 deferral respected:** the merged payment remediation remains unverified
   against real MongoDB/Razorpay (per the user's explicit deferral). The Next
   checkout port is contract-faithful to dev's current backend; no payment
   semantics were invented, weakened, or mocked.
3. `og-image.jpg` referenced by the legacy head does not exist in the repo —
   og:image omitted until an asset is authored.
4. GTM / Meta Pixel scripts were part of the legacy app's deferred script work —
   see `docs/SEO_AUDIT.md` §7 follow-ups.
5. Backend `modules/sitemap` is superseded by the Next sitemap — retire it at
   production cutover (not during the migration).

## Asset exclusions (per policy)

- `The_Dior_Men_s_Summer_2022_Campaign_Video_720P.mp4` — **NOT copied**; video
  hero treatment replaced with poster/gradient, identical layout/typography.
- No other `frontend/public/` media copied. Only `v2_logo.webp` (favicon,
  actively referenced by index.html) and self-hosted font woff2 files (OFL 1.1)
  were added.
