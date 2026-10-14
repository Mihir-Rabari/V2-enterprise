import type { Metadata } from 'next';
import LegalPage from '../_components/legal-page';

/**
 * /terms — Next.js port of the `terms` route of frontend/pages/LegalPage.tsx.
 *
 * The Vite router mapped all four legal paths (privacy/returns/shipping/terms)
 * to the same LegalPage component, which picked its key from the URL. Here
 * each route file passes its key explicitly, so the shared component renders
 * exactly the title the Vite version derived from this path:
 *   terms → "Terms of Excellence"
 *
 * Metadata note: the Vite LegalPage never called usePageMeta — the variant
 * title map was visual <h1> only, never a <title> (SEO_AUDIT.md §2.3). Per the
 * audit's checklist (§6, legal-routes row) this route exports a
 * route-appropriate title + 1-line description + canonical, so the legal
 * routes are no longer headless duplicates in the eyes of crawlers.
 */

export const metadata: Metadata = {
    title: 'Terms of Service | V2 Enterprise',
    description: 'The terms and conditions that govern purchases and use of V2 Enterprise services.',
    alternates: {
        canonical: '/terms',
    },
};

export default function TermsPage() {
    return <LegalPage type="terms" />;
}
