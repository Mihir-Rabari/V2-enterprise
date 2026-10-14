import type { Metadata } from 'next';
import Orders from './orders-content';

/**
 * /account/orders — server entry for the order-history view (Next.js port of
 * the nested `<Route path="orders" element={<Orders />} />` in the Vite
 * `frontend/pages/Account.tsx`). Deep links and refreshes hit this file
 * directly (the App Router owns the URL — no client-side tab state).
 *
 * Metadata: per docs/SEO_AUDIT.md §6.3, minimal title + no canonical +
 * `robots: { index: false }` for private account routes (the Vite app set
 * no meta here and robots.txt blocks /account).
 *
 * The data-fetching view lives in the client component `./orders-content.tsx`
 * (client components cannot export metadata). The shared account shell and
 * the unauthenticated → /login gate live in ../layout.tsx.
 */

export const metadata: Metadata = {
    title: 'My Orders | V2 Enterprise',
    robots: { index: false },
};

export default function AccountOrdersPage() {
    return <Orders />;
}
