# V2 Enterprise — Next.js App Router Migration Plan

Single source of truth for migrating the Vite + React Router app (`frontend/`) to the
Next.js **App Router** (`app-next.js/`). Companion docs: [`MIGRATION_STATUS.md`](./MIGRATION_STATUS.md)
(baseline + phase checklist), [`ROUTE_MIGRATION.md`](./ROUTE_MIGRATION.md) (per-route progress table).

## 1. Target architecture

- **Framework:** Next.js 16 (App Router, Turbopack), React 19.2.4 — same React version as
  the Vite app, pinned.
- **Directory conventions** (inside `app-next.js/`):
  - `app/` — routes; `lib/`, `utils/`, `types.ts` — shared leaf modules (ported first);
    `context/`, `hooks/`, `components/` — ported by their owners (see §4).
  - Import alias `@/*` → project root (mirrors the Vite app).
- **Route groups:**
  - `app/(storefront)/…` — all customer-facing pages. This group gets a
    `layout.tsx` mirroring the Vite `CustomerView` provider stack
    (`AuthProvider > InitialLoadProvider > QuickViewProvider > CartProvider`) plus
    `CustomerLayout` (Navbar/Footer). The group keeps the URL paths unchanged.
  - Standalone routes **outside** the group: `/admin/*` (localStorage-guarded dashboard),
    `/size-guide`, `/forgot-password`, `/reset-password/[token]` — matching the Vite app,
    which rendered these outside `CustomerView`.
- **Rendering strategy:**
  - Server Components by default.
  - Narrow, deliberate `'use client'` boundaries: anything touching `localStorage`,
    `window`, browser events, context providers, or animation state.
  - **Never read `localStorage`/`window` during render.** The Vite app's localStorage
    guards (e.g. `v2_admin_session`, `v2_token` in `App.tsx`) become client-side guards
    inside client components/hooks (read in `useEffect`/event handlers), or middleware at
    the edge later — never during SSR render.
  - Data fetching initially stays client-side through the ported `lib/apiClient.ts`
    (client-only). Moving reads into Server Components/RSC fetches is a later, deliberate
    optimization phase (the API sends `Cache-Control` responses that must be respected).
- **Route matching note:** React Router resolves by registration order; the App Router
  resolves **static before dynamic**. So the Vite app's trailing `:category` / `:subcategory`
  routes are expressed as catch-all **dynamic segments at the end of the tree**
  (`/[category]`, `/[category]/[subcategory]`, `/[category]/[subcategory]/[id]`), and any
  static path (`/shop`, `/about`, …) always wins over them without ordering tricks.
- **Styling:** Tailwind CSS 4 (same `@theme` design tokens as `frontend/index.css`, ported
  to `app/globals.css`) via `@tailwindcss/postcss`. Fonts are self-hosted with
  `next/font/google` (Inter, Playfair Display — same families/weights as `frontend/index.html`).
- **Ports:** Next dev/prod server on **3001**; the Vite app stays on 3000 until cutover.

## 2. Route matrix

Source files live under `frontend/` (Vite). Target paths are inside `app-next.js/app/`.

| Route | Target file | Vite source | Notes |
| --- | --- | --- | --- |
| `/` | `(storefront)/page.tsx` | `pages/Home.tsx` | placeholder until home agent lands |
| `/shop` | `(storefront)/shop/page.tsx` | `pages/Shop.tsx` | |
| `/categories` | `(storefront)/categories/page.tsx` | `pages/Categories.tsx` | |
| `/product/[id]` | `(storefront)/product/[id]/page.tsx` | `pages/ProductDetails.tsx` | |
| `/new-arrivals` | `(storefront)/new-arrivals/page.tsx` | `pages/Shop.tsx` | Shop variant (new-arrivals flag) |
| `/about` | `(storefront)/about/page.tsx` | `pages/About.tsx` | |
| `/contact` | `(storefront)/contact/page.tsx` | `pages/Contact.tsx` | |
| `/cart` | `(storefront)/cart/page.tsx` | `pages/Cart.tsx` | |
| `/checkout` | `(storefront)/checkout/page.tsx` | `pages/Checkout.tsx` | Razorpay loaded lazily |
| `/login` | `(storefront)/login/page.tsx` | `pages/Login.tsx` | |
| `/signup` | `(storefront)/signup/page.tsx` | `pages/Signup.tsx` | |
| `/liked` | `(storefront)/liked/page.tsx` | `Navigate → /account/wishlist` | redirect via `next.config` redirect or route handler; target = Account wishlist tab |
| `/account/*` | `(storefront)/account/[[...path]]/page.tsx` | `pages/Account.tsx` | verify internal nav (tabs → nested routes) when porting |
| `/privacy` | `(storefront)/privacy/page.tsx` | `pages/LegalPage.tsx` | LegalPage variant |
| `/returns` | `(storefront)/returns/page.tsx` | `pages/LegalPage.tsx` | LegalPage variant |
| `/shipping` | `(storefront)/shipping/page.tsx` | `pages/LegalPage.tsx` | LegalPage variant |
| `/terms` | `(storefront)/terms/page.tsx` | `pages/LegalPage.tsx` | LegalPage variant |
| `/[category]` | `(storefront)/[category]/page.tsx` | `pages/SubCategories.tsx` | dynamic segment — static routes take precedence |
| `/[category]/[subcategory]` | `(storefront)/[category]/[subcategory]/page.tsx` | `pages/Shop.tsx` | |
| `/[category]/[subcategory]/[id]` | `(storefront)/[category]/[subcategory]/[id]/page.tsx` | `pages/ProductDetails.tsx` | |
| `/size-guide` | `size-guide/page.tsx` | `pages/SizeGuide.tsx` | outside (storefront) |
| `/forgot-password` | `forgot-password/page.tsx` | `pages/ForgotPassword.tsx` | outside (storefront) |
| `/reset-password/[token]` | `reset-password/[token]/page.tsx` | `pages/ResetPassword.tsx` | outside (storefront) |
| `/admin/login` | `admin/login/page.tsx` | `pages/AdminLogin.tsx` | |
| `/admin/[[...path]]` | `admin/[[...path]]/page.tsx` | `components/AdminDashboard.tsx` | localStorage guard (`v2_admin_session` + `v2_token`) → client-side guard component |

## 3. Context / provider porting order

1. `SettingsProvider` (used by both root and admin in the Vite app) — shared-contexts agent.
2. Customer stack: `AuthProvider`, `InitialLoadProvider`, `QuickViewProvider`,
   `CartProvider` — mounted in `(storefront)/layout.tsx`, mirroring `CustomerView`.
3. `Providers` (`app/providers.tsx`) currently holds only the toast `<Toaster>`; the
   shared-contexts agent extends it with `SettingsProvider` etc. once ported.

## 4. OWNERSHIP matrix

One owner per file. Cross-needs = open an issue/comment in the foundation PR — **never
silently edit another agent's files.**

| Owner | Owns |
| --- | --- |
| **foundation** (this PR) | scaffold: `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `.gitignore`, `.env.example`; `lib/apiClient.ts`, `lib/validation.ts`, `lib/r2.ts`; `utils/mediaUtils.ts`; `types.ts`; `app/layout.tsx`, `app/providers.tsx` (current Toaster-only version), `app/globals.css`, `app/error.tsx`, `app/loading.tsx`, `app/not-found.tsx`; `app/(storefront)/page.tsx` (placeholder, hands off to home agent); the four docs |
| **shared-providers** | `context/*` and `hooks/*` (except `hooks/useAdminData.ts`); extension of `app/providers.tsx` with SettingsProvider etc. |
| **storefront-shell** | `components/{CustomerLayout,Navbar,Footer,LoadingBar,Toast,QuickView,PromotionalSlider,ProductCard,Modal,Accordion}`; `app/(storefront)/layout.tsx` |
| **home** | `components/home/*`; **replaces** `app/(storefront)/page.tsx` |
| **catalog** | `app/(storefront)/shop`, `/categories`, `/new-arrivals`, `/[category]` tree, `/product/[id]`; `FilterAccordion` |
| **cart-checkout** | `app/(storefront)/cart`, `app/(storefront)/checkout` |
| **auth-account** | `app/(storefront)/login`, `/signup`; `app/forgot-password`, `app/reset-password/[token]`; `app/(storefront)/account`, `/liked` |
| **informational** | `app/(storefront)/about`, `/contact`; `app/size-guide`; `app/(storefront)/privacy`, `/returns`, `/shipping`, `/terms` |
| **admin** | `app/admin/**`; `components/admin/*`; `AdminDashboard`, `Sidebar`, `StatsCard`, `DataTable`, `OrderDetailsModal`; `hooks/useAdminData.ts` |
| **seo** | `app/robots.ts`, `app/sitemap.ts`, canonical/metadata infrastructure |
| **test** | test infrastructure + smoke tests |

## 5. Asset policy

The foundation copies **nothing** from `frontend/public/`:

- ❌ No `Dior.mp4` (or any hero/brand video), no `v2_logo.webp`, no `og-image.jpg`, no
  favicon binaries, no other public media.
- ❌ No `robots.txt` / `sitemap.xml` copies — recreated as `app/robots.ts` + `app/sitemap.ts`
  by the SEO agent.
- ✅ Product/catalog media is **backend/CDN-driven at runtime** via the ported
  `utils/mediaUtils.ts` helpers and `resolveLocalAssetUrl`.
- ✅ `frontend/`, `backend/`, `reports/`, and every root file remain untouched; `main`
  remains untouched (no branch syncing — `main` is strictly behind `dev` and will be
  fast-forwarded by the maintainers).

Remote image hosts (`cdn.v2enterprise.in`, legacy ImageKit/R2 URLs) are deliberately **not**
configured in `next.config.ts` yet; they will be added via `images.remotePatterns` when the
image pipeline is finalized (see the comment in `next.config.ts`).

## 6. Migration phases

1. **foundation** — this PR: scaffold + leaf modules + root chrome + docs.
2. **shared infra** — contexts, hooks, providers extension.
3. **shell** — `(storefront)/layout.tsx` + Navbar/Footer.
4. **storefront/catalog** — home, shop, categories, product tree.
5. **customer workflows** — cart, checkout, auth, account.
6. **admin** — dashboard + admin components + guard.
7. **SEO/testing/hardening** — robots/sitemap, smoke tests, perf.

Detailed per-route status: [`ROUTE_MIGRATION.md`](./ROUTE_MIGRATION.md).
Phase checklist and baseline: [`MIGRATION_STATUS.md`](./MIGRATION_STATUS.md).
