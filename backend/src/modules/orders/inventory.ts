import { Product } from '../../models/Product';
import { CartError } from './pricing';
import { ACTIVE_STATUS_FILTER } from '../../utils/productStatus';

export interface StockLine { productId: import('mongoose').Types.ObjectId | string; quantity: number; name?: string }

/**
 * Inventory model (verified in models/Product.ts): one Product document per SKU (size/colour);
 * stock is the top-level `quantity` field. There is no `variants` array.
 *
 * Reserve = atomic conditional decrement. The `quantity: { $gte: n }` guard lives in the same
 * single-document update as the `$inc`, so two concurrent buyers of the last unit cannot both succeed
 * (MongoDB single-document updates are atomic; no transaction/replica set is required).
 * If any line fails, lines already reserved are given back and the call throws.
 *
 * Not transactional across documents/collections: a process crash between reserve and order creation
 * can leave stock decremented without an order (see report, "Known limitations").
 */
export const reserveStock = async (lines: StockLine[]): Promise<StockLine[]> => {
    const reserved: StockLine[] = [];
    for (const line of lines) {
        const updated = await Product.findOneAndUpdate(
            { _id: line.productId, status: ACTIVE_STATUS_FILTER, quantity: { $gte: line.quantity } },
            { $inc: { quantity: -line.quantity } },
            { new: true }
        );
        if (!updated) {
            await releaseStock(reserved);
            throw new CartError(`Insufficient stock for "${line.name ?? String(line.productId)}". Please reduce the quantity or remove it from your cart.`);
        }
        reserved.push(line);
    }
    return reserved;
};

/** Give back previously reserved stock. Best effort per line; failures are logged for reconciliation. */
export const releaseStock = async (lines: StockLine[]): Promise<void> => {
    for (const line of lines) {
        try {
            await Product.updateOne({ _id: line.productId }, { $inc: { quantity: line.quantity } });
        } catch (err) {
            console.error('[Inventory] CRITICAL: failed to release reserved stock', String(line.productId), line.quantity, (err as Error).message);
        }
    }
};

/** Non-reserving availability check, used only to fail fast before a payment is started. */
export const assertStockAvailable = (products: { _id: unknown; name: string; quantity: number }[], lines: { productId: string; quantity: number }[]) => {
    for (const line of lines) {
        const p = products.find(x => String(x._id) === line.productId);
        if (!p || !(p.quantity >= line.quantity)) {
            throw new CartError(`Insufficient stock for "${p?.name ?? line.productId}". Please reduce the quantity or remove it from your cart.`);
        }
    }
};
