import { Request, Response, NextFunction } from 'express';

/**
 * Middleware requirePublisher:
 * Chỉ cho phép người dùng có quyền Admin hoặc Content Creator (đang ở trạng thái ACTIVE)
 * thực hiện các hành động Xuất bản (Publish) nội dung ra cộng đồng.
 * Người dùng role 'user' hoặc Creator bị đình chỉ ('SUSPENDED') sẽ bị chặn (403).
 */
export const requirePublisher = (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role?.toLowerCase().replace(/\s+/g, '_');
    const creatorStatus = req.user?.creator_status;

    const isAdmin = role === 'admin';
    const isSuspended = creatorStatus === 'SUSPENDED';
    const isActiveCreator = role === 'content_creator' && !isSuspended;

    if (!isAdmin && !isActiveCreator) {
        res.status(403).json({
            status: 'error',
            message: role === 'content_creator'
                ? 'Tài khoản Creator của bạn đang bị đình chỉ, không thể xuất bản nội dung.'
                : 'Chỉ tài khoản Content Creator hoặc Admin mới có quyền xuất bản nội dung ra cộng đồng.',
            requires_creator: true
        });
        return;
    }

    next();
};
