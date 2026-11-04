/** Catalogue-neutral starters: these ask for help without assuming an item is sold here. */
const STARTERS = [
    'Find my next everyday favourite',
    'Help me put a weekend look together',
    'Explore what is in store',
    'Help me shop within my budget',
    'Find something for a special occasion',
    'Help me discover my style',
    'Give my wardrobe a refresh',
    'Help me choose the right fit',
    'Find a look that feels like me',
];

export const shuffledStarters = (): string[] => {
    const pool = [...STARTERS];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
};
