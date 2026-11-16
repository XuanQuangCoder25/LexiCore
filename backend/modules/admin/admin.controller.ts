import { Request, Response } from 'express';
import { pool } from '../../config/mysql';
import {
    sendCreatorApprovedEmail,
    sendCreatorRejectedEmail,
    sendCreatorSuspendedEmail,
    sendUserBannedEmail,
    sendDirectCustomEmail,
} from '../email/email.service';

const db = pool as any;

// CREATOR APPLICATION MANAGEMENT

export const getCreatorApplications = async (req: Request, res: Response): Promise<void> => {
    const { status } = req.query;
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    const filter = status && validStatuses.includes(status as string) ? (status as string) : null;

    const [rows] = filter
        ? await db.execute(
            `SELECT ca.id, ca.reason, ca.qualifications, ca.status, ca.admin_note, ca.created_at, ca.updated_at,
                    u.full_name, u.email
             FROM creator_applications ca JOIN users u ON ca.user_id = u.id
             WHERE ca.status = ? ORDER BY ca.updated_at DESC`,
            [filter]
        )
        : await db.execute(
            `SELECT ca.id, ca.reason, ca.qualifications, ca.status, ca.admin_note, ca.created_at, ca.updated_at,
                    u.full_name, u.email
             FROM creator_applications ca JOIN users u ON ca.user_id = u.id
             ORDER BY FIELD(ca.status, 'PENDING', 'REJECTED', 'APPROVED'), ca.updated_at DESC`
        );

    res.json({ success: true, data: rows });
};

export const approveApplication = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const conn = connection as any;
    try {
        await conn.beginTransaction();

        const [appRows] = await conn.execute(
            `SELECT ca.user_id, ca.status, u.email, u.full_name
             FROM creator_applications ca
             JOIN users u ON ca.user_id = u.id
             WHERE ca.id = ?`,
            [id]
        );
        const app = appRows[0];

        if (!app) { res.status(404).json({ success: false, message: 'Không tìm thấy đơn.' }); return; }
        if (app.status !== 'PENDING') {
            res.status(400).json({ success: false, message: `Đơn này đã được xử lý (${app.status}).` });
            return;
        }

        await conn.execute(
            `UPDATE creator_applications SET status = 'APPROVED', updated_at = NOW() WHERE id = ?`, [id]
        );
        await conn.execute(
            `UPDATE users SET role = 'CONTENT_CREATOR', creator_status = 'ACTIVE' WHERE id = ?`,
            [app.user_id]
        );

        await conn.commit();

        // Gửi email chúc mừng duyệt Content Creator
        if (app.email) {
            sendCreatorApprovedEmail({
                toEmail: app.email,
                fullName: app.full_name || 'Creator',
            }).catch((err) => {
                console.error('[Admin] Lỗi gửi email duyệt Creator:', err);
            });
        }

        res.json({ success: true, message: 'Đã duyệt đơn và cấp quyền Content Creator.' });
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export const rejectApplication = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { admin_note } = req.body;

    if (!admin_note || admin_note.trim().length < 5) {
        res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối (tối thiểu 5 ký tự).' });
        return;
    }

    const [appRows] = await db.execute(
        `SELECT ca.status, u.email, u.full_name
         FROM creator_applications ca
         JOIN users u ON ca.user_id = u.id
         WHERE ca.id = ?`,
        [id]
    );
    const app = appRows[0];

    if (!app) { res.status(404).json({ success: false, message: 'Không tìm thấy đơn.' }); return; }
    if (app.status !== 'PENDING') {
        res.status(400).json({ success: false, message: `Đơn này đã được xử lý (${app.status}).` });
        return;
    }

    const cleanNote = admin_note.trim();
    await db.execute(
        `UPDATE creator_applications SET status = 'REJECTED', admin_note = ?, updated_at = NOW() WHERE id = ?`,
        [cleanNote, id]
    );

    // Gửi email thông báo từ chối kèm lý do nhận xét
    if (app.email) {
        sendCreatorRejectedEmail({
            toEmail: app.email,
            fullName: app.full_name || 'Học viên',
            adminNote: cleanNote,
        }).catch((err) => {
            console.error('[Admin] Lỗi gửi email từ chối Creator:', err);
        });
    }

    res.json({ success: true, message: 'Đã từ chối đơn và ghi nhận lý do.' });
};

// ACTIVE CREATOR MANAGEMENT

export const getCreators = async (req: Request, res: Response): Promise<void> => {
    const [rows] = await db.execute(
        `SELECT u.id, u.full_name, u.email, u.creator_status, ca.updated_at as approved_at
         FROM users u
         LEFT JOIN creator_applications ca ON u.id = ca.user_id AND ca.status = 'APPROVED'
         WHERE u.role = 'CONTENT_CREATOR'
         ORDER BY u.creator_status ASC, ca.updated_at DESC`
    );
    res.json({ success: true, data: rows });
};

export const suspendCreator = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { reason } = req.body || {};
    const [rows] = await db.execute(
        `SELECT role, creator_status, email, full_name FROM users WHERE id = ?`, [userId]
    );
    const user = rows[0];

    if (!user || user.role !== 'CONTENT_CREATOR') { res.status(404).json({ success: false, message: 'Không tìm thấy Creator.' }); return; }
    if (user.creator_status === 'SUSPENDED') { res.status(400).json({ success: false, message: 'Creator này đã bị đình chỉ rồi.' }); return; }

    await db.execute(`UPDATE users SET creator_status = 'SUSPENDED' WHERE id = ?`, [userId]);

    // Gửi email thông báo tạm đình chỉ quyền Content Creator
    if (user.email) {
        sendCreatorSuspendedEmail({
            toEmail: user.email,
            fullName: user.full_name || 'Creator',
            reason,
        }).catch((err) => {
            console.error('[Admin] Lỗi gửi email đình chỉ Creator:', err);
        });
    }

    res.json({ success: true, message: 'Đã đình chỉ tài khoản Creator. Nội dung cũ vẫn được bảo lưu.' });
};

export const reactivateCreator = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const [rows] = await db.execute(
        `SELECT role, creator_status FROM users WHERE id = ?`, [userId]
    );
    const user = rows[0];

    if (!user || user.role !== 'CONTENT_CREATOR') { res.status(404).json({ success: false, message: 'Không tìm thấy Creator.' }); return; }
    if (user.creator_status === 'ACTIVE') { res.status(400).json({ success: false, message: 'Creator này đang hoạt động bình thường.' }); return; }

    await db.execute(`UPDATE users SET creator_status = 'ACTIVE' WHERE id = ?`, [userId]);
    res.json({ success: true, message: 'Đã kích hoạt lại tài khoản Creator.' });
};

// ADMIN STATS (cho inbox badge)

export const getPendingCounts = async (req: Request, res: Response): Promise<void> => {
    const [rows] = await db.execute(
        `SELECT COUNT(*) as pending_applications FROM creator_applications WHERE status = 'PENDING'`
    );
    res.json({ success: true, data: rows[0] });
};

// USER MANAGEMENT (HR)

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
    const [rows] = await db.execute(
        `SELECT u.id, u.full_name, u.email, u.role, u.status, u.creator_status, u.avatar_url, u.created_at,
                w.coin_balance, w.diamond_balance, w.level, w.rank_point
         FROM users u
         LEFT JOIN wallets w ON u.id = w.user_id
         ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: rows });
};

export const banUser = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { reason } = req.body || {};

    const [rows] = await db.execute(
        `SELECT email, full_name FROM users WHERE id = ?`, [userId]
    );
    const user = rows[0];

    await db.execute(`UPDATE users SET status = 'BANNED' WHERE id = ?`, [userId]);

    // Gửi email thông báo khóa tài khoản
    if (user?.email) {
        sendUserBannedEmail({
            toEmail: user.email,
            fullName: user.full_name || 'Người dùng',
            reason,
        }).catch((err) => {
            console.error('[Admin] Lỗi gửi email khóa tài khoản:', err);
        });
    }

    res.json({ success: true, message: 'Đã khóa tài khoản người dùng.' });
};

export const unbanUser = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    await db.execute(`UPDATE users SET status = 'ACTIVE' WHERE id = ?`, [userId]);
    res.json({ success: true, message: 'Đã mở khóa tài khoản người dùng.' });
};

export const sendUserDirectEmail = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { subject, heading, badgeText, badgeType, message, actionText, actionUrl } = req.body;

    if (!subject || !subject.trim()) {
        res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề email.' });
        return;
    }
    if (!message || !message.trim()) {
        res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung email.' });
        return;
    }

    const [rows] = await db.execute(
        `SELECT email, full_name FROM users WHERE id = ?`, [userId]
    );
    const user = rows[0];

    if (!user || !user.email) {
        res.status(404).json({ success: false, message: 'Không tìm thấy người dùng hoặc người dùng không có email.' });
        return;
    }

    try {
        await sendDirectCustomEmail({
            toEmail: user.email,
            fullName: user.full_name || 'Học viên',
            subject: subject.trim(),
            heading: (heading && heading.trim()) || subject.trim(),
            badgeText: badgeText || 'Thông báo',
            badgeType: badgeType || 'info',
            message: message.trim(),
            actionText: actionText ? actionText.trim() : undefined,
            actionUrl: actionUrl ? actionUrl.trim() : undefined,
        });

        res.json({ success: true, message: `Đã gửi email thành công đến ${user.email}.` });
    } catch (err: any) {
        console.error('[Admin] Lỗi gửi email trực tiếp:', err);
        res.status(500).json({ success: false, message: err?.message || 'Lỗi khi gửi email qua dịch vụ Resend.' });
    }
};
