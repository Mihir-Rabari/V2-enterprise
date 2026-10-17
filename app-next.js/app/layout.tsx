import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Providers from './providers';
import { backendGet } from '@/lib/serverApi';
import type { SiteSettings } from '@/types';
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
// Playfair Display 400/700 + italic 400, Inter 400/500/600 — self-hosted via
// next/font/local from ./fonts (sources/licenses in ./fonts/README.md).
//
// Why local instead of next/font/google: the Google loader must fetch font
// metadata from fonts.googleapis.com when the root layout compiles, which
// makes `next dev` rendering depend on the network. When that fetch fails
// (sandboxed CI, offline or flaky network) Next has been observed to either
// hard-fail with HTTP 500 on every route (the original symptom reported on
// this branch) or, on Next 16.4 today, silently fall back to system fonts
// with warnings — dev-mode typography degrades either way. Self-hosting
// removes the network dependency entirely: dev and build both resolve the
// fonts from the repo and the real typefaces always ship.
//
// Fidelity notes:
// - Google serves these families as variable woff2 fonts (one file per style,
//   instanced by the @font-face weight), so each entry below re-declares the
//   same file at the exact weights/styles the previous next/font/google setup
//   emitted: Inter 400/500/600 normal; Playfair Display 400/700 normal +
//   400/700 italic (the google config's style/weight cartesian product).
// - `declarations` re-declares Google's latin-subset unicode-range verbatim,
//   so the same codepoints map to the webfont (and everything else falls
//   through to the system stack) exactly as before. NOTE: next/font config
//   values must be explicitly written literals in Turbopack (a variable
//   reference silently drops its field and 500s every route), so the range
//   is inlined below instead of shared via a const.
const inter = localFont({
  src: [
    { path: './fonts/inter-variable-latin.woff2', weight: '400', style: 'normal' },
    { path: './fonts/inter-variable-latin.woff2', weight: '500', style: 'normal' },
    { path: './fonts/inter-variable-latin.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
  adjustFontFallback: 'Arial',
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
});

const playfair = localFont({
  src: [
    { path: './fonts/playfair-display-variable-latin.woff2', weight: '400', style: 'normal' },
    { path: './fonts/playfair-display-variable-latin.woff2', weight: '700', style: 'normal' },
    { path: './fonts/playfair-display-italic-variable-latin.woff2', weight: '400', style: 'italic' },
    { path: './fonts/playfair-display-italic-variable-latin.woff2', weight: '700', style: 'italic' },
  ],
  variable: '--font-playfair',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The font variable classes must sit on <html> (= :root): the @theme tokens
  // (--font-sans: var(--font-inter), …) resolve their var() at computed-value
  // time ON :root, where --font-inter was undefined while these classes lived
  // on <body> — every font token then computed to the guaranteed-invalid empty
  // value and the whole page silently rendered in the system font stack.
  // Public site settings, fetched on the server and cached (lib/serverApi.ts),
  // so pages render with the real navbar/section order in the first HTML.
  const settings = await backendGet<SiteSettings>('/settings');
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        {/* Shared client providers (toast, and later the context stack) live in Providers. */}
        <Providers initialSettings={settings}>{children}</Providers>
      </body>
    </html>
  );
}
