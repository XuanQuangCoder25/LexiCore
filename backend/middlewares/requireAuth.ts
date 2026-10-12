import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mở rộng kiểu Request của Express để chứa thêm thông tin User
declare global {
    namespace Express {
        interface Request {
            user?: { id: string; role: string; creator_status?: string | null };
        }
    }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    let token = req.cookies?.accessToken || req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        res.status(401).json({ status: 'error', message: 'Truy cập bị từ chối. Vui lòng đăng nhập.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: string };
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ status: 'error', message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    let token = req.cookies?.accessToken || req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: string };
            req.user = decoded;
        } catch {
            // ignore invalid token for optional auth
        }
    }
    next();
};
