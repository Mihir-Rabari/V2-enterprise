import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

process.env.MONGODB_URI = 'mongodb://localhost/test';
process.env.JWT_SECRET = 'test-secret-test-secret';
process.env.ADMIN_SECRET_CODE = 'test-admin-code';
process.env.RAZORPAY_KEY_ID = 'x';
process.env.RAZORPAY_KEY_SECRET = 'y';

test('app boots without DB; security headers set, x-powered-by removed, 404 JSON (B-11)', async () => {
    const { default: app } = await import('../src/app');
    const server = app.listen(0);
    try {
        const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        const h = await fetch(`${base}/health`);
        assert.equal(h.status, 200);
        assert.equal(h.headers.get('x-powered-by'), null);
        assert.equal(h.headers.get('x-content-type-options'), 'nosniff');
        assert.ok(h.headers.get('strict-transport-security'));
        const nf = await fetch(`${base}/api/v1/nope`);
        assert.equal(nf.status, 404);
        assert.ok(nf.headers.get('ratelimit') || nf.headers.get('ratelimit-policy'), 'API routes carry rate-limit headers');
        assert.equal((await nf.json()).message, 'API Route not found');
    } finally {
        server.close();
    }
});
