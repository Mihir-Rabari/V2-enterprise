import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI = 'mongodb://localhost/test';
process.env.JWT_SECRET = 'test-secret-test-secret';
process.env.ADMIN_SECRET_CODE = 'test-admin-code';
process.env.RAZORPAY_KEY_ID = 'x';
process.env.RAZORPAY_KEY_SECRET = 'y';

import { parseIntParam, asString, escapeRegex } from '../src/utils/query';
import { validateOrderItems } from '../src/utils/orderItems';
import { pickProfileUpdate } from '../src/utils/profile';

test('parseIntParam: NaN, zero, negative and huge values are bounded (F-04/F-05)', () => {
    assert.equal(parseIntParam('abc', 12, 1, 500), 12);
    assert.equal(parseIntParam('0', 12, 1, 500), 1);
    assert.equal(parseIntParam('-5', 12, 1, 500), 1);
    assert.equal(parseIntParam('100000', 12, 1, 500), 500);
    assert.equal(parseIntParam(undefined, 12, 1, 500), 12);
    assert.equal(parseIntParam(['1', '2'], 12, 1, 500), 12);
    assert.equal(parseIntParam('20', 12, 1, 500), 20);
});

test('asString rejects operator objects and arrays (F-06)', () => {
    assert.equal(asString({ $ne: 'x' }), undefined);
    assert.equal(asString(['a']), undefined);
    assert.equal(asString('shirt'), 'shirt');
    assert.equal(asString(''), undefined);
});

test('escapeRegex makes metacharacters literal and never throws (F-07)', () => {
    for (const s of ['(', '[', '.*', 'a+b', '\\', '$^', '(a+)+$']) {
        const re = new RegExp(`^${escapeRegex(s)}$`, 'i');
        assert.ok(re.test(s));
    }
    assert.equal(new RegExp(escapeRegex('.*')).test('abc'), false);
});

test('validateOrderItems blocks negative / fractional / zero / huge quantities and duplicates (F-02)', () => {
    const ok = [{ productId: 'a', quantity: 1 }, { productId: 'b', quantity: 3 }];
    assert.doesNotThrow(() => validateOrderItems(ok));
    for (const q of [-1, 0, 1.5, 51, '2', null, undefined, NaN]) {
        assert.throws(() => validateOrderItems([{ productId: 'a', quantity: q }]), /quantity/i, `quantity ${String(q)}`);
    }
    assert.throws(() => validateOrderItems([]), /at least one/);
    assert.throws(() => validateOrderItems('x'), /at least one/);
    assert.throws(() => validateOrderItems([{ productId: 'a', quantity: 1 }, { productId: 'a', quantity: 1 }]), /Duplicate/);
});

test('pickProfileUpdate strips role/password/token fields (F-01)', () => {
    const out = pickProfileUpdate({ name: ' Asha ', phone: '99', role: 'ADMIN', password: 'plain', resetPasswordToken: 't', wishlist: [], $set: { role: 'ADMIN' } });
    assert.deepEqual(out, { name: 'Asha', phone: '99' });
    assert.deepEqual(pickProfileUpdate(undefined), {});
    assert.deepEqual(pickProfileUpdate({ name: { $ne: 1 } as any }), {});
});

// F-03 (admin-only non-ACTIVE listing) is now enforced by route separation; see test/products-visibility.test.ts.
