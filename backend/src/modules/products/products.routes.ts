import { Router } from 'express';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from './products.controller';
import { protect } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/admin.middleware';

const router = Router();

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', protect, adminOnly, createProduct);
router.patch('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

export default router;
