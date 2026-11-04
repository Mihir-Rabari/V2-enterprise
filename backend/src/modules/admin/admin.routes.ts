import { getAdminStats } from './admin.stats';
import { Router, Request, Response } from 'express';
import path from 'path';
import { Product } from '../../models/Product';
import { User } from '../../models/User';
import { Media } from '../../models/Media';
import { sendSuccess, sendError } from '../../utils/response';
import { protect } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/admin.middleware';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';
import { env } from '../../config/env';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { getAdminProducts, getAdminProduct } from '../products/products.controller';
import { uploadToR2, listR2Objects, isR2Configured } from '../../utils/r2';
import { Category } from '../../models/Category';
import { chatBurstLimiter, chatDailyLimiter } from '../../middlewares/rateLimit.middleware';
import { budgetExhausted, getProvider, isChatAvailable } from '../chat/chat.service';
import { assistantRequestSchema, assistantImageType, draftProduct } from './admin.product-assistant';

const router = Router();

router.post('/product-assistant', protect, adminOnly, chatBurstLimiter, chatDailyLimiter, async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'private, no-store');
    const parsed = assistantRequestSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 'Invalid conversation. Keep messages short or start a new draft.', 400);
    if (!isChatAvailable()) return sendError(res, 'The product assistant is unavailable. Check the AI configuration or add the product manually.', 503);
    try {
        if (await budgetExhausted()) return sendError(res, 'The daily AI budget has been reached. Please try again tomorrow.', 503);
        const categories = await Category.find({ status: 'ACTIVE' }).select('name parentId').lean();
        return sendSuccess(res, await draftProduct(parsed.data.messages, categories, getProvider(), parsed.data.images));
    } catch (err) {
        console.error('[Admin product assistant]', (err as Error).message);
        return sendError(res, 'Unable to prepare a product draft. Please retry; your product has not been saved.', 502);
    }
});

const assistantUpload = multer({
    storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
    fileFilter: (_req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(new Error('Use a JPEG, PNG or WebP image.'));
        cb(null, true);
    },
}).single('file');

router.post('/product-assistant/images', protect, adminOnly, chatBurstLimiter, (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'private, no-store');
    if (!isR2Configured()) return sendError(res, 'Image uploads require R2 storage to be configured.', 503);
    assistantUpload(req, res, async err => {
        if (err) return sendError(res, err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
            ? 'Each image must be 5 MB or smaller.' : 'Upload one JPEG, PNG or WebP image, up to 5 MB.', 400);
        if (!req.file) return sendError(res, 'Choose a product image to upload.', 400);
        const mimeType = assistantImageType(req.file.buffer);
        if (!mimeType || mimeType !== req.file.mimetype) return sendError(res, 'The file is not a valid JPEG, PNG or WebP image.', 400);
        try {
            const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mimeType];
            const uploaded = await uploadToR2(req.file.buffer, 'products/assistant', `${randomUUID()}.${extension}`, mimeType);
            const media = await Media.create({ ...uploaded, size: req.file.size, mimeType });
            return sendSuccess(res, { url: uploaded.url, fileId: uploaded.fileId, id: String(media._id) }, 'Image saved to R2 for AI review and future product use.');
        } catch (error) {
            console.error('[Admin product image]', (error as Error).message);
            return sendError(res, 'Unable to save the product image. Please retry.', 502);
        }
    });
});

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

// Never cache analytics, including authentication failures.
router.use('/stats', (_req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});
router.get('/stats', protect, adminOnly, async (_req: Request, res: Response) => {
    const range = _req.query.range ?? '30d';
    if (range !== '7d' && range !== '30d' && range !== '12m') return sendError(res, 'Invalid analytics range.', 400);
    try {
        const data = await getAdminStats(new Date(), range);
        return sendSuccess(res, {
            ...data,
            // Snapshot cutoff and response time both come from this server's clock.
            serverTime: new Date().toISOString(),
            requestId: typeof _req.query.requestId === 'string' ? _req.query.requestId.slice(0, 128) : null,
        });
    } catch (err) {
        console.error('Stats error:', err);
        return sendError(res, 'Unable to load current analytics. Please retry.', 503);
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
