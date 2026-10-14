import type { Metadata } from 'next';
import ProductDetailsView from '@/app/(storefront)/_components/ProductDetailsView';
import {
    getProductPageData,
    buildProductMetadata,
    ProductJsonLd,
} from '@/app/(storefront)/_components/product-seo';

/**
 * `/product/[id]` — port of frontend/pages/ProductDetails.tsx
 * (Vite: `<Route path="product/:id" element={<ProductDetails />} />`).
 *
 * Server entry owns what the legacy page did client-side via usePageMeta:
 * real metadata from the fetched product (generateMetadata) + the Product
 * JSON-LD script (docs/SEO_AUDIT.md §6.4, via `product-seo.ts`). The view
 * itself stays a client component — the product fetch for RENDERING is still
 * client-side, exactly like the Vite SPA.
 *
 * Canonical: `/product/<id>` — this IS the actual route served here.
 *
 * Graceful degradation (no backend reachable): `getProductPageData` → null
 * → legacy fallback title/description (`Product Details | V2 Enterprise` /
 * `Premium luxury fashion from V2 Enterprise.`), canonical still carries the
 * real id, and NO JSON-LD is emitted (the legacy hook also emitted `undefined`
 * JSON-LD without a product). The interactive view then shows its own
 * loading → "Item not found." client states.
 */

interface ProductPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
    const { id } = await params;
    const { product } = await getProductPageData(id);
    return buildProductMetadata(`/product/${id}`, product);
}

export default async function ProductPage({ params }: ProductPageProps) {
    const { id } = await params;
    const { product, reviews } = await getProductPageData(id);
    return (
        <>
            <ProductJsonLd id={id} product={product} reviews={reviews} />
            <ProductDetailsView id={id} />
        </>
    );
}
