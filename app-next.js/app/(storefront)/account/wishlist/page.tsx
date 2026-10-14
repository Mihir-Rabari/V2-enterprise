import type { Metadata } from 'next';
import Wishlist from './wishlist-content';

/**
 * /account/wishlist — server entry for the wishlist view (Next.js port of the
 * nested `<Route path="wishlist" element={<Wishlist />} />` in the Vite
 * `frontend/pages/Account.tsx`). Deep links and refreshes hit this file
 * directly; it is also the permanent home of the legacy `/liked` URL, which
 * the Vite app redirected here (`<Route path="liked" element={<Navigate
 * to="/account/wishlist" replace />} />` — see app/(storefront)/liked/page.tsx).
 *
 * Metadata: per docs/SEO_AUDIT.md §6.3, minimal title + no canonical +
 * `robots: { index: false }` for private account routes (the Vite app set no
 * meta here and robots.txt blocks /account).
 *
 * The data-fetching view lives in the client component
 * `./wishlist-content.tsx` (client components cannot export metadata). The
 * shared account shell and the unauthenticated → /login gate live in
 * ../layout.tsx.
 */

export const metadata: Metadata = {
    title: 'My Wishlist | V2 Enterprise',
    robots: { index: false },
};

export default function AccountWishlistPage() {
    return <Wishlist />;
}
