import type { Metadata } from 'next';
import { Suspense } from 'react';
import ShopView from '@/components/catalog/ShopView';

/**
 * `/shop` — port of frontend/pages/Shop.tsx
 * (Vite: `<Route path="shop" element={<Shop />} />`).
 *
 * Metadata ports the legacy `usePageMeta` call verbatim (title/description/
 * canonical — SEO_AUDIT.md §2.3). The Vite page's `usePageMeta` was
 * client-only; the Metadata API now ships the same tags server-side.
 */
export const metadata: Metadata = {
    title: 'Shop All | V2 Enterprise',
    description: 'Browse the full V2 Enterprise collection — premium kurtas, shirts, and luxury menswear. Filter by category, fabric, size, and more.',
    alternates: { canonical: '/shop' },
};

/**
 * Shell shown while the client tree streams in. Required because ShopView
 * reads `useSearchParams()` (CSR bailout): the static prerender of `/shop`
 * renders this fallback, and the browser hydrates the real query state.
 */
const ShopFallback = (
    <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin" />
    </div>
);

export default function ShopPage() {
    return (
        <Suspense fallback={ShopFallback}>
            <ShopView variant="shop" />
        </Suspense>
    );
}
