import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import Providers from './providers';

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

// Base metadata mirrors frontend/index.html's title/description.
// Extended SEO (canonical, Open Graph, sitemap, robots) is owned by the SEO agent.
export const metadata: Metadata = {
  title: 'V2 Enterprise — Premium Luxury Fashion',
  description:
    "Discover V2 Enterprise's exclusive collection of premium menswear and luxury fashion. Crafted with care in Bhavnagar, Gujarat. Shop kurtas, shirts, and more.",
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
