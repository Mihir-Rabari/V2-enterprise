# app-next.js — shared modules (contexts, hooks, provider hierarchy)

This documents the shared React contexts + hooks ported from the Vite app
(`frontend/context`, `frontend/hooks`) and the provider hierarchy page agents
must compose against.

## Provider hierarchy

### Root level (mounted by `app/layout.tsx` via `app/providers.tsx`)

Mirrors Vite `App.tsx` (`SettingsProvider` wrapped the whole router):

```
<Providers>                      ← app/providers.tsx
  <SettingsProvider>             ← context/SettingsContext.tsx  (ROOT)
    <Toaster />                  ← react-hot-toast portal, options identical to Vite App.tsx
    {children}                   ← all routes (admin + storefront)
  </SettingsProvider>
</Providers>
```

`SettingsProvider` fetches public site settings exactly once per page load
(`settingsAPI.get()`), guards with a `cancelled` flag so React StrictMode
double-mounts (dev only) never apply stale responses, and never throws for
consumers — `useSettings()` outside a provider returns the safe default
`{ settings: {} as SiteSettings, loaded: false }` (same as Vite).

### Storefront (customer) level — composed by the (storefront) layout agent

Mirrors Vite `components/CustomerView.tsx`. **Nesting order is significant**;
use exactly:

```
<AuthProvider>                   ← context/AuthContext.tsx
  <InitialLoadProvider>          ← context/InitialLoadContext.tsx
    <QuickViewProvider>          ← context/QuickViewContext.tsx
      <CartProvider>             ← context/CartContext.tsx
        {children}               ← storefront layout children
      </CartProvider>
    </QuickViewProvider>
  </InitialLoadProvider>
</AuthProvider>
```

All five providers are re-exported from `app/providers.tsx`, so the storefront
layout can import the full stack from one module. The customer-only providers
are intentionally **not** mounted at the root (admin pages don't need them).

## Export contract (import these exact names)

| Module | Exports |
|---|---|
| `context/AuthContext.tsx` | `AuthProvider`, `useAuth`, type `AuthUser` |
| `context/CartContext.tsx` | `CartProvider`, `useCart` |
| `context/InitialLoadContext.tsx` | `InitialLoadProvider`, `useInitialLoad` |
| `context/QuickViewContext.tsx` | `QuickViewProvider`, `useQuickView` |
| `context/SettingsContext.tsx` | `SettingsProvider`, `useSettings` |
| `hooks/useLocalStorage.ts` | `useLocalStorage<T>(key, initialValue)` → `[value, setValue]` (functional updates supported) |
| `hooks/useMyOrders.ts` | `useMyOrders()` → `{ orders, loading, error }`, type `MyOrder` |
| `hooks/useProducts.ts` | `useProducts(params?)` → `{ products, loading, loadingMore, error, hasMore, total }`, `useProduct(id?)` → `{ product, loading, error }`, type `ApiProduct` |

All context/hook modules are `'use client'`. Pages that use them must
themselves be client components (or call the hooks inside client components).

Not ported by this branch (by design):
- `hooks/useAdminData.ts` — owned by the admin agent.
- `hooks/usePageMeta.ts` — replaced by the Next.js metadata API
  (`export const metadata` / `generateMetadata` in server components).

## Hydration-safe storage rules (IMPORTANT for page agents)

1. **Never read `localStorage` (or `window`) during render.** Only inside
   `useEffect`, event handlers, or the apiClient interceptors. Auth restores
   its user and Cart restores its items in mount effects; the server render
   and the first client render always agree → no hydration mismatch.
2. **Cart persistence** (`CartContext`): starts empty, hydrates from
   localStorage key `v2_cart` in a mount effect, and persists on every change
   after hydration. Cart data model, item shape (`CartItem extends Product`
   with `quantity`, `selectedSize`, `selectedColor`), merge-on-add,
   quantity-delta, remove and totals math (`cartCount`, `cartTotal`) are
   identical to the Vite source.
3. **Auth persistence**: localStorage keys `v2_token` and `v2_user` are
   preserved exactly. `login`/`register` write both keys and return
   `Promise<boolean>`; `logout` clears them (cart is kept); `refreshUser`
   re-syncs the user from `/auth/me` and force-logs-out on failure. The 401
   interceptor in `lib/apiClient.ts` also clears these keys — that contract is
   unchanged and not duplicated here.
4. **`useLocalStorage`**: value starts at `initialValue` and is restored from
   localStorage in a mount effect (hydration-safe). First render shows the
   initial value; stored value applies immediately after mount. Write
   semantics unchanged (every `setValue` writes through to localStorage).
5. **QuickView / InitialLoad**: pure in-memory state (no persistence) —
   quick view open/close + product selection, initial-load splash flag.

## Storage keys (must not change)

- `v2_token` — JWT (also managed by `lib/apiClient.ts` interceptors)
- `v2_user` — serialized `AuthUser` JSON
- `v2_cart` — serialized `CartItem[]` JSON
- `v2_admin_session` — admin flag (admin agent's domain; cleared by the
  shared 401 interceptor)
