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
  origin/main..origin/dev` = 2); **0** main-only commits (`origin/dev..origin/main` = 0).
- `main` must remain untouched — no syncing, no PRs to it, no fast-forwards from this
  migration.
- Open PRs #4 and #5 are stale drafts from March 2026 and irrelevant to this migration.
- Migration branch: `migration/nextjs-foundation`, created from `origin/dev`, PRs into
  `dev` only.

## Phase checklist

- [x] **Phase 1 — foundation** (this PR): scaffold (`package.json`, `next.config.ts`,
  `tsconfig.json`, `postcss.config.mjs`, `.gitignore`, `.env.example`), leaf module ports
  (`lib/apiClient.ts`, `lib/validation.ts`, `lib/r2.ts`, `utils/mediaUtils.ts`, `types.ts`,
  `test/mediaUtils.test.ts`), root chrome (`app/layout.tsx`, `app/providers.tsx`,
  `app/globals.css`, `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`),
  `(storefront)` route group with placeholder home page, docs, verification
  (typecheck / build / dev server on 3001 / media tests).
- [ ] **Phase 2 — shared infra:** port `context/*` + `hooks/*`, extend `app/providers.tsx`
      (SettingsProvider + customer context stack) — shared-providers agent.
- [ ] **Phase 3 — shell:** `app/(storefront)/layout.tsx` + Navbar/Footer/CustomerLayout —
      storefront-shell agent.
- [ ] **Phase 4 — storefront/catalog:** home (replace placeholder), shop, categories,
      new-arrivals, `[category]` tree, product/[id] — home + catalog agents.
- [ ] **Phase 5 — customer workflows:** cart, checkout, login/signup, forgot/reset,
      account, liked — cart-checkout + auth-account agents.
- [ ] **Phase 6 — admin:** `app/admin/**`, admin components, useAdminData, guard —
      admin agent.
- [ ] **Phase 7 — SEO/testing/hardening:** robots.ts, sitemap.ts, canonical, smoke tests,
      perf pass — seo + test agents.

## This PR's status

- **PR:** `migration/nextjs-foundation` → `dev` — *foundation scaffold, complete.*
- **Pinned versions:** Next.js `16.4.0` (latest stable), React/React DOM `19.2.4`
  (exact — same as the Vite app; inside Next 16's `^19.0.0` peer range).
- **Verification (all run locally):** `npm run typecheck` ✅ · `npm run build` ✅ ·
  `npm run dev` on 3001 → `/` = 200, unknown route = 404 page ✅ ·
  `npm run test:media` (node --test) ✅. See the PR body for raw outputs.
- **Scope:** `git status` shows changes only under `app-next.js/`.
