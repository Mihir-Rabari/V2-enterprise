import type { Metadata } from 'next';
import SubCategoriesView from '@/components/catalog/SubCategoriesView';
import { paramToLabel } from '@/lib/paramUtils';

/**
 * `/[category]` — port of frontend/pages/SubCategories.tsx
 * (Vite: `<Route path=":category" element={<SubCategories />} />`).
 *
 * Static segments (/shop, /categories, /new-arrivals, /about, …) beat this
 * dynamic segment naturally in the App Router — same precedence as the Vite
 * `<Route>` declaration order, no hacks.
 *
 * Metadata: the Vite page never called usePageMeta (no legacy title/canonical
 * — docs/SEO_AUDIT.md §2.3), so this entry supplies the checklist metadata
 * from §6: a `generateMetadata` title via `paramToLabel` and a per-route
 * canonical built from the raw segment.
 *
 * NOTE (post-merge harness interaction): because this dynamic segment now
 * exists, an unknown single-segment path like /totally-bogus-route resolves
 * here with a 200 (SubCategories shell) instead of a 404. That matches the Vite
 * app exactly — `:category` also matched unknown segments, and the page then
 * client-redirected to `/<category>/All` (Shop's "No matches found" state) —
 * so the /totally-bogus-route row in test/smoke-routes.sh needs re-baselining
 * by its owner once this lands.
 */
interface CategoryPageProps {
    params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
    const { category } = await params;
    const label = paramToLabel(category);
    return {
        title: `${label} | V2 Enterprise`,
        description: `Explore the ${label} collection at V2 Enterprise — premium fabrics, luxury craftsmanship, and timeless menswear.`,
        alternates: { canonical: `/${category}` },
    };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
    const { category } = await params;
    return <SubCategoriesView category={category} />;
}
