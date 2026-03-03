import { Router, Request, Response } from 'express';
import { Product } from '../../models/Product';
import { Order } from '../../models/Order';
import { User } from '../../models/User';
import { ContactMessage } from '../../models/ContactMessage';
import { sendSuccess, sendError } from '../../utils/response';
import { protect } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/admin.middleware';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Admin: get dashboard stats
router.get('/stats', protect, adminOnly, async (_req: Request, res: Response) => {
    try {
        const [
            totalProducts, totalOrders, totalCustomers,
            pendingOrders, unreadMessages, recentOrders,
        ] = await Promise.all([
            Product.countDocuments({ status: 'ACTIVE' }),
            Order.countDocuments(),
            User.countDocuments({ role: 'CUSTOMER' }),
            Order.countDocuments({ status: 'PENDING' }),
            ContactMessage.countDocuments({ status: 'UNREAD' }),
            Order.find()
                .populate('userId', 'name email')
                .limit(5)
                .sort({ createdAt: -1 }),
        ]);

        // Revenue aggregation
        const revenueResult = await Order.aggregate([
            { $match: { status: { $in: ['PENDING', 'DELIVERED'] } } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        const recentOrdersWithUser = recentOrders.map(o => {
            const obj = o.toObject();
            const { userId, ...rest } = obj;
            return { ...rest, user: userId, id: o._id.toString() };
        });

        return sendSuccess(res, {
            totalProducts,
            totalOrders,
            totalCustomers,
            totalRevenue,
            pendingOrders,
            unreadMessages,
            recentOrders: recentOrdersWithUser,
        });
    } catch (err: unknown) { return sendError(res, (err as Error).message); }
});

// Admin: get all customers
router.get('/customers', protect, adminOnly, async (_req: Request, res: Response) => {
    try {
        // In Mongoose, we'll fetch users and then maybe aggregate counts or just fetch them
        // For now, let's keep it simple
        const customers = await User.find({ role: 'CUSTOMER' })
            .select('name email phone createdAt')
            .sort({ createdAt: -1 });

        // Note: _count for orders will be missing unless we aggregate.
        // Let's add it via aggregation if possible, or just return basic info for now.
        const usersWithId = customers.map(c => ({ ...c.toObject(), id: c._id.toString() }));
        return sendSuccess(res, usersWithId);
    } catch (err: unknown) { return sendError(res, (err as Error).message); }
});

// Admin: upload image to Cloudinary
router.post('/upload', protect, adminOnly, upload.single('image'), async (req: Request, res: Response) => {
    try {
        if (!req.file) return sendError(res, 'No image file provided.', 400);

        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: 'v2-enterprise', resource_type: 'image' },
                (error, result) => { if (error) reject(error); else resolve(result); }
            ).end(req.file!.buffer);
        });

        return sendSuccess(res, { url: (result as { secure_url: string }).secure_url }, 'Image uploaded');
    } catch (err: unknown) { return sendError(res, (err as Error).message, 500); }
});

export default router;
