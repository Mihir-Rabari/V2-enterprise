import type { Metadata } from 'next';
import { Suspense } from 'react';
import ShopView from '@/components/catalog/ShopView';
import { paramToLabel } from '@/lib/paramUtils';

/**
 * `/[category]/[subcategory]` — the Shop component's category variant
 * (Vite: `<Route path=":category/:subcategory" element={<Shop />} />`).
 *
 * CANONICAL FIX (approved deviation, docs/SEO_AUDIT.md §2.3 + §6): the legacy
 * Shop component called `usePageMeta({ title: 'Shop All | V2 Enterprise',
 * canonical: '/shop' })` unconditionally, so every /:category/:subcategory URL
 * shipped /shop's title AND canonical — a duplicate-canonical bug that made
 * all category shop pages unindexable. This entry exports its own
 * `generateMetadata` with the per-route canonical `/${category}/${subcategory}`
 * instead. Everything else about the variant is behaviour-identical to the Vite
 * page (same params object; the variant is detected via the route entry, which
 * is the App Router equivalent of the source's `useParams` check).
 *
 * The `[id]` sibling route ([category]/[subcategory]/[id], the ProductDetails
 * port) is owned by the product workstream — no conflicts with this file.
 */
interface SubcategoryShopPageProps {
    params: Promise<{ category: string; subcategory: string }>;
}

export async function generateMetadata({ params }: SubcategoryShopPageProps): Promise<Metadata> {
    const { category, subcategory } = await params;
    const subLabel = paramToLabel(subcategory);
    const catLabel = paramToLabel(category);
    return {
        title: `${subLabel} | V2 Enterprise`,
        description: `Shop ${subLabel} under our ${catLabel} collection — premium ${catLabel.toLowerCase()} from V2 Enterprise, crafted from luxury fabrics.`,
        alternates: { canonical: `/${category}/${subcategory}` },
    };
}

/**
 * Shell shown while the client tree streams in. Required because ShopView
 * reads `useSearchParams()` (CSR bailout): the static prerender of this route
 * renders this fallback, and the browser hydrates the real query state.
 */
const ShopFallback = (
    <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin" />
    </div>
);

export default async function SubcategoryShopPage({ params }: SubcategoryShopPageProps) {
    const { category, subcategory } = await params;
    return (
        <Suspense fallback={ShopFallback}>
            <ShopView variant="category" category={category} subcategory={subcategory} />
        </Suspense>
    );
}
