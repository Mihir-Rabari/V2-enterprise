/** Follow-ups describe searches to try, never promise unverified stock or cart changes. */
export const followUpSuggestions = (context: {
    emptySearch: boolean;
    hasProducts: boolean;
    addedToCart: boolean;
    search?: { color?: string | null; min_price?: number | null; max_price?: number | null };
}): string[] => {
    if (context.addedToCart) return ['Show me my bag', 'Help me find something to go with it'];
    if (context.emptySearch) {
        const suggestions: string[] = [];
        if (context.search?.color) suggestions.push('Try the same search in other colours');
        if (context.search?.min_price != null || context.search?.max_price != null) {
            suggestions.push('Try the same search with a wider budget');
        }
        suggestions.push('Show me what is available instead', 'Explore the store categories', 'Help me find a different style');
        return suggestions.slice(0, 3);
    }
    if (context.hasProducts) return ['What sizes are available for these?', 'Help me choose between these', 'Show me some other options'];
    return ['Explore the store categories', 'Help me find my next outfit', 'Help me shop within my budget'];
};
