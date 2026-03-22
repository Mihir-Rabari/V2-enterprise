import axios from 'axios';
import {
    initialProducts, initialOrders, initialReviews,
    initialMainCategories, initialSubCategories, initialCustomers,
    initialContacts, initialSiteSettings
} from '../data/initialData';

const mockResponse = (data: any) => Promise.resolve({ data: { success: true, data } });

// ─── Base Config ─────────────────────────────────────────────────────────────

// In production, Express serves both frontend and backend from the same origin,
// so we use a relative path (/api/v1) — no CORS ever triggered.
// In development, fall back to localhost:5000 where the backend runs separately.
const BASE_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5000/api/v1' : '/api/v1');
const IS_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';

export const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
});

// ─── Request Interceptor: Attach JWT ─────────────────────────────────────────

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('v2_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ─── Response Interceptor: Handle 401 ────────────────────────────────────────

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid — clear session
            localStorage.removeItem('v2_token');
            localStorage.removeItem('v2_user');
            localStorage.removeItem('v2_admin_session');
            // Do not redirect globally anymore; let individual protected pages handle it
        }
        return Promise.reject(error);
    }
);

// ─── API Modules ──────────────────────────────────────────────────────────────

export const authAPI = {
    register: (data: { name: string; email: string; password: string; phone?: string; adminCode?: string }) =>
        IS_MOCK
            ? mockResponse({ user: { id: 999, ...data, role: data.adminCode ? 'ADMIN' : 'CUSTOMER' }, token: 'mock-jwt-token' })
            : api.post('/auth/register', data),

    login: (data: { email: string; password: string }) => {
        if (IS_MOCK) {
            const user = initialCustomers.find(c => c.email === data.email);
            if (user) {
                return mockResponse({ user, token: 'mock-jwt-token', message: 'Mock login successful' });
            }
            return Promise.reject({ response: { data: { message: 'Invalid credentials' }, status: 401 } });
        }
        return api.post('/auth/login', data);
    },

    getMe: () =>
        IS_MOCK
            ? mockResponse(initialCustomers[0])
            : api.get('/auth/me'),

    updateMe: (data: { name?: string; firstName?: string; lastName?: string; phone?: string }) =>
        IS_MOCK
            ? mockResponse({ ...initialCustomers[0], ...data })
            : api.patch('/auth/me', data),

    forgotPassword: (email: string) =>
        api.post('/auth/forgot-password', { email }),

    resetPassword: (token: string, password: string) =>
        api.post(`/auth/reset-password/${token}`, { password }),
};

export const productsAPI = {
    getAll: (params?: Record<string, string | number | boolean>) =>
        IS_MOCK
            ? mockResponse({ products: initialProducts })
            : api.get('/products', { params }),

    getById: (id: string | number) =>
        IS_MOCK
            ? mockResponse(initialProducts.find(p => p.id === id))
            : api.get(`/products/${id}`),

    create: (data: FormData | Record<string, unknown>) =>
        IS_MOCK
            ? mockResponse({ id: 999 })
            : api.post('/products', data, {
                headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
            }),

    update: (id: string | number, data: Record<string, unknown> | FormData) =>
        IS_MOCK
            ? mockResponse({ id })
            : api.patch(`/products/${id}`, data, {
                headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
            }),

    delete: (id: string | number) =>
        IS_MOCK
            ? mockResponse(null)
            : api.delete(`/products/${id}`),
};

export const ordersAPI = {
    place: (data: any) =>
        IS_MOCK
            ? mockResponse({ orderId: '#V2-MOCK-123' })
            : api.post('/orders', data),

    getMyOrders: () =>
        IS_MOCK
            ? mockResponse(initialOrders)
            : api.get('/orders/my'),

    // Admin
    getAll: (params?: Record<string, number>) =>
        IS_MOCK
            ? mockResponse({ orders: initialOrders })
            : api.get('/orders', { params }),

    update: (id: string | number, data: any) =>
        IS_MOCK
            ? mockResponse({ id, ...data })
            : api.patch(`/orders/${id}/status`, data),

    delete: (id: string | number) =>
        IS_MOCK
            ? mockResponse(null)
            : api.delete(`/orders/${id}`),
};

export const reviewsAPI = {
    getForProduct: (productId: string | number) =>
        IS_MOCK
            ? mockResponse(initialReviews.filter(r => r.productId === productId))
            : api.get(`/reviews/product/${productId}`),

    getHomepage: () =>
        IS_MOCK
            ? mockResponse(initialReviews.filter(r => r.homepageVisible))
            : api.get('/reviews/homepage'),

    submit: (data: any) =>
        IS_MOCK
            ? mockResponse({ id: 999, ...data })
            : api.post('/reviews', data),

    // Admin
    getAll: () =>
        IS_MOCK
            ? mockResponse(initialReviews)
            : api.get('/reviews'),

    update: (id: string | number, data: Record<string, unknown>) =>
        IS_MOCK
            ? mockResponse({ id })
            : api.patch(`/reviews/${id}`, data),

    delete: (id: string | number) =>
        IS_MOCK
            ? mockResponse(null)
            : api.delete(`/reviews/${id}`),
};

export const sliderAPI = {
    getHero: () =>
        IS_MOCK
            ? mockResponse([{ id: 1, image: 'https://via.placeholder.com/1920x600/FF5733/FFFFFF?text=Hero+Slide+1', title: 'Mock Hero Slide 1', subtitle: 'Amazing products await!', link: '/products' }])
            : api.get('/sliders/hero'),
    getPromotional: () =>
        IS_MOCK
            ? mockResponse([{ id: 1, image: 'https://via.placeholder.com/800x400/33FF57/FFFFFF?text=Promo+Slide+1', title: 'Mock Promo Slide 1', link: '/products' }])
            : api.get('/sliders/promotional'),
    getMarquee: () => contentAPI.getByType('MARQUEE'),

    // Admin
    createHero: (data: any) => api.post('/sliders/hero', data),
    updateHero: (id: string | number, data: any) => api.patch(`/sliders/hero/${id}`, data),
    deleteHero: (id: string | number) => api.delete(`/sliders/hero/${id}`),
    createPromo: (data: any) => api.post('/sliders/promotional', data),
    updatePromo: (id: string | number, data: any) => api.patch(`/sliders/promotional/${id}`, data),
    deletePromo: (id: string | number) => api.delete(`/sliders/promotional/${id}`),
};

export const contentAPI = {
    getByType: (type: string) => api.get(`/content/${type}`),
    getAdminByType: (type: string) => api.get(`/content/admin/${type}`),
    create: (data: any) => api.post('/content', data),
    update: (id: string | number, data: any) => api.patch(`/content/${id}`, data),
    delete: (id: string | number) => api.delete(`/content/${id}`),
};

export const settingsAPI = {
    get: () =>
        IS_MOCK
            ? mockResponse(initialSiteSettings)
            : api.get('/settings'),

    update: (data: Record<string, unknown>) =>
        IS_MOCK
            ? mockResponse({ ...initialSiteSettings, ...data })
            : api.patch('/settings', data),
};

export const contactsAPI = {
    submit: (data: { name: string; email: string; message: string }) =>
        IS_MOCK
            ? mockResponse({ id: 999, ...data })
            : api.post('/contacts', data),

    // Admin
    getAll: () =>
        IS_MOCK
            ? mockResponse(initialContacts)
            : api.get('/contacts'),

    markRead: (id: string | number, data: any) =>
        IS_MOCK
            ? mockResponse({ id, ...data })
            : api.patch(`/contacts/${id}`, data),
};

export const adminAPI = {
    getStats: () =>
        IS_MOCK
            ? mockResponse({ revenue: 50000, orders: 12, customers: 5 })
            : api.get('/admin/stats'),

    getCustomers: (params?: Record<string, number>) =>
        IS_MOCK
            ? mockResponse(initialCustomers)
            : api.get('/admin/customers', { params }),

    uploadImage: (file: File) => {
        if (IS_MOCK) return mockResponse({ url: 'https://via.placeholder.com/150' });
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/admin/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    getMedia: (params?: Record<string, string | number>) =>
        IS_MOCK
            ? mockResponse({ media: [] })
            : api.get('/admin/media', { params }),
};

export const categoriesAPI = {
    getAll: () =>
        IS_MOCK
            ? mockResponse([...initialMainCategories, ...initialSubCategories])
            : api.get('/categories'),

    create: (data: { name: string; slug: string; parentId?: number }) =>
        IS_MOCK
            ? mockResponse({ id: 999, ...data })
            : api.post('/categories', data),

    update: (id: string | number, data: Record<string, unknown>) =>
        IS_MOCK
            ? mockResponse({ id })
            : api.patch(`/categories/${id}`, data),

    delete: (id: string | number) =>
        IS_MOCK
            ? mockResponse(null)
            : api.delete(`/categories/${id}`),
};

export const wishlistAPI = {
    get: () =>
        IS_MOCK
            ? mockResponse([])
            : api.get('/wishlist'),

    add: (productId: string | number) =>
        IS_MOCK
            ? mockResponse([productId])
            : api.post('/wishlist', { productId }),

    remove: (productId: string | number) =>
        IS_MOCK
            ? mockResponse([])
            : api.delete(`/wishlist/${productId}`),
};

export const paymentsAPI = {
    createRazorpayOrder: (data: { amount: number; receipt?: string }) =>
        IS_MOCK
            ? mockResponse({ id: 'order_mock_' + Date.now(), amount: data.amount * 100 })
            : api.post('/payments/create-order', data),
};

export const addressesAPI = {
    add: (data: any) =>
        IS_MOCK
            ? mockResponse({ id: Date.now(), ...data })
            : api.post('/addresses', data),

    update: (id: string | number, data: any) =>
        IS_MOCK
            ? mockResponse({ id, ...data })
            : api.patch(`/addresses/${id}`, data),

    remove: (id: string | number) =>
        IS_MOCK
            ? mockResponse(null)
            : api.delete(`/addresses/${id}`),

    setDefault: (id: string | number) =>
        IS_MOCK
            ? mockResponse({ success: true })
            : api.patch(`/addresses/${id}/default`),
};

// --- NEW FILTERS API ---
export const filtersAPI = {
    getSuggestions: () =>
        IS_MOCK
            ? mockResponse({ fabric: [], size: [], collar: [], patternType: [], neck: [], sleeve: [], chest: [], length: [], pocket: [], shoulder: [], sleeveLength: [], waist: [], color: [] })
            : api.get('/filters/suggestions'),
};
