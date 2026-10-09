export const MAX_ITEM_QUANTITY = 50;

interface RawItem { productId: unknown; quantity: unknown }

/**
 * Reject carts the server cannot price safely: non-array, empty, non-integer or
 * non-positive quantities, and duplicate product lines.
 */
export const validateOrderItems = (items: unknown): void => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Order must contain at least one item.');
    }
    const seen = new Set<string>();
    for (const item of items as RawItem[]) {
        const q = item?.quantity;
        if (typeof q !== 'number' || !Number.isInteger(q) || q < 1 || q > MAX_ITEM_QUANTITY) {
            throw new Error(`Invalid quantity: must be a whole number between 1 and ${MAX_ITEM_QUANTITY}.`);
        }
        const id = String(item?.productId);
        if (seen.has(id)) throw new Error('Duplicate product in order items.');
        seen.add(id);
    }
};
