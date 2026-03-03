import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    console.error('🔥 Unhandled Error:', err.message);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        errors: process.env.NODE_ENV === 'development' ? err.message : null,
    });
};
