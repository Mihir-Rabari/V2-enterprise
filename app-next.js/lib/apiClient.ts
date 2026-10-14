/**
 * client-only module
 *
 * This module is only safe to import from client components / browser event
 * handlers. It attaches a JWT from localStorage to every request and clears
 * session keys on 401 responses, so it must never be evaluated during a
 * server-side render pass. Server Components should not import anything
 * from this file.
 *
 * Ported from frontend/lib/apiClient.ts (Vite → Next.js):
 *  - import.meta.env.VITE_API_URL          → process.env.NEXT_PUBLIC_API_URL
 *  - import.meta.env.VITE_USE_MOCK_API     → process.env.NEXT_PUBLIC_USE_MOCK_API
 *  - resolveLocalAssetUrl no longer consults import.meta.env.DEV; it is now
 *    env-driven (derives the backend origin from NEXT_PUBLIC_API_URL, falling
 *    back to the localhost heuristic, then to a relative path in production).
 * All API modules, including the server-priced paymentsAPI contract and
 * adminAPI.getProducts (/admin/products), are kept exactly as-is.
 */

import axios from 'axios';
// No initialData imports needed for a 100% dynamic model

// Mock Responses
const mockResponse = (data: any) => Promise.resolve({ data: { success: true, data } });

// ─── Base Config ─────────────────────────────────────────────────────────────

// In production, Express serves both frontend and backend from the same origin,
// so we use a relative path (/api/v1) — no CORS ever triggered.
// In development, fall back to localhost:5000 where the backend runs separately.
const IS_LOCALHOST = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168.'));

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ||
    (IS_LOCALHOST ? 'http://localhost:5000/api/v1' : '/api/v1');

const IS_MOCK_ENV = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

// Only allow mock mode on localhost to prevent production from accidentally showing mock data
export const IS_MOCK = IS_MOCK_ENV && IS_LOCALHOST;

if (typeof window !== 'undefined') {
    console.log(`[V2-API] Base URL: ${BASE_URL} | Mock Mode: ${IS_MOCK ? 'ENABLED' : 'DISABLED'}`);
}

/**
 * Resolves a local asset path (e.g. /videos/f.mp4) to a full URL when the
 * backend runs on a separate origin (development), or keeps it relative when
 * frontend and API are served from the same origin (production).
 *
 * Env-driven replacement for the Vite `import.meta.env.DEV` check: we derive
 * the backend origin from NEXT_PUBLIC_API_URL when it is set, otherwise fall
 * back to the localhost heuristic (dev without explicit env) and finally to
 * a relative path (same-origin production).
 */
export const resolveLocalAssetUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path; // Already full URL

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const rootUrl = apiUrl
        ? apiUrl.replace(/\/api\/v\d+\/?$/, '') // e.g. http://localhost:5000/api/v1 → http://localhost:5000
        : (IS_LOCALHOST ? 'http://localhost:5000' : '');
    return `${rootUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000, // 120 seconds per user request
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
            return mockResponse({ user: { id: 999, email: data.email }, token: 'mock-jwt-token', message: 'Mock login successful' });
        }
        return api.post('/auth/login', data);
    },

    getMe: () =>
        IS_MOCK
            ? mockResponse(null)
            : api.get('/auth/me'),

    updateMe: (data: { name?: string; firstName?: string; lastName?: string; phone?: string }) =>
        IS_MOCK
            ? mockResponse({ id: 999, ...data })
            : api.patch('/auth/me', data),

    forgotPassword: (email: string) =>
        api.post('/auth/forgot-password', { email }),

    resetPassword: (token: string, password: string) =>
        api.post(`/auth/reset-password/${token}`, { password }),
};

export const productsAPI = {
    // string[] params (mainCategories/subCategories) were already passed here at
    // runtime by ShopView's fetchParams — the declared type just didn't allow them.
    getAll: (params?: Record<string, string | number | boolean | string[]>) =>
        IS_MOCK
            ? mockResponse({ products: [] })
            : api.get('/products', { params }),

    getById: (id: string | number) =>
        IS_MOCK
            ? mockResponse(null)
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
            ? mockResponse([])
            : api.get('/orders/my'),

    // Admin
    getAll: (params?: Record<string, number>) =>
        IS_MOCK
            ? mockResponse({ orders: [] })
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
            ? mockResponse([])
            : api.get(`/reviews/product/${productId}`),

    getHomepage: () =>
        IS_MOCK
            ? mockResponse([])
            : api.get('/reviews/homepage'),

    submit: (data: any) =>
        IS_MOCK
            ? mockResponse({ id: 999, ...data })
            : api.post('/reviews', data),

    // Admin
    getAll: () =>
        IS_MOCK
            ? mockResponse([])
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
            ? mockResponse([])
            : api.get('/sliders/hero'),
    getPromotional: () =>
        IS_MOCK
            ? mockResponse([])
            : api.get('/sliders/promotional'),
    getMarquee: () =>
        IS_MOCK
            ? mockResponse([])
            : api.get('/content/MARQUEE'),

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
            ? mockResponse({})
            : api.get('/settings'),

    update: (data: Record<string, unknown>) =>
        IS_MOCK
            ? mockResponse({ ...data })
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
            ? mockResponse([])
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

    /** Admin catalog listing (includes inactive). Public `/products` ignores `status`. */
    getProducts: (params?: Record<string, string | number | boolean>) =>
        IS_MOCK
            ? mockResponse({ products: [] })
            : api.get('/admin/products', { params }),

    getCustomers: (params?: Record<string, number>) =>
        IS_MOCK
            ? mockResponse([])
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

    uploadLocalVideo: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/admin/upload-video', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    uploadSliderMedia: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/admin/upload-slider-media', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
};

export const categoriesAPI = {
    getAll: () =>
        IS_MOCK
            ? mockResponse([])
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
    /** The server prices the cart itself; the client never supplies the payable amount. */
    createRazorpayOrder: (data: { items: { productId: string | number; quantity: number; size?: string; color?: string }[]; couponCode?: string }) =>
        IS_MOCK
            ? mockResponse({ id: 'order_mock_' + Date.now(), amount: 0 })
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
            ? mockResponse({ fabric: [], size: [], collar: [], patternType: [], neck: [], sleeve: [], chest: [], length: [], pocket: [], shoulder: [], sleeveLength: [], waist: [], color: [], customAttributes: {} })
            : api.get('/filters/suggestions'),
};

export const attributesAPI = {
    getAll: () =>
        IS_MOCK
            ? mockResponse([])
            : api.get('/attributes'),

    getAllAdmin: () =>
        IS_MOCK
            ? mockResponse([])
            : api.get('/attributes/all'),

    create: (data: { name: string; isActive?: boolean }) =>
        IS_MOCK
            ? mockResponse({ id: Date.now(), ...data, key: data.name.toLowerCase().replace(/\s+/g, '_') })
            : api.post('/attributes', data),

    update: (id: string, data: { name?: string; isActive?: boolean }) =>
        IS_MOCK
            ? mockResponse({ id, ...data })
            : api.patch(`/attributes/${id}`, data),

    delete: (id: string) =>
        IS_MOCK
            ? mockResponse(null)
            : api.delete(`/attributes/${id}`),
};
