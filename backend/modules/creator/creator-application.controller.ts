import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../config/mysql';
import { AppError } from '../../errors/AppError';

export const applyForCreator = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { reason, qualifications } = req.body;

    if (!reason || reason.trim().length < 20) {
        res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do chi tiết (tối thiểu 20 ký tự).' });
        return;
    }

    // Kiểm tra đã là Creator chưa
    const [userRows] = await pool.execute(
        `SELECT role, creator_status FROM users WHERE id = ?`,
        [userId]
    ) as any;
    const user = (userRows as any[])[0];
    if (user?.role === 'CONTENT_CREATOR' && user?.creator_status === 'ACTIVE') {
        res.status(400).json({ success: false, message: 'Bạn đã là Content Creator.' });
        return;
    }

    // Kiểm tra đơn đang tồn tại
    const [existingRows] = await pool.execute(
        `SELECT id, status, updated_at FROM creator_applications WHERE user_id = ?`,
        [userId]
    ) as any;
    const existing = (existingRows as any[])[0];

    if (existing) {
        if (existing.status === 'PENDING') {
            res.status(400).json({ success: false, message: 'Đơn của bạn đang được xem xét, vui lòng chờ.' });
            return;
        }
        if (existing.status === 'REJECTED') {
            // Kiểm tra 24 giờ cooldown
            const rejectedAt = new Date(existing.updated_at).getTime();
            const hoursSinceRejection = (Date.now() - rejectedAt) / (1000 * 60 * 60);
            if (hoursSinceRejection < 24) {
                const hoursLeft = Math.ceil(24 - hoursSinceRejection);
                res.status(400).json({
                    success: false,
                    message: `Đơn bị từ chối. Bạn có thể nộp lại sau ${hoursLeft} giờ nữa.`
                });
                return;
            }
            // Đã qua 24h -> Cập nhật lại đơn cũ thành PENDING
            await pool.execute(
                `UPDATE creator_applications SET reason = ?, qualifications = ?, status = 'PENDING', admin_note = NULL, updated_at = NOW() WHERE user_id = ?`,
                [reason.trim(), qualifications?.trim() || null, userId]
            );
            res.status(200).json({ success: true, message: 'Đơn xin của bạn đã được gửi lại thành công!' });
            return;
        }
        if (existing.status === 'APPROVED') {
            res.status(400).json({ success: false, message: 'Đơn của bạn đã được duyệt trước đó.' });
            return;
        }
    }

    // Tạo đơn mới
    await pool.execute(
        `INSERT INTO creator_applications (id, user_id, reason, qualifications) VALUES (?, ?, ?, ?)`,
        [uuidv4(), userId, reason.trim(), qualifications?.trim() || null]
    );

    res.status(201).json({ success: true, message: 'Đơn xin làm Content Creator đã được gửi thành công! Admin sẽ xem xét trong thời gian sớm nhất.' });
};

export const getMyApplication = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const [rows] = await pool.execute(
        `SELECT id, status, reason, qualifications, admin_note, created_at, updated_at 
         FROM creator_applications WHERE user_id = ?`,
        [userId]
    );
    const applications = rows as any[];

    if (applications.length === 0) {
        res.json({ success: true, data: null, message: 'Bạn chưa nộp đơn xin làm Creator.' });
        return;
    }

    res.json({ success: true, data: applications[0] });
};
