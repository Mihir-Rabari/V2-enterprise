import type { Metadata } from 'next';
import { Suspense } from 'react';
import ShopView from '@/components/catalog/ShopView';

/**
 * `/new-arrivals` — the Shop component's new-arrivals variant
 * (Vite: `<Route path="new-arrivals" element={<Shop />} />`; the source
 * distinguished it via `location.pathname === '/new-arrivals'`).
 *
 * CANONICAL FIX (approved deviation, docs/SEO_AUDIT.md §2.3 + §6): the legacy
 * Shop component called `usePageMeta({ title: 'Shop All | V2 Enterprise',
 * canonical: '/shop' })` unconditionally, so /new-arrivals shipped /shop's
 * title AND canonical — a duplicate-canonical bug that made /new-arrivals
 * unindexable. This entry exports its own title/description/canonical
 * instead. Everything else about the variant is behaviour-identical: the Vite
 * new-arrivals page issued exactly the same product fetch (no isNewArrivals
 * param was ever sent), so the data flow is unchanged.
 */
export const metadata: Metadata = {
    title: 'New Arrivals | V2 Enterprise',
    description: 'The latest arrivals from V2 Enterprise — fresh drops of premium kurtas, shirts, and luxury menswear.',
    alternates: { canonical: '/new-arrivals' },
};

const ShopFallback = (
    <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin" />
    </div>
);

export default function NewArrivalsPage() {
    return (
        <Suspense fallback={ShopFallback}>
            <ShopView variant="new-arrivals" />
        </Suspense>
    );
}
