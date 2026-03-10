import { FilterSuggestion } from '../../models/FilterSuggestion';
import { IProduct } from '../../models/Product';

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
        return filterDoc;
    } catch (error) {
        throw error;
    }
};
