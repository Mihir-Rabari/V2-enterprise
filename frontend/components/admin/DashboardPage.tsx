import React, { useState, useEffect } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis,
    Tooltip, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Eye, Package, ShoppingCart, Users, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardPageProps {
    apiStats: any;
    apiContacts: any[];
}

const CHART_COLORS = ['#000000', '#D4AF37', '#6B7280', '#E5E7EB'];

const DashboardPage: React.FC<DashboardPageProps> = ({ apiStats, apiContacts }) => {
    const navigate = useNavigate();
    const [chartsMounted, setChartsMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setChartsMounted(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const revenueData = apiStats?.monthlyRevenue?.map((m: any) => ({
        name: m.month,
        revenue: m.revenue,
    })) || [
            { name: 'Jan', revenue: 0 },
            { name: 'Feb', revenue: 0 },
            { name: 'Mar', revenue: 0 },
        ];

    const categoryData = apiStats?.categoryDistribution || [];
    const customerData = apiStats?.customerPulse?.map((p: any) => ({
        name: p.date,
        count: p.orders
    })) || [];

    const statCards = [
        {
            label: 'Total Revenue',
            value: apiStats?.stats?.totalRevenue ? `₹${apiStats.stats.totalRevenue.toLocaleString()}` : '₹0',
            change: apiStats?.stats?.growthTrend === 'UP' ? `+${apiStats.stats.salesGrowth}%` : apiStats?.stats?.growthTrend === 'DOWN' ? `-${apiStats.stats.salesGrowth}%` : '0%',
            trend: apiStats?.stats?.growthTrend || 'STABLE',
            icon: ShoppingCart
        },
        {
            label: 'Sales Growth',
            value: apiStats?.stats?.salesGrowth ? `${apiStats.stats.salesGrowth}%` : '0%',
            change: 'Live',
            trend: 'STABLE',
            icon: Package
        },
        {
            label: 'New Customers',
            value: apiStats?.stats?.newCustomers ?? 0,
            change: 'Last 30d',
            trend: (apiStats?.stats?.newCustomers ?? 0) > 0 ? 'UP' : 'STABLE',
            icon: Users
        },
        {
            label: 'Inquiry Inbox',
            value: apiStats?.stats?.unreadMessages ?? (apiContacts.filter((c: any) => c.status === 'UNREAD').length),
            change: 'Unread',
            trend: (apiStats?.stats?.unreadMessages ?? 0) > 0 ? 'DOWN' : 'STABLE',
            icon: Mail
        },
    ];

    return (
        <div className="space-y-12 animate-fade-in pb-12">
            {/* Hero Welcome */}
            <div className="relative bg-luxury-black rounded-3xl p-12 overflow-hidden shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <span className="text-luxury-gold text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] block">Master Control</span>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif italic text-white tracking-tighter">Welcome back, Admin.</h2>
                        <p className="text-gray-400 max-w-md mx-auto md:mx-0 text-xs sm:text-sm">Your store is currently live and the collection is performing exceptionally well.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                        <button onClick={() => navigate('/')} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[11px] sm:text-sm font-bold transition-all flex items-center justify-center gap-2 backdrop-blur-md">
                            <Eye size={16} /> View Live Site
                        </button>
                    </div>
                </div>
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-luxury-gold/10 rounded-full blur-[100px]" />
                <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-[80px]" />
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-gray-50 rounded-xl text-luxury-black">
                                {/* @ts-ignore */}
                                <stat.icon size={20} strokeWidth={1.5} />
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${stat.trend === 'UP' ? 'bg-green-50 text-green-500' :
                                stat.trend === 'DOWN' ? 'bg-red-50 text-red-500' :
                                    'bg-gray-50 text-gray-400'
                                }`}>
                                {stat.change}
                            </span>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
                        <h4 className="text-2xl font-bold text-slate-800 tracking-tight">{stat.value}</h4>
                    </div>
                ))}
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-12">
                {/* Revenue Area Chart */}
                <div className="bg-white p-4 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6 sm:mb-8">
                        <div>
                            <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-widest">Revenue Performance</h3>
                            <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Last 6 Months</p>
                        </div>
                    </div>
                    <div className="h-[250px] sm:h-[300px] w-full">
                        {chartsMounted && (
                            <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 600 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 600 }} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="space-y-6 sm:space-y-8">
                    {/* Category Balance */}
                    <div className="bg-white p-4 sm:p-8 rounded-3xl border border-gray-100 shadow-sm h-auto lg:h-[calc(50%-1rem)]">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-widest">Category Balance</h3>
                        </div>
                        <div className="h-[200px] sm:h-[250px] w-full flex items-center">
                            {chartsMounted && (
                                <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                                    <PieChart>
                                        <Pie data={categoryData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                            {categoryData.map((_entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Customer Pulse */}
                    <div className="bg-luxury-black p-4 sm:p-8 rounded-3xl shadow-xl h-auto lg:h-[calc(50%-1rem)]">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-widest">Customer Pulse</h3>
                        </div>
                        <div className="h-[200px] sm:h-[250px] w-full">
                            {chartsMounted && (
                                <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                                    <LineChart data={customerData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6B7280', fontWeight: 600 }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                                        <Line type="stepAfter" dataKey="count" stroke="#D4AF37" strokeWidth={3} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
