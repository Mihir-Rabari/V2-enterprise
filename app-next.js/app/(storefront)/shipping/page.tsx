import type { Metadata } from 'next';
import LegalPage from '../_components/legal-page';

/**
 * /shipping — Next.js port of the `shipping` route of frontend/pages/LegalPage.tsx.
 *
 * The Vite router mapped all four legal paths (privacy/returns/shipping/terms)
 * to the same LegalPage component, which picked its key from the URL. Here
 * each route file passes its key explicitly, so the shared component renders
 * exactly the title the Vite version derived from this path:
 *   shipping → "Deployment & Logistics"
 *
 * Metadata note: the Vite LegalPage never called usePageMeta — the variant
 * title map was visual <h1> only, never a <title> (SEO_AUDIT.md §2.3). Per the
 * audit's checklist (§6, legal-routes row) this route exports a
 * route-appropriate title + 1-line description + canonical, so the legal
 * routes are no longer headless duplicates in the eyes of crawlers.
 */

export const metadata: Metadata = {
    title: 'Shipping Policy | V2 Enterprise',
    description: 'Shipping, dispatch, and delivery information for V2 Enterprise orders.',
    alternates: {
        canonical: '/shipping',
    },
};

export default function ShippingPage() {
    return <LegalPage type="shipping" />;
}
