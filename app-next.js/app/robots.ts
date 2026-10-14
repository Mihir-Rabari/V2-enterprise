import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * `/robots.txt` — Next.js MetadataRoute.Robots port of `frontend/public/robots.txt`.
 *
 * Legacy semantics preserved exactly (frontend/public/robots.txt):
 *
 * ```
 * User-agent: *
 * Allow: /
 *
 * # Block admin and private areas
 * Disallow: /admin
 * Disallow: /account
 * Disallow: /checkout
 * Disallow: /cart
 *
 * # Sitemap location
 * Sitemap: https://v2enterprise.in/sitemap.xml
 * ```
 *
 * Notes:
 *  - `Allow: /` + a `Disallow` list is equivalent to Next's `allow: '/'` plus an
 *    explicit `disallow` array; the generated file keeps the same net rules.
 *  - The sitemap pointer now targets this app's `/sitemap.xml` (generated from
 *    `app/sitemap.ts`), absolutized against the canonical origin
 *    (`NEXT_PUBLIC_SITE_URL`, default `https://v2enterprise.in` — see lib/seo.ts).
 *  - Evidence: in the legacy stack the Express backend also mounted its own
 *    `/robots.txt` route (backend/src/modules/sitemap — `Allow: /` only, no
 *    disallows) *before* the static frontend, so production actually served the
 *    backend's weaker rules. This port restores the intended private-area
 *    blocks expressed in the Vite `robots.txt`.
 *  - Routes intentionally NOT disallowed (parity with the legacy rules; do not
 *    invent new ones): /login, /signup, /liked, /forgot-password, /reset-password.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/account', '/checkout', '/cart'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
