import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/env';
import { makeFakeDb, seedProduct, seedUser, sign, FakeDb } from './helpers/fakeDb';
import { serve } from './helpers/http';

afterEach(() => mock.restoreAll());

const SECRET = 'y'; // RAZORPAY_KEY_SECRET in helpers/env

const setup = async () => {
    const db = await makeFakeDb();
    const orders = await import('../src/modules/orders/orders.service');
    const payments = await import('../src/modules/payments/payments.service');
    const user = seedUser(db);
    const other = seedUser(db);
    const shirt = seedProduct(db, { name: 'Shirt', price: 1000, quantity: 5 });
    return { db, orders, payments, user, other, shirt, uid: String(user._id), oid2: String(other._id) };
};

let payN = 0;
/** A Razorpay payment as the (fake) provider would report it for `orderId`. */
const providerPayment = (db: FakeDb, orderId: string, amount: number, over: Record<string, unknown> = {}) => {
    const id = `pay_TEST${String(++payN).padStart(6, '0')}`;
    db.provider.addPayment({ id, order_id: orderId, amount, currency: 'INR', status: 'captured', ...over });
    return id;
};

const orderInput = (uid: string, productId: string, quantity: number, over: Record<string, unknown> = {}) => ({
    userId: uid, items: [{ productId, quantity, size: 'M' }], method: 'prepaid', address: 'a', phone: '1234567890', ...over,
});

const pay = (rzpOrderId: string, paymentId: string) => ({
    razorpayOrderId: rzpOrderId, razorpayPaymentId: paymentId, razorpaySignature: sign(SECRET, rzpOrderId, paymentId),
});

/** create-order for 2 x Shirt(1000) prepaid: 2000 - 2*50 = 1900 rupees = 190000 paise. */
const checkout = async (s: Awaited<ReturnType<typeof setup>>, qty = 2) => {
    const rzp = await s.payments.createPaymentIntentService(s.uid, [{ productId: String(s.shirt._id), quantity: qty }]);
    return rzp.id;
};

// ================================================================ S2
test('S2: create-order ignores a client amount and charges the server-priced total (paise)', async () => {
    const s = await setup();
    const srv = await serve({ '/payments': (await import('../src/modules/payments/payments.routes')).default });
    const { signToken } = await import('../src/utils/jwt');
    try {
        const r = await srv.post('/payments/create-order', { amount: 1, currency: 'USD', receipt: 'x', items: [{ productId: String(s.shirt._id), quantity: 2 }] },
            signToken({ userId: s.uid, role: 'CUSTOMER' }));
        assert.equal(r.status, 200);
        assert.equal(s.db.provider.createCalls.length, 1);
        assert.equal(s.db.provider.createCalls[0].amount, 190000);
        assert.equal(s.db.provider.createCalls[0].currency, 'INR');
        assert.notEqual(s.db.provider.createCalls[0].receipt, 'x');
        assert.equal(s.db.intents.length, 1);
        assert.equal(s.db.intents[0].amountPaise, 190000);
        assert.equal(String(s.db.intents[0].userId), s.uid);
    } finally { await srv.close(); }
});

test('S2: create-order requires authentication and a cart; amount-only (legacy) bodies are rejected', async () => {
    const s = await setup();
    const srv = await serve({ '/payments': (await import('../src/modules/payments/payments.routes')).default });
    const { signToken } = await import('../src/utils/jwt');
    const token = signToken({ userId: s.uid, role: 'CUSTOMER' });
    try {
        assert.equal((await srv.post('/payments/create-order', { items: [] })).status, 401);
        assert.equal((await srv.post('/payments/create-order', { amount: 1 }, token)).status, 400);
        assert.equal((await srv.post('/payments/create-order', { items: [] }, token)).status, 400);
        assert.equal((await srv.post('/payments/create-order', { items: [{ productId: String(s.shirt._id), quantity: -1 }] }, token)).status, 400);
        assert.equal((await srv.post('/payments/create-order', { items: [{ productId: String(s.shirt._id), quantity: 99 }] }, token)).status, 400, 'more than stock');
        assert.equal(s.db.provider.createCalls.length, 0, 'no provider order for rejected carts');
    } finally { await srv.close(); }
});

test('S2: matching amount and currency creates a PAID order at the server total and decrements stock once', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 190000);
    const order: any = await s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, { ...pay(rzp, payId), total: 1 }));
    assert.equal(order.total, 1900);
    assert.equal(order.paymentStatus, 'PAID');
    assert.equal(order.razorpayPaymentId, payId);
    assert.equal(s.shirt.quantity, 3);
    assert.equal(s.db.intents[0].status, 'COMPLETED');
    assert.equal(String(s.db.intents[0].orderId), String(order._id));
});

test('S2: provider amount mismatch is rejected even with a valid signature; intent FAILED, no order, no stock change', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 100); // paid ₹1 for a ₹1900 cart
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, payId))), /amount does not match/i);
    assert.equal(s.db.orders.length, 0);
    assert.equal(s.shirt.quantity, 5);
    assert.equal(s.db.intents[0].status, 'FAILED');
});

test('S2: overpayment (amount != expected in either direction) is rejected too', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 190001);
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, payId))), /amount does not match/i);
    assert.equal(s.db.orders.length, 0);
});

test('S2: currency mismatch is rejected', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 190000, { currency: 'USD' });
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, payId))), /currency/i);
    assert.equal(s.db.orders.length, 0);
});

test('S2: a payment belonging to a different provider order is rejected', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, 'order_SOMEONEELSE1', 190000);
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, payId))), /does not belong/i);
    assert.equal(s.db.orders.length, 0);
});

test('S2: invalid signature fails closed before any state change', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 190000);
    const bad = { razorpayOrderId: rzp, razorpayPaymentId: payId, razorpaySignature: 'a'.repeat(64) };
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, bad)), /verification failed/i);
    for (const sig of ['', 'zz', 'a'.repeat(63), sign(SECRET, rzp, payId).toUpperCase().slice(0, 10)]) {
        await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, { ...bad, razorpaySignature: sig })));
    }
    assert.equal(s.db.orders.length, 0);
    assert.equal(s.shirt.quantity, 5);
    assert.equal(s.db.intents[0].status, 'CREATED', 'intent untouched, still usable by the real payment');
});

test('S2: missing or malformed provider data is rejected', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 190000);
    const good = pay(rzp, payId);
    const variants: Record<string, unknown>[] = [
        {}, { razorpayOrderId: rzp }, { ...good, razorpaySignature: undefined }, { ...good, razorpayPaymentId: undefined },
        { ...good, razorpayOrderId: { $ne: 'x' } }, { ...good, razorpayPaymentId: ['a'] }, { ...good, razorpayPaymentId: 'not-a-payment-id' },
        { ...good, razorpayOrderId: 'x'.repeat(500) },
    ];
    for (const v of variants) {
        await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, v)), undefined, JSON.stringify(v));
    }
    // provider returns an unusable payload
    const rzp2 = await checkout(s);
    s.db.provider.addPayment({ id: 'pay_TESTMALFORM', order_id: rzp2, amount: '190000', currency: 'INR', status: 'captured' });
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp2, 'pay_TESTMALFORM'))), /amount does not match/i);
    assert.equal(s.db.orders.length, 0);
    assert.equal(s.shirt.quantity, 5);
});

test('S2: payment not captured is rejected but stays retryable; a later captured payment on the same order succeeds', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const failed = providerPayment(s.db, rzp, 190000, { status: 'failed' });
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, failed))), /not completed/i);
    assert.equal(s.db.intents[0].status, 'CREATED');
    assert.equal(s.shirt.quantity, 5);
    const authorizedOnly = providerPayment(s.db, rzp, 190000, { status: 'authorized' });
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, authorizedOnly))), /not completed/i);
    const good = providerPayment(s.db, rzp, 190000);
    const order: any = await s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, good)));
    assert.equal(order.razorpayPaymentId, good);
    assert.equal(s.shirt.quantity, 3);
    assert.equal(s.db.orders.length, 1);
});

test('S2: provider outage during verification fails closed and stays retryable', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 190000);
    s.db.provider.failFetch = true;
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, payId))), /unable to verify/i);
    assert.equal(s.db.orders.length, 0);
    assert.equal(s.db.intents[0].status, 'CREATED');
    s.db.provider.failFetch = false;
    await s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, payId)));
    assert.equal(s.db.orders.length, 1);
});

test('S2: price change between checkout and verification is rejected (no order, no stock change, intent FAILED for refund review)', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 190000);
    s.shirt.price = 1500; // admin edits the price after the customer started paying
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, payId))), /changed after payment/i);
    assert.equal(s.db.orders.length, 0);
    assert.equal(s.shirt.quantity, 5);
    assert.equal(s.db.intents[0].status, 'FAILED');
});

test('S2: cart different from the one that was paid for is rejected', async () => {
    const s = await setup();
    const other = seedProduct(s.db, { name: 'Other', price: 1000, quantity: 5 });
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 190000);
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(other._id), 2, pay(rzp, payId))), /changed after payment/i);
    assert.equal(s.db.orders.length, 0);
});

test('S2: another user cannot consume someone else\'s payment intent', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 190000);
    await assert.rejects(s.orders.createOrderService(orderInput(s.oid2, String(s.shirt._id), 2, pay(rzp, payId))), /cannot be used/i);
    assert.equal(s.db.orders.length, 0);
    assert.equal(s.db.intents[0].status, 'CREATED');
});

test('S2: replaying a fulfilled payment returns the same order and never creates/decrements again; others cannot replay it', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 190000);
    const first: any = await s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, payId)));
    const again: any = await s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, payId)));
    assert.equal(String(again._id), String(first._id));
    assert.equal(s.db.orders.length, 1);
    assert.equal(s.shirt.quantity, 3);
    await assert.rejects(s.orders.createOrderService(orderInput(s.oid2, String(s.shirt._id), 2, pay(rzp, payId))));
    // the used payment id cannot back a second order via a fresh intent either
    const rzp2 = await checkout(s);
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp2, payId))), /signature|verification|does not belong/i);
    assert.equal(s.db.orders.length, 1);
    assert.equal(s.shirt.quantity, 3);
});

test('S2: concurrent duplicate verification creates exactly one order and decrements once', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 190000);
    const results = await Promise.allSettled([1, 2, 3].map(() => s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, payId)))));
    assert.equal(results.filter(r => r.status === 'fulfilled').length >= 1, true);
    assert.equal(s.db.orders.length, 1);
    assert.equal(s.shirt.quantity, 3);
});

test('S2: a non-prepaid order cannot use/forge Razorpay fields to skip stock or pricing', async () => {
    const s = await setup();
    const order: any = await s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 1, { method: 'cod', razorpayPaymentId: 'pay_x', total: 1 }));
    assert.equal(order.total, 1000);
    assert.equal(order.paymentStatus, 'PENDING');
    assert.equal(order.razorpayPaymentId, undefined);
    assert.equal(s.shirt.quantity, 4);
});

// ================================================================ S4
test('S4: COD order decrements the real `quantity` field by the ordered amount', async () => {
    const s = await setup();
    await s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, { method: 'cod' }));
    assert.equal(s.shirt.quantity, 3);
});

test('S4: insufficient stock is rejected with no order and no change', async () => {
    const s = await setup();
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 6, { method: 'cod' })), /insufficient stock/i);
    assert.equal(s.db.orders.length, 0);
    assert.equal(s.shirt.quantity, 5);
    const out = seedProduct(s.db, { name: 'Zero', quantity: 0 });
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(out._id), 1, { method: 'cod' })), /insufficient stock/i);
});

test('S4: a multi-line cart is all-or-nothing: earlier reservations are released when a later line is short', async () => {
    const s = await setup();
    const scarce = seedProduct(s.db, { name: 'Scarce', quantity: 1 });
    await assert.rejects(s.orders.createOrderService({
        userId: s.uid, method: 'cod', address: 'a', phone: '1',
        items: [{ productId: String(s.shirt._id), quantity: 3 }, { productId: String(scarce._id), quantity: 2 }],
    }), /insufficient stock for "Scarce"/i);
    assert.equal(s.shirt.quantity, 5, 'first line restored');
    assert.equal(scarce.quantity, 1);
    assert.equal(s.db.orders.length, 0);
});

test('S4: two concurrent buyers of the last unit - exactly one wins and stock never goes negative', async () => {
    const s = await setup();
    const last = seedProduct(s.db, { name: 'Last', quantity: 1 });
    const results = await Promise.allSettled(
        [s.uid, s.oid2, s.uid, s.oid2, s.uid].map(u => s.orders.createOrderService(orderInput(u, String(last._id), 1, { method: 'cod' })))
    );
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.filter(r => r.status === 'rejected').length, 4);
    assert.equal(last.quantity, 0);
    assert.equal(s.db.orders.filter(o => String(o.items[0].productId) === String(last._id)).length, 1);
});

test('S4: order creation failure after reservation restores stock (COD)', async () => {
    const s = await setup();
    s.db.failNextOrderCreate.value = true;
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, { method: 'cod' })), /simulated DB failure/);
    assert.equal(s.shirt.quantity, 5);
    assert.equal(s.db.orders.length, 0);
});

test('S4: prepaid order-creation failure restores stock, keeps the payment retryable, and the retry decrements exactly once', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 190000);
    s.db.failNextOrderCreate.value = true;
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, payId))), /simulated DB failure/);
    assert.equal(s.shirt.quantity, 5);
    assert.equal(s.db.intents[0].status, 'CREATED');
    await s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, payId)));
    assert.equal(s.shirt.quantity, 3);
    assert.equal(s.db.orders.length, 1);
});

test('S4: stock sold out between payment start and verification -> no order, no negative stock, intent FAILED for refund', async () => {
    const s = await setup();
    const rzp = await checkout(s);
    const payId = providerPayment(s.db, rzp, 190000);
    s.shirt.quantity = 1; // someone else bought the units meanwhile
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(s.shirt._id), 2, pay(rzp, payId))), /insufficient stock/i);
    assert.equal(s.shirt.quantity, 1);
    assert.equal(s.db.orders.length, 0);
    assert.equal(s.db.intents[0].status, 'FAILED');
});

test('S4: malformed quantities are rejected before touching inventory', async () => {
    const s = await setup();
    for (const q of [0, -1, 1.5, '2', null, undefined, NaN, Infinity, 51, {}, [1]]) {
        await assert.rejects(
            s.orders.createOrderService({ userId: s.uid, method: 'cod', address: 'a', phone: '1', items: [{ productId: String(s.shirt._id), quantity: q as any }] }),
            /quantity/i, String(q));
    }
    await assert.rejects(s.orders.createOrderService({ userId: s.uid, method: 'cod', address: 'a', phone: '1', items: undefined as any }));
    await assert.rejects(s.orders.createOrderService({ userId: s.uid, method: 'cod', address: 'a', phone: '1', items: [{ productId: 'nope', quantity: 1 }] }), /Invalid product ID/);
    assert.equal(s.shirt.quantity, 5);
    assert.equal(s.db.orders.length, 0);
});

test('S4: inactive products cannot be ordered; mixed-case "Active" products can', async () => {
    const s = await setup();
    const inactive = seedProduct(s.db, { name: 'Gone', status: 'Inactive', quantity: 9 });
    await assert.rejects(s.orders.createOrderService(orderInput(s.uid, String(inactive._id), 1, { method: 'cod' })), /no longer available/i);
    assert.equal(inactive.quantity, 9);
    const mixed = seedProduct(s.db, { name: 'Mixed', status: 'Active', quantity: 2 });
    await s.orders.createOrderService(orderInput(s.uid, String(mixed._id), 1, { method: 'cod' }));
    assert.equal(mixed.quantity, 1);
});
