import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, verifyEmail, getMe, forgotPassword, resetPassword, resendOtp, verifyOtpCode } from './auth-service';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await registerUser(req.body);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await loginUser(req.body);

        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: result.message,
            user: result.user
        });
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

export const resendOtpHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await resendOtp(req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const verifyOtpHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await verifyOtpCode(req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
