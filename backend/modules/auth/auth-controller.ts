import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, verifyEmail, getMe, forgotPassword, resetPassword } from './auth-service';
import { AppError } from '../../errors/AppError';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await registerUser(req.body);
        res.status(201).json(result);
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return next(new AppError('Email này đã được sử dụng', 400));
        }
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await loginUser(req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const verifyEmailHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await verifyEmail(req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// req.user được gán bởi requireAuth middleware
export const getMeHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await getMe(req.user!.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const forgotPasswordHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await forgotPassword(req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const resetPasswordHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await resetPassword(req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
