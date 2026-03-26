import { Router, Request, Response } from 'express';
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

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ImageKit credentials from env
const IK_PRIVATE_KEY = env.IMAGEKIT_PRIVATE_KEY;
const IK_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';
const IK_LIST_URL = 'https://api.imagekit.io/v1/files';

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

// Admin: get all media from ImageKit directly
router.get('/media', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const path = (req.query.path as string) || '/';
        const searchQuery = (req.query.searchQuery as string) || '';
        const limit = parseInt(req.query.limit as string) || 100;
        const skip = parseInt(req.query.skip as string) || 0;

        if (!IK_PRIVATE_KEY) {
            console.warn('⚠️ IMAGEKIT_PRIVATE_KEY is missing in backend env');
            return sendError(res, 'ImageKit Private Key not configured', 500);
        }

        const maskedKey = IK_PRIVATE_KEY.substring(0, 8) + '...' + IK_PRIVATE_KEY.substring(IK_PRIVATE_KEY.length - 4);
        // console.log(`📡 Fetching Media assets (query: "${searchQuery}", path: "${path}") with key: ${maskedKey}`);

        const ikParams: any = { limit, skip };
        if (path && path !== '/') ikParams.path = path;
        if (searchQuery) ikParams.searchQuery = `name = "${searchQuery}"`;

        // 1. Fetch files
        const filesResponse = await axios.get(IK_LIST_URL, {
            params: ikParams,
            auth: {
                username: IK_PRIVATE_KEY as string,
                password: '',
            },
        });

        // 2. Fetch subfolders in this path (optional but better for UI)
        // Note: ImageKit API for folders is a bit different, let's just focus on files for now 
        // to get the core logic back, but we can infer folders from file paths if needed.
        // Actually, let's try to get subfolders if no search query is active
        let subfolders: string[] = [];
        if (!searchQuery) {
            try {
                // This is a guess on the endpoint structure based on common usage
                // If this fails, we just don't show folders
                const foldersRes = await axios.get('https://api.imagekit.io/v1/folders', {
                    params: { parentFolderPath: path },
                    auth: { username: IK_PRIVATE_KEY, password: '' }
                });
                subfolders = (foldersRes.data || []).map((f: any) => f.name);
            } catch (fErr) {
                console.warn('Could not fetch folders:', (fErr as Error).message);
            }
        }

        // console.log(`✅ ImageKit returned ${filesResponse.data.length} assets and ${subfolders.length} folders`);

        // Map ImageKit response to our frontend expected format
        const media = filesResponse.data.map((file: any) => ({
            id: file.fileId,
            url: file.url,
            thumbnailUrl: `${file.url}?tr=w-200,h-200,fo-auto`,
            name: file.name,
            size: file.size,
            mimeType: file.fileType,
            folder: file.filePath.split('/').slice(0, -1).join('/') || '/',
            createdAt: file.createdAt
        }));

        return sendSuccess(res, {
            media,
            folders: subfolders,
            currentPath: path,
            total: media.length
        });
    } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to fetch media library';
        console.error('❌ ImageKit list error:', msg);
        if (err.response) {
            console.error('Response details:', JSON.stringify(err.response.data));
        }
        return sendError(res, msg);
    }
});

// Admin: Proxy upload to ImageKit (private key stays on server, Basic Auth)
router.post('/upload', protect, adminOnly, upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!IK_PRIVATE_KEY) {
            return sendError(res, 'ImageKit Private Key not configured', 500);
        }
        if (!req.file) return sendError(res, 'No file provided.', 400);

        const folder = (req.body.folder as string) || '/v2-uploads';
        const fileName = (req.body.fileName as string) || `upload_${Date.now()}_${req.file.originalname}`;

        // Build multipart form for ImageKit
        const form = new FormData();
        form.append('file', req.file.buffer, {
            filename: fileName,
            contentType: req.file.mimetype,
        });
        form.append('fileName', fileName);
        form.append('folder', folder);
        form.append('useUniqueFileName', 'true');

        // Upload to ImageKit using HTTP Basic Auth (private_key as username, empty password)
        // This is exactly how the old PHP system worked: CURLOPT_USERPWD => 'private_key:'
        const response = await axios.post(IK_UPLOAD_URL, form, {
            headers: {
                ...form.getHeaders(),
            },
            auth: {
                username: IK_PRIVATE_KEY as string,
                password: '',
            },
        });

        // Save to Media collection for the Cloud Library
        const newMedia = await Media.create({
            url: response.data.url,
            fileId: response.data.fileId,
            name: response.data.name,
            size: response.data.size,
            mimeType: req.file.mimetype,
            folder: folder,
        });

        return sendSuccess(res, {
            url: response.data.url,
            fileId: response.data.fileId,
            name: response.data.name,
            id: newMedia._id.toString(),
        }, 'File uploaded to ImageKit and saved to library');
    } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Upload failed';
        console.error('ImageKit upload error:', msg);
        return sendError(res, msg, 500);
    }
});

// Admin: Local video upload (Multer disk storage)
const videoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.join(__dirname, '../../../public/videos'));
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'v2-video-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadVideo = multer({ 
    storage: videoStorage, 
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for local videos
});

router.post('/upload-video', protect, adminOnly, uploadVideo.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) return sendError(res, 'No video file provided.', 400);

        // Construct the local URL (relative to public)
        const videoUrl = `/videos/${req.file.filename}`;
        
        // Optional: Save to Media library as a local reference
        await Media.create({
            url: videoUrl,
            fileId: `local_${req.file.filename}`,
            name: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype,
            folder: '/videos-local',
        });

        return sendSuccess(res, {
            url: videoUrl,
            name: req.file.originalname,
            filename: req.file.filename
        }, 'Video uploaded locally successfully');

    } catch (err: any) {
        console.error('Local video upload error:', err.message);
        return sendError(res, err.message, 500);
    }
});

export default router;
