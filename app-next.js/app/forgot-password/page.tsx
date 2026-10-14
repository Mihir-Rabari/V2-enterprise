/**
 * /forgot-password — ported from frontend/pages/ForgotPassword.tsx.
 *
 * ROUTE PLACEMENT (verified against frontend/App.tsx): this route was declared
 * ABOVE the CustomerView catch-all — it rendered STANDALONE, outside
 * CustomerLayout, with no Navbar/Footer. So the page lives at the app root (NOT
 * in the (storefront) route group) and only inherits the root layout
 * (SettingsProvider + Toaster).
 *
 * The page file stays a Server Component for the metadata export; the form is
 * the client component components/auth/ForgotPasswordView.tsx.
 *
 * SEO (docs/SEO_AUDIT.md §6.3, auth-account row): Vite set no meta; per the
 * checklist this gets a minimal title + `robots: { index: false }`, no canonical.
 */

import type { Metadata } from 'next';
import ForgotPasswordView from '@/components/auth/ForgotPasswordView';

export const metadata: Metadata = {
    title: 'Reset Access | V2 Enterprise',
    robots: { index: false },
};

export default function ForgotPasswordPage() {
    return <ForgotPasswordView />;
}
