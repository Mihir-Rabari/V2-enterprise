/**
 * /reset-password/[token] — ported from frontend/pages/ResetPassword.tsx.
 *
 * ROUTE PLACEMENT (verified against frontend/App.tsx): declared above the
 * CustomerView catch-all as `<Route path="/reset-password/:token">` — rendered
 * STANDALONE, outside CustomerLayout, with no Navbar/Footer. So the page lives
 * at the app root (NOT in the (storefront) route group).
 *
 * The Server Component awaits the App Router params Promise (Next 16) and
 * passes the token string to the client view — replacing the source's
 * useParams(). The API contract is unchanged: authAPI.resetPassword posts
 * { password } to POST /auth/reset-password/:token.
 *
 * SEO (docs/SEO_AUDIT.md §6.3, auth-account row): Vite set no meta; per the
 * checklist this gets a minimal title + `robots: { index: false }`, no canonical
 * (the static metadata export applies to every token value — deliberately, the
 * reset link must never be indexed regardless of token).
 */

import type { Metadata } from 'next';
import ResetPasswordView from '@/components/auth/ResetPasswordView';

export const metadata: Metadata = {
    title: 'New Password | V2 Enterprise',
    robots: { index: false },
};

export default async function ResetPasswordPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    return <ResetPasswordView token={token} />;
}
