/**
 * Minimal in-memory stand-in for the Mongoose models used by the security tests.
 * It is NOT MongoDB: it only implements the query operators the code under test uses, and its
 * findOneAndUpdate is atomic only in the sense that the match + apply step has no `await` inside it.
 * Real-Mongo atomicity must still be confirmed on staging (see the report).
 */
import { mock } from 'node:test';
import crypto from 'node:crypto';
import mongoose from 'mongoose';

type Doc = Record<string, any>;

const isRegexOp = (v: any) => v && typeof v === 'object' && v.$regex !== undefined;

export const matches = (doc: Doc, query: Doc): boolean =>
    Object.entries(query).every(([key, cond]) => {
        const val = doc[key];
        if (cond instanceof RegExp) return typeof val === 'string' && cond.test(val);
        if (isRegexOp(cond)) {
            const re = cond.$regex instanceof RegExp ? cond.$regex : new RegExp(cond.$regex, cond.$options);
            return typeof val === 'string' && re.test(val);
        }
        if (cond && typeof cond === 'object' && !(cond instanceof mongoose.Types.ObjectId)) {
            if ('$in' in cond) return (cond.$in as any[]).some(c => (c instanceof RegExp ? c.test(String(val)) : String(c) === String(val)));
            if ('$ne' in cond) return String(cond.$ne) !== String(val);
            if ('$gte' in cond) return typeof val === 'number' && val >= cond.$gte;
        }
        return String(cond) === String(val);
    });

const applyUpdate = (doc: Doc, update: Doc) => {
    for (const [k, v] of Object.entries(update.$inc ?? {})) doc[k] = (doc[k] ?? 0) + (v as number);
    for (const [k, v] of Object.entries(update.$set ?? {})) doc[k] = v;
    for (const k of Object.keys(update.$unset ?? {})) delete doc[k];
};

const wrap = (doc: Doc | null) =>
    doc && Object.assign(Object.create(null), doc, {
        toObject: () => ({ ...doc }),
        id: String(doc._id),
    });

/** Thenable query supporting the chain methods the services call. */
const query = (rows: () => Doc[], single = false) => {
    let skip = 0; let limit = Infinity;
    const q: any = {
        sort: () => q, select: () => q, lean: () => q,
        skip: (n: number) => { skip = n; return q; },
        limit: (n: number) => { limit = n; return q; },
        then: (res: any, rej: any) => Promise.resolve(single ? wrap(rows()[0] ?? null) : rows().slice(skip, skip + limit).map(wrap)).then(res, rej),
    };
    return q;
};

export const oid = () => new mongoose.Types.ObjectId();

export const sign = (secret: string, orderId: string, paymentId: string) =>
    crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

export const makeFakeDb = async () => {
    const products: Doc[] = [];
    const users: Doc[] = [];
    const orders: Doc[] = [];
    const intents: Doc[] = [];
    const log = { productFindQueries: [] as Doc[] };

    const { Product } = await import('../../src/models/Product');
    const { User } = await import('../../src/models/User');
    const { Order } = await import('../../src/models/Order');
    const { PaymentIntent } = await import('../../src/models/PaymentIntent');
    const { Coupon } = await import('../../src/models/Coupon');
    const { razorpay } = await import('../../src/modules/payments/payments.service');

    mock.method(Product as any, 'find', (q: Doc) => { log.productFindQueries.push(q); return query(() => products.filter(p => matches(p, q))); });
    mock.method(Product as any, 'countDocuments', async (q: Doc) => products.filter(p => matches(p, q)).length);
    mock.method(Product as any, 'findById', async (id: any) => wrap(products.find(p => String(p._id) === String(id)) ?? null));
    mock.method(Product as any, 'findOne', async (q: Doc) => wrap(products.find(p => matches(p, q as Doc)) ?? null));
    mock.method(Product as any, 'findOneAndUpdate', async (filter: Doc, update: Doc) => {
        await Promise.resolve(); // let concurrent callers interleave BEFORE the atomic match+apply
        const doc = products.find(p => matches(p, filter));
        if (!doc) return null;
        applyUpdate(doc, update);
        return wrap(doc);
    });
    mock.method(Product as any, 'updateOne', async (filter: Doc, update: Doc) => {
        const doc = products.find(p => matches(p, filter));
        if (doc) applyUpdate(doc, update);
        return { modifiedCount: doc ? 1 : 0 };
    });
    mock.method(User as any, 'findById', (id: any) => query(() => users.filter(u => String(u._id) === String(id)), true));
    mock.method(Coupon as any, 'findOne', async () => null);

    const failNextOrderCreate = { value: false };
    mock.method(Order as any, 'create', async (data: Doc) => {
        await Promise.resolve();
        if (failNextOrderCreate.value) { failNextOrderCreate.value = false; throw new Error('simulated DB failure'); }
        for (const f of ['orderId', 'razorpayPaymentId', 'razorpayOrderId']) {
            if (typeof data[f] === 'string' && orders.some(o => o[f] === data[f])) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
        }
        const doc = { _id: oid(), createdAt: new Date(), ...data };
        orders.push(doc);
        return wrap(doc);
    });
    mock.method(Order as any, 'findOne', async (q: Doc) => wrap(orders.find(o => matches(o, q)) ?? null));

    mock.method(PaymentIntent as any, 'create', async (data: Doc) => {
        const doc = { _id: oid(), status: 'CREATED', currency: 'INR', ...data };
        intents.push(doc);
        return wrap(doc);
    });
    mock.method(PaymentIntent as any, 'findOneAndUpdate', async (filter: Doc, update: Doc) => {
        await Promise.resolve();
        const doc = intents.find(i => matches(i, filter));
        if (!doc) return null;
        applyUpdate(doc, update);
        return wrap(doc);
    });
    mock.method(PaymentIntent as any, 'updateOne', async (filter: Doc, update: Doc) => {
        const doc = intents.find(i => matches(i, filter));
        if (doc) applyUpdate(doc, update);
        return { modifiedCount: doc ? 1 : 0 };
    });

    // Razorpay "provider": records of what the fake provider knows about.
    const providerOrders = new Map<string, Doc>();
    const providerPayments = new Map<string, Doc>();
    let seq = 0;
    const provider = {
        createCalls: [] as Doc[],
        failFetch: false,
        addPayment: (p: Doc) => providerPayments.set(p.id, p),
        orders: providerOrders,
    };
    mock.method(razorpay.orders as any, 'create', async (opts: Doc) => {
        provider.createCalls.push(opts);
        const o = { id: `order_TEST${String(++seq).padStart(6, '0')}`, ...opts, status: 'created' };
        providerOrders.set(o.id, o);
        return o;
    });
    mock.method(razorpay.payments as any, 'fetch', async (id: string) => {
        if (provider.failFetch) throw new Error('provider unreachable');
        const p = providerPayments.get(id);
        if (!p) throw { error: { description: 'not found' } };
        return p;
    });

    return { products, users, orders, intents, provider, log, failNextOrderCreate };
};

export type FakeDb = Awaited<ReturnType<typeof makeFakeDb>>;

export const seedProduct = (db: FakeDb, over: Doc = {}) => {
    const p = { _id: oid(), name: 'Shirt', price: 1000, photo: 'x.jpg', status: 'ACTIVE', quantity: 5, size: 'M', color: 'Blue', styleCode: undefined, ...over };
    db.products.push(p);
    return p;
};

export const seedUser = (db: FakeDb, role: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER') => {
    const u = { _id: oid(), role };
    db.users.push(u);
    return u;
};
