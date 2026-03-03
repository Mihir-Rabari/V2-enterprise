import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

export const validate =
    (schema: ZodSchema) =>
        (req: Request, res: Response, next: NextFunction) => {
            const result = schema.safeParse(req.body);
            if (!result.success) {
                const formatted = (result.error as ZodError).flatten().fieldErrors;
                return sendError(res, 'Validation failed', 400, formatted);
            }
            req.body = result.data;
            return next();
        };
