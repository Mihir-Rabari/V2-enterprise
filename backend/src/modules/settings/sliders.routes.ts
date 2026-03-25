import { Router, Request, Response } from 'express';
import { HeroSlide } from '../../models/HeroSlide';
import { Slider } from '../../models/Slider';
import { sendSuccess, sendError } from '../../utils/response';
import { protect } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/admin.middleware';

const router = Router();

// Get all active hero slides
router.get('/hero', async (_req: Request, res: Response) => {
    try {
        const slides = await HeroSlide.find({ status: { $regex: /^active$/i } }).sort({ order: 1 });
        const slidesWithId = slides.map(s => ({ ...s.toObject(), id: s._id.toString() }));
        return sendSuccess(res, slidesWithId);
    } catch (err: unknown) {
        return sendError(res, (err as Error).message);
    }
});

// Get all active promotional sliders (excluding Marquee)
router.get('/promotional', async (_req: Request, res: Response) => {
    try {
        const marquee = await Slider.find({ type: 'MARQUEE',  status: { $regex: /^active$/i } });
        const sliders = await Slider.find({  status: { $regex: /^active$/i }, type: { $ne: 'MARQUEE' } });
        const slidersWithId = sliders.map(s => ({ ...s.toObject(), id: s._id.toString() }));
        return sendSuccess(res, slidersWithId);
    } catch (err: unknown) {
        return sendError(res, (err as Error).message);
    }
});



// Admin: Create Hero Slide
router.post('/hero', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const slide = await HeroSlide.create(req.body);
        return sendSuccess(res, { ...slide.toObject(), id: slide._id.toString() }, 'Hero slide created', 201);
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

// Admin: Update Hero Slide
router.patch('/hero/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const slide = await HeroSlide.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!slide) return sendError(res, 'Hero slide not found', 404);
        return sendSuccess(res, { ...slide.toObject(), id: slide._id.toString() }, 'Hero slide updated');
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

// Admin: Delete Hero Slide
router.delete('/hero/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const slide = await HeroSlide.findByIdAndDelete(req.params.id);
        if (!slide) return sendError(res, 'Hero slide not found', 404);
        return sendSuccess(res, null, 'Hero slide deleted');
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

// Admin: Create Slider
router.post('/promotional', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const slider = await Slider.create(req.body);
        return sendSuccess(res, { ...slider.toObject(), id: slider._id.toString() }, 'Slider created', 201);
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

// Admin: Update Slider
router.patch('/promotional/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const slider = await Slider.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!slider) return sendError(res, 'Slider not found', 404);
        return sendSuccess(res, { ...slider.toObject(), id: slider._id.toString() }, 'Slider updated');
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

// Admin: Delete Slider
router.delete('/promotional/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const slider = await Slider.findByIdAndDelete(req.params.id);
        if (!slider) return sendError(res, 'Slider not found', 404);
        return sendSuccess(res, null, 'Slider deleted');
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

export default router;
