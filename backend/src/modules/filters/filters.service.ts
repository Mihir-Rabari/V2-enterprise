import { FilterSuggestion } from '../../models/FilterSuggestion';
import { IProduct, Product } from '../../models/Product';

export const syncFiltersFromProducts = async (products: IProduct | IProduct[]) => {
    try {
        const productArray = Array.isArray(products) ? products : [products];
        if (productArray.length === 0) return;

        // Fetch or create the single master filter document
        let filterDoc = await FilterSuggestion.findOne();
        if (!filterDoc) {
            filterDoc = new FilterSuggestion();
        }

        // Helper to merge unique values
        const mergeUnique = (existing: string[], newValues: string[]) => {
            const set = new Set(existing);
            newValues.forEach(v => {
                if (v && v.trim() !== '') set.add(v.trim());
            });
            return Array.from(set).sort();
        };

        const newFabrics = new Set<string>();
        const newPatternTypes = new Set<string>();
        const newCollars = new Set<string>();
        const newSleeves = new Set<string>();
        const newNecks = new Set<string>();
        const newPockets = new Set<string>();
        const newLengths = new Set<string>();
        const newChests = new Set<string>();
        const newWaists = new Set<string>();
        const newShoulders = new Set<string>();
        const newSleeveLengths = new Set<string>();
        const newSizes = new Set<string>();
        const newColors = new Set<string>();

        productArray.forEach(p => {
            if (p.color) newColors.add(p.color);
            if (p.size) newSizes.add(p.size);

            if (p.fabric) newFabrics.add(p.fabric);
            if (p.patternType) newPatternTypes.add(p.patternType);
            if (p.collar) newCollars.add(p.collar);
            if (p.sleeve) newSleeves.add(p.sleeve);
            if (p.neck) newNecks.add(p.neck);
            if (p.pocket) newPockets.add(p.pocket);
            if (p.length) newLengths.add(p.length);
            if (p.chest) newChests.add(p.chest);
            if (p.waist) newWaists.add(p.waist);
            if (p.shoulder) newShoulders.add(p.shoulder);
            if (p.sleeveLength) newSleeveLengths.add(p.sleeveLength);
        });

        filterDoc.fabric = mergeUnique(filterDoc.fabric, Array.from(newFabrics));
        filterDoc.patternType = mergeUnique(filterDoc.patternType, Array.from(newPatternTypes));
        filterDoc.collar = mergeUnique(filterDoc.collar, Array.from(newCollars));
        filterDoc.sleeve = mergeUnique(filterDoc.sleeve, Array.from(newSleeves));
        filterDoc.neck = mergeUnique(filterDoc.neck, Array.from(newNecks));
        filterDoc.pocket = mergeUnique(filterDoc.pocket, Array.from(newPockets));
        filterDoc.length = mergeUnique(filterDoc.length, Array.from(newLengths));
        filterDoc.chest = mergeUnique(filterDoc.chest, Array.from(newChests));
        filterDoc.waist = mergeUnique(filterDoc.waist, Array.from(newWaists));
        filterDoc.shoulder = mergeUnique(filterDoc.shoulder, Array.from(newShoulders));
        filterDoc.sleeveLength = mergeUnique(filterDoc.sleeveLength, Array.from(newSleeveLengths));
        filterDoc.size = mergeUnique(filterDoc.size, Array.from(newSizes));
        filterDoc.color = mergeUnique(filterDoc.color, Array.from(newColors));

        // Sync custom (dynamic) attributes
        const customMap = new Map<string, Set<string>>();
        productArray.forEach(p => {
            if (p.customAttributes) {
                // customAttributes may be a Mongoose Map or a plain object depending on retrieval path
                const entries = typeof p.customAttributes.entries === 'function'
                    ? Array.from(p.customAttributes.entries() as Iterable<[string, string]>)
                    : Object.entries(p.customAttributes as unknown as Record<string, string>);
                entries.forEach(([key, value]) => {
                    if (value && String(value).trim() !== '') {
                        if (!customMap.has(key)) customMap.set(key, new Set());
                        customMap.get(key)!.add(String(value).trim());
                    }
                });
            }
        });
        customMap.forEach((values, key) => {
            const existing: string[] = (() => {
                if (!filterDoc.customAttributes) return [];
                if (typeof filterDoc.customAttributes.get === 'function') {
                    return filterDoc.customAttributes.get(key) || [];
                }
                return (filterDoc.customAttributes as unknown as Record<string, string[]>)[key] || [];
            })();
            filterDoc.customAttributes.set(key, mergeUnique(existing, Array.from(values)));
        });
        filterDoc.markModified('customAttributes');

        await filterDoc.save();
        return filterDoc;
    } catch (error) {
        console.error('Error syncing filter suggestions:', error);
    }
};

export const getFilterSuggestionsService = async () => {
    try {
        let filterDoc = await FilterSuggestion.findOne();
        if (!filterDoc) {
            filterDoc = await FilterSuggestion.create({});
        }
        return filterDoc.toObject({ flattenMaps: true });
    } catch (error) {
        throw error;
    }
};

/**
 * Rebuild the FilterSuggestion document from scratch using all remaining products.
 * Call this after a product is deleted so removed values are purged from filters.
 */
export const rebuildFiltersFromAllProducts = async () => {
    try {
        const allProducts = await Product.find({});
        if (allProducts.length === 0) {
            // No products left — clear the filter document entirely
            await FilterSuggestion.deleteMany({});
            await FilterSuggestion.create({});
            return;
        }

        let filterDoc = await FilterSuggestion.findOne();
        if (!filterDoc) {
            filterDoc = new FilterSuggestion();
        }

        const fabrics = new Set<string>();
        const patternTypes = new Set<string>();
        const collars = new Set<string>();
        const sleeves = new Set<string>();
        const necks = new Set<string>();
        const pockets = new Set<string>();
        const lengths = new Set<string>();
        const chests = new Set<string>();
        const waists = new Set<string>();
        const shoulders = new Set<string>();
        const sleeveLengths = new Set<string>();
        const sizes = new Set<string>();
        const colors = new Set<string>();
        const customMap = new Map<string, Set<string>>();

        allProducts.forEach((p: IProduct) => {
            if (p.color) colors.add(p.color);
            if (p.size) sizes.add(p.size);
            if (p.fabric) fabrics.add(p.fabric);
            if (p.patternType) patternTypes.add(p.patternType);
            if (p.collar) collars.add(p.collar);
            if (p.sleeve) sleeves.add(p.sleeve);
            if (p.neck) necks.add(p.neck);
            if (p.pocket) pockets.add(p.pocket);
            if (p.length) lengths.add(p.length);
            if (p.chest) chests.add(p.chest);
            if (p.waist) waists.add(p.waist);
            if (p.shoulder) shoulders.add(p.shoulder);
            if (p.sleeveLength) sleeveLengths.add(p.sleeveLength);

            if (p.customAttributes) {
                const entries = typeof p.customAttributes.entries === 'function'
                    ? Array.from(p.customAttributes.entries() as Iterable<[string, string]>)
                    : Object.entries(p.customAttributes as unknown as Record<string, string>);
                entries.forEach(([key, value]) => {
                    if (value && String(value).trim() !== '') {
                        if (!customMap.has(key)) customMap.set(key, new Set());
                        customMap.get(key)!.add(String(value).trim());
                    }
                });
            }
        });

        const toSorted = (s: Set<string>) => Array.from(s).sort();

        filterDoc.fabric = toSorted(fabrics);
        filterDoc.patternType = toSorted(patternTypes);
        filterDoc.collar = toSorted(collars);
        filterDoc.sleeve = toSorted(sleeves);
        filterDoc.neck = toSorted(necks);
        filterDoc.pocket = toSorted(pockets);
        filterDoc.length = toSorted(lengths);
        filterDoc.chest = toSorted(chests);
        filterDoc.waist = toSorted(waists);
        filterDoc.shoulder = toSorted(shoulders);
        filterDoc.sleeveLength = toSorted(sleeveLengths);
        filterDoc.size = toSorted(sizes);
        filterDoc.color = toSorted(colors);

        // Rebuild custom attributes map from scratch
        filterDoc.customAttributes = new Map<string, string[]>();
        customMap.forEach((values, key) => {
            filterDoc!.customAttributes.set(key, toSorted(values));
        });
        filterDoc.markModified('customAttributes');

        await filterDoc.save();
    } catch (error) {
        console.error('Error rebuilding filter suggestions:', error);
    }
};
