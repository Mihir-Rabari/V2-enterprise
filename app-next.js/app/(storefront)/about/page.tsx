import type { Metadata } from 'next';
import AboutContent from './about-content';

/**
 * /about — server entry for the About page (Next.js port of
 * frontend/pages/About.tsx).
 *
 * The Vite version called
 *   usePageMeta({
 *     title: 'Our Heritage | V2 Enterprise',
 *     description: 'Discover the story behind V2 Enterprise. A legacy of premium craftsmanship, luxury fabrics, and timeless menswear from Bhavnagar.',
 *     canonical: '/about',
 *   });
 * which is replaced here by a static metadata export (titles/descriptions
 * kept verbatim). The canonical is ported as a relative alternates.canonical;
 * absolute resolution is owned by the root metadataBase (SEO agent), matching
 * the Vite hook which resolved it to https://v2enterprise.in/about.
 *
 * Route placement mirrors frontend/components/CustomerView.tsx: /about renders
 * INSIDE the customer layout → this page lives in the (storefront) route group.
 */

export const metadata: Metadata = {
    title: 'Our Heritage | V2 Enterprise',
    description:
        'Discover the story behind V2 Enterprise. A legacy of premium craftsmanship, luxury fabrics, and timeless menswear from Bhavnagar.',
    alternates: {
        canonical: '/about',
    },
};

export default function AboutPage() {
    return <AboutContent />;
}
