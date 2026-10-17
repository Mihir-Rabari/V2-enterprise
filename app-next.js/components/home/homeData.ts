/**
 * Homepage data shared by the server route (app/(storefront)/page.tsx) and the
 * HomePage client component. Kept out of HomePage.tsx because functions from a
 * 'use client' module can't be called from a server component.
 */

import type { ApiProduct } from '../../hooks/useProducts';
import type {
    HeroSlide, PromotionalSlide, MarqueeItem, Category, Review, LookbookItem,
} from '../../types';

export type FilterSuggestions = Record<string, string[]> & { customAttributes?: Record<string, string[]> };

/** Server-fetched homepage data. A `null` field means the server fetch failed
 *  and HomePage fetches that piece in the browser instead. */
export interface HomeInitialData {
    heroSlides: HeroSlide[] | null;
    promoSlides: PromotionalSlide[] | null;
    marquee: MarqueeItem[] | null;
    categories: Category[] | null;
    reviews: Review[] | null;
    filterSuggestions: FilterSuggestions | null;
    lookbook: LookbookItem[] | null;
    products: ApiProduct[] | null;
}

export interface PromoGroups {
    promotional: PromotionalSlide[];
    bottom: PromotionalSlide[];
    category: PromotionalSlide[];
    best: PromotionalSlide[];
    newArrival: PromotionalSlide[];
}

export const EMPTY_PROMO_GROUPS: PromoGroups = { promotional: [], bottom: [], category: [], best: [], newArrival: [] };

/** Splits the /sliders/promotional payload into the homepage's slider groups (active slides only). */
export function splitPromoSlides(slides: PromotionalSlide[]): PromoGroups {
    const active = slides.filter((s: any) => String(s.status || '').toUpperCase() === 'ACTIVE');
    const ofType = (type: string) => active.filter((s: any) => String(s.type || '').toUpperCase() === type);
    return {
        promotional: active.filter((s: any) => !s.type || String(s.type).toUpperCase() === 'PROMOTIONAL'),
        bottom: ofType('BOTTOM_PROMOTIONAL'),
        category: ofType('CATEGORY'),
        best: ofType('BEST_CATEGORY'),
        newArrival: ofType('NEW_ARRIVAL'),
    };
}

/** Top-level categories (no parent), as shown in the categories section. */
export function topLevelCategories(categories: Category[]): Category[] {
    return categories.filter((c: any) => !c.parentId || c.parentId === '' || c.parentId === null);
}

const idOf = (p: ApiProduct) => String(p.id || (p as { _id?: string })._id);

/**
 * The few products the first render needs, so the HTML doesn't carry the full
 * catalogue (~440 KB): products[0], the 8 newest (Essentials' default sort),
 * the first 4 trending and the first new arrival. Original order is kept, so
 * HomePage derives exactly the same Essentials / Trending / New Drop items from
 * this subset as from the full list it loads in the background for filtering.
 */
export function pickInitialProducts(all: ApiProduct[]): ApiProduct[] {
    if (all.length === 0) return [];
    const keep = new Set<ApiProduct>([all[0]]);
    [...all].sort((a, b) => idOf(b).localeCompare(idOf(a))).slice(0, 8).forEach(p => keep.add(p));
    all.filter(p => p.isTrending).slice(0, 4).forEach(p => keep.add(p));
    const newDrop = all.find(p => p.isNewArrival);
    if (newDrop) keep.add(newDrop);
    return all.filter(p => keep.has(p));
}
