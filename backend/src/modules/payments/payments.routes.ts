import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware';
import { createRazorpayOrder } from './payments.controller';

const router = Router();

// Only authenticated users can create payment orders
router.post('/create-order', protect, createRazorpayOrder);

export default router;
