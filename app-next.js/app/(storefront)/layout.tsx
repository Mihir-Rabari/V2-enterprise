'use client';

import React from 'react';
import CustomerLayout from '../../components/CustomerLayout';
import { AuthProvider } from '../../context/AuthContext';
import { InitialLoadProvider } from '../../context/InitialLoadContext';
import { QuickViewProvider } from '../../context/QuickViewContext';
import { CartProvider } from '../../context/CartContext';

/**
 * Storefront route-group layout.
 *
 * This replaces the Vite SPA's `CustomerView` component: the exact provider
 * nesting is preserved from `frontend/components/CustomerView.tsx` —
 * AuthProvider > InitialLoadProvider > QuickViewProvider > CartProvider > CustomerLayout.
 *
 * Notes on the migration:
 *  - The React Router `<Routes>` tree is gone: the App Router owns routing;
 *    each storefront page becomes a file under `app/(storefront)/`.
 *  - The `<Suspense>` lazy-loading wrapper is gone: route-level code
 *    splitting is handled by the App Router (per-page chunks).
 *  - `SettingsProvider` is NOT duplicated here — the root layout (from the
 *    Next.js foundation) already provides it, together with the Toaster.
 */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <InitialLoadProvider>
                <QuickViewProvider>
                    <CartProvider>
                        <CustomerLayout>
                            {children}
                        </CustomerLayout>
                    </CartProvider>
                </QuickViewProvider>
            </InitialLoadProvider>
        </AuthProvider>
    );
}
