import { Router, Request, Response } from 'express';
import { Review } from '../../models/Review';
import { User } from '../../models/User';
import { sendSuccess, sendError } from '../../utils/response';
import { protect, AuthRequest } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/admin.middleware';
import mongoose from 'mongoose';

const router = Router();

// Public: get approved reviews for a product
router.get('/product/:id', async (req: Request, res: Response) => {
    try {
        const productId = req.params.id;
        const filter: any = mongoose.Types.ObjectId.isValid(productId) ? { productId } : { productId: parseInt(productId) };
        const reviews = await Review.find({ ...filter, status: 'ACTIVE' })
            .sort({ date: -1 });
        return sendSuccess(res, reviews);
    } catch (err: unknown) { return sendError(res, (err as Error).message); }
});

// Public: get homepage-visible reviews
router.get('/homepage', async (_req: Request, res: Response) => {
    try {
        const reviews = await Review.find({ status: 'ACTIVE', homepageVisible: true })
            .populate('productId', 'name photo');

        const reviewsWithProduct = reviews.map(r => {
            const obj = r.toObject();
            const product = (r.productId as any);
            return {
                ...obj,
                product: { name: product?.name, photo: product?.photo },
                id: r._id.toString()
            };
        });
        return sendSuccess(res, reviewsWithProduct);
    } catch (err: unknown) { return sendError(res, (err as Error).message); }
});

// Customer: submit a review
router.post('/', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { productId, rating, reviewText } = req.body;
        const user = await User.findById(req.user!.userId).select('name email');

        const review = await Review.create({
            productId: new mongoose.Types.ObjectId(productId),
            userId: new mongoose.Types.ObjectId(req.user!.userId),
            customerName: user!.name,
            customerEmail: user!.email,
            rating: parseInt(rating),
            reviewText,
            status: 'INACTIVE', // awaits admin approval
        });
        return sendSuccess(res, { ...review.toObject(), id: review._id.toString() }, 'Review submitted — awaiting approval', 201);
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

// Admin: get all reviews
router.get('/', protect, adminOnly, async (_req: Request, res: Response) => {
    try {
        const reviews = await Review.find()
            .populate('productId', 'name')
            .sort({ date: -1 });

        const reviewsWithProduct = reviews.map(r => {
            const obj = r.toObject();
            const product = (r.productId as any);
            return {
                ...obj,
                product: { name: product?.name },
                id: r._id.toString()
            };
        });
        return sendSuccess(res, reviewsWithProduct);
    } catch (err: unknown) { return sendError(res, (err as Error).message); }
});

// Admin: update review status / pin to homepage
router.patch('/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const filter: any = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: parseInt(id) };
        const review = await Review.findOneAndUpdate(filter, req.body, { new: true });
        if (!review) throw new Error('Review not found');
        return sendSuccess(res, { ...review.toObject(), id: review._id.toString() }, 'Review updated');
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

// Admin: delete review
router.delete('/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const filter: any = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: parseInt(id) };
        await Review.findOneAndDelete(filter);
        return sendSuccess(res, null, 'Review deleted');
    } catch (err: unknown) { return sendError(res, (err as Error).message, 404); }
});

export default router;
