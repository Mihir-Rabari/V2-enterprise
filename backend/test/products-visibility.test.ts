import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/env';
import { makeFakeDb, seedProduct, seedUser, oid, FakeDb } from './helpers/fakeDb';
import { serve } from './helpers/http';

afterEach(() => mock.restoreAll());

const setup = async () => {
    const db = await makeFakeDb();
    const { signToken } = await import('../src/utils/jwt');
    const { default: productRoutes } = await import('../src/modules/products/products.routes');
    const { default: adminRoutes } = await import('../src/modules/admin/admin.routes');
    const srv = await serve({ '/api/v1/products': productRoutes, '/api/v1/admin': adminRoutes });
    const admin = seedUser(db, 'ADMIN');
    const customer = seedUser(db, 'CUSTOMER');
    return {
        db, srv,
        adminToken: signToken({ userId: String(admin._id), role: 'ADMIN' }),
        customerToken: signToken({ userId: String(customer._id), role: 'CUSTOMER' }),
    };
};

const catalog = (db: FakeDb) => ({
    active: seedProduct(db, { name: 'Active', status: 'ACTIVE', styleCode: 'S1', color: 'Blue' }),
    activeMixed: seedProduct(db, { name: 'ActiveMixedCase', status: 'Active', styleCode: 'S1', color: 'Red' }),
    inactive: seedProduct(db, { name: 'Hidden', status: 'INACTIVE', styleCode: 'S1', color: 'Green' }),
    inactiveMixed: seedProduct(db, { name: 'HiddenMixed', status: 'Inactive', color: 'Black' }),
});

const names = (body: any) => (body.data.products as any[]).map(p => p.name).sort();

// ---------------------------------------------------------------- S1
test('S1: anonymous GET /products/:id returns ACTIVE (any casing) products', async () => {
    const { db, srv } = await setup();
    const c = catalog(db);
    try {
        for (const p of [c.active, c.activeMixed]) {
            const r = await srv.get(`/api/v1/products/${p._id}`);
            assert.equal(r.status, 200);
            assert.equal((await r.json()).data.name, p.name);
        }
    } finally { await srv.close(); }
});

test('S1: inactive products (INACTIVE and Inactive) are 404 for anonymous and customer, indistinguishable from missing', async () => {
    const { db, srv, customerToken } = await setup();
    const c = catalog(db);
    try {
        const missing = await srv.get(`/api/v1/products/${oid()}`);
        const missingBody = await missing.json();
        assert.equal(missing.status, 404);
        for (const p of [c.inactive, c.inactiveMixed]) {
            for (const token of [undefined, customerToken]) {
                const r = await srv.get(`/api/v1/products/${p._id}`, token);
                assert.equal(r.status, 404);
                const body = await r.json();
                assert.deepEqual(body, missingBody, 'identical response to a non-existent id (non-disclosing)');
                assert.ok(!JSON.stringify(body).includes(p.name));
            }
        }
    } finally { await srv.close(); }
});

test('S1: public GET /products/:id with an ADMIN token still hides inactive products (admin uses the admin route)', async () => {
    const { db, srv, adminToken } = await setup();
    const c = catalog(db);
    try {
        assert.equal((await srv.get(`/api/v1/products/${c.inactive._id}`, adminToken)).status, 404);
    } finally { await srv.close(); }
});

test('S1: admin route returns inactive products; anonymous/customer are rejected', async () => {
    const { db, srv, adminToken, customerToken } = await setup();
    const c = catalog(db);
    try {
        const ok = await srv.get(`/api/v1/admin/products/${c.inactive._id}`, adminToken);
        assert.equal(ok.status, 200);
        assert.equal((await ok.json()).data.name, 'Hidden');
        assert.equal((await srv.get(`/api/v1/admin/products/${c.inactive._id}`)).status, 401);
        assert.equal((await srv.get(`/api/v1/admin/products/${c.inactive._id}`, customerToken)).status, 403);
    } finally { await srv.close(); }
});

test('S1: missing and malformed ids give 404 (no 500, no stack)', async () => {
    const { srv } = await setup();
    try {
        for (const id of [String(oid()), 'not-an-id', '123', '%00', 'undefined', '$ne']) {
            const r = await srv.get(`/api/v1/products/${encodeURIComponent(id)}`);
            assert.equal(r.status, 404, id);
            const body = await r.json();
            assert.equal(body.success, false);
            assert.equal(body.message, 'Product not found.');
        }
    } finally { await srv.close(); }
});

test('S1: related products (siblings) never include inactive SKUs on the public route, but do for admin', async () => {
    const { db, srv, adminToken } = await setup();
    const c = catalog(db);
    try {
        const pub = await (await srv.get(`/api/v1/products/${c.active._id}`)).json();
        const sibs = pub.data.siblings.map((s: any) => s.name).sort();
        assert.deepEqual(sibs, ['ActiveMixedCase'], 'ACTIVE and Active siblings only; Hidden is excluded');
        const adm = await (await srv.get(`/api/v1/admin/products/${c.active._id}`, adminToken)).json();
        assert.deepEqual(adm.data.siblings.map((s: any) => s.name).sort(), ['ActiveMixedCase', 'Hidden']);
    } finally { await srv.close(); }
});

// ---------------------------------------------------------------- S3
test('S3: public list never returns inactive products; status param and admin token are ignored', async () => {
    const { db, srv, adminToken, customerToken } = await setup();
    catalog(db);
    try {
        const expected = ['Active', 'ActiveMixedCase'];
        const bodies: any[] = [];
        for (const [qs, token] of [
            ['', undefined], ['?status=ALL', undefined], ['?status=INACTIVE', undefined],
            ['?status=ALL', customerToken], ['?status=ALL', adminToken], ['?status=INACTIVE', adminToken],
            ['?status=all', adminToken], ['', adminToken], ['?status=Inactive', 'garbage.token.value'],
        ] as [string, string | undefined][]) {
            const r = await srv.get(`/api/v1/products${qs}`, token);
            assert.equal(r.status, 200, qs);
            const body = await r.json();
            assert.deepEqual(names(body), expected, `${qs} token=${token ? 'yes' : 'no'}`);
            bodies.push(body);
        }
        // the response does not change merely because an admin token was attached
        assert.deepEqual(bodies[4], bodies[1]);
        assert.deepEqual(bodies[7], bodies[0]);
    } finally { await srv.close(); }
});

test('S3: admin listing is protected, private/no-store, and returns the admin dataset', async () => {
    const { db, srv, adminToken, customerToken } = await setup();
    catalog(db);
    try {
        const anon = await srv.get('/api/v1/admin/products');
        assert.equal(anon.status, 401);
        assert.equal((await srv.get('/api/v1/admin/products', customerToken)).status, 403);
        const bad = await srv.get('/api/v1/admin/products', 'not.a.jwt');
        assert.equal(bad.status, 401);
        for (const r of [anon, bad]) assert.equal(r.headers.get('cache-control'), 'private, no-store', 'errors are non-cacheable too');

        const all = await srv.get('/api/v1/admin/products?status=ALL', adminToken);
        assert.equal(all.status, 200);
        assert.equal(all.headers.get('cache-control'), 'private, no-store');
        assert.equal(all.headers.get('vary'), null, 'no Vary: Authorization workaround');
        const everything = ['Active', 'ActiveMixedCase', 'Hidden', 'HiddenMixed'];
        assert.deepEqual(names(await all.json()), everything);
        assert.deepEqual(names(await (await srv.get('/api/v1/admin/products', adminToken)).json()), everything, 'default is ALL');
        assert.deepEqual(names(await (await srv.get('/api/v1/admin/products?status=INACTIVE', adminToken)).json()), ['Hidden', 'HiddenMixed']);
        assert.deepEqual(names(await (await srv.get('/api/v1/admin/products?status=active', adminToken)).json()), ['Active', 'ActiveMixedCase']);
    } finally { await srv.close(); }
});

test('S3: public list adds no cache headers; filters and pagination still work', async () => {
    const { db, srv } = await setup();
    for (let i = 0; i < 5; i++) seedProduct(db, { name: `P${i}`, mainCategory: i < 3 ? 'Mens' : 'Women', price: 100 * (i + 1) });
    seedProduct(db, { name: 'Inactive', status: 'INACTIVE', mainCategory: 'Mens' });
    try {
        const r = await srv.get('/api/v1/products?limit=2&page=2&mainCategories=Mens');
        assert.equal(r.status, 200);
        assert.equal(r.headers.get('cache-control'), null);
        const body = await r.json();
        assert.equal(body.data.page, 2);
        assert.equal(body.data.limit, 2);
        assert.equal(body.data.total, 3, 'inactive Mens product excluded from the count');
        assert.equal(body.data.products.length, 1);
        assert.equal(body.data.totalPages, 2);
    } finally { await srv.close(); }
});
