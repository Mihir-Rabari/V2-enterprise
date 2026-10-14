import type { Metadata } from 'next';
import Addresses from './addresses-content';

/**
 * /account/addresses — server entry for the address-book view (Next.js port
 * of the nested `<Route path="addresses" element={<Addresses />} />` in the
 * Vite `frontend/pages/Account.tsx`). Deep links and refreshes hit this file
 * directly (the App Router owns the URL — no client-side tab state).
 *
 * Metadata: per docs/SEO_AUDIT.md §6.3, minimal title + no canonical +
 * `robots: { index: false }` for private account routes (the Vite app set no
 * meta here and robots.txt blocks /account).
 *
 * The interactive CRUD view lives in the client component
 * `./addresses-content.tsx` (client components cannot export metadata). The
 * shared account shell and the unauthenticated → /login gate live in
 * ../layout.tsx.
 */

export const metadata: Metadata = {
    title: 'My Addresses | V2 Enterprise',
    robots: { index: false },
};

export default function AccountAddressesPage() {
    return <Addresses />;
}
