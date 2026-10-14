/**
 * /login — ported from frontend/pages/Login.tsx (rendered via the Vite route
 * `<Route path="login">` INSIDE CustomerView, so this lives in the (storefront)
 * group and gets the Navbar/Footer + provider stack from the group layout).
 *
 * The page file stays a Server Component so it can export route metadata, and
 * it reads the `?redirect=` return-to param server-side (awaiting the App
 * Router searchParams Promise) and hands it to the client form as a plain
 * prop — the same params-as-prop pattern the reset-password route uses. This
 * keeps the form fully server-rendered in the initial HTML (a client-side
 * useSearchParams() read would exclude it behind a Suspense boundary instead
 * of rendering it, since it forces static-prerender bailout).
 *
 * The `?redirect=` param is the return-to contract the account guard uses:
 * AccountShell sends unauthenticated deep-linkers to
 * `/login?redirect=<origin-path>`. React Router's `location.state.from`
 * (the other source the Vite page checked) has no App Router equivalent.
 *
 * Values that are not in-app paths (must start with a single '/') fall back
 * to '/account' — React Router's navigate() only ever performed in-app
 * navigation in the source, so this guard restores that property; it also
 * neutralizes protocol-relative ('//evil.com') URLs.
 *
 * SEO (docs/SEO_AUDIT.md §6.3, auth-account row): the Vite page set no meta at
 * all. Per the audit checklist this route gets a full legacy-style title and
 * `robots: { index: false }` (low-value auth page); no canonical — consistent
 * with the other non-indexable routes (cart/checkout/account).
 */

import type { Metadata } from 'next';
import LoginView from '@/components/auth/LoginView';

export const metadata: Metadata = {
    title: 'Login | V2 Enterprise',
    robots: { index: false },
};

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ redirect?: string | string[] }>;
}) {
    const params = await searchParams;
    const raw = Array.isArray(params.redirect) ? params.redirect[0] : params.redirect;
    const redirectPath = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/account';
    return <LoginView redirectPath={redirectPath} />;
}
