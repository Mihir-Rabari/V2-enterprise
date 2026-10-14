import type { Metadata } from 'next';
import Profile from './profile-content';

/**
 * /account — server entry for the account hub index (Next.js port of the
 * nested `<Route index element={<Profile />} />` in the Vite
 * `frontend/pages/Account.tsx`).
 *
 * Metadata: per docs/SEO_AUDIT.md §6.3 the account routes set NO meta in the
 * Vite app and are blocked in robots.txt; the checklist prescribes a minimal
 * title + `robots: { index: false }` and NO canonical for private routes.
 *
 * Route placement mirrors frontend/components/CustomerView.tsx: /account
 * rendered INSIDE the customer layout → this page lives in the (storefront)
 * route group (the AuthProvider > ... > CartProvider stack it relies on),
 * wrapped by the shared account shell in ../layout.tsx.
 *
 * Unauthenticated behavior is replicated from the source
 * (`<Navigate to="/login" state={{ from: location }} replace />`): the shell
 * renders on the server, then the client-side gate in ../layout.tsx
 * replace-navigates to /login (current path carried via ?redirect=).
 */

export const metadata: Metadata = {
    title: 'My Account | V2 Enterprise',
    robots: { index: false },
};

export default function AccountProfilePage() {
    return <Profile />;
}
