# V2 Enterprise — Next.js App (app-next.js)

The Next.js App Router migration of the V2 Enterprise frontend. This directory is a
**standalone package** at the repo root; the existing Vite app in `frontend/` is untouched
and keeps running on port **3000** while the migration proceeds route-by-route.

## Status

Foundation scaffold only. The home page at `/` is a placeholder that will be replaced by the
home-page agent; the full route map and ownership plan live in [`MIGRATION_PLAN.md`](./MIGRATION_PLAN.md),
per-route progress in [`ROUTE_MIGRATION.md`](./ROUTE_MIGRATION.md), and baseline/phase status
in [`MIGRATION_STATUS.md`](./MIGRATION_STATUS.md).

## Prerequisites

- Node.js **>= 20.9** (Next.js 16 requirement; Node 22 LTS recommended — Node >= 22.18 also
  lets `npm run test:media` run TypeScript tests with no extra tooling)
- npm **>= 10**

## Install

```bash
cd app-next.js
npm install
```

## Environment setup

Copy the example env file and adjust if needed:

```bash
cp .env.example .env.local
```

| Variable | Default in `.env.example` | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api/v1` | Backend API base URL. **Unset in production** — then the client falls back to the relative `/api/v1` path (Express serves frontend + API from one origin, no CORS). |
| `NEXT_PUBLIC_USE_MOCK_API` | `false` | `true` enables mock API responses, but only ever on localhost/192.168.\* hosts. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3001` | Canonical origin of this app (SEO/metadata purposes). |

## Commands

All commands below were verified against Node v22.22.3 / npm 10.9.8:

```bash
npm run dev        # dev server on http://localhost:3001
npm run build      # production build
npm run start      # production server on http://localhost:3001 (run `npm run build` first)
npm run typecheck  # tsc --noEmit
npm run test:media # node --test test/mediaUtils.test.ts
```

## Relationship to the Vite app

| | Vite app (`frontend/`) | Next.js app (`app-next.js/`) |
| --- | --- | --- |
| Port | 3000 | 3001 |
| Status | Production app — untouched by this migration | Migration target |
| Build output | `../backend/public` (served by Express) | Standalone Next deployment (TBD at cutover) |

Both apps talk to the same Express backend. During the migration you can run them
side-by-side (`npm run dev` in `frontend/` and in `app-next.js/`) and compare behavior.

## Backend connection notes

- `lib/apiClient.ts` is a **client-only module** (ported from `frontend/lib/apiClient.ts`):
  axios instance with `baseURL` from `NEXT_PUBLIC_API_URL` (or the localhost fallback),
  `Bearer` token from `localStorage['v2_token']` attached per request, and a 401 response
  interceptor that clears `v2_token` / `v2_user` / `v2_admin_session`.
- Every API module (auth, products, orders, reviews, sliders, content, settings, contacts,
  admin incl. `adminAPI.getProducts` → `/admin/products`, categories, wishlist, payments,
  addresses, filters, attributes) is ported **verbatim**, including the server-side-pricing
  contract of `paymentsAPI.createRazorpayOrder` (the client never sends an amount).
- `resolveLocalAssetUrl` no longer consults `import.meta.env.DEV`; it derives the backend
  origin from `NEXT_PUBLIC_API_URL` when set (dev), otherwise keeps paths relative (prod).

## Assets

Nothing was copied from `frontend/public/` — no brand media, no logo file, and no
`robots.txt`/`sitemap.xml` (they will be recreated as `app/robots.ts` + `app/sitemap.ts` by
the SEO agent). Product/catalog media is backend/CDN-driven at runtime; see
[`MIGRATION_PLAN.md`](./MIGRATION_PLAN.md#asset-policy) for the full exclusion list.
