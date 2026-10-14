import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_DESCRIPTION,
  DEFAULT_TITLE,
  DEFAULT_TWITTER_DESCRIPTION,
  GOOGLE_SITE_VERIFICATION,
  SITE_NAME,
  SITE_URL,
  THEME_COLOR,
} from '@/lib/seo';

// Same families/weights as frontend/index.html (Google Fonts CDN links):
// Playfair Display 400/700 + italic 400, Inter 400/500/600 — self-hosted via next/font.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

// Root metadata — mirrors frontend/index.html's SEO head. Title/description are
// unchanged from the foundation; the canonical/OG/Twitter/robots/verification
// extensions below were left to the SEO agent (see the previous comment) and
// are driven by lib/seo.ts (canonical origin + evidence).
//
// Page-level `metadata` exports (owned by the page agents — per-route checklist
// in docs/SEO_AUDIT.md) inherit `metadataBase` from here and override
// title/description/canonical per route. No title template is set on purpose:
// legacy titles are complete strings ("Shop All | V2 Enterprise"), so a
// "%s | V2 Enterprise" template would double the suffix — page agents export
// full titles instead.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: '/' },
  icons: {
    // Byte-identical copy of frontend/public/v2_logo.webp (the file the Vite
    // app actively referenced as <link rel="icon" type="image/webp">). Served
    // from public/ at the same /v2_logo.webp path — Next 16's app/icon.*
    // file convention doesn't accept .webp (ico/jpg/jpeg/png/svg only), so this
    // Metadata entry replaces that <link> instead.
    icon: { url: '/v2_logo.webp', type: 'image/webp' },
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: '/',
    title: DEFAULT_TITLE,
    description: DEFAULT_OG_DESCRIPTION,
    // NOTE: og:image deliberately omitted — frontend/index.html referenced
    // /og-image.jpg, but no such asset exists anywhere in the repo
    // (frontend/public has no og-image.jpg), so emitting it would ship a dead
    // URL. Tracked as a follow-up in docs/SEO_AUDIT.md.
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_TWITTER_DESCRIPTION,
  },
  robots: { index: true, follow: true }, // mirrors <meta name="robots" content="index, follow">
  verification: { google: GOOGLE_SITE_VERIFICATION },
};

// PWA/browser chrome color (mirrors index.html <meta name="theme-color">).
export const viewport: Viewport = {
  themeColor: THEME_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable}`}>
        {/* Shared client providers (toast, and later the context stack) live in Providers. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
