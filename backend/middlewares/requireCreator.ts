import { Request, Response, NextFunction } from 'express';

export const requireCreator = (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role?.toLowerCase().replace(/\s+/g, '_');
    const creatorStatus = req.user?.creator_status;

    const isAdmin = role === 'admin';
    const isUser = role === 'user';
    const isActiveCreator = role === 'content_creator' && creatorStatus === 'ACTIVE';

    if (role === 'content_creator' && creatorStatus === 'SUSPENDED') {
        res.status(403).json({
            status: 'error',
            message: 'Tài khoản Creator của bạn đang bị đình chỉ. Vui lòng liên hệ Admin.'
        });
        return;
    }

    if (!isAdmin && !isActiveCreator && !isUser) {
        res.status(403).json({
            status: 'error',
            message: 'Vui lòng đăng nhập để sử dụng tính năng này.'
        });
        return;
    }

    next();
};
