import type { Metadata } from 'next';
import ProductDetailsView from '@/app/(storefront)/_components/ProductDetailsView';
import {
    getProductPageData,
    buildProductMetadata,
    ProductJsonLd,
} from '@/app/(storefront)/_components/product-seo';

/**
 * `/[category]/[subcategory]/[id]` — port of frontend/pages/ProductDetails.tsx
 * (Vite: `<Route path=":category/:subcategory/:id" element={<ProductDetails} />`;
 * the same 48KB component served `/product/:id`, hence the shared view).
 *
 * Sibling route directories (`[category]/page.tsx`,
 * `[category]/[subcategory]/page.tsx`) are owned by the catalog workstream and
 * are NOT touched here; this `[id]/` entry only adds its own file.
 *
 * Metadata is identical to `/product/[id]` (same shared builders) except the
 * canonical, which follows THIS workstream's instruction to match the ACTUAL
 * route the page is served on:
 *
 *   /men/shirts/1  →  canonical /men/shirts/1
 *
 * The legacy app hardcoded `canonical: /product/${id}` for BOTH routes (one
 * component, one usePageMeta call), and docs/SEO_AUDIT.md §6.3 noted that as
 * the legacy behaviour — the deviation is deliberate and documented in the PR
 * body + the audit row. The Product JSON-LD's `offers.url` still uses
 * `absoluteUrl(/product/${id})` because §6.4 mandates exactly that.
 */

interface NestedProductPageProps {
    params: Promise<{ category: string; subcategory: string; id: string }>;
}

export async function generateMetadata({ params }: NestedProductPageProps): Promise<Metadata> {
    const { category, subcategory, id } = await params;
    const { product } = await getProductPageData(id);
    return buildProductMetadata(`/${category}/${subcategory}/${id}`, product);
}

export default async function NestedProductPage({ params }: NestedProductPageProps) {
    const { id } = await params;
    const { product, reviews } = await getProductPageData(id);
    return (
        <>
            <ProductJsonLd id={id} product={product} reviews={reviews} />
            <ProductDetailsView id={id} />
        </>
    );
}
