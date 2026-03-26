import express from 'express';
import cors from 'cors';
import path from 'path';
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
import fs from 'fs';

const app = express();

// ── Ensure Persistent Upload Directories Exist ──────────────────────────────
const uploadDirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/videos'),
    path.join(__dirname, '../uploads/sliders'),
];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

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
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

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

// ── Serve Videos Locally (Persistent) ────────────────────────────────────────
// This ensures /videos/filename.mp4 works in both dev and prod
app.use('/videos', express.static(path.join(__dirname, '../uploads/videos'), {
    maxAge: '1y',
    immutable: true
}));

app.use('/sliders', express.static(path.join(__dirname, '../uploads/sliders'), {
    maxAge: '1y',
    immutable: true
}));

// ── API 404 Handler ──────────────────────────────────────────────────────────
app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'API Route not found' });
});

// ── Serve Frontend (Production) ──────────────────────────────────────────────
// ── Serve Frontend (Production) ──────────────────────────────────────────────
if (env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../public');
    
    // 1. Immutable caching for hashed assets (Vite specific)
    app.use('/assets', express.static(path.join(frontendPath, 'assets'), {
        maxAge: '1y',
        immutable: true,
        fallthrough: true // Allow for clean 404s or error handling
    }));

    // Specific 404 for missing assets to avoid SPA fallback for .js/.css
    app.use('/assets', (_req, res) => {
        res.status(404).json({ success: false, message: 'Asset not found' });
    });

    // 2. Standard caching for other static files (icons, logos, etc.)
    app.use(express.static(frontendPath, {
        maxAge: '1d', // 1 day for non-hashed assets
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                // NEVER cache index.html to ensure users get latest JS bundle references
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            }
        }
    }));

    // SPA fallback — all non-API routes serve index.html
    app.get('*', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
} else {
    // ── Global 404 Handler (Development) ─────────────────────────────────────
    app.use((_req, res) => {
        res.status(404).json({ success: false, message: 'Route not found' });
    });
}


// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
