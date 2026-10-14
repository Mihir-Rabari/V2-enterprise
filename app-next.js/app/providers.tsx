'use client';

/**
 * Shared client providers for the whole Next.js app (root provider stack).
 *
 * Next.js port of Vite App.tsx: SettingsProvider wraps everything (the root
 * provider), and the react-hot-toast <Toaster> keeps the identical config
 * from frontend/App.tsx.
 *
 *     <Providers>              ← this file, used by app/layout.tsx
 *       <SettingsProvider>     ← ROOT provider (settings for admin + storefront)
 *         {children}
 *         <Toaster />
 *       </SettingsProvider>
 *     </Providers>
 *
 * ─── Storefront providers are NOT composed here ──────────────────────────────
 * The customer-only provider stack belongs to the (storefront) route-group
 * layout, which must nest the re-exported providers in the SAME order as the
 * Vite CustomerView.tsx:
 *
 *     <AuthProvider>
 *       <InitialLoadProvider>
 *         <QuickViewProvider>
 *           <CartProvider>
 *             {children}       ← storefront layout children
 *           </CartProvider>
 *         </QuickViewProvider>
 *       </InitialLoadProvider>
 *     </AuthProvider>
 *
 * All five providers are re-exported below so that layout can import the
 * whole stack from this single module. Consumer hooks live next to their
 * providers: see lib/README.md for the full export contract.
 */

import { Toaster } from 'react-hot-toast';
import { SettingsProvider } from '../context/SettingsContext';
import { AuthProvider } from '../context/AuthContext';
import { InitialLoadProvider } from '../context/InitialLoadContext';
import { QuickViewProvider } from '../context/QuickViewContext';
import { CartProvider } from '../context/CartContext';

// Re-exports for the (storefront) layout agent — compose in the order
// documented above (Auth > InitialLoad > QuickView > Cart).
export { SettingsProvider, AuthProvider, InitialLoadProvider, QuickViewProvider, CartProvider };

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0A0A0B',
            color: '#fff',
            fontSize: '13px',
            border: '1px solid #1f2937',
          },
          duration: 4000,
        }}
      />
    </SettingsProvider>
  );
}
