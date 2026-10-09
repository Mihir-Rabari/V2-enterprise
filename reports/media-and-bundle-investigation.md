# How media URLs are served, and what is in the build bundle

Investigated 2026-10-09 from source (commit `cd6a495` + audit branch) and live requests. Companion to `performance-audit.md`.

## 1. Media lifecycle (end to end)

1. **Upload (admin only).** Browser `uploadToR2()` (`frontend/lib/r2.ts`) → `POST /api/v1/admin/upload` (`backend/src/modules/admin/admin.routes.ts`) → multer writes the file to `backend/uploads/v2-temp` → `fs.readFileSync` loads the whole file → `uploadToR2()` (`backend/src/utils/r2.ts`) does one S3 `PutObject` to Cloudflare R2 with only `ContentType` set. No resizing, no re-encoding, no thumbnails, no `Cache-Control`, no type check.
2. **Key / URL.** Key = `<folder>/<Date.now()>-<random>-<originalName>`; stored URL = `${R2_PUBLIC_URL}/${key}` (e.g. `https://cdn.v2enterprise.in/products/1786273628083-175204331-917128.jpg`). The absolute URL is saved verbatim in MongoDB (`Product.photo/photos/hoverImage`, hero/slider/category/content documents) and a `Media` row.
3. **API.** URLs are returned unchanged inside the JSON of `/products`, `/categories`, `/sliders/*`, `/content/*`, `/settings` (about 1,260 distinct image URLs for 300 grouped products; ≈2.2 gallery photos + hover image per product).
4. **Frontend.** Components call `getOptimizedImageUrl(url, {width, quality})` (`frontend/src/utils/mediaUtils.ts`). It only rewrites URLs that contain `ik.imagekit.io`; everything else is returned untouched. Result: product cards request the original file. Videos are used as `<video src>` directly (hero, promotional slider). Product videos are YouTube links only.
5. **Edge.** `cdn.v2enterprise.in` is a Cloudflare custom domain on the R2 bucket. Observed: `cf-cache-status: HIT`, `Cache-Control: max-age=604800` (7 d, not immutable), `ETag` present, `Accept-Ranges`/206 for MP4, HTTP/3 in the browser. `?width=` and `/cdn-cgi/image/` are not honoured (404 / ignored), and `Accept: image/webp` does not change the response.

## 2. Where media URLs actually point

| Host | What | Count / evidence | Notes |
|---|---|---|---|
| `cdn.v2enterprise.in` | R2 custom domain: product images (all `.jpg`), hero and slider MP4s | 1,107 product URLs (262 `photo`, 262 `hoverImage`, 583 `photos`) | cached at edge (HIT), 7 d |
| `pub-8848…​.r2.dev` | R2 public dev URL (legacy uploads) | 152 product URLs (38 photo, 38 hover, 76 gallery) ≈ 12% | no `Cache-Control`, no `cf-cache-status` (not edge-cached), TTFB 1.48 s on the sample; r2.dev is intended for development and is rate-limited. Should be rewritten to `cdn.v2enterprise.in` |
| `ik.imagekit.io` | old ImageKit URL (category image) and the only host the resize helper understands | 1 category; `<link rel=preconnect>` still in `index.html` | helper is effectively dead for current data |
| `v2enterprise.in` | `/v2_logo.webp` (36 KB, `public, max-age=604800`), SPA assets, local `/videos/*` and `/sliders/*` static folders (`maxAge 1y, immutable`) | `og-image.jpg` and unknown `/videos/x.mp4` return **HTML 200** (SPA fallback soft-404) | `og:image="/og-image.jpg"` is therefore broken for social previews |
| `images.unsplash.com`, `images.pexels.com`, `v2-fashion.s3.amazonaws.com` | seed/default content in `/settings` | present in settings JSON | third-party origins, uncontrolled size |
| `youtu.be` | product videos | 85 links | iframes/links only |

Other facts: all 1,252 product image files are JPEG; sampled originals are 1200–3024 px wide (median 340 KB, max 4 MB); the admin media library uses the full original as `thumbnailUrl` (`utils/r2.ts`), so the admin grid downloads originals too; three byte-identical files were stored under different names (no dedupe); `backend/src/app.ts` still serves `/videos` and `/sliders` from local disk although uploads now go to R2.

## 3. Build bundle

Build: Vite 6 + React 19 + Tailwind 4, output to `backend/public` (served by Express: `/assets` 1 y immutable, verified `Cache-Control: public, max-age=31536000, immutable`; HTML is delivered with Brotli). `npx vite build` succeeded (31 s, 2,864 modules). Sizes below are from that build (production loads the same vendor hashes; app chunks differ slightly because production was built from an older commit).

| Chunk | Min | Gzip | Loaded on public home? | Contents |
|---|---|---|---|---|
| `index-*.js` (entry) | 271 KB | 87.6 KB | yes (blocking entry) | **react-dom 524 KB of source**, axios 107 KB, react-hot-toast, app shell/contexts (~82 KB source) |
| `vendor-charts` | 374 KB | 110 KB | **no** (admin only; confirmed absent from production network log) | recharts, redux-toolkit, immer, d3 |
| `AdminDashboard` | 157 KB | 31 KB | no (lazy) | admin UI |
| `vendor-motion` | 133 KB | 44 KB | **yes, every page** (`modulepreload`) | framer-motion / motion-dom |
| `vendor-react` | 49 KB | 17.4 KB | yes | react-router (346 KB source) + react |
| `vendor-ui` | 32 KB | 7 KB | yes | lucide-react |
| route/page chunks | 0.7–24 KB each | – | on demand | Home 19 KB, ProductDetails 24 KB, Checkout 20 KB, Shop 11.7 KB, etc. |
| `index-*.css` | 91.6 KB | 14.7 KB | yes (render-blocking) | one Tailwind sheet for storefront + admin |

Observed production JS on the home page (cold): 15 script requests, 389 KB transferred, of which `fbevents.js` (Meta Pixel) is 113 KB and our own JS ≈ 275 KB. GTM and the Meta Pixel snippet are inline in `<head>`.

Findings:
- **Bundle is not the main problem.** About 165 KB gzip of first-party JS plus 113 KB of Meta Pixel; images and video are 20× larger. Lighthouse still reports TBT ≈ 1.0–1.4 s on mobile (4× CPU throttle), driven by React hydration/rendering, framer-motion on every product card, and the third-party tags.
- `manualChunks` lists `react-dom` under `vendor-react`, but Vite places it in the entry chunk (entry imports `react-dom/client`), so the "vendor" split does not separate it: any app-code change re-downloads react-dom (~half of the entry).
- `framer-motion` (44 KB gz) is imported by product cards and hero on every public page; `LazyMotion` + `m.*` would cut most of it.
- Recharts is correctly isolated; keep it admin-only.
- Single CSS file includes admin styles; low priority.
- `frontend/public/The_Dior_Men_s_Summer_2022_Campaign_Video_720P.mp4` (3.7 MB) is copied into every build/deploy, is referenced nowhere in source (grep), and is publicly fetchable. It also looks like third-party campaign footage; confirm you have rights, otherwise remove it.
- `index.html` preconnects to `ik.imagekit.io` and `v2enterprise.cloud` (neither used for current media) but not to `cdn.v2enterprise.in`.

## 4. Consequences for the fix order
1. Generate resized WebP variants (or Cloudflare Image Resizing) and make a single helper that works for `cdn.v2enterprise.in`, replacing the ImageKit-only helper.
2. Rewrite 152 `r2.dev` URLs (and any in galleries) to the CDN domain, with a DB backfill script (dry-run first).
3. Set `Cache-Control: public, max-age=31536000, immutable` on new uploads; keys are already unique.
4. Re-encode and poster the hero videos.
5. Then micro-optimise the bundle (LazyMotion, defer Meta Pixel).
