import { Router, Request, Response } from 'express';
import { Content } from '../../models/Content';
import { sendSuccess, sendError } from '../../utils/response';
import { protect } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/admin.middleware';

const router = Router();

// Public: Get content by type
router.get('/:type', async (req: Request, res: Response) => {
    try {
        const { type } = req.params;
        const content = await Content.find({ type: type.toUpperCase(), status: 'ACTIVE' });
        const contentWithId = content.map(c => ({ ...c.toObject(), id: c._id.toString() }));
        return sendSuccess(res, contentWithId);
    } catch (err: unknown) {
        return sendError(res, (err as Error).message);
    }
});

// Admin: Get all content by type (including inactive)
router.get('/admin/:type', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const { type } = req.params;
        const content = await Content.find({ type: type.toUpperCase() });
        const contentWithId = content.map(c => ({ ...c.toObject(), id: c._id.toString() }));
        return sendSuccess(res, contentWithId);
    } catch (err: unknown) {
        return sendError(res, (err as Error).message);
    }
});

// Admin: Create content
router.post('/', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const content = await Content.create(req.body);
        return sendSuccess(res, { ...content.toObject(), id: content._id.toString() }, 'Content created', 201);
    } catch (err: unknown) {
        return sendError(res, (err as Error).message, 400);
    }
});

// Admin: Update content
router.patch('/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const content = await Content.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!content) return sendError(res, 'Content not found', 404);
        return sendSuccess(res, { ...content.toObject(), id: content._id.toString() }, 'Content updated');
    } catch (err: unknown) {
        return sendError(res, (err as Error).message, 400);
    }
});

// Admin: Delete content
router.delete('/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const content = await Content.findByIdAndDelete(req.params.id);
        if (!content) return sendError(res, 'Content not found', 404);
        return sendSuccess(res, null, 'Content deleted');
    } catch (err: unknown) {
        return sendError(res, (err as Error).message, 400);
    }
});

export default router;
