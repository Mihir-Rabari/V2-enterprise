/**
 * Tools the shopping assistant may call. All of them are read-only against the database;
 * add_to_cart only *proposes* a cart line, which the browser applies to its local cart.
 * The payable amount is always recomputed by the server at checkout (payments module), so
 * nothing the assistant returns can change what a shopper is charged.
 */
import type Anthropic from '@anthropic-ai/sdk';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { SiteSettings } from '../../models/SiteSettings';
import { getProductsService } from '../products/products.service';
import { isActiveStatus } from '../../utils/productStatus';
import { CHAT_LIMITS } from './chat.config';

// ── Shapes returned to the browser ───────────────────────────────────────────

export interface ProductCard {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    photo: string;
    color?: string;
    url: string;
}

/** A cart line the browser should add. Built from the database, never from model text. */
export interface CartAddAction {
    type: 'add_to_cart';
    quantity: number;
    size?: string;
    color?: string;
    product: {
        id: string;
        _id: string;
        name: string;
        price: number;
        originalPrice?: number;
        photo: string;
        mainCategory: string;
        subCategory: string;
        styleCode: string;
        color: string;
        size: string;
        quantity: number;
        description: string;
        materialCare: string;
    };
}

/** What the browser says is in its cart. Only ids and quantities are trusted; names/prices come from the DB. */
export const clientCartSchema = z
    .array(
        z.object({
            productId: z.string().regex(/^[a-f0-9]{24}$/i),
            quantity: z.number().int().min(1).max(99),
            size: z.string().max(20).optional(),
        })
    )
    .max(CHAT_LIMITS.maxCartLines);
export type ClientCart = z.infer<typeof clientCartSchema>;

/** Per-turn state shared by the tool executors. */
export interface ToolContext {
    cart: ClientCart;
    cards: Map<string, ProductCard>;
    actions: CartAddAction[];
    /** Rupee amounts that appeared in tool results; the reply may only quote these. */
    amounts: Set<number>;
    /** Raw text of tool results, scanned for percentages the reply may quote. */
    resultText: string[];
}

export const newToolContext = (cart: ClientCart): ToolContext => ({
    cart, cards: new Map(), actions: [], amounts: new Set(), resultText: [],
});

// ── Tool definitions ─────────────────────────────────────────────────────────

const nullableString = (description: string) => ({ type: ['string', 'null'], description });
const nullableNumber = (description: string) => ({ type: ['number', 'null'], description });

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
    {
        name: 'search_products',
        description: 'Search the store catalogue. Returns up to 6 matching products (one per colour) with id, name, price, colour and sizes. Use plain keywords such as "linen shirt" or "black kurta". Pass null for filters you do not need.',
        strict: true,
        input_schema: {
            type: 'object',
            properties: {
                query: nullableString('Keywords, e.g. "white linen shirt". Null to browse by filters only.'),
                category: nullableString('Main category name from list_categories, or null.'),
                min_price: nullableNumber('Minimum price in rupees, or null.'),
                max_price: nullableNumber('Maximum price in rupees, or null.'),
                color: nullableString('Colour name, e.g. "Black", or null.'),
                size: nullableString('Size label, e.g. "M", "L", "32", or null.'),
            },
            required: ['query', 'category', 'min_price', 'max_price', 'color', 'size'],
            additionalProperties: false,
        },
    },
    {
        name: 'get_product_details',
        description: 'Get full details for one product: description, fabric, care, and every size/colour variant with its own variant_id and stock. Call this before add_to_cart to find the exact variant_id.',
        strict: true,
        input_schema: {
            type: 'object',
            properties: { product_id: { type: 'string', description: 'The id returned by search_products.' } },
            required: ['product_id'],
            additionalProperties: false,
        },
    },
    {
        name: 'add_to_cart',
        description: "Add one exact variant to the shopper's bag. Only use when the shopper asked for this item and the size/colour is known. variant_id must come from get_product_details.",
        strict: true,
        input_schema: {
            type: 'object',
            properties: {
                variant_id: { type: 'string', description: 'variant_id from get_product_details.' },
                quantity: { type: 'integer', description: 'How many to add (1-5).' },
            },
            required: ['variant_id', 'quantity'],
            additionalProperties: false,
        },
    },
    {
        name: 'view_cart',
        description: "Show what is currently in the shopper's bag, with current prices and the bag total.",
        strict: true,
        input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
    },
    {
        name: 'list_categories',
        description: 'List the store\'s product categories.',
        strict: true,
        input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
    },
    {
        name: 'get_store_info',
        description: 'Store contact details and links to the shipping, returns, size guide and contact pages.',
        strict: true,
        input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
    },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strips control characters and caps length so catalogue text cannot smuggle in long instructions. */
const clip = (value: unknown, max: number): string | undefined => {
    if (typeof value !== 'string') return undefined;
    // eslint-disable-next-line no-control-regex
    const clean = value.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return undefined;
    return clean.length > max ? `${clean.slice(0, max)}…` : clean;
};

const recordPrice = (ctx: ToolContext, ...values: (number | undefined)[]) => {
    for (const v of values) if (typeof v === 'number' && Number.isFinite(v)) ctx.amounts.add(v);
};

const addCard = (ctx: ToolContext, p: any) => {
    const id = String(p._id ?? p.id);
    if (ctx.cards.has(id)) return;
    ctx.cards.set(id, {
        id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice || undefined,
        photo: p.photo,
        color: p.color || undefined,
        url: `/product/${id}`,
    });
};

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

// ── Executors ────────────────────────────────────────────────────────────────

const searchInput = z.object({
    query: z.string().max(100).nullable(),
    category: z.string().max(60).nullable(),
    min_price: z.number().min(0).max(1_000_000).nullable(),
    max_price: z.number().min(0).max(1_000_000).nullable(),
    color: z.string().max(30).nullable(),
    size: z.string().max(10).nullable(),
});

const searchProducts = async (raw: unknown, ctx: ToolContext) => {
    const input = searchInput.parse(raw);
    const result = await getProductsService({
        status: 'ACTIVE',
        search: input.query?.trim() || undefined,
        mainCategories: input.category ? [input.category] : undefined,
        minPrice: input.min_price ?? undefined,
        maxPrice: input.max_price ?? undefined,
        colors: input.color ? [...new Set([input.color, capitalise(input.color), input.color.toUpperCase()])] : undefined,
        sizes: input.size ? [...new Set([input.size, input.size.toUpperCase()])] : undefined,
        groupByColor: true,
        page: 1,
        limit: CHAT_LIMITS.searchResults,
    });
    const products = (result.products as any[]).map(p => {
        addCard(ctx, p);
        recordPrice(ctx, p.price, p.originalPrice);
        return {
            product_id: String(p._id ?? p.id),
            name: clip(p.name, 120),
            price: p.price,
            original_price: p.originalPrice || null,
            discount: clip(p.discount, 20) ?? null,
            colour: clip(p.color, 30),
            sizes: Array.isArray(p.sizes) ? p.sizes.slice(0, 12) : [p.size].filter(Boolean),
            category: clip(`${p.mainCategory} / ${p.subCategory}`, 80),
            url: `/product/${String(p._id ?? p.id)}`,
        };
    });
    return { total_matches: result.total, products };
};

const productDetails = async (raw: unknown, ctx: ToolContext) => {
    const { product_id } = z.object({ product_id: z.string() }).parse(raw);
    if (!mongoose.Types.ObjectId.isValid(product_id)) return { error: 'Unknown product id.' };
    const product = await Product.findById(product_id);
    if (!product || !isActiveStatus(product.status)) return { error: 'This product is not available.' };

    const siblings = product.styleCode
        ? await Product.find({ styleCode: product.styleCode, status: { $regex: /^active$/i } })
            .select('_id color size price originalPrice quantity')
            .limit(40)
            .lean()
        : [product];

    addCard(ctx, product);
    recordPrice(ctx, product.price, product.originalPrice);
    const variants = siblings.map(s => {
        recordPrice(ctx, s.price, s.originalPrice);
        return {
            variant_id: String(s._id),
            colour: clip(s.color, 30),
            size: clip(s.size, 10),
            price: s.price,
            in_stock: s.quantity > 0,
            low_stock: s.quantity > 0 && s.quantity <= 3,
        };
    });

    return {
        product_id: String(product._id),
        name: clip(product.name, 120),
        price: product.price,
        original_price: product.originalPrice || null,
        discount: clip(product.discount, 20) ?? null,
        category: clip(`${product.mainCategory} / ${product.subCategory}`, 80),
        description: clip(product.description, 500),
        fabric: clip(product.fabric, 60) ?? null,
        fit_and_style: clip([product.collar, product.sleeve, product.neck, product.length, product.patternType].filter(Boolean).join(', '), 120) ?? null,
        care: clip(product.materialCare, 200),
        variants,
        url: `/product/${String(product._id)}`,
    };
};

const addToCart = async (raw: unknown, ctx: ToolContext) => {
    const { variant_id, quantity } = z.object({ variant_id: z.string(), quantity: z.number().int() }).parse(raw);
    if (ctx.actions.length >= CHAT_LIMITS.maxCartAddsPerTurn) {
        return { added: false, reason: 'Too many items added at once. Ask the shopper to continue in a new message.' };
    }
    if (quantity < 1 || quantity > CHAT_LIMITS.maxQuantityPerAdd) {
        return { added: false, reason: `Quantity must be between 1 and ${CHAT_LIMITS.maxQuantityPerAdd}.` };
    }
    if (!mongoose.Types.ObjectId.isValid(variant_id)) return { added: false, reason: 'Unknown variant id. Call get_product_details first.' };

    const p = await Product.findById(variant_id);
    if (!p || !isActiveStatus(p.status)) return { added: false, reason: 'This item is not available.' };

    const alreadyInCart = ctx.cart
        .filter(l => l.productId === variant_id && (l.size ?? p.size) === p.size)
        .reduce((n, l) => n + l.quantity, 0);
    const pendingInTurn = ctx.actions
        .filter(a => a.product.id === variant_id)
        .reduce((n, a) => n + a.quantity, 0);
    const available = p.quantity - alreadyInCart - pendingInTurn;
    if (available <= 0) return { added: false, reason: 'Out of stock (or the bag already holds all available stock).' };
    const qty = Math.min(quantity, available);

    const id = String(p._id);
    ctx.actions.push({
        type: 'add_to_cart',
        quantity: qty,
        size: p.size,
        color: p.color || undefined,
        product: {
            id, _id: id,
            name: p.name,
            price: p.price,
            originalPrice: p.originalPrice || undefined,
            photo: p.photo,
            mainCategory: p.mainCategory,
            subCategory: p.subCategory,
            styleCode: p.styleCode ?? '',
            color: p.color,
            size: p.size,
            quantity: p.quantity,
            description: p.description,
            materialCare: p.materialCare,
        },
    });
    addCard(ctx, p);
    recordPrice(ctx, p.price, p.price * qty);
    return {
        added: true,
        name: clip(p.name, 120),
        size: p.size,
        colour: p.color,
        quantity: qty,
        unit_price: p.price,
        note: qty < quantity ? `Only ${qty} could be added because of stock.` : undefined,
    };
};

const viewCart = async (_raw: unknown, ctx: ToolContext) => {
    if (ctx.cart.length === 0 && ctx.actions.length === 0) return { items: [], total: 0, note: 'The bag is empty.' };
    const ids = [...new Set(ctx.cart.map(l => l.productId))];
    const docs = await Product.find({ _id: { $in: ids } }).select('_id name price size color status quantity').lean();
    const byId = new Map(docs.map(d => [String(d._id), d]));

    const items: Record<string, unknown>[] = [];
    let total = 0;
    for (const line of ctx.cart) {
        const d = byId.get(line.productId);
        if (!d || !isActiveStatus(d.status)) {
            items.push({ name: 'An item that is no longer available', quantity: line.quantity });
            continue;
        }
        const lineTotal = d.price * line.quantity;
        total += lineTotal;
        recordPrice(ctx, d.price, lineTotal);
        items.push({ name: clip(d.name, 120), size: line.size ?? d.size, colour: d.color, quantity: line.quantity, unit_price: d.price, line_total: lineTotal });
    }
    for (const a of ctx.actions) {
        const lineTotal = a.product.price * a.quantity;
        total += lineTotal;
        recordPrice(ctx, a.product.price, lineTotal);
        items.push({ name: clip(a.product.name, 120), size: a.size, colour: a.color, quantity: a.quantity, unit_price: a.product.price, line_total: lineTotal, just_added: true });
    }
    recordPrice(ctx, total);
    return { items, total, note: 'Final amount, including any offers and shipping, is calculated at checkout.' };
};

const listCategories = async () => {
    const cats = await Category.find({ status: 'ACTIVE' }).select('name parentId').limit(60).lean();
    return { categories: cats.filter(c => !c.parentId).map(c => clip(c.name, 60)) };
};

const storeInfo = async () => {
    const s = await SiteSettings.findOne().select('email phone storeHours address').lean();
    return {
        email: clip(s?.email, 80) ?? null,
        phone: clip(s?.phone, 30) ?? null,
        store_hours: clip(s?.storeHours, 80) ?? null,
        pages: { shipping: '/shipping', returns: '/returns', size_guide: '/size-guide', contact: '/contact', orders: '/account/orders', checkout: '/checkout' },
    };
};

const EXECUTORS: Record<string, (input: unknown, ctx: ToolContext) => Promise<unknown>> = {
    search_products: searchProducts,
    get_product_details: productDetails,
    add_to_cart: addToCart,
    view_cart: viewCart,
    list_categories: listCategories,
    get_store_info: storeInfo,
};

/** Runs a tool and returns a JSON string for the tool_result. Unknown tools and bad input are errors, not crashes. */
export const executeTool = async (name: string, input: unknown, ctx: ToolContext): Promise<{ content: string; isError: boolean }> => {
    const run = EXECUTORS[name];
    if (!run) return { content: JSON.stringify({ error: `Unknown tool ${name}` }), isError: true };
    try {
        const result = await run(input, ctx);
        const content = JSON.stringify(result);
        ctx.resultText.push(content);
        return { content, isError: false };
    } catch (err) {
        const msg = err instanceof z.ZodError ? 'Invalid tool input.' : 'The store could not complete that lookup.';
        console.error(`[Chat] Tool ${name} failed:`, (err as Error).message);
        return { content: JSON.stringify({ error: msg }), isError: true };
    }
};
