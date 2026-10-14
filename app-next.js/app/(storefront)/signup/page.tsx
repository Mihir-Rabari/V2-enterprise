/**
 * /signup — ported from frontend/pages/Register.tsx. The Vite router mounted
 * Signup.tsx at /signup, but Signup.tsx is a pure re-export of Register.tsx
 * (`export { default } from './Register'`), so Register's form IS this page —
 * there is exactly one signup implementation in the source and exactly one
 * here (components/auth/SignupView.tsx). Rendered inside CustomerView in the
 * Vite app, so this lives in the (storefront) group with the Navbar/Footer.
 *
 * The page file stays a Server Component for the metadata export, and reads
 * the `?redirect=` return-to param server-side (awaiting the App Router
 * searchParams Promise), passing it to the client form as a plain prop — the
 * same params-as-prop pattern the reset-password route uses, keeping the form
 * fully server-rendered in the initial HTML. Non-in-app path values (must
 * start with a single '/') fall back to '/account' — React Router's navigate()
 * only ever performed in-app navigation in the source, so this restores that
 * property and neutralizes protocol-relative URLs.
 *
 * SEO (docs/SEO_AUDIT.md §6.3, auth-account row): the Vite page set no meta;
 * per the checklist this route gets a full title + `robots: { index: false }`,
 * no canonical (non-indexable).
 */

import type { Metadata } from 'next';
import SignupView from '@/components/auth/SignupView';

export const metadata: Metadata = {
    title: 'Create Account | V2 Enterprise',
    robots: { index: false },
};

export default async function SignupPage({
    searchParams,
}: {
    searchParams: Promise<{ redirect?: string | string[] }>;
}) {
    const params = await searchParams;
    const raw = Array.isArray(params.redirect) ? params.redirect[0] : params.redirect;
    const redirectPath = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/account';
    return <SignupView redirectPath={redirectPath} />;
}
