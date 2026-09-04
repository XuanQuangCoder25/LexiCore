import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export const globalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            status: 'error',
            message: err.message
        });
        return;
    }

    console.error('LỖI KHÔNG XÁC ĐỊNH:', err);
    res.status(500).json({
        status: 'error',
        message: 'Lỗi máy chủ nội bộ (Internal Server Error)'
    });
};
