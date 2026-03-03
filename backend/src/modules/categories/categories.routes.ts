import { Router } from 'express';
import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { getCategoriesService, createCategoryService, updateCategoryService, deleteCategoryService } from './categories.service';
import { protect } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/admin.middleware';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const cats = await getCategoriesService();
        return sendSuccess(res, cats);
    } catch (err: unknown) { return sendError(res, (err as Error).message); }
});

router.post('/', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const cat = await createCategoryService(req.body);
        return sendSuccess(res, cat, 'Category created', 201);
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

router.patch('/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const cat = await updateCategoryService(req.params.id, req.body);
        return sendSuccess(res, cat, 'Category updated');
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

router.delete('/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        await deleteCategoryService(req.params.id);
        return sendSuccess(res, null, 'Category deleted');
    } catch (err: unknown) { return sendError(res, (err as Error).message, 404); }
});

export default router;
