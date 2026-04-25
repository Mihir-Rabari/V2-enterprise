import { Router, Request, Response } from 'express';
import { protect } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/admin.middleware';
import {
    getAllAttributesService,
    createAttributeService,
    updateAttributeService,
    deleteAttributeService,
} from './attributes.service';

const router = Router();

// Public: list active attributes (used by shop filter)
router.get('/', async (_req: Request, res: Response) => {
    try {
        const attrs = await getAllAttributesService(false);
        res.json({ success: true, data: attrs });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: list all attributes including inactive
router.get('/all', protect, adminOnly, async (_req: Request, res: Response) => {
    try {
        const attrs = await getAllAttributesService(true);
        res.json({ success: true, data: attrs });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: create attribute
router.post('/', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const attr = await createAttributeService(req.body);
        res.status(201).json({ success: true, data: attr });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Admin: update attribute
router.patch('/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const attr = await updateAttributeService(req.params.id, req.body);
        res.json({ success: true, data: attr });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Admin: delete attribute
router.delete('/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        await deleteAttributeService(req.params.id);
        res.json({ success: true, message: 'Attribute deleted' });
    } catch (error: any) {
        res.status(404).json({ success: false, message: error.message });
    }
});

export const attributesRoutes = router;
