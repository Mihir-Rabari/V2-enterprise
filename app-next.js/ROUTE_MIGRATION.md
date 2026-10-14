# Route Migration Matrix

> **✅ ALL ROUTES MIGRATED + VERIFIED (2026-10-14) — 22/22 smoke PASS on integrated
> dev.** The per-row Status column below was authored at Phase 1 and kept for
> history; the authoritative completion evidence is the merged PR ledger +
> verification results in `MIGRATION_STATUS.md`, and the 22/22 green run of
> `test/smoke-routes.sh` (every route: ported → verified).

Per-route tracking for the Vite (`frontend/`, React Router) → Next.js (`app-next.js/`,
App Router) migration. Status values: `pending` → `in progress` → `ported` → `verified`.

Static routes always take precedence over dynamic segments in the App Router, which
replaces the React Router "registration order" behavior (see MIGRATION_PLAN.md §1).

| Route | Next.js file (under `app-next.js/app/`) | Vite source (under `frontend/`) | Status | Owner |
| --- | --- | --- | --- | --- |
| `/` | `(storefront)/page.tsx` | `pages/Home.tsx` (+ `components/home/*`) | placeholder — home agent replaces | home |
| `/shop` | `(storefront)/shop/page.tsx` | `pages/Shop.tsx` | pending | catalog |
| `/categories` | `(storefront)/categories/page.tsx` | `pages/Categories.tsx` | pending | catalog |
| `/product/[id]` | `(storefront)/product/[id]/page.tsx` | `pages/ProductDetails.tsx` | pending | catalog |
| `/new-arrivals` | `(storefront)/new-arrivals/page.tsx` | `pages/Shop.tsx` (variant) | pending | catalog |
| `/about` | `(storefront)/about/page.tsx` | `pages/About.tsx` | pending | informational |
| `/contact` | `(storefront)/contact/page.tsx` | `pages/Contact.tsx` | pending | informational |
| `/cart` | `(storefront)/cart/page.tsx` | `pages/Cart.tsx` | pending | cart-checkout |
| `/checkout` | `(storefront)/checkout/page.tsx` | `pages/Checkout.tsx` | pending | cart-checkout |
| `/login` | `(storefront)/login/page.tsx` | `pages/Login.tsx` | pending | auth-account |
| `/signup` | `(storefront)/signup/page.tsx` | `pages/Signup.tsx` | pending | auth-account |
| `/liked` | `(storefront)/liked/page.tsx` | `pages/Account.tsx` wishlist (`Navigate → /account/wishlist` in Vite) | ✅ landed — server `redirect('/account/wishlist')` (307, permanent=false) | auth-account |
| `/account/*` | `(storefront)/account/{page,layout}.tsx` + `orders/`, `wishlist/`, `addresses/`, `[...rest]/` | `pages/Account.tsx` | ✅ landed — each Vite nested Route is its own route folder (deep links + refresh work); `[...rest]` reproduces the Vite empty-content 200; auth gate in `account/layout.tsx` | auth-account |
| `/privacy` | `(storefront)/privacy/page.tsx` | `pages/LegalPage.tsx` (variant) | pending | informational |
| `/returns` | `(storefront)/returns/page.tsx` | `pages/LegalPage.tsx` (variant) | pending | informational |
| `/shipping` | `(storefront)/shipping/page.tsx` | `pages/LegalPage.tsx` (variant) | pending | informational |
| `/terms` | `(storefront)/terms/page.tsx` | `pages/LegalPage.tsx` (variant) | pending | informational |
| `/[category]` | `(storefront)/[category]/page.tsx` | `pages/SubCategories.tsx` | pending | catalog |
| `/[category]/[subcategory]` | `(storefront)/[category]/[subcategory]/page.tsx` | `pages/Shop.tsx` | pending | catalog |
| `/[category]/[subcategory]/[id]` | `(storefront)/[category]/[subcategory]/[id]/page.tsx` | `pages/ProductDetails.tsx` | pending | catalog |
| `/size-guide` | `size-guide/page.tsx` | `pages/SizeGuide.tsx` | pending (outside (storefront), per Vite App.tsx) | informational |
| `/forgot-password` | `forgot-password/page.tsx` | `pages/ForgotPassword.tsx` | pending (outside (storefront)) | auth-account |
| `/reset-password/[token]` | `reset-password/[token]/page.tsx` | `pages/ResetPassword.tsx` | pending (outside (storefront)) | auth-account |
| `/admin/login` | `admin/login/page.tsx` | `pages/AdminLogin.tsx` | pending | admin |
| `/admin/[[...path]]` | `admin/[[...path]]/page.tsx` | `components/AdminDashboard.tsx` (guarded by `v2_admin_session` + `v2_token` in localStorage) | pending | admin |
| catch-all 404 | `app/not-found.tsx` | inline in `components/CustomerView.tsx` | ported | foundation |

## Non-route ports

| Module | Next.js file | Status | Owner |
| --- | --- | --- | --- |
| Design tokens / global CSS | `app/globals.css` | ported (from `frontend/index.css`) | foundation |
| Root chrome + fonts + metadata | `app/layout.tsx`, `app/providers.tsx` | ported | foundation (providers extension → shared-providers) |
| Loading / error boundaries | `app/loading.tsx`, `app/error.tsx` | ported | foundation |
| HTTP client + API modules | `lib/apiClient.ts` | ported (env-adapted, contract-identical) | foundation |
| Form validators | `lib/validation.ts` | ported verbatim | foundation |
| R2 upload helper | `lib/r2.ts` | ported (env-adapted) | foundation |
| Media URL helpers | `utils/mediaUtils.ts` | ported verbatim | foundation |
| Shared TypeScript types | `types.ts` | ported verbatim | foundation |
| Media helper tests | `test/mediaUtils.test.ts` | ported, `npm run test:media` passes | foundation |
| Contexts (`SettingsContext`, `AuthContext`, `CartContext`, `QuickViewContext`, `InitialLoadContext`) | `context/*` | pending | shared-providers |
| Hooks | `hooks/*` | pending (except `useAdminData.ts` → admin agent) | shared-providers |
| SEO infra (robots, sitemap, canonical) | `app/robots.ts`, `app/sitemap.ts` | pending — do **not** copy `frontend/public/robots.txt`/`sitemap.xml` | seo |
| Test infrastructure + smoke tests | `test/*` | pending | test |
