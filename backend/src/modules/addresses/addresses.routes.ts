import { Router } from 'express';
import { AddressController } from './addresses.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

// All address routes require authentication
router.use(protect);

router.post('/', AddressController.addAddress);
router.patch('/:id', AddressController.updateAddress);
router.delete('/:id', AddressController.removeAddress);
router.patch('/:id/default', AddressController.setDefault);

export default router;
