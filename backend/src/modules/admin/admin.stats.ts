import { Order } from '../../models/Order';
import { Product } from '../../models/Product';
import { User } from '../../models/User';
import { ContactMessage } from '../../models/ContactMessage';
import { ChatUsage } from '../../models/ChatUsage';

const DAY = 86_400_000;
const IST_OFFSET = 330 * 60_000;
const TIMEZONE = 'Asia/Kolkata';
const paid = { paymentStatus: 'PAID', status: { $nin: ['CANCELLED', 'REFUNDED'] } };
const total = [{ $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }];
export const revenueGrowth = (current: number, previous: number): number | null =>
    previous > 0 ? Math.round((current - previous) / previous * 1000) / 10 : null;

export const statsWindows = (now: Date) => {
    const local = new Date(now.getTime() + IST_OFFSET);
    const monthStart = (offset: number) => new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + offset, 1) - IST_OFFSET);
    const today = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - IST_OFFSET);
    return {
        since: new Date(now.getTime() - 30 * DAY), previousSince: new Date(now.getTime() - 60 * DAY),
        months: Array.from({ length: 6 }, (_, i) => monthStart(i - 5)),
        days: Array.from({ length: 7 }, (_, i) => new Date(today.getTime() + (i - 6) * DAY)),
    };
};

/** Every request reads MongoDB; no application cache or seeded fallback. Dates group in IST. */
export const getAdminStats = async (now = new Date()) => {
    const windows = statsWindows(now);
    const range = { $gte: windows.since, $lt: now };
    const [orderRows, inventoryRows, totalCustomers, newCustomers, unreadMessages, ai] = await Promise.all([
        Order.aggregate([
            { $match: { createdAt: { $lt: now } } },
            { $facet: {
                all: [{ $count: 'count' }],
                lifetimePaid: [{ $match: paid }, ...total],
                current: [{ $match: { ...paid, createdAt: range } }, ...total],
                previous: [{ $match: { ...paid, createdAt: { $gte: windows.previousSince, $lt: windows.since } } }, ...total],
                periodOrders: [{ $match: { createdAt: range } }, { $count: 'count' }],
                statuses: [{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
                monthly: [
                    { $match: { ...paid, createdAt: { $gte: windows.months[0] } } },
                    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: TIMEZONE } }, revenue: { $sum: '$total' } } },
                ],
                daily: [
                    { $match: { createdAt: { $gte: windows.days[0] } } },
                    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TIMEZONE } }, orders: { $sum: 1 } } },
                ],
                recent: [{ $sort: { createdAt: -1 } }, { $limit: 5 }, { $project: { orderId: 1, total: 1, status: 1, paymentStatus: 1, createdAt: 1 } }],
            } },
        ]),
        Product.aggregate([{ $facet: {
            all: [{ $count: 'count' }],
            active: [{ $match: { status: { $regex: '^active$', $options: 'i' } } }, { $count: 'count' }],
            lowStock: [{ $match: { status: { $regex: '^active$', $options: 'i' }, quantity: { $gt: 0, $lte: 5 } } }, { $count: 'count' }],
            outOfStock: [{ $match: { status: { $regex: '^active$', $options: 'i' }, quantity: { $lte: 0 } } }, { $count: 'count' }],
            categories: [
                { $match: { status: { $regex: '^active$', $options: 'i' } } },
                { $group: { _id: '$mainCategory', value: { $sum: 1 } } },
                { $sort: { value: -1 } }, { $project: { _id: 0, name: { $ifNull: ['$_id', 'Uncategorised'] }, value: 1 } },
            ],
        } }]),
        User.countDocuments({ role: 'CUSTOMER' }),
        User.countDocuments({ role: 'CUSTOMER', createdAt: range }),
        ContactMessage.countDocuments({ status: 'UNREAD' }),
        ChatUsage.findOne({ day: now.toISOString().slice(0, 10) }).lean(),
    ]);
    const orders = orderRows[0] ?? {};
    const inventory = inventoryRows[0] ?? {};
    const current = orders.current?.[0] ?? { revenue: 0, orders: 0 };
    const previous = orders.previous?.[0] ?? { revenue: 0, orders: 0 };
    const growth = revenueGrowth(current.revenue, previous.revenue);
    const statuses: { status: string; count: number }[] = (orders.statuses ?? []).map((s: any) => ({ status: s._id, count: s.count }));
    return {
        generatedAt: now.toISOString(), timezone: TIMEZONE,
        period: { from: windows.since.toISOString(), to: now.toISOString(), comparisonFrom: windows.previousSince.toISOString() },
        stats: {
            totalProducts: inventory.all?.[0]?.count ?? 0, totalOrders: orders.all?.[0]?.count ?? 0,
            totalCustomers, newCustomers, unreadMessages,
            totalRevenue: orders.lifetimePaid?.[0]?.revenue ?? 0,
            pendingOrders: statuses.find(s => s.status === 'PENDING')?.count ?? 0,
            salesGrowth: growth == null ? null : Math.abs(growth).toFixed(1),
            growthTrend: growth == null || growth === 0 ? 'STABLE' : growth > 0 ? 'UP' : 'DOWN',
            revenue30d: current.revenue, previousRevenue30d: previous.revenue, revenueGrowth: growth,
            orders30d: orders.periodOrders?.[0]?.count ?? 0, paidOrders30d: current.orders,
            averagePaidOrder30d: current.orders > 0 ? current.revenue / current.orders : null,
            activeProducts: inventory.active?.[0]?.count ?? 0,
            lowStockProducts: inventory.lowStock?.[0]?.count ?? 0,
            outOfStockProducts: inventory.outOfStock?.[0]?.count ?? 0,
        },
        monthlyRevenue: windows.months.map(date => {
            const key = new Date(date.getTime() + IST_OFFSET).toISOString().slice(0, 7);
            return { month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: TIMEZONE }), revenue: orders.monthly?.find((r: any) => r._id === key)?.revenue ?? 0 };
        }),
        customerPulse: windows.days.map(date => {
            const key = new Date(date.getTime() + IST_OFFSET).toISOString().slice(0, 10);
            return { date: key, orders: orders.daily?.find((r: any) => r._id === key)?.orders ?? 0 };
        }),
        categoryDistribution: inventory.categories ?? [], orderStatuses: statuses,
        recentOrders: (orders.recent ?? []).map((o: any) => ({ id: String(o._id), orderId: o.orderId, amount: o.total, status: o.status, paymentStatus: o.paymentStatus, date: o.createdAt })),
        aiToday: { day: now.toISOString().slice(0, 10), messages: ai?.messages ?? 0, requests: ai?.requests ?? 0, estimatedCostUsd: ai?.costUsd ?? 0,
            searches: ai?.searches ?? 0, emptySearches: ai?.emptySearches ?? 0, blockedMessages: ai?.blockedMessages ?? 0 },
    };
};
