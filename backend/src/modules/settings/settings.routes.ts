import { Router, Request, Response } from 'express';
import { SiteSettings } from '../../models/SiteSettings';
import { sendSuccess, sendError } from '../../utils/response';
import { protect } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/admin.middleware';

const router = Router();

// Public: get site settings
router.get('/', async (_req: Request, res: Response) => {
    try {
        const settings = await SiteSettings.findOne();
        const settingsObj = settings ? { ...settings.toObject(), id: settings._id.toString() } : null;
        return sendSuccess(res, settingsObj);
    } catch (err: unknown) { return sendError(res, (err as Error).message); }
});

// Admin: update site settings (upsert — create if doesn't exist)
router.patch('/', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        let settings = await SiteSettings.findOne();
        if (settings) {
            settings = await SiteSettings.findByIdAndUpdate(settings._id, req.body, { new: true });
        } else {
            settings = await SiteSettings.create(req.body);
        }
        const settingsObj = settings ? { ...settings.toObject(), id: settings._id.toString() } : null;
        return sendSuccess(res, settingsObj, 'Settings updated');
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

export default router;
