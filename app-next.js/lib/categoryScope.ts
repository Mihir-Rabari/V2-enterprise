/**
 * Category-scope resolution for the shop/category views.
 *
 * Pure and framework-free so it can be unit-tested directly (see
 * test/categoryScope.test.ts). ShopView delegates its `categoryConstraint`
 * memo to this function.
 *
 * The scope maps the user's checked categories AND the active route's main
 * category onto the backend's `{ mainCategories, subCategories }` query params.
 * The same scope drives both the product grid and the category-scoped facet
 * baseline (lib/facets.ts), which is what keeps the filter sidebar showing only
 * values that exist among the in-scope products.
 *
 * THE BUG THIS FIXES
 * ------------------
 * A main category with no subcategories is reached at `/<category>/All` (the
 * SubCategories page forwards there). On that route the checkbox state carries
 * only the "All" placeholder, so the main category was being dropped: the grid
 * fell back to the whole catalog and the sidebar to catalog-wide ("dead")
 * facets. `routeMainCategory` carries the first route segment into the scope so
 * `/mens/All` is constrained to the `mens` main category.
 */

export interface CategoryLike {
    name: string;
    parentId?: string | number;
}

export interface CategoryConstraint {
    mainCategories: string[];
    subCategories: string[];
}

export interface ResolveCategoryScopeArgs {
    /** Categories currently checked in the sidebar (names). */
    selectedCategories: readonly string[];
    /** All categories loaded from the API (empty until the fetch resolves). */
    allCategories: readonly CategoryLike[];
    /** Raw subcategory route segment, if on a /[category]/[subcategory] route. */
    subcategory?: string;
    /** Resolved initial category label ("All" when the route is a whole-category view). */
    initialCategory: string;
    /**
     * Decoded main category from the route's first segment on the `category`
     * variant; '' when not on a category route or when the segment is "All".
     */
    routeMainCategory: string;
}

/**
 * Resolve the active category scope into backend main/sub category params.
 *
 * Behaviour preserved from the original inline memo, PLUS the route-main-category
 * fold that fixes the dropped-category bug.
 */
export function resolveCategoryScope({
    selectedCategories,
    allCategories,
    subcategory,
    initialCategory,
    routeMainCategory,
}: ResolveCategoryScopeArgs): CategoryConstraint {
    const mainCategories: string[] = [];
    const subCategories: string[] = [];

    // Case-insensitive so slug-style URLs (/mens/tshirt) resolve to the same
    // category as /MENS/TSHIRT.
    const findCategory = (name: string): CategoryLike | undefined =>
        allCategories.find(c => c.name === name) ||
        allCategories.find(c => c.name?.toLowerCase() === name.toLowerCase());

    if (selectedCategories.length > 0) {
        const categoriesLoaded = allCategories.length > 0;
        const mainCats = categoriesLoaded
            ? selectedCategories.filter(name => {
                  const cat = findCategory(name);
                  return cat && !cat.parentId;
              })
            : [];
        const subCats = categoriesLoaded
            ? selectedCategories.filter(name => {
                  const cat = findCategory(name);
                  return cat && cat.parentId;
              })
            : subcategory
              ? selectedCategories.filter(name => name === initialCategory)
              : [];
        mainCategories.push(...mainCats);
        subCategories.push(...subCats);
    }

    // Fold in the route's main category (incl. the "/[category]/All"
    // whole-category view). Skipped when a real subcategory is active (the
    // subcategory is the narrower, correct scope), and deduped against a main
    // category already derived from the checkboxes.
    if (routeMainCategory && subCategories.length === 0) {
        const resolved = findCategory(routeMainCategory);
        const name = resolved?.name ?? routeMainCategory;
        if (!mainCategories.some(m => m.toLowerCase() === name.toLowerCase())) {
            mainCategories.push(name);
        }
    }

    return { mainCategories, subCategories };
}
