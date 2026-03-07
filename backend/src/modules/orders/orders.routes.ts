import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { createOrderService, getMyOrdersService, getAllOrdersService, updateOrderStatusService, deleteOrderService } from './orders.service';
import { protect, AuthRequest } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/admin.middleware';

const router = Router();

// Customer: place an order
router.post('/', protect, async (req: AuthRequest, res: Response) => {
    try {
        const order = await createOrderService({ ...req.body, userId: req.user!.userId });
        return sendSuccess(res, order, 'Order placed successfully', 201);
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

// Customer: my orders
router.get('/my', protect, async (req: AuthRequest, res: Response) => {
    try {
        const orders = await getMyOrdersService(req.user!.userId);
        return sendSuccess(res, orders);
    } catch (err: unknown) { return sendError(res, (err as Error).message); }
});

// Admin: all orders
router.get('/', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const { page, limit } = req.query;
        const result = await getAllOrdersService(Number(page) || 1, Number(limit) || 20);
        return sendSuccess(res, result);
    } catch (err: unknown) { return sendError(res, (err as Error).message); }
});

// Admin: update order (status, AWB, etc.)
router.patch('/:id/status', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const order = await updateOrderStatusService(req.params.id, req.body);
        return sendSuccess(res, order, 'Order updated successfully');
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

// Admin: delete order
router.delete('/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        await deleteOrderService(req.params.id);
        return sendSuccess(res, null, 'Order deleted successfully');
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

export default router;
