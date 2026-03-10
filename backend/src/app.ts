import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middlewares/error.middleware';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/products.routes';
import categoryRoutes from './modules/categories/categories.routes';
import orderRoutes from './modules/orders/orders.routes';
import reviewRoutes from './modules/reviews/reviews.routes';
import settingsRoutes from './modules/settings/settings.routes';
import contactRoutes from './modules/contacts/contacts.routes';
import adminRoutes from './modules/admin/admin.routes';
import sliderRoutes from './modules/settings/sliders.routes';
import contentRoutes from './modules/settings/content.routes';
import wishlistRoutes from './modules/wishlist/wishlist.routes';
import paymentRoutes from './modules/payments/payments.routes';
import addressRoutes from './modules/addresses/addresses.routes';
import { filtersRoutes } from './modules/filters/filters.routes';

const app = express();

// ── Core Middleware ──────────────────────────────────────────────────────────
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (env.FRONTEND_URL.indexOf(origin) !== -1 || env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────────────────────────────
const API = '/api/v1';

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/products`, productRoutes);
app.use(`${API}/categories`, categoryRoutes);
app.use(`${API}/orders`, orderRoutes);
app.use(`${API}/reviews`, reviewRoutes);
app.use(`${API}/settings`, settingsRoutes);
app.use(`${API}/contacts`, contactRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/sliders`, sliderRoutes);
app.use(`${API}/content`, contentRoutes);
app.use(`${API}/wishlist`, wishlistRoutes);
app.use(`${API}/payments`, paymentRoutes);
app.use(`${API}/addresses`, addressRoutes);
app.use(`${API}/filters`, filtersRoutes);

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
