import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { makeLimiter } from '../src/middlewares/rateLimit.middleware';

test('limiter returns JSON 429 after the threshold and keys by CF-Connecting-IP (B-11)', async () => {
    const app = express();
    app.set('trust proxy', 1);
    app.use(makeLimiter(60_000, 3, 'slow down'));
    app.get('/x', (_req, res) => res.json({ ok: true }));
    const server = app.listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/x`;
    try {
        const codes: number[] = [];
        for (let i = 0; i < 5; i++) codes.push((await fetch(base, { headers: { 'cf-connecting-ip': '1.1.1.1' } })).status);
        assert.deepEqual(codes, [200, 200, 200, 429, 429]);
        const other = await fetch(base, { headers: { 'cf-connecting-ip': '2.2.2.2' } });
        assert.equal(other.status, 200, 'a different client IP has its own budget');
        const blocked = await fetch(base, { headers: { 'cf-connecting-ip': '1.1.1.1' } });
        assert.equal(blocked.headers.get('content-type')?.includes('application/json'), true);
        assert.deepEqual(await blocked.json(), { success: false, message: 'slow down', errors: null });
    } finally {
        server.close();
    }
});
