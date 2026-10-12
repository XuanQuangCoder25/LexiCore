import { Request, Response, NextFunction } from 'express';
import { 
    registerUser, 
    loginUser, 
    verifyEmail, 
    getMe, 
    forgotPassword, 
    resetPassword, 
    resendOtp, 
    verifyOtpCode, 
    refreshAccessToken, 
    changePassword 
} from './auth-service';

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

        const cookieBaseOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const
        };

        // Access token: 15 phút
        res.cookie('accessToken', result.accessToken, {
            ...cookieBaseOptions,
            maxAge: 15 * 60 * 1000
        });

        // Giữ cookie 'token' để tương thích ngược
        res.cookie('token', result.accessToken, {
            ...cookieBaseOptions,
            maxAge: 15 * 60 * 1000
        });

        // Refresh token: 7 ngày
        res.cookie('refreshToken', result.refreshToken, {
            ...cookieBaseOptions,
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

export const refreshTokenHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const tokenFromCookie = req.cookies?.refreshToken;
        const result = await refreshAccessToken(tokenFromCookie);

        const cookieBaseOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const
        };

        res.cookie('accessToken', result.accessToken, {
            ...cookieBaseOptions,
            maxAge: 15 * 60 * 1000
        });

        res.cookie('token', result.accessToken, {
            ...cookieBaseOptions,
            maxAge: 15 * 60 * 1000
        });

        res.status(200).json({
            status: 'success',
            message: 'Token đã được làm mới thành công',
            user: result.user
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const cookieBaseOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const
        };

        res.clearCookie('accessToken', cookieBaseOptions);
        res.clearCookie('token', cookieBaseOptions);
        res.clearCookie('refreshToken', cookieBaseOptions);

        res.status(200).json({
            status: 'success',
            message: 'Đăng xuất thành công'
        });
    } catch (error) {
        next(error);
    }
};

export const changePasswordHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await changePassword(req.user!.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

