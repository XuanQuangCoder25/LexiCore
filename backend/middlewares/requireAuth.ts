import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mở rộng kiểu Request của Express để chứa thêm thông tin User
declare global {
    namespace Express {
        interface Request {
            user?: { id: string; role: string };
        }
    }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy phần token từ "Bearer <token>"

    if (!token) {
        res.status(401).json({ error: 'Truy cập bị từ chối. Vui lòng đăng nhập.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: string };
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
};
