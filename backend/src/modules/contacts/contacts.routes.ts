import { Router, Request, Response } from 'express';
import { ContactMessage } from '../../models/ContactMessage';
import { sendSuccess, sendError } from '../../utils/response';
import { protect } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/admin.middleware';
import mongoose from 'mongoose';

const router = Router();

// Public: submit contact message
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return sendError(res, 'Name, email, and message are required.', 400);
        }
        const contact = await ContactMessage.create({ name, email, message });
        return sendSuccess(res, { ...contact.toObject(), id: contact._id.toString() }, 'Your message has been received!', 201);
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

// Admin: view all messages
router.get('/', protect, adminOnly, async (_req: Request, res: Response) => {
    try {
        const messages = await ContactMessage.find().sort({ date: -1 });
        const messagesWithId = messages.map(m => ({ ...m.toObject(), id: m._id.toString() }));
        return sendSuccess(res, messagesWithId);
    } catch (err: unknown) { return sendError(res, (err as Error).message); }
});

// Admin: mark as read
router.patch('/:id', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const query: any = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: parseInt(id) };
        const msg = await ContactMessage.findOneAndUpdate(
            query,
            { status: req.body.status || 'READ' },
            { new: true }
        );
        if (!msg) throw new Error('Message not found');
        return sendSuccess(res, { ...msg.toObject(), id: msg._id.toString() }, 'Message updated');
    } catch (err: unknown) { return sendError(res, (err as Error).message, 400); }
});

export default router;
