import express from 'express';
import { getFilterSuggestionsService } from './filters.service';
import { protect } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/admin.middleware';

const router = express.Router();

router.get('/suggestions', async (req, res) => {
    try {
        const filters = await getFilterSuggestionsService();
        res.json({ success: true, data: filters });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export const filtersRoutes = router;
