import type { Metadata } from 'next';
import CategoriesView from '@/components/catalog/CategoriesView';

/**
 * `/categories` — port of frontend/pages/Categories.tsx
 * (Vite: `<Route path="categories" element={<Categories />} />`).
 *
 * The source had no usePageMeta call (no legacy title/canonical — SEO_AUDIT.md
 * §2.3); this entry supplies the checklist metadata from §6.
 */
export const metadata: Metadata = {
    title: 'Shop by Category | V2 Enterprise',
    description: 'Browse every V2 Enterprise collection — explore our main categories of premium kurtas, shirts, and luxury menswear.',
    alternates: { canonical: '/categories' },
};

export default function CategoriesPage() {
    return <CategoriesView />;
}
