import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/env';
import { getAdminStats, revenueGrowth, statsWindows } from '../src/modules/admin/admin.stats';
import { Order } from '../src/models/Order';
import { Product } from '../src/models/Product';
import { User } from '../src/models/User';
import { ContactMessage } from '../src/models/ContactMessage';
import { ChatUsage } from '../src/models/ChatUsage';
import { serve } from './helpers/http';
import { makeFakeDb, seedUser } from './helpers/fakeDb';
afterEach(() => mock.restoreAll());

test('analytics windows handle IST midnight, month rollover and equal 30-day comparisons', () => {
    const now = new Date('2026-03-31T19:00:00Z'); // April 1 in India.
    const w = statsWindows(now);
    assert.equal(w.days.at(-1)?.toISOString(), '2026-03-31T18:30:00.000Z');
    assert.equal(w.months.at(-1)?.toISOString(), '2026-03-31T18:30:00.000Z');
    assert.equal(w.months[0].toISOString(), '2025-10-31T18:30:00.000Z');
    assert.equal(now.getTime() - w.since.getTime(), w.since.getTime() - w.previousSince.getTime());
    assert.equal(revenueGrowth(500, 0), null);
    assert.equal(revenueGrowth(0, 100), -100);
    assert.equal(revenueGrowth(125, 100), 25);
});

test('fresh analytics excludes ineligible revenue, fills missing buckets and handles no data honestly', async () => {
    const now = new Date('2026-11-04T10:00:00Z');
    let pipeline: any[] = [];
    mock.method(Order, 'aggregate', async (p: any[]) => { pipeline = p; return [{
        current: [{ revenue: 300, orders: 2 }], previous: [{ revenue: 200, orders: 1 }],
        monthly: [{ _id: '2026-11', revenue: 300 }], daily: [{ _id: '2026-11-04', orders: 3 }],
    }]; });
    mock.method(Product, 'aggregate', async () => [{}]);
    mock.method(User, 'countDocuments', async () => 0);
    mock.method(ContactMessage, 'countDocuments', async () => 0);
    mock.method(ChatUsage, 'findOne', () => ({ lean: async () => null }) as any);
    const data = await getAdminStats(now);
    assert.equal(data.stats.revenue30d, 300);
    assert.equal(data.stats.averagePaidOrder30d, 150);
    assert.equal(data.stats.revenueGrowth, 50);
    assert.equal(data.monthlyRevenue.length, 6);
    assert.equal(data.monthlyRevenue[0].revenue, 0);
    assert.equal(data.monthlyRevenue[5].revenue, 300);
    assert.equal(data.customerPulse[6].orders, 3);
    assert.equal(data.aiToday.messages, 0);
    for (const branch of ['current', 'previous', 'lifetimePaid', 'monthly']) {
        assert.equal(pipeline[1].$facet[branch][0].$match.paymentStatus, 'PAID');
        assert.deepEqual(pipeline[1].$facet[branch][0].$match.status, { $nin: ['CANCELLED', 'REFUNDED'] });
    }
    assert.equal(pipeline[1].$facet.daily[1].$group._id.$dateToString.timezone, 'Asia/Kolkata');
    mock.method(Order, 'aggregate', async () => [{}]);
    const empty = await getAdminStats(now);
    assert.equal(empty.stats.revenueGrowth, null);
    assert.equal(empty.stats.averagePaidOrder30d, null);
    assert.equal(empty.stats.totalRevenue, 0);
    assert.deepEqual(empty.recentOrders, []);
});

test('analytics stays admin-only and non-cacheable, and database failures return 503', async () => {
    const db = await makeFakeDb();
    const { signToken } = await import('../src/utils/jwt');
    const { default: routes } = await import('../src/modules/admin/admin.routes');
    const admin = seedUser(db, 'ADMIN');
    const customer = seedUser(db, 'CUSTOMER');
    const srv = await serve({ '/admin': routes });
    try {
        const guest = await srv.get('/admin/stats');
        assert.equal(guest.status, 401);
        assert.match(guest.headers.get('cache-control')!, /no-store/);
        const forbidden = await srv.get('/admin/stats', signToken({ userId: String(customer._id), role: 'CUSTOMER' }));
        assert.equal(forbidden.status, 403);
        mock.method(Order, 'aggregate', async () => { throw new Error('database unavailable'); });
        mock.method(Product, 'aggregate', async () => []);
        mock.method(ContactMessage, 'countDocuments', async () => 0);
        mock.method(ChatUsage, 'findOne', () => ({ lean: async () => null }) as any);
        const failed = await srv.get('/admin/stats', signToken({ userId: String(admin._id), role: 'ADMIN' }));
        assert.equal(failed.status, 503);
        assert.equal(failed.headers.get('cdn-cache-control'), 'no-store');
        assert.ok(!(await failed.text()).includes('database unavailable'));
    } finally { await srv.close(); }
});
