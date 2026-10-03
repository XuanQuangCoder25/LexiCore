import { Request, Response, NextFunction } from 'express';

export const requireCreator = (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role?.toLowerCase().replace(/\s+/g, '_');
    const creatorStatus = req.user?.creator_status;

    const isAdmin = role === 'admin';
    const isActiveCreator = role === 'content_creator' && creatorStatus === 'ACTIVE';

    if (!isAdmin && !isActiveCreator) {
        res.status(403).json({
            status: 'error',
            message: role === 'content_creator'
                ? 'Tài khoản Creator của bạn đang bị đình chỉ. Vui lòng liên hệ Admin.'
                : 'Cần quyền Content Creator để truy cập khu vực này.'
        });
        return;
    }

    next();
};
