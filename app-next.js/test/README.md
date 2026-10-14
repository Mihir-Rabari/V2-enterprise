# app-next.js — test suite

Everything testable in the Next.js migration lives in this directory. Two
independent runners coexist on purpose:

| Runner | Command | Files | What it covers |
|---|---|---|---|
| **Vitest** (jsdom) | `npm test` | `test/*.test.ts(x)` except `mediaUtils` | React contexts + hooks regression tests (this PR) |
| **Node test runner** | `npm run test:media` | `test/mediaUtils.test.ts` | CDN media URL canonicalization (pre-existing suite) |

The route smoke harness (`test/smoke-routes.sh`) runs against a real Next.js
server and is the post-merge gate for the page migrations (details below).

## Commands

```bash
cd app-next.js

npm test             # vitest run — the unit suite (jsdom, no network)
npm run test:media   # node --test test/mediaUtils.test.ts (Node ≥ 22.18)
npm run typecheck    # tsc --noEmit (strict)
npm run build        # next build (production bundle)

bash test/smoke-routes.sh              # route matrix via next build + start -p 3999
SKIP_BUILD=1 bash test/smoke-routes.sh  # reuse an existing .next build
bash test/smoke-routes.sh dev          # same matrix against next dev
SMOKE_PORT=4321 bash test/smoke-routes.sh
```

## Vitest suite (`npm test`)

- Config: `vitest.config.ts` — jsdom environment, `test/setup.ts` setup file.
  `test/mediaUtils.test.ts` is **excluded** on purpose (it is a Node-native
  `node --test` suite — running it under vitest would fail because it
  registers against `node:test`, and `npm run test:media` keeps working).
- `test/setup.ts` registers `@testing-library/jest-dom/vitest` matchers on
  vitest's `expect`, unmounts rendered components, and clears `localStorage`
  after every test (storage seeding must not leak between tests).
- `lib/apiClient` is mocked with `vi.mock` — **no network calls** anywhere in
  the suite.
- Cosmetic note: vitest prints a one-line warning that `vitest.config.ts` uses
  ESM syntax in a CommonJS package (this package has no `"type": "module"`;
  a future Vite default notice). It is harmless.

### File inventory

| File | Covers | Notable pinned behavior |
|---|---|---|
| `test/cart.test.tsx` | `CartProvider` / `useCart` | First render is always `[]` (hydration-safe), then `v2_cart` is restored in a mount effect; exact persisted item shape `{ ...product, id: String(_id \|\| id), quantity, selectedSize, selectedColor }`; same-(id,size,color) merge increments quantity; `updateQuantity` delta never drops below 1; `removeFromCart` removes only the matching combo; `clearCart` empties state + storage; `cartCount`/`cartTotal` math; malformed `v2_cart` (`"{oops"`) → empty cart + `console.warn`, no crash; `"null"`/non-array JSON → empty cart via the silent `Array.isArray` fallback; a pre-hydration mutation is never clobbered by the stale stored read. Also pins two **preserved source quirks** from PR #16 (the dead sanitize branch, and strict-`===` id matching in remove/update — see the test bodies). |
| `test/auth.test.tsx` | `AuthProvider` / `useAuth` | `login`/`register` write `v2_token` + `v2_user` and return `true`; `logout` clears both keys but keeps `v2_cart`; session restore in a mount effect (malformed `v2_user` → keys cleared); `refreshUser` success re-syncs `v2_user`, failure force-logs-out; `authError` formatting matches the source character-for-character (`message` + ` (field: msgs, …)` from `errors`). |
| `test/settings.test.tsx` | `SettingsProvider` / `useSettings` | Exactly one `settingsAPI.get` per mount; the `cancelled` flag discards a response that resolves after cleanup (StrictMode double-mount semantics — stale response never applied, `loaded` stays false until the live response); `loaded` flips even on `success: false` or rejection (never throws to consumers); `useSettings()` outside a provider returns `{ settings: {}, loaded: false }`. |
| `test/useLocalStorage.test.tsx` | `useLocalStorage` | First render shows `initialValue`; stored value applies after mount; plain + functional `setValue`; write-through persistence survives remount; a child-effect write that fires before the hook's own mount effect is never clobbered by the stale stored read (`writeBeforeHydration` guard). |
| `test/uiContexts.test.tsx` | `QuickViewContext`, `InitialLoadContext` | `selectedProductId` starts null; open/close passes string/number through; `isInitialLoad` starts `true` and flips via the consumer; both hooks throw outside their providers. |
| `test/hooks-api.test.tsx` | `useProducts`, `useProduct`, `useMyOrders` | loading→success/error lifecycles; page 1 replaces / page 2 appends (`loadingMore` in flight, old page kept); `hasMore = newProducts.length >= limit`; the `JSON.stringify(params)` dependency (same-JSON new object → no refetch); `useProduct(undefined)` never fetches (loading stays `true` — verbatim source behavior); `useMyOrders` `res.data.data ?? []` null-guard. |
| `test/setup.ts` | — | Global vitest setup (jest-dom matchers, cleanup, storage reset). |
| `test/mediaUtils.test.ts` | `utils/mediaUtils` | Pre-existing Node-native suite — **not** part of the vitest run. |

The storage-key contract (`v2_token`, `v2_user`, `v2_cart`) and the provider
hierarchy are documented in [`lib/README.md`](../lib/README.md) — the tests
pin that contract.

## Route smoke harness (`test/smoke-routes.sh`)

Boots a server (`next build && next start -p 3999`, or `next dev`) and curls
the full route matrix, asserting HTTP statuses:

| Expectation | Routes |
|---|---|
| **200** | `/`, `/shop`, `/categories`, `/new-arrivals`, `/about`, `/contact`, `/size-guide`, `/privacy`, `/returns`, `/shipping`, `/terms`, `/login`, `/signup`, `/forgot-password`, `/reset-password/sometoken` |
| **redirect → `/account/wishlist`** | `/liked` |
| **200 (client shells)** | `/product/1`, `/cat/sub`, `/cat/sub/1`, `/admin/login` |
| **404** | `/totally-bogus-route` |

Output is a PASS/FAIL table with the expected vs. actual HTTP code per route,
a summary line, and exit code 0/1.

**Dynamic API-dependent pages degrade without a backend** (expected): pages
like `/`, `/shop`, `/categories`, `/product/1` render their route shell
server-side and fetch data client-side; with no backend running they show
loading/error states in the browser. The harness asserts the HTTP status of
the rendered route shell only, never page content — a 200 with an empty
loading state is a pass.

**Expected state on this branch:** only `/` (and Next's built-in
`/_not-found`) exists, so every other route currently reports FAIL with a 404.
That is the honest, documented pre-merge state — the page-migration PRs own
those routes. This script is the post-merge gate: once those PRs merge into
`dev`, the identical script (no edits) must report 21/21 PASS. Until then,
treat FAIL(404) rows for missing routes as "route not migrated yet", not as a
harness defect. `/totally-bogus-route` (404) and `/` (200) are the two rows
that must already pass today.

## Typecheck / build

`npm run typecheck` (strict) and `npm run build` include the test files and
`vitest.config.ts` — keep both green in this package. The original app sources
already passed strict `tsc` when they were merged (PR #15/#16 verification);
the test additions introduce no new strict errors.
