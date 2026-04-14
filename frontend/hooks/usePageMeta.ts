import { useEffect } from 'react';

interface PageMetaOptions {
    title: string;
    description?: string;
    ogImage?: string;
    ogType?: 'website' | 'product' | 'article';
    canonical?: string;
    jsonLd?: object;
}

const SITE_NAME = 'V2 Enterprise';
const DEFAULT_OG_IMAGE = '/og-image.jpg';
const BASE_URL = 'https://v2enterprise.in';

/**
 * Sets page-level <title>, meta description, and OG tags dynamically.
 * Call this at the top of each page component.
 *
 * @example
 * usePageMeta({
 *   title: 'Shop All | V2 Enterprise',
 *   description: 'Browse our full collection of luxury menswear.',
 * });
 */
export const usePageMeta = ({
    title,
    description,
    ogImage = DEFAULT_OG_IMAGE,
    ogType = 'website',
    canonical,
    jsonLd,
}: PageMetaOptions) => {
    useEffect(() => {
        // ── Title ──────────────────────────────────────────────────────────────
        document.title = title;

        // ── Helper to upsert <meta> tags ───────────────────────────────────────
        const setMeta = (attr: string, value: string, content: string) => {
            let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${value}"]`);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attr, value);
                document.head.appendChild(el);
            }
            el.setAttribute('content', content);
        };

        const setLink = (rel: string, href: string) => {
            let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
            if (!el) {
                el = document.createElement('link');
                el.setAttribute('rel', rel);
                document.head.appendChild(el);
            }
            el.setAttribute('href', href);
        };

        // ── Description ────────────────────────────────────────────────────────
        if (description) {
            setMeta('name', 'description', description);
            setMeta('property', 'og:description', description);
            setMeta('name', 'twitter:description', description);
        }

        // ── OG Tags ────────────────────────────────────────────────────────────
        setMeta('property', 'og:title', title);
        setMeta('property', 'og:type', ogType);
        setMeta('property', 'og:image', ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`);
        setMeta('property', 'og:site_name', SITE_NAME);

        // ── Twitter ────────────────────────────────────────────────────────────
        setMeta('name', 'twitter:title', title);
        setMeta('name', 'twitter:image', ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`);

        // ── Canonical ──────────────────────────────────────────────────────────
        if (canonical) {
            setLink('canonical', canonical.startsWith('http') ? canonical : `${BASE_URL}${canonical}`);
        }

        // ── JSON-LD Structured Data ───────────────────────────────────────────
        if (jsonLd) {
            let script = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
            if (!script) {
                script = document.createElement('script');
                script.setAttribute('type', 'application/ld+json');
                document.head.appendChild(script);
            }
            script.textContent = JSON.stringify(jsonLd);
        }

        // ── Reset title on unmount ─────────────────────────────────────────────
        return () => {
            document.title = `${SITE_NAME} — Premium Luxury Fashion`;
            // Remove JSON-LD on unmount to avoid stale data on navigation
            const script = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
            if (script) script.remove();
        };
    }, [title, description, ogImage, ogType, canonical, jsonLd]);
};
