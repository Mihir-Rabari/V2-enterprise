/**
 * Media URL helpers.
 *
 * Canonical media (produced by the `media-migrate` tool) lives at
 *   https://<MEDIA_CDN_HOST>/media/<version>/<assetId>/<width>.webp
 * and every nominal width in MEDIA_VARIANT_WIDTHS exists for every canonical asset (small originals are never
 * upscaled: the file at /1200.webp may be physically narrower, but the URL always exists). That makes responsive
 * URLs a pure string operation: no lookup per image.
 *
 * Anything that is NOT a canonical URL (legacy R2 URLs that have not been migrated yet, ImageKit, third parties) is
 * returned exactly as before, so un-migrated data keeps working. Third-party hosts are never rewritten.
 */

export interface ImageKitOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'avif';
    blur?: number;
    crop?: 'maintain-ratio' | 'force' | 'at-least' | 'at-max';
}

/** Hosts that serve canonical media. Must match destination.publicBaseUrl in the media-migrate config. */
export const MEDIA_CDN_HOSTS: readonly string[] = ['cdn.v2enterprise.in'];
/** Must match processing.widths in the media-migrate config. */
export const MEDIA_VARIANT_WIDTHS: readonly number[] = [400, 800, 1200, 1600];

const CANONICAL_PATH = /^\/media\/(v\d+)\/(a[a-z2-7]{24})\/(\d+)\.webp$/;

export interface CanonicalMedia {
    origin: string;
    version: string;
    assetId: string;
    width: number;
}

/** Parse a canonical media URL; returns null for anything else (never throws). */
export const parseCanonicalMedia = (url: string | undefined | null): CanonicalMedia | null => {
    if (!url || typeof url !== 'string') return null;
    let u: URL;
    try {
        u = new URL(url);
    } catch {
        return null;
    }
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    if (!MEDIA_CDN_HOSTS.includes(u.hostname.toLowerCase())) return null;
    const m = CANONICAL_PATH.exec(u.pathname);
    if (!m) return null;
    return { origin: u.origin, version: m[1], assetId: m[2], width: Number(m[3]) };
};

export const isCanonicalMedia = (url: string | undefined | null): boolean => parseCanonicalMedia(url) !== null;

const variantUrl = (c: CanonicalMedia, width: number): string => `${c.origin}/media/${c.version}/${c.assetId}/${width}.webp`;

/** Smallest generated width that is >= the requested one (or the largest available). */
export const pickVariantWidth = (requested: number | undefined, widths: readonly number[] = MEDIA_VARIANT_WIDTHS): number => {
    const sorted = [...widths].sort((a, b) => a - b);
    if (!requested || requested <= 0) return sorted[sorted.length - 1];
    return sorted.find((w) => w >= requested) ?? sorted[sorted.length - 1];
};

/**
 * `srcSet` for a canonical URL, or undefined for anything else (callers then simply omit the attribute).
 * Descriptors use the nominal widths; for originals narrower than a variant the browser just downloads a file
 * that is no larger than the original.
 */
export const getImageSrcSet = (url: string | undefined | null, widths: readonly number[] = [400, 800]): string | undefined => {
    const c = parseCanonicalMedia(url);
    if (!c) return undefined;
    const usable = widths.filter((w) => MEDIA_VARIANT_WIDTHS.includes(w));
    if (usable.length === 0) return undefined;
    return usable.map((w) => `${variantUrl(c, w)} ${w}w`).join(', ');
};

/**
 * Returns the best URL for a requested display width.
 *  - canonical media  -> the matching responsive variant
 *  - ImageKit URL     -> ImageKit transformation (previous behaviour)
 *  - anything else    -> unchanged (legacy / third-party / relative)
 */
export const getOptimizedImageUrl = (url: string | undefined, options: ImageKitOptions = {}): string => {
    if (!url) return '';

    const canonical = parseCanonicalMedia(url);
    if (canonical) {
        // requested width is a CSS-pixel hint; ask for the smallest variant that covers it
        return variantUrl(canonical, pickVariantWidth(options.width));
    }

    // Skip if not an ImageKit URL
    if (!url.includes('ik.imagekit.io')) return url;

    const {
        width,
        height,
        quality = 70,
        format = 'auto',
        blur,
        crop = 'at-max'
    } = options;

    const transforms: string[] = [];

    if (format) transforms.push(`f-${format}`);
    if (quality) transforms.push(`q-${quality}`);
    if (width) transforms.push(`w-${width}`);
    if (height) transforms.push(`h-${height}`);

    if (width || height) {
        const cmMap: Record<string, string> = {
            'maintain-ratio': 'maintain_ratio',
            'force': 'force',
            'at-least': 'at_least',
            'at-max': 'at_max'
        };
        transforms.push(`cm-${cmMap[crop] || 'at_max'}`);
    }

    if (blur) transforms.push(`bl-${blur}`);

    const baseUrl = url.split('?')[0];
    const trString = transforms.length > 0 ? `?tr=${transforms.join(',')}` : '';

    return `${baseUrl}${trString}`;
};

/** Full-resolution canonical URL for product-detail views (largest generated variant); other URLs unchanged. */
export const getHighResImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    const c = parseCanonicalMedia(url);
    return c ? variantUrl(c, pickVariantWidth(undefined)) : url;
};
