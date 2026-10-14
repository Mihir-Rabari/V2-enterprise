import type { Metadata } from 'next';
import LegalPage from '../_components/legal-page';

/**
 * /returns — Next.js port of the `returns` route of frontend/pages/LegalPage.tsx.
 *
 * The Vite router mapped all four legal paths (privacy/returns/shipping/terms)
 * to the same LegalPage component, which picked its key from the URL. Here
 * each route file passes its key explicitly, so the shared component renders
 * exactly the title the Vite version derived from this path:
 *   returns → "Archive & Exchange"
 *
 * Metadata note: the Vite LegalPage never called usePageMeta — the variant
 * title map was visual <h1> only, never a <title> (SEO_AUDIT.md §2.3). Per the
 * audit's checklist (§6, legal-routes row) this route exports a
 * route-appropriate title + 1-line description + canonical, so the legal
 * routes are no longer headless duplicates in the eyes of crawlers.
 */

export const metadata: Metadata = {
    title: 'Returns & Exchanges | V2 Enterprise',
    description: 'V2 Enterprise returns and exchange policy for your purchases.',
    alternates: {
        canonical: '/returns',
    },
};

export default function ReturnsPage() {
    return <LegalPage type="returns" />;
}
