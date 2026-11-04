'use client';
import React from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowUpRight, ShoppingBag, IndianRupee, Users, Package } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { useLiveAnalytics } from '../../hooks/useLiveAnalytics';

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const count = (value: number) => value.toLocaleString('en-IN');
const time = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' });
const Panel = ({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) => (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
        <h3 className="font-serif text-xl text-stone-900">{title}</h3>
        <p className="mb-6 mt-1 text-xs leading-relaxed text-stone-500">{detail}</p>{children}
    </section>
);
const Empty = ({ children }: { children: React.ReactNode }) => <p className="py-12 text-center text-sm text-stone-500">{children}</p>;
const MetricList = ({ rows }: { rows: [string, string][] }) => <dl className="space-y-3 text-sm">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-stone-100 pb-2"><dt className="text-stone-600">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>)}</dl>;

export default function DashboardPage() {
    const { data, loading, error, refresh } = useLiveAnalytics();
    const s = data?.stats;
    const cards = s ? [
        { title: 'Paid revenue', value: money(s.revenue30d), icon: IndianRupee, detail: s.revenueGrowth === null ? 'No paid revenue in the comparison period' : `${s.revenueGrowth > 0 ? '+' : ''}${s.revenueGrowth}% vs previous 30 days` },
        { title: 'Orders placed', value: count(s.orders30d), icon: ShoppingBag, detail: `${count(s.paidOrders30d)} paid, excluding cancelled / refunded` },
        { title: 'Average paid order', value: s.averagePaidOrder30d === null ? '—' : money(s.averagePaidOrder30d), icon: Package, detail: 'Paid revenue ÷ eligible paid orders' },
        { title: 'New customers', value: count(s.newCustomers), icon: Users, detail: 'Customer accounts created in the last 30 days' },
    ] : [];
    return <div className="space-y-6 pb-12">
        <header className="flex flex-col justify-between gap-5 rounded-2xl bg-[#191816] p-6 text-white sm:p-9 lg:flex-row lg:items-end">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d4b77a]">Store intelligence</p>
                <h2 className="mt-3 font-serif text-3xl sm:text-4xl">The numbers behind your store.</h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-300">Sales, orders and operational signals from your database. No estimated traffic or placeholder performance claims.</p></div>
            <div className="shrink-0 space-y-3 text-xs text-stone-300">
                <button type="button" onClick={() => void refresh()} disabled={loading} className="flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-white transition hover:bg-white/10 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />{loading ? 'Refreshing…' : 'Refresh now'}</button>
                <p role="status">{data ? `Updated ${time(data.generatedAt)} IST` : loading ? 'Reading current data…' : 'Current data unavailable'}</p>
                <p className="text-[11px] text-stone-400">Refreshes every 30 seconds while visible</p>
            </div>
        </header>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error} Previous figures are hidden so they cannot be mistaken for current data.</div>}
        {loading && <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Loading analytics">{[0, 1, 2, 3].map(i => <div key={i} className="h-36 animate-pulse rounded-2xl bg-stone-100" />)}</div>}
        {data && s && <>
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-stone-500"><p className="font-semibold uppercase tracking-widest text-stone-700">Last 30 days</p><p>{time(data.period.from)} — {time(data.period.to)} IST</p></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <section key={card.title} className="rounded-2xl border border-stone-200 bg-white p-6">
                <div className="flex items-center justify-between text-stone-500"><h3 className="text-xs font-semibold uppercase tracking-wider">{card.title}</h3><card.icon size={18} strokeWidth={1.5} /></div>
                <p className="mt-5 text-3xl font-semibold tabular-nums tracking-tight text-stone-900">{card.value}</p><p className="mt-3 text-xs leading-relaxed text-stone-500">{card.detail}</p>
            </section>)}</div>
            <p className="px-1 text-xs leading-relaxed text-stone-500">Revenue uses recorded PAID orders by order creation date, excluding CANCELLED and REFUNDED orders. Unpaid COD orders are excluded. This is sales reporting, not a bank settlement report.</p>
            <div className="grid gap-6 xl:grid-cols-2">
                <Panel title="Paid revenue over time" detail="Six calendar months, including the current partial month · INR · grouped in IST">
                    {data.monthlyRevenue.some(r => r.revenue > 0) ? <div className="h-64 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.monthlyRevenue} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eeeae2" /><XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip formatter={v => money(Number(v))} /><Area name="Paid revenue" type="monotone" dataKey="revenue" stroke="#9a7b3c" fill="#ece3d0" isAnimationActive={false} />
                    </AreaChart></ResponsiveContainer></div> : <Empty>No paid revenue recorded in these six months.</Empty>}
                </Panel>
                <Panel title="Daily orders" detail="Seven calendar days, including today · all order statuses · grouped in IST">
                    {data.customerPulse.some(r => r.orders > 0) ? <div className="h-64 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.customerPulse}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eeeae2" /><XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => String(v).slice(5)} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip /><Bar name="Orders placed" dataKey="orders" fill="#28251f" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart></ResponsiveContainer></div> : <Empty>No orders placed in the last seven days.</Empty>}
                </Panel>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <Panel title="Needs attention" detail="Current store operations · counts across all records">
                    <MetricList rows={[
                        ['Pending orders', count(s.pendingOrders)], ['Unread inquiries', count(s.unreadMessages)],
                        ['Low stock variants (1–5 units)', count(s.lowStockProducts)], ['Out of stock active variants', count(s.outOfStockProducts)],
                    ]} />
                </Panel>
                <Panel title="Order status" detail={`${count(s.totalOrders)} orders across all time · fulfilment status`}>
                    {data.orderStatuses.length ? <MetricList rows={data.orderStatuses.map(row => [row.status, count(row.count)])} /> : <Empty>No orders recorded yet.</Empty>}
                </Panel>
                <Panel title="AI assistant today" detail={`UTC day ${data.aiToday.day} · recorded usage, not estimated visitors`}>
                    <MetricList rows={[
                        ['Shopper messages', count(data.aiToday.messages)], ['Model API calls', count(data.aiToday.requests)], ['Estimated spend (USD)', `$${data.aiToday.estimatedCostUsd.toFixed(4)}`],
                        ['Empty searches / searches', `${data.aiToday.emptySearches} / ${data.aiToday.searches}`], ['Blocked messages', count(data.aiToday.blockedMessages)],
                    ]} />
                    <p className="mt-4 text-xs leading-relaxed text-stone-500">Spend uses configured model rates, not your provider invoice. Usage counters may take a moment to be written.</p>
                </Panel>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
                <Panel title="Latest orders" detail="Five most recently placed orders · payment and fulfilment shown separately">
                    {data.recentOrders.length ? <ul className="divide-y divide-stone-100">{data.recentOrders.map(order => <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                        <div><p className="text-sm font-semibold text-stone-800">{order.orderId}</p><p className="mt-1 text-xs text-stone-500">{time(order.date)} IST</p></div>
                        <div className="text-right"><p className="text-sm font-semibold tabular-nums">{money(order.amount)}</p><p className="mt-1 text-[10px] text-stone-500">{order.status} · {order.paymentStatus}</p></div>
                    </li>)}</ul> : <Empty>No orders recorded yet.</Empty>}
                    <Link href="/admin?page=orders-all" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#8a703c]">Manage orders <ArrowUpRight size={13} /></Link>
                </Panel>
                <Panel title="Catalogue composition" detail={`${count(s.activeProducts)} active variants · ${count(s.totalCustomers)} customer accounts · ${money(s.totalRevenue)} lifetime eligible paid revenue`}>
                    {data.categoryDistribution.length ? <ul className="space-y-4">{data.categoryDistribution.map(row => <li key={row.name}>
                        <div className="mb-2 flex justify-between gap-4 text-sm"><span className="text-stone-600">{row.name}</span><span className="font-semibold tabular-nums">{count(row.value)}</span></div>
                        <div className="h-1.5 rounded-full bg-stone-100"><div className="h-full rounded-full bg-[#b79a62]" style={{ width: `${s.activeProducts ? row.value / s.activeProducts * 100 : 0}%` }} /></div>
                    </li>)}</ul> : <Empty>No active product variants.</Empty>}
                    <p className="mt-5 text-xs text-stone-500">Counts catalogue variants, not sales or unique styles.</p>
                </Panel>
            </div>
        </>}
    </div>;
}
