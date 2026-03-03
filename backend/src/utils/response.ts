/**
 * Standard API response wrapper for consistent JSON shape.
 */

export const sendSuccess = <T>(
    res: import('express').Response,
    data: T,
    message = 'Success',
    statusCode = 200
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

export const sendError = (
    res: import('express').Response,
    message: string,
    statusCode = 500,
    errors?: unknown
) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors: errors || null,
    });
};
