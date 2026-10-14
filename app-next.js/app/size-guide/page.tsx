import type { Metadata } from 'next';
import SizeGuideContent from './size-guide-content';

/**
 * /size-guide — server entry for the Size Guide (Next.js port of
 * frontend/pages/SizeGuide.tsx).
 *
 * STANDALONE ROUTE: in the Vite App.tsx, /size-guide was registered OUTSIDE
 * the CustomerView router (no Navbar/Footer/customer layout), so this page
 * lives at the app root (`app/size-guide/page.tsx`), not inside the
 * (storefront) route group.
 *
 * Metadata note: the Vite SizeGuide never called usePageMeta, so the document
 * title stayed at the static app default. Per the SEO audit checklist
 * (SEO_AUDIT.md §6, `/size-guide` row) this route exports a
 * route-appropriate title + canonical; the interactive content lives in the
 * client component `./size-guide-content.tsx` (client components cannot
 * export metadata).
 */

export const metadata: Metadata = {
    title: 'Size Guide | V2 Enterprise',
    alternates: {
        canonical: '/size-guide',
    },
};

export default function SizeGuidePage() {
    return <SizeGuideContent />;
}
