import { useState, useEffect, useCallback } from 'react';
import {
    adminAPI, productsAPI, ordersAPI, reviewsAPI,
    contactsAPI, categoriesAPI, settingsAPI,
    sliderAPI, contentAPI
} from '../lib/apiClient';

// ─── Types (minimal, matches backend response shape) ─────────────────────────

export interface AdminStats {
    stats: {
        totalProducts: number;
        totalOrders: number;
        totalCustomers: number;
        totalRevenue: number;
        pendingOrders: number;
        unreadMessages: number;
        salesGrowth: string;
        growthTrend: 'UP' | 'DOWN' | 'STABLE';
        newCustomers: number;
    };
    monthlyRevenue: { month: string; revenue: number }[];
    categoryDistribution: { name: string; value: number }[];
    customerPulse: { date: string; orders: number }[];
    recentOrders: any[];
}

export interface AdminProduct {
    id: string | number; name: string; price: number; status: string;
    category?: { name: string }; stock: number; photo: string;
    isTrending: boolean; isFeatured: boolean;
    _id?: string;
}

export interface AdminOrder {
    id: string; userId: string; total: number; status: string;
    paymentMethod: string; createdAt: string;
    user?: { name: string; email: string };
    items: { productName: string; quantity: number; priceAtTime: number }[];
}

export interface AdminReview {
    id: string | number; rating: number; reviewText: string; status: string;
    createdAt: string;
    user?: { name: string }; product?: { name: string };
    _id?: string;
}

export interface AdminContact {
    id: string | number; name: string; email: string; message: string;
    status: string; createdAt: string;
    _id?: string;
}

export interface AdminCustomer {
    id: string; name: string; email: string; phone?: string;
    role: string; createdAt: string;
    _count?: { orders: number };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminData() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [reviews, setReviews] = useState<AdminReview[]>([]);
    const [contacts, setContacts] = useState<AdminContact[]>([]);
    const [customers, setCustomers] = useState<AdminCustomer[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pagination State
    const [productPagination, setProductPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [orderPagination, setOrderPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [customerPagination, setCustomerPagination] = useState({ page: 1, totalPages: 1, total: 0 });

    const fetchStats = useCallback(async () => {
        try {
            const res = await adminAPI.getStats();
            setStats(res.data.data);
        } catch (err) { console.error('Stats fetch error:', err); }
    }, []);

    const fetchProducts = useCallback(async (page = 1, limit = 10, search = '') => {
        setLoading(true);
        try {
            const res = await adminAPI.getProducts({ page, limit, status: 'ALL', ...(search ? { search } : {}) });
            setProducts(res.data.data.products);
            setProductPagination({
                page: res.data.data.page,
                totalPages: res.data.data.totalPages,
                total: res.data.data.total
            });
        } catch (err) { setError('Failed to load products'); }
        finally { setLoading(false); }
    }, []);

    const fetchOrders = useCallback(async (page = 1, limit = 10) => {
        setLoading(true);
        try {
            const res = await ordersAPI.getAll({ page, limit });
            setOrders(res.data.data.orders);
            setOrderPagination({
                page: res.data.data.page,
                totalPages: res.data.data.totalPages,
                total: res.data.data.total
            });
        } catch (err) { setError('Failed to load orders'); }
        finally { setLoading(false); }
    }, []);

    const fetchCustomers = useCallback(async (page = 1, limit = 10) => {
        setLoading(true);
        try {
            const res = await adminAPI.getCustomers({ page, limit } as any);
            setCustomers(res.data.data.users);
            setCustomerPagination({
                page: res.data.data.page,
                totalPages: res.data.data.totalPages,
                total: res.data.data.total
            });
        } catch (err) { setError('Failed to load customers'); }
        finally { setLoading(false); }
    }, []);

    const fetchAllBase = useCallback(async () => {
        setLoading(true);
        try {
            const [reviewsRes, contactsRes, categoriesRes] = await Promise.allSettled([
                reviewsAPI.getAll(),
                contactsAPI.getAll(),
                categoriesAPI.getAll(),
            ]);

            if (reviewsRes.status === 'fulfilled') setReviews(reviewsRes.value.data.data);
            if (contactsRes.status === 'fulfilled') setContacts(contactsRes.value.data.data);
            if (categoriesRes.status === 'fulfilled') setCategories(categoriesRes.value.data.data);

            await fetchStats();
        } catch (err) {
            setError('Failed to load base admin data');
        } finally {
            setLoading(false);
        }
    }, [fetchStats]);

    // Initial load: logic is now on dashboard instead of here
    // useEffect(() => { fetchAllBase(); }, [fetchAllBase]);

    // ─── Mutations ─────────────────────────────────────────────

    const deleteProduct = useCallback(async (id: string | number) => {
        await productsAPI.delete(id);
        setProducts(prev => prev.filter(p => p.id !== id && (p as any)._id !== id));
    }, []);

    const toggleProductField = useCallback(async (id: string | number, field: 'isTrending' | 'isFeatured', value: boolean) => {
        await productsAPI.update(id, { [field]: value });
        setProducts(prev => prev.map(p => (p.id === id || p._id === id) ? { ...p, [field]: value } : p));
    }, []);

    const updateOrderStatus = useCallback(async (id: string | number, updates: any) => {
        await ordersAPI.update(id as any, updates);
        setOrders(prev => prev.map(o => (o.id === id || (o as any)._id === id) ? { ...o, ...updates } : o));
    }, []);

    const deleteOrder = useCallback(async (id: string | number) => {
        await ordersAPI.delete(id as any);
        setOrders(prev => prev.filter(o => o.id !== id && (o as any)._id !== id));
    }, []);

    const updateReview = useCallback(async (id: string | number, data: Record<string, unknown>) => {
        await reviewsAPI.update(id as any, data);
        setReviews(prev => prev.map(r => (r.id === id || r._id === id) ? { ...r, ...data } : r));
    }, []);

    const deleteReview = useCallback(async (id: string | number) => {
        await reviewsAPI.delete(id as any);
        setReviews(prev => prev.filter(r => r.id !== id && r._id !== id));
    }, []);

    const markContactRead = useCallback(async (id: string | number) => {
        await contactsAPI.markRead(id as any, { status: 'READ' });
        setContacts(prev => prev.map(c => (c.id === id || c._id === id) ? { ...c, status: 'READ' } : c));
    }, []);

    // ─── Sliders ───────────────────────────────────────────
    const createHero = useCallback(async (data: any) => sliderAPI.createHero(data), []);
    const updateHero = useCallback(async (id: string | number, data: any) => sliderAPI.updateHero(id, data), []);
    const deleteHero = useCallback(async (id: string | number) => sliderAPI.deleteHero(id), []);

    const createPromo = useCallback(async (data: any) => sliderAPI.createPromo(data), []);
    const updatePromo = useCallback(async (id: string | number, data: any) => sliderAPI.updatePromo(id, data), []);
    const deletePromo = useCallback(async (id: string | number) => sliderAPI.deletePromo(id), []);

    // ─── Content (Taglines, Photos, etc) ──────────────────
    const createContent = useCallback(async (data: any) => contentAPI.create(data), []);
    const updateContent = useCallback(async (id: string | number, data: any) => contentAPI.update(id, data), []);
    const deleteContent = useCallback(async (id: string | number) => contentAPI.delete(id), []);

    const fetchContent = useCallback(async (type: string) => contentAPI.getAdminByType(type), []);

    return {
        stats, products, orders, reviews, contacts, customers, categories,
        loading, error,
        fetchStats, fetchProducts, fetchOrders, fetchCustomers, fetchAllBase,
        productPagination, orderPagination, customerPagination,
        deleteProduct, toggleProductField, updateOrderStatus, deleteOrder,
        updateReview, deleteReview, markContactRead,
        createHero, updateHero, deleteHero,
        createPromo, updatePromo, deletePromo,
        createContent, updateContent, deleteContent, fetchContent,
        setProducts, setOrders, setReviews, setContacts,
    };
}
