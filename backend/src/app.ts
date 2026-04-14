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
import sitemapRoutes from './modules/sitemap/sitemap.routes';
import { Product } from './models/Product';
import { Category } from './models/Category';
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
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// ── SEO & Meta ───────────────────────────────────────────────────────────────
app.use('/', sitemapRoutes);

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

    // SPA fallback — all non-API routes serve index.html with dynamic meta injection for SEO
    app.get('*', async (req, res) => {
        try {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            const filePath = path.join(frontendPath, 'index.html');
            
            if (!fs.existsSync(filePath)) {
                return res.status(404).send('Frontend not built');
            }

            let html = fs.readFileSync(filePath, 'utf8');

            const BASE_URL = 'https://v2enterprise.in';
            const DEFAULT_LOGO = `${BASE_URL}/v2_logo.webp`;
            
            let meta = {
                title: 'V2 Enterprise — Premium Luxury Fashion',
                description: "Discover V2 Enterprise's exclusive collection of premium menswear and luxury fashion. Crafted with care in Bhavnagar, Gujarat.",
                image: DEFAULT_LOGO,
                url: `${BASE_URL}${req.path}`
            };

            // 1. Dynamic Product Meta
            if (req.path.startsWith('/product/')) {
                const parts = req.path.split('/');
                const productId = parts[2];
                if (productId && productId.length >= 12) { // Basic MongoID check
                    try {
                        const product = await Product.findById(productId);
                        if (product) {
                            meta.title = `${product.name} | V2 Enterprise`;
                            meta.description = product.description ? product.description.slice(0, 160) : meta.description;
                            meta.image = product.photo || DEFAULT_LOGO;
                        }
                    } catch (e) {
                         // Fallback to default if DB fails or ID invalid
                    }
                }
            } 
            // 2. Dynamic Category Meta
            else if (req.path.startsWith('/category/')) {
                const parts = req.path.split('/');
                const slug = decodeURIComponent(parts[2]);
                if (slug) {
                    try {
                        const category = await Category.findOne({ $or: [{ slug }, { name: slug }] });
                        if (category) {
                            meta.title = `${category.name} | V2 Enterprise`;
                            meta.description = category.description ? category.description.slice(0, 160) : `Shop the finest ${category.name} at V2 Enterprise.`;
                            meta.image = category.image || DEFAULT_LOGO;
                        }
                    } catch (e) {}
                }
            }

            // Inject Meta Tags into HTML
            html = html.replace(/<title>.*?<\/title>/g, `<title>${meta.title}</title>`);
            
            // Open Graph
            html = html.replace(/property="og:title" content=".*?"/g, `property="og:title" content="${meta.title}"`);
            html = html.replace(/property="og:description" content=".*?"/g, `property="og:description" content="${meta.description}"`);
            html = html.replace(/property="og:image" content=".*?"/g, `property="og:image" content="${meta.image}"`);
            html = html.replace(/property="og:url" content=".*?"/g, `property="og:url" content="${meta.url}"`);
            
            // Twitter
            html = html.replace(/name="twitter:title" content=".*?"/g, `name="twitter:title" content="${meta.title}"`);
            html = html.replace(/name="twitter:description" content=".*?"/g, `name="twitter:description" content="${meta.description}"`);
            html = html.replace(/name="twitter:image" content=".*?"/g, `name="twitter:image" content="${meta.image}"`);
            
            // Primary Description
            html = html.replace(/name="description" content=".*?"/g, `name="description" content="${meta.description}"`);

            res.send(html);
        } catch (error) {
            console.error('SPA Fallback Error:', error);
            res.status(500).send('Server Error');
        }
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
