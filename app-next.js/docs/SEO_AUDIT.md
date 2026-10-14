# SEO & Metadata Audit — Vite → Next.js migration

Report-only audit of the SEO surface, produced by the **seo** workstream
(`migration/seo-metadata`). It documents (a) what the legacy Vite app actually
emitted, (b) what the merged `app-next.js/` tree has today, and (c) a per-route
checklist of `metadata` each **page agent** should export when porting their
pages. Page agents own their page files; this doc is the coordination surface —
no page files were edited to produce it.

Related infra shipped alongside this audit (all owned by the seo workstream):

| File | Serves / purpose |
| --- | --- |
| `lib/seo.ts` | Single source of truth: canonical origin, site name, legacy head constants, server-side API base for SEO fetches |
| `app/robots.ts` | `/robots.txt` (port of `frontend/public/robots.txt`) |
| `app/sitemap.ts` | `/sitemap.xml` (static matrix routes + API-driven dynamic entries) |
| `public/v2_logo.webp` | Favicon asset (byte-identical copy, see §4) |
| `app/layout.tsx` (metadata only) | Root `metadata`/`viewport` (canonical, OG, Twitter, robots, verification, theme-color) |

---

## 1. Canonical domain — evidence

**Production origin: `https://v2enterprise.in`** — unambiguous, five independent
sources in the legacy stack:

| # | Source | Evidence |
| --- | --- | --- |
| 1 | `frontend/index.html` | `<link rel="canonical" href="https://v2enterprise.in/">` and `<meta property="og:url" content="https://v2enterprise.in/">` |
| 2 | `frontend/public/robots.txt` | `Sitemap: https://v2enterprise.in/sitemap.xml` |
| 3 | `frontend/public/sitemap.xml` | every `<loc>` is `https://v2enterprise.in/…` |
| 4 | `frontend/hooks/usePageMeta.ts` | `const BASE_URL = 'https://v2enterprise.in'` (absolutizes canonicals + og:image) |
| 5 | `backend/src/modules/sitemap/sitemap.controller.ts` + `backend/src/config/env.ts` | `BASE_URL = 'https://v2enterprise.in'`; `FRONTEND_URL`/`BACKEND_URL` default to it |

`frontend/vercel.json` contains only an SPA rewrite (`/(.*) → /index.html`) — no
domain evidence there.

**Environment contract** (`lib/seo.ts`):

- `NEXT_PUBLIC_SITE_URL` overrides the fallback everywhere:
  - dev: `http://localhost:3001` (matches `.env.example`),
  - production: `https://v2enterprise.in` (set it explicitly, or the
    well-evidenced fallback in `lib/seo.ts` applies — a production build can
    therefore never emit localhost/dev URLs).
- `NEXT_PUBLIC_API_URL` — absolute API base (`https://v2enterprise.in/api/v1` in
  production same-origin topology; `http://localhost:5000/api/v1` in dev).
  Needed for the sitemap's dynamic product/category entries; if unset in
  production the sitemap gracefully serves the static entries only.

## 2. What the legacy Vite app emitted

### 2.1 Static head (`frontend/index.html`)

| Tag | Value |
| --- | --- |
| `<title>` | `V2 Enterprise — Premium Luxury Fashion` |
| `meta description` | `Discover V2 Enterprise's exclusive collection of premium menswear and luxury fashion. Crafted with care in Bhavnagar, Gujarat. Shop kurtas, shirts, and more.` |
| `meta robots` | `index, follow` |
| canonical | `https://v2enterprise.in/` |
| OG | type `website`, site_name `V2 Enterprise`, title as above, og:description `Exclusive premium menswear and luxury fashion from Bhavnagar, Gujarat. Shop V2 Enterprise's curated collections.`, og:image `/og-image.jpg`, og:url `https://v2enterprise.in/` |
| Twitter | `summary_large_image`, title as above, description `Exclusive premium menswear and luxury fashion, crafted with care.`, image `/og-image.jpg` |
| Icon | `<link rel="icon" type="image/webp" href="/v2_logo.webp">` |
| theme-color | `#0A0A0B` |
| google-site-verification | `dWAxr9hgKpMtQ9YUgjrYh4rMtAfrcyUS61LZkFG5PKM` |
| 3rd-party | Google Tag Manager (`GTM-PLX86FB7`), Meta Pixel (`1887679655474555`) |

All of the SEO-relevant entries above are now ported in `app/layout.tsx`
(see §5). GTM/Meta Pixel are runtime analytics scripts, not metadata — tracked
as a follow-up in §7.

### 2.2 Runtime head (`frontend/hooks/usePageMeta.ts`)

The Vite app mutated the head client-side via `usePageMeta({ title, description,
ogImage, ogType, canonical, jsonLd })`:

- `<title>`, `meta description`, `og:title/type/image/site_name`,
  `twitter:title/image`, `link[rel=canonical]` (absolutized against
  `https://v2enterprise.in`), and a single `script[type="application/ld+json"]`
  (removed again on unmount).
- **Client-only by construction** — crawlers executing JS got these tags, but
  they were absent from the initial HTML. The Next.js Metadata API fixes this
  class of problem by rendering real head tags server-side.
- **`usePageMeta` should not be ported** to `app-next.js/hooks/` — it is fully
  superseded by per-route `export const metadata` / `generateMetadata`
  (recommendation to the shared-providers agent, who owns `hooks/*`).

### 2.3 Per-route legacy coverage (grep of `frontend/pages` + `frontend/components`)

`usePageMeta` was called on only 5 routes; JSON-LD existed on only 1:

| Route (Vite source) | usePageMeta? | Legacy title | Legacy canonical | Notes |
| --- | --- | --- | --- | --- |
| `/` (`Home.tsx`) | ❌ **imports but never calls it** (dead import, line 19) | *(static head title)* | *(static head canonical)* | Home relied entirely on `index.html` |
| `/shop` (`Shop.tsx`) | ✅ | `Shop All \| V2 Enterprise` | `/shop` | |
| `/new-arrivals` (Shop variant) | ⚠️ same component | `Shop All \| V2 Enterprise` | **`/shop`** ❌ | Canonical-duplication bug: variant re-used `/shop`'s meta verbatim |
| `/[category]` (`SubCategories.tsx`) | ❌ | *(static)* | *(none)* | No meta at all |
| `/[category]/[subcategory]` (Shop variant) | ⚠️ same component | `Shop All \| V2 Enterprise` | **`/shop`** ❌ | Same duplication bug |
| `/product/[id]`, `/[category]/[subcategory]/[id]` (`ProductDetails.tsx`) | ✅ | `` `${product.name} \| V2 Enterprise` `` (fallback `Product Details \| V2 Enterprise`) | `/product/${id}` | Only JSON-LD emitter (Product schema, see §6.4); ogType `product`, ogImage = product photo |
| `/categories` (`Categories.tsx`) | ❌ | *(static)* | *(none)* | |
| `/about` (`About.tsx`) | ✅ | `Our Heritage \| V2 Enterprise` | `/about` | |
| `/contact` (`Contact.tsx`) | ✅ | `Contact Us \| V2 Enterprise` | `/contact` | |
| `/cart` (`Cart.tsx`) | ❌ | *(static)* | *(none)* | Blocked in robots.txt |
| `/checkout` (`Checkout.tsx`) | ✅ | `Checkout \| V2 Enterprise` | `/checkout` | Blocked in robots.txt |
| `/login`, `/signup` | ❌ | *(static)* | *(none)* | |
| `/privacy` `/terms` `/shipping` `/returns` (`LegalPage.tsx`) | ❌ | *(static)* — the variant title map (`Privacy Protocol`, `Terms of Excellence`, `Deployment & Logistics`, `Archive & Exchange`) is **visual `<h1>` only**, never a `<title>` | *(none)* | |
| `/size-guide` (`SizeGuide.tsx`) | ❌ | *(static)* | *(none)* | |
| `/account/*`, `/liked` (`Account.tsx`) | ❌ | *(static)* | *(none)* | Blocked in robots.txt |
| `/forgot-password`, `/reset-password/[token]` | ❌ | *(static)* | *(none)* | |
| `/admin/**` (`AdminDashboard`) | ❌ | *(static)* | *(none)* | Blocked in robots.txt |

### 2.4 Legacy robots/sitemap — two competing sources

The legacy stack had **two** robots/sitemap sources, and production served the
weaker of the two:

1. `frontend/public/robots.txt` + `sitemap.xml` (static, intended rules):
   robots blocks `/admin`, `/account`, `/checkout`, `/cart`; sitemap lists `/`,
   `/shop`, `/categories`, `/about`, `/contact`, `/new-arrivals`.
2. `backend/src/modules/sitemap` (dynamic, mounted at `app.use('/', sitemapRoutes)`
   in `backend/src/app.ts` **before** the production static middleware) — so
   production `/robots.txt` was actually the backend's *`Allow: /`-only* version
   (no private-area blocks) and `/sitemap.xml` the backend's dynamic one. The
   backend's category URLs (`/category/<slug>`) were stale: the frontend links
   categories by **name** (`Categories.tsx`:
   `` to={`/${encodeURIComponent(category.name)}`}``), not slug.

The Next port (this PR) supersedes both: Vite robots semantics restored (with
the private-area blocks), sitemap rebuilt against the committed route matrix,
and dynamic URLs built in the *actual* legacy URL shapes (`/<name>`,
`/<parent>/<name>`, `/product/<id>`). The backend module can be retired in a
backend-owned PR once the Next app serves the domain.

## 3. Current state of the merged `app-next.js` tree (pre-PR)

- `app/layout.tsx` — root `metadata` with title/description only (foundation);
  extended by this PR (see §5).
- `app/(storefront)/page.tsx` — placeholder home, **no** `metadata` export
  (inherits root metadata; correct for `/` — see §6.1).
- No `robots`/`sitemap`/icon/opengraph-image files existed; no `public/` dir.
- `lib/apiClient.ts` is client-only (localStorage interceptors) and therefore
  intentionally **not** used by server-side SEO code (`app/sitemap.ts` has its
  own small fetch helpers).

## 4. Favicon decision

- `frontend/index.html` **actively references** `/v2_logo.webp` as the site
  icon: `<link rel="icon" type="image/webp" href="/v2_logo.webp">`.
- Next 16's `app/icon.*` file convention accepts only
  `.ico/.jpg/.jpeg/.png/.svg` (verified against `next@16.4.0`
  `STATIC_METADATA_IMAGES.icon.extensions` and the bundled docs) — so
  `app/icon.webp` would be silently ignored.
- **Decision:** byte-identical copy of `frontend/public/v2_logo.webp` →
  `app-next.js/public/v2_logo.webp` (same URL path as the Vite app:
  `/v2_logo.webp`), plus a `metadata.icons` entry in the root layout that emits
  the same `<link rel="icon" type="image/webp">`. No re-encoding, no other
  media copied (asset policy respected — this is the only asset, because it is
  the only one the head actively referenced).
- `og-image.jpg` was referenced by the legacy head but **does not exist** in
  the repo (`frontend/public/` contains only robots.txt, sitemap.xml,
  v2_logo.webp, one mp4). `og:image` is therefore omitted from root metadata
  rather than shipping a dead URL — see §7 follow-ups.

## 5. Root metadata shipped in this PR (`app/layout.tsx`)

| Field | Value | Source |
| --- | --- | --- |
| `metadataBase` | `new URL(SITE_URL)` | `lib/seo.ts` (env-driven, prod fallback `https://v2enterprise.in`) |
| `title` | `V2 Enterprise — Premium Luxury Fashion` | unchanged from foundation / index.html |
| `description` | *(index.html description, unchanged)* | index.html |
| `alternates.canonical` | `/` → `https://v2enterprise.in/` | index.html |
| `icons.icon` | `/v2_logo.webp` (type `image/webp`) | index.html |
| `openGraph` | type `website`, siteName, url `/`, index.html og:title/og:description | index.html |
| `twitter` | `summary_large_image` + index.html twitter title/description | index.html |
| `robots` | `index: true, follow: true` | index.html |
| `verification.google` | `dWAxr9hgKpMtQ9YUgjrYh4rMtAfrcyUS61LZkFG5PKM` | index.html |
| `viewport.themeColor` | `#0A0A0B` | index.html |

**No `title.template` is set, on purpose.** Legacy titles are complete strings
(`'Shop All | V2 Enterprise'`); a `'%s | V2 Enterprise'` template would double
the suffix when page agents port those strings verbatim. Page agents export
**full title strings**. `metadataBase` (not the template) is the inheritance
mechanism that makes relative canonicals/OG URLs resolve absolutely.

## 6. Checklist for page agents — metadata each route should export

Rules of thumb:

- Export `metadata` (static) or `generateMetadata` (dynamic data) from every
  `page.tsx`. `metadataBase` and OG defaults come from the root layout — you
  only override what differs.
- Canonicals: export **site-relative** strings (`alternates: { canonical: '/shop' }`);
  `metadataBase` absolutizes them to `https://v2enterprise.in`.
- Titles: full strings, `'<Page> | V2 Enterprise'`, matching legacy copy.
- Private/transactional routes (account, cart, checkout, admin, auth-recovery):
  export `robots: { index: false, follow: false }` — robots.txt already
  disallows the main ones, but the meta tag also protects them from any
  indexing via incoming links.
- JSON-LD: render `<script type="application/ld+json" dangerouslySetInnerHTML>`
  in the server component — no client-side injection.

| Route (Next file) | Owner | `title` | `description` | `alternates.canonical` | OG / other |
| --- | --- | --- | --- | --- | --- |
| `/` `(storefront)/page.tsx` | home | Rely on root layout (legacy home did the same via index.html) — an explicit export equal to the root values is also fine | root default | `/` (root already sets it) | root OG |
| ✅ `/shop` `(storefront)/shop/page.tsx` (landed) | catalog | `Shop All \| V2 Enterprise` | `Browse the full V2 Enterprise collection — premium kurtas, shirts, and luxury menswear. Filter by category, fabric, size, and more.` | `/shop` | default OG |
| ✅ `/new-arrivals` (landed) | catalog | `New Arrivals \| V2 Enterprise` (**fix:** legacy reused `/shop`'s title) | `The latest arrivals from V2 Enterprise — fresh drops of premium menswear.` | `/new-arrivals` (**fix:** legacy pointed at `/shop`) | default OG |
| ✅ `/categories` (landed) | catalog | `Shop by Category \| V2 Enterprise` (legacy had none) | `Browse every V2 Enterprise collection — explore our main categories of premium kurtas, shirts, and luxury menswear.` | `/categories` | default OG |
| ✅ `/[category]` (landed) | catalog | `generateMetadata`: `` `${paramToLabel(category)} \| V2 Enterprise` `` (legacy had none) | derived category copy | `` `/${category}` `` | default OG |
| ✅ `/[category]/[subcategory]` (landed) | catalog | `generateMetadata`: `` `${paramToLabel(subcategory)} \| V2 Enterprise` `` (**fix:** legacy reused `/shop`'s) | derived copy | `` `/${category}/${subcategory}` `` (**fix:** legacy pointed at `/shop`) | default OG |
| `/product/[id]` | catalog | `generateMetadata`: `` `${product.name} \| V2 Enterprise` `` (fallback `Product Details \| V2 Enterprise`) | `product.description.slice(0, 160)` (fallback `Premium luxury fashion from V2 Enterprise.`) | `` `/product/${id}` `` | `openGraph.images: [product.photo]`, `openGraph.type: 'website'` (OG has no `product` type; keep Product JSON-LD — §6.4); nested `/[category]/[subcategory]/[id]` should canonicalize to `/product/[id]` like the legacy app did |
| ✅ `/about` (landed) | informational | `Our Heritage \| V2 Enterprise` | `Discover the story behind V2 Enterprise. A legacy of premium craftsmanship, luxury fabrics, and timeless menswear from Bhavnagar.` | `/about` | default OG |
| ✅ `/contact` (landed) | informational | `Contact Us \| V2 Enterprise` | `Get in touch with V2 Enterprise. Visit our Smart Fashion Hub in Bhavnagar, or reach out to our team of style experts.` | `/contact` | default OG |
| `/cart` | cart-checkout | e.g. `Your Cart \| V2 Enterprise` | — | **no canonical** (non-indexable) | `robots: { index: false }` |
| `/checkout` | cart-checkout | `Checkout \| V2 Enterprise` (legacy) | — | **no canonical** (legacy had `/checkout` — pointless on a blocked page) | `robots: { index: false }` |
| `/login` | auth-account | e.g. `Login \| V2 Enterprise` | — | `/login` or none | low-value page; consider `robots: { index: false }` |
| `/signup` | auth-account | e.g. `Create Account \| V2 Enterprise` | — | `/signup` or none | consider `robots: { index: false }` |
| ✅ `/privacy` `/terms` `/shipping` `/returns` (landed) | informational | e.g. `Privacy Policy \| V2 Enterprise` etc. (legacy variant titles were **visual `<h1>` only**) | 1-line summary each | `/privacy` … `/returns` | default OG |
| ✅ `/size-guide` (landed) | informational | e.g. `Size Guide \| V2 Enterprise` | — | `/size-guide` | default OG |
| `/account/*`, `/liked` | auth-account | minimal | — | **no canonical** | `robots: { index: false }` |
| `/forgot-password`, `/reset-password/[token]` | auth-account | minimal | — | **no canonical** | `robots: { index: false }` |
| `/admin/**` | admin | minimal | — | **no canonical** | `robots: { index: false, follow: false }` |

### 6.4 Product JSON-LD (the only schema the legacy app emitted)

`frontend/pages/ProductDetails.tsx` (lines 63–108) built a schema.org
**Product** with: `name`, `image: [photo, ...photos]`, `description`, `brand`
(V2 Enterprise), `sku`/`mpn` (styleCode or id), `offers` (url
`https://v2enterprise.in/product/<id>`, priceCurrency `INR`, `price`,
`priceValidUntil` +1y, `itemCondition` NewCondition, availability InStock ↔
quantity>0, seller V2 Enterprise) and, when reviews exist, `aggregateRating` +
`review[]`. When porting to a server component:

- reproduce the same fields from server-fetched product data,
- build `offers.url` with `absoluteUrl(\`/product/${id}\`)` from `lib/seo.ts`
  instead of the legacy hardcoded domain,
- inject via `<script type="application/ld+json" dangerouslySetInnerHTML>`.
- Legacy *also* set `ogType: 'product'`; `og:type` has no `product` value
  (it's `website`/`article`/`profile`/`video.*`), so use JSON-LD for product
  semantics and keep OG `website`.

## 7. Follow-ups (owners beyond this workstream)

1. **og-image.jpg is missing** — legacy head and `usePageMeta` referenced
   `/og-image.jpg`, but the asset exists nowhere in the repo; root metadata
   omits `og:image` rather than emitting a dead URL. Whoever owns assets should
   add a real `og-image.jpg`/`opengraph-image.*` under `app-next.js/` and add it
   to root/page OG (product pages already use real CDN photos).
2. **GTM (`GTM-PLX86FB7`) + Meta Pixel (`1887679655474555`)** scripts from
   `frontend/index.html` need a Next home (`next/script` in the root layout, or
   a dedicated analytics agent decision) — not SEO metadata, deliberately left
   out of this PR.
3. **`usePageMeta` port**: recommend *not* porting it (superseded by the
   Metadata API) — decision belongs to the shared-providers agent (`hooks/*`).
4. **Backend sitemap module retirement** (`backend/src/modules/sitemap`):
   once the Next app serves `v2enterprise.in`, `/robots.txt` + `/sitemap.xml`
   come from `app/robots.ts` + `app/sitemap.ts`; the Express module (and its
   stale `/category/<slug>` URL shape) can be removed by a backend PR.
5. **Sitemap dynamic entries in production** require `NEXT_PUBLIC_API_URL`
   (absolute) — see §1. Without it the sitemap serves the 13 static entries.
   If catalog growth demands it, consider `generateSitemaps` pagination
   (Google cap 50k/sitemap) and raising the 3-page/1500-product fetch cap in
   `app/sitemap.ts`.
6. **`docs/SEO_AUDIT.md` updates**: page agents, when you land your route's
   metadata, tick/adjust your row in §6 so this file stays the source of truth.

## 8. Verification (run by this PR — see PR body for raw outputs)

- `npm run typecheck` / `npm run build` green (strict TS).
- Dev server on 3001: `/robots.txt` and `/sitemap.xml` return the generated
  content (static entries; dynamic entries empty with no local backend —
  graceful degradation by design).
- `git status` clean outside `app-next.js/`.
