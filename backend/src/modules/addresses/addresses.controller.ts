import { Request, Response } from 'express';
import { AddressService } from './addresses.service';
import { sendSuccess, sendError } from '../../utils/response';

export class AddressController {
    static async addAddress(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            const address = await AddressService.addAddress(userId, req.body);
            sendSuccess(res, address, 'Address added successfully', 201);
        } catch (error: any) {
            sendError(res, error.message, 400);
        }
    }

    static async updateAddress(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            const address = await AddressService.updateAddress(userId, req.params.id, req.body);
            sendSuccess(res, address, 'Address updated successfully');
        } catch (error: any) {
            sendError(res, error.message, 400);
        }
    }

    static async removeAddress(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            await AddressService.removeAddress(userId, req.params.id);
            sendSuccess(res, null, 'Address removed successfully');
        } catch (error: any) {
            sendError(res, error.message, 400);
        }
    }

    static async setDefault(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            const addresses = await AddressService.setDefaultAddress(userId, req.params.id);
            sendSuccess(res, addresses, 'Default address updated');
        } catch (error: any) {
            sendError(res, error.message, 400);
        }
    }
}
