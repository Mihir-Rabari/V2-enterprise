import { Router, Request, Response } from 'express';
import path from 'path';
import { Product } from '../../models/Product';
import { Order } from '../../models/Order';
import { User } from '../../models/User';
import { ContactMessage } from '../../models/ContactMessage';
import { Media } from '../../models/Media';
import { sendSuccess, sendError } from '../../utils/response';
import { protect } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/admin.middleware';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';
import { env } from '../../config/env';
import fs from 'fs';
import { getAdminProducts, getAdminProduct } from '../products/products.controller';
import { uploadToR2, listR2Objects, isR2Configured } from '../../utils/r2';

const router = Router();

// Admin product reads include inactive products: never cacheable by browsers' shared/CDN caches.
// Set before auth so 401/403 responses are not cacheable either.
router.use('/products', (_req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
});
router.get('/products', protect, adminOnly, getAdminProducts);
router.get('/products/:id', protect, adminOnly, getAdminProduct);

// Standard Disk Storage for all Admin Uploads (Temporary before R2)
const tempStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const dest = path.join(__dirname, '../../../uploads/v2-temp');
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (_req, file, cb) => {
        cb(null, `temp-upload-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
    }
});

const upload = multer({ 
    storage: tempStorage, 
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

// Admin: get dashboard stats
router.get('/stats', protect, adminOnly, async (_req: Request, res: Response) => {
    try {
        const [totalProducts, totalOrders, totalUsers, revenueResult, recentOrders, pendingOrders, unreadMessages] = await Promise.all([
            Product.countDocuments(),
            Order.countDocuments(),
            User.countDocuments({ role: 'CUSTOMER' }),
            Order.aggregate([
                { $match: { status: 'DELIVERED' } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            Order.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('userId', 'name email'),
            Order.countDocuments({ status: 'PENDING' }),
            ContactMessage.countDocuments({ status: 'UNREAD' }),
        ]);

        // ── Growth & Metrics Calculations ─────────────────────────────────────
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [thisMonthRevenue, lastMonthRevenue, newCustomersCount] = await Promise.all([
            Order.aggregate([
                { $match: { status: 'DELIVERED', createdAt: { $gte: startOfThisMonth } } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]),
            Order.aggregate([
                { $match: { status: 'DELIVERED', createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]),
            User.countDocuments({ role: 'CUSTOMER', createdAt: { $gte: thirtyDaysAgo } })
        ]);

        const currentRev = thisMonthRevenue[0]?.total || 0;
        const prevRev = lastMonthRevenue[0]?.total || 0;
        let salesGrowth = 0;
        let growthTrend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';

        if (prevRev > 0) {
            salesGrowth = ((currentRev - prevRev) / prevRev) * 100;
            growthTrend = salesGrowth > 0 ? 'UP' : salesGrowth < 0 ? 'DOWN' : 'STABLE';
        } else if (currentRev > 0) {
            salesGrowth = 100;
            growthTrend = 'UP';
        }

        // ── Monthly Revenue (Last 6 months) ───────────────────────────────────
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const monthlyRevenueRaw = await Order.aggregate([
            {
                $match: {
                    status: 'DELIVERED',
                    createdAt: { $gte: sixMonthsAgo },
                },
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' },
                    },
                    revenue: { $sum: '$total' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        // ── Category Distribution ─────────────────────────────────────────────
        const categoryDistribution = await Product.aggregate([
            {
                $group: {
                    _id: '$mainCategory',
                    count: { $sum: 1 },
                },
            },
            { $project: { name: '$_id', value: '$count', _id: 0 } },
        ]);

        // ── Customer Pulse (Daily orders last 7 days) ─────────────────────────
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const customerPulseRaw = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            { $project: { date: '$_id', orders: 1, _id: 0 } },
        ]);

        // Format dates for Customer Pulse (ensure every day has a record)
        const pulseMap = new Map();
        customerPulseRaw.forEach(p => pulseMap.set(p.date, p.orders));
        const customerPulse = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];
            customerPulse.push({
                date: d.toLocaleDateString('default', { weekday: 'short' }),
                orders: pulseMap.get(dateStr) || 0
            });
        }

        return sendSuccess(res, {
            stats: {
                totalProducts,
                totalOrders,
                totalCustomers: totalUsers,
                totalRevenue: revenueResult[0]?.total || 0,
                pendingOrders,
                unreadMessages,
                salesGrowth: Math.abs(salesGrowth).toFixed(1),
                growthTrend,
                newCustomers: newCustomersCount,
            },
            monthlyRevenue: monthlyRevenueRaw.map((m) => ({
                month: new Date(2000, m._id.month - 1).toLocaleString('default', { month: 'short' }),
                revenue: m.revenue,
            })),
            categoryDistribution,
            customerPulse,
            recentOrders: recentOrders.map((order) => ({
                id: (order._id as any).toString(),
                orderId: order.orderId,
                customer: (order.userId as any)?.name || 'Guest',
                amount: order.total,
                status: order.status,
                date: order.createdAt,
            })),
        });
    } catch (err: unknown) {
        console.error('Stats error:', err);
        return sendError(res, (err as Error).message);
    }
});

// Admin: get all customers
router.get('/customers', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [customers, total] = await Promise.all([
            User.find({ role: 'CUSTOMER' })
                .select('name email phone createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments({ role: 'CUSTOMER' })
        ]);

        const usersWithId = customers.map(c => ({ ...c.toObject(), id: c._id.toString() }));
        return sendSuccess(res, { users: usersWithId, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err: unknown) { return sendError(res, (err as Error).message); }
});

// Admin: get all media from R2
router.get('/media', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const path = (req.query.path as string) || '/';
        const limit = parseInt(req.query.limit as string) || 100;
        const cursor = req.query.cursor as string | undefined;

        if (!isR2Configured()) {
            return sendError(res, 'Cloudflare R2 is not fully configured', 500);
        }

        const prefix = path === '/' ? '' : path.replace(/^\/+/, '');
        
        let allMedia: any[] = [];
        let allFolders: string[] = [];

        const listResult = await listR2Objects(prefix, limit, cursor);
        
        allMedia = listResult.media;
        allFolders = listResult.folders;

        return sendSuccess(res, {
            media: allMedia,
            folders: allFolders,
            currentPath: listResult.currentPath,
            total: listResult.total,
            nextCursor: listResult.nextContinuationToken
        });
    } catch (err: any) {
        const msg = err?.message || 'Failed to fetch media library from R2';
        console.error('❌ R2 list error:', msg);
        return sendError(res, msg);
    }
});

// Admin: Upload to R2 (replaces proxy to ImageKit)
router.post('/upload', protect, adminOnly, upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) return sendError(res, 'No file provided.', 400);

        const folder = (req.body.folder as string) || 'products';
        const fileContent = fs.readFileSync(req.file.path);

        // Upload to R2
        const r2Response = await uploadToR2(
            fileContent,
            folder,
            req.file.originalname,
            req.file.mimetype
        );

        // Delete temporary file
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Failed to delete temp file:', err);
        });

        // Save to Media collection
        const newMedia = await Media.create({
            url: r2Response.url,
            fileId: r2Response.fileId,
            name: r2Response.name,
            size: req.file.size,
            mimeType: req.file.mimetype,
            folder: r2Response.folder,
        });

        return sendSuccess(res, {
            url: r2Response.url,
            fileId: r2Response.fileId,
            name: r2Response.name,
            id: newMedia._id.toString(),
        }, 'File uploaded to R2 and saved to library');
    } catch (err: any) {
        const msg = err?.message || 'Upload failed';
        console.error('R2 upload error:', msg);
        return sendError(res, msg, 500);
    }
});

// Admin: Legacy Local video upload (now mapped to R2 'products' by default)
router.post('/upload-video', protect, adminOnly, upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) return sendError(res, 'No video file provided.', 400);

        const fileContent = fs.readFileSync(req.file.path);
        
        // Upload to R2 under products/
        const r2Response = await uploadToR2(
            fileContent,
            'products',
            req.file.originalname,
            req.file.mimetype
        );

        // Delete temporary file
        fs.unlink(req.file.path, () => {});

        // Save to Media library
        const newMedia = await Media.create({
            url: r2Response.url,
            fileId: r2Response.fileId,
            name: r2Response.name,
            size: req.file.size,
            mimeType: req.file.mimetype,
            folder: r2Response.folder,
        });

        return sendSuccess(res, {
            url: r2Response.url,
            name: r2Response.name,
            filename: r2Response.name
        }, 'Video uploaded to R2 successfully');

    } catch (err: any) {
        console.error('Video upload error:', err.message);
        return sendError(res, err.message, 500);
    }
});

// Dedicated route for Slider Media (now mapped to R2 'sliders')
router.post('/upload-slider-media', protect, adminOnly, upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) return sendError(res, 'No file uploaded', 400);
        
        const fileContent = fs.readFileSync(req.file.path);
        
        // Upload to R2 under sliders/
        const r2Response = await uploadToR2(
            fileContent,
            'sliders',
            req.file.originalname,
            req.file.mimetype
        );

        // Delete temporary file
        fs.unlink(req.file.path, () => {});

        // Save to Media library
        await Media.create({
            url: r2Response.url,
            fileId: r2Response.fileId,
            name: r2Response.name,
            size: req.file.size,
            mimeType: req.file.mimetype,
            folder: r2Response.folder,
        });

        return sendSuccess(res, {
            url: r2Response.url,
            name: r2Response.name,
            filename: r2Response.name
        }, 'Slider media uploaded to R2 successfully');
    } catch (error: any) {
        console.error('Slider media upload error:', error.message);
        return sendError(res, error.message, 500);
    }
});

export default router;
