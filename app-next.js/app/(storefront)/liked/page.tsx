import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

/**
 * /liked — Next.js port of the Vite redirect route
 * (`frontend/components/CustomerView.tsx`:
 * `<Route path="liked" element={<Navigate to="/account/wishlist" replace />} />`).
 *
 * `redirect()` issues a temporary (307, i.e. permanent=false) server-side
 * redirect to /account/wishlist, which preserves the replace semantics of the
 * source. No loop is possible: /account/wishlist is a real page
 * (app/(storefront)/account/wishlist/page.tsx) that renders the wishlist
 * view and never redirects back to /liked.
 *
 * The Navbar's heart icon links to /liked, exactly as in the Vite app
 * (frontend/components/Navbar.tsx) — this route keeps that URL working.
 *
 * Metadata (docs/SEO_AUDIT.md §6): minimal title + `robots: { index: false }`,
 * no canonical. The 307 response carries no HTML, so the tags never reach a
 * crawler in practice — exported for checklist parity with the audit row.
 */

export const metadata: Metadata = {
    title: 'Liked | V2 Enterprise',
    robots: { index: false },
};

export default function LikedPage() {
    redirect('/account/wishlist');
}
