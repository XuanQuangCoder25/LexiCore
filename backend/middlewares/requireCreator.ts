import { Request, Response, NextFunction } from 'express';

export const requireCreator = (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role?.toLowerCase().replace(/\s+/g, '_');
    const creatorStatus = req.user?.creator_status;

    const isAdmin = role === 'admin';
    const isUser = role === 'user';
    const isSuspended = role === 'content_creator' && creatorStatus === 'SUSPENDED';
    const isCreator = role === 'content_creator' && !isSuspended;

    // Cho phép user, creator và admin tạo & quản lý nội dung cá nhân (Private Space)
    // Chỉ chặn nếu tài khoản không hợp lệ
    if (!isAdmin && !isCreator && !isUser && !isSuspended) {
        res.status(401).json({
            status: 'error',
            message: 'Vui lòng đăng nhập để sử dụng tính năng này.'
        });
        return;
    }

    next();
};
