import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';
import { AppError } from '../../errors/AppError';
import { invalidateMaintenanceCache } from '../../middlewares/checkMaintenance';
import { sendDirectCustomEmail } from '../email/email.service';

// ============================================================
// Types
// ============================================================

export interface PackageSaleStatus {
    id: string;
    name: string;
    slug: string;
    package_type: string;
    tier: string | null;
    price_vnd: number;
    sale_percent: number;
    sale_starts_at: string | null;
    sale_ends_at: string | null;
    final_price_vnd: number;
    sale_status: 'NONE' | 'INCOMING' | 'ACTIVE' | 'EXPIRED';
    coin_amount: number;
    diamond_amount: number;
    duration_days: number | null;
}

export interface AdminRewardCampaign {
    id: string;
    name: string;
    description: string | null;
    coin_amount: number;
    diamond_amount: number;
    item_id: string | null;
    item_name?: string | null;
    item_type?: string | null;
    item_image?: string | null;
    fallback_coin: number;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
    created_at: string;
    total_claims: number;
    status: 'UPCOMING' | 'ACTIVE' | 'EXPIRED';
}

export interface SystemAnnouncement {
    id: string;
    type: 'MAINTENANCE' | 'ANNOUNCEMENT';
    title: string;
    message: string;
    is_maintenance_active: boolean;
    estimated_end: string | null;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
    created_at: string;
}

export interface EmailBlastLog {
    id: string;
    subject: string;
    target_audience: 'ALL' | 'CREATORS' | 'STARTER' | 'PRO' | 'ELITE' | 'FREE';
    total_recipients: number;
    sent_count: number;
    failed_count: number;
    status: 'PENDING' | 'SENDING' | 'DONE' | 'FAILED';
    heading: string;
    message: string;
    badge_text: string | null;
    badge_type: 'info' | 'warning' | 'danger' | 'success' | null;
    action_text: string | null;
    action_url: string | null;
    created_at: string;
    completed_at: string | null;
}

// ============================================================
// Helper: Đẩy thông báo In-App cho toàn bộ học viên
// ============================================================

export async function pushNotificationToAllActiveUsers(params: {
    type: string;
    title: string;
    body: string;
}) {
    try {
        const [users] = await pool.execute<RowDataPacket[]>(
            `SELECT id FROM users WHERE status = 'ACTIVE'`
        );
        if (users.length === 0) return;

        // Chia thành các đợt 200 người dùng để tránh câu lệnh SQL quá dài
        const batchSize = 200;
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            const placeholders = batch.map(() => `(?, ?, ?, ?, FALSE, NOW())`).join(', ');
            const values: any[] = [];
            for (const u of batch) {
                values.push(uuidv4(), u.id, params.type, params.title, params.body);
            }
            await pool.execute(
                `INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at)
                 VALUES ${placeholders}`,
                values
            );
        }
    } catch (err) {
        console.error('[Notification Push Error] Không thể đẩy thông báo:', err);
    }
}

// ============================================================
// 1. Quản lý Giảm giá (Sale %)
// ============================================================

export async function adminGetAllPackagesWithSaleStatus(): Promise<PackageSaleStatus[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, name, slug, package_type, tier, price_vnd,
                sale_percent, sale_starts_at, sale_ends_at,
                coin_amount, diamond_amount, duration_days
         FROM credit_packages
         WHERE is_active = TRUE
         ORDER BY display_order ASC`
    );

    const now = new Date();

    return rows.map((r) => {
        const salePercent = Number(r.sale_percent || 0);
        const saleStart = r.sale_starts_at ? new Date(r.sale_starts_at) : null;
        const saleEnd = r.sale_ends_at ? new Date(r.sale_ends_at) : null;

        let saleStatus: 'NONE' | 'INCOMING' | 'ACTIVE' | 'EXPIRED' = 'NONE';
        let finalPrice = Number(r.price_vnd);

        if (salePercent > 0 && saleEnd) {
            if (saleStart && now < saleStart) {
                saleStatus = 'INCOMING';
            } else if (now <= saleEnd) {
                saleStatus = 'ACTIVE';
                finalPrice = Math.round(Number(r.price_vnd) * (1 - salePercent / 100));
            } else {
                saleStatus = 'EXPIRED';
            }
        }

        return {
            id: r.id as string,
            name: r.name as string,
            slug: r.slug as string,
            package_type: r.package_type as string,
            tier: r.tier as string | null,
            price_vnd: Number(r.price_vnd),
            sale_percent: salePercent,
            sale_starts_at: r.sale_starts_at ? new Date(r.sale_starts_at).toISOString() : null,
            sale_ends_at: r.sale_ends_at ? new Date(r.sale_ends_at).toISOString() : null,
            final_price_vnd: finalPrice,
            sale_status: saleStatus,
            coin_amount: Number(r.coin_amount || 0),
            diamond_amount: Number(r.diamond_amount || 0),
            duration_days: r.duration_days ? Number(r.duration_days) : null,
        };
    });
}

export async function adminSetPackageSale(data: {
    packageId: string;
    salePercent: number;
    saleStartsAt?: string | null;
    saleEndsAt?: string | null;
}) {
    const { packageId, salePercent, saleStartsAt, saleEndsAt } = data;

    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, name, price_vnd FROM credit_packages WHERE id = ?`,
        [packageId]
    );
    if (rows.length === 0) {
        throw new AppError('Gói cước không tồn tại', 404);
    }
    const pkg = rows[0];

    // Xóa giảm giá
    if (salePercent <= 0) {
        await pool.execute(
            `UPDATE credit_packages
             SET sale_percent = 0, sale_starts_at = NULL, sale_ends_at = NULL
             WHERE id = ?`,
            [packageId]
        );
        return { message: `Đã hủy bỏ giảm giá cho gói ${pkg.name}` };
    }

    if (salePercent > 100) {
        throw new AppError('Tỷ lệ giảm giá không hợp lệ (tối đa 100%)', 400);
    }

    if (!saleEndsAt) {
        throw new AppError('Ngày kết thúc giảm giá là bắt buộc', 400);
    }

    const start = saleStartsAt ? new Date(saleStartsAt) : new Date();
    const end = new Date(saleEndsAt);
    if (start >= end) {
        throw new AppError('Thời gian bắt đầu phải trước thời gian kết thúc', 400);
    }

    await pool.execute(
        `UPDATE credit_packages
         SET sale_percent = ?, sale_starts_at = ?, sale_ends_at = ?
         WHERE id = ?`,
        [salePercent, saleStartsAt ? new Date(saleStartsAt) : null, end, packageId]
    );

    // Đẩy thông báo in-app về sự kiện giảm giá
    const formattedEnd = end.toLocaleDateString('vi-VN');
    pushNotificationToAllActiveUsers({
        type: 'sale',
        title: `Ưu đãi đặc biệt: Gói ${pkg.name} giảm ${salePercent}%`,
        body: `Cơ hội sở hữu gói ${pkg.name} với mức giảm giá ${salePercent}%. Chương trình áp dụng đến hết ngày ${formattedEnd}. Nhấn để xem ngay!`,
    }).catch(() => {});

    return {
        message: `Đã thiết lập giảm giá ${salePercent}% cho gói ${pkg.name} đến ngày ${formattedEnd}`,
    };
}

// ============================================================
// 2. Quản lý Chiến dịch quà tặng (Tặng Coin / Diamond / Vật phẩm)
// ============================================================

export async function adminListRewardCampaigns(): Promise<AdminRewardCampaign[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
            rc.*,
            i.name AS item_name,
            i.type AS item_type,
            i.image_url AS item_image,
            COUNT(ucc.id) AS total_claims
         FROM reward_campaigns rc
         LEFT JOIN items i ON rc.item_id = i.id
         LEFT JOIN user_campaign_claims ucc ON rc.id = ucc.reward_campaign_id
         GROUP BY rc.id
         ORDER BY rc.created_at DESC`
    );

    const now = new Date();

    return rows.map((r) => {
        const start = new Date(r.starts_at);
        const end = new Date(r.ends_at);

        let status: 'UPCOMING' | 'ACTIVE' | 'EXPIRED' = 'ACTIVE';
        if (now < start) status = 'UPCOMING';
        else if (now > end) status = 'EXPIRED';

        return {
            id: r.id as string,
            name: r.name as string,
            description: r.description as string | null,
            coin_amount: Number(r.coin_amount || 0),
            diamond_amount: Number(r.diamond_amount || 0),
            item_id: r.item_id as string | null,
            item_name: r.item_name as string | null,
            item_type: r.item_type as string | null,
            item_image: r.item_image as string | null,
            fallback_coin: Number(r.fallback_coin || 50),
            starts_at: new Date(r.starts_at).toISOString(),
            ends_at: new Date(r.ends_at).toISOString(),
            is_active: Boolean(r.is_active),
            created_at: new Date(r.created_at).toISOString(),
            total_claims: Number(r.total_claims || 0),
            status,
        };
    });
}

export async function adminCreateRewardCampaign(data: {
    name: string;
    description?: string;
    coinAmount: number;
    diamondAmount: number;
    itemId?: string;
    fallbackCoin?: number;
    startsAt: string;
    endsAt: string;
    createdBy?: string;
}) {
    const { name, description, coinAmount, diamondAmount, itemId, fallbackCoin, startsAt, endsAt, createdBy } = data;

    if (!name || name.trim() === '') {
        throw new AppError('Tên chiến dịch quà tặng không được để trống', 400);
    }

    if (coinAmount < 0 || diamondAmount < 0) {
        throw new AppError('Số lượng Coin và Diamond không được âm', 400);
    }

    if (coinAmount === 0 && diamondAmount === 0 && !itemId) {
        throw new AppError('Phải có ít nhất một phần thưởng (Coin, Diamond hoặc Vật phẩm)', 400);
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
        throw new AppError('Khoảng thời gian chiến dịch không hợp lệ', 400);
    }

    const id = uuidv4();
    await pool.execute(
        `INSERT INTO reward_campaigns (
            id, name, description, coin_amount, diamond_amount, item_id,
            fallback_coin, starts_at, ends_at, is_active, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [
            id,
            name.trim(),
            description?.trim() || null,
            coinAmount,
            diamondAmount,
            itemId || null,
            fallbackCoin !== undefined ? fallbackCoin : 50,
            start,
            end,
            createdBy || null,
        ]
    );

    // Đẩy thông báo vào Notification Bell cho tất cả học viên để hiện modal nhận quà
    const rewardDetails: string[] = [];
    if (coinAmount > 0) rewardDetails.push(`${coinAmount.toLocaleString('vi-VN')} Coin`);
    if (diamondAmount > 0) rewardDetails.push(`${diamondAmount.toLocaleString('vi-VN')} Diamond`);
    if (itemId) rewardDetails.push('Vật phẩm độc quyền');

    pushNotificationToAllActiveUsers({
        type: 'reward',
        title: `Quà tặng sự kiện: ${name}`,
        body: `Nhân dịp sự kiện "${name}", LexiCore gửi tặng bạn: ${rewardDetails.join(' + ')}. Nhấn để nhận quà ngay!`,
    }).catch(() => {});

    return { id, message: 'Tạo chiến dịch quà tặng thành công!' };
}

export async function adminToggleRewardCampaign(id: string) {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, is_active FROM reward_campaigns WHERE id = ?`,
        [id]
    );
    if (rows.length === 0) throw new AppError('Chiến dịch quà tặng không tồn tại', 404);

    const nextState = !rows[0].is_active;
    await pool.execute(
        `UPDATE reward_campaigns SET is_active = ? WHERE id = ?`,
        [nextState ? 1 : 0, id]
    );

    return {
        is_active: nextState,
        message: nextState ? 'Đã kích hoạt chiến dịch' : 'Đã tạm dừng chiến dịch',
    };
}

export async function adminDeleteRewardCampaign(id: string) {
    const [result] = await pool.execute(
        `DELETE FROM reward_campaigns WHERE id = ?`,
        [id]
    ) as any;
    if (result.affectedRows === 0) throw new AppError('Chiến dịch quà tặng không tồn tại', 404);
    return { message: 'Đã xóa chiến dịch thành công' };
}

// ============================================================
// 3. Thông báo Hệ thống & Bảo trì Máy chủ
// ============================================================

export async function adminGetSystemAnnouncements(): Promise<SystemAnnouncement[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, type, title, message, is_maintenance_active,
                estimated_end, starts_at, ends_at, is_active, created_at
         FROM system_announcements
         ORDER BY created_at DESC
         LIMIT 30`
    );

    return rows.map((r) => ({
        id: r.id as string,
        type: r.type as 'MAINTENANCE' | 'ANNOUNCEMENT',
        title: r.title as string,
        message: r.message as string,
        is_maintenance_active: Boolean(r.is_maintenance_active),
        estimated_end: r.estimated_end ? new Date(r.estimated_end).toISOString() : null,
        starts_at: r.starts_at ? new Date(r.starts_at).toISOString() : null,
        ends_at: r.ends_at ? new Date(r.ends_at).toISOString() : null,
        is_active: Boolean(r.is_active),
        created_at: new Date(r.created_at).toISOString(),
    }));
}

export async function adminStartMaintenance(data: {
    title: string;
    message: string;
    estimatedEnd?: string | null;
    sendEmail?: boolean;
    createdBy?: string;
}) {
    const { title, message, estimatedEnd, sendEmail, createdBy } = data;

    if (!title || title.trim() === '') {
        throw new AppError('Tiêu đề thông báo bảo trì không được để trống', 400);
    }
    if (!message || message.trim() === '') {
        throw new AppError('Nội dung bảo trì không được để trống', 400);
    }

    // Tắt các chế độ bảo trì đang hoạt động trước đó
    await pool.execute(
        `UPDATE system_announcements SET is_maintenance_active = FALSE WHERE type = 'MAINTENANCE'`
    );

    const id = uuidv4();
    const estDate = estimatedEnd ? new Date(estimatedEnd) : null;

    await pool.execute(
        `INSERT INTO system_announcements (
            id, type, title, message, is_maintenance_active,
            estimated_end, starts_at, is_active, created_by
         ) VALUES (?, 'MAINTENANCE', ?, ?, TRUE, ?, NOW(), TRUE, ?)`,
        [id, title.trim(), message.trim(), estDate, createdBy || null]
    );

    // Xóa cache để middleware checkMaintenance có hiệu lực ngay lập tức
    invalidateMaintenanceCache();

    // Nếu admin chọn gửi email thông báo diện rộng
    if (sendEmail) {
        adminSendEmailBlast({
            subject: `[Thông báo bảo trì] ${title.trim()}`,
            heading: title.trim(),
            message: message.trim(),
            badgeText: 'Bảo trì hệ thống',
            badgeType: 'warning',
            targetAudience: 'ALL',
            createdBy: createdBy || 'admin',
        }).catch((err) => {
            console.error('[Maintenance Email Blast Error] Lỗi khi gửi email bảo trì:', err);
        });
    }

    return { id, message: 'Đã kích hoạt chế độ bảo trì hệ thống thành công!' };
}

export async function adminEndMaintenance(announcementId?: string) {
    if (announcementId) {
        await pool.execute(
            `UPDATE system_announcements SET is_maintenance_active = FALSE WHERE id = ?`,
            [announcementId]
        );
    } else {
        await pool.execute(
            `UPDATE system_announcements SET is_maintenance_active = FALSE WHERE type = 'MAINTENANCE'`
        );
    }

    invalidateMaintenanceCache();
    return { message: 'Đã tắt chế độ bảo trì, hệ thống hoạt động trở lại bình thường!' };
}

// ============================================================
// 4. Gửi Email Diện rộng (Email Blast)
// ============================================================

export async function adminGetEmailBlastLogs(): Promise<EmailBlastLog[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM email_blast_logs ORDER BY created_at DESC LIMIT 20`
    );
    return rows.map((r) => ({
        id: r.id as string,
        subject: r.subject as string,
        target_audience: r.target_audience as any,
        total_recipients: Number(r.total_recipients || 0),
        sent_count: Number(r.sent_count || 0),
        failed_count: Number(r.failed_count || 0),
        status: r.status as any,
        heading: r.heading as string,
        message: r.message as string,
        badge_text: r.badge_text as string | null,
        badge_type: r.badge_type as any,
        action_text: r.action_text as string | null,
        action_url: r.action_url as string | null,
        created_at: new Date(r.created_at).toISOString(),
        completed_at: r.completed_at ? new Date(r.completed_at).toISOString() : null,
    }));
}

export async function adminSendEmailBlast(data: {
    subject: string;
    heading: string;
    message: string;
    badgeText?: string;
    badgeType?: 'info' | 'warning' | 'danger' | 'success';
    actionText?: string;
    actionUrl?: string;
    targetAudience: 'ALL' | 'CREATORS' | 'STARTER' | 'PRO' | 'ELITE' | 'FREE';
    createdBy?: string;
}) {
    const { subject, heading, message, badgeText, badgeType, actionText, actionUrl, targetAudience, createdBy } = data;

    if (!subject || subject.trim() === '') throw new AppError('Chủ đề email không được để trống', 400);
    if (!heading || heading.trim() === '') throw new AppError('Tiêu đề email không được để trống', 400);
    if (!message || message.trim() === '') throw new AppError('Nội dung email không được để trống', 400);

    // 1. Truy vấn danh sách email theo đối tượng mục tiêu
    let query = `SELECT email, full_name FROM users WHERE status = 'ACTIVE'`;
    const queryParams: any[] = [];

    if (targetAudience === 'CREATORS') {
        query += ` AND role = 'CONTENT_CREATOR'`;
    } else if (targetAudience === 'STARTER' || targetAudience === 'PRO' || targetAudience === 'ELITE') {
        query = `
            SELECT u.email, u.full_name
            FROM users u
            JOIN user_subscription s ON u.id = s.user_id
            WHERE u.status = 'ACTIVE' AND s.status = 'ACTIVE' AND s.tier = ?
        `;
        queryParams.push(targetAudience);
    } else if (targetAudience === 'FREE') {
        query = `
            SELECT u.email, u.full_name
            FROM users u
            LEFT JOIN user_subscription s ON u.id = s.user_id AND s.status = 'ACTIVE'
            WHERE u.status = 'ACTIVE' AND s.id IS NULL
        `;
    }

    const [recipients] = await pool.execute<RowDataPacket[]>(query, queryParams);
    const totalRecipients = recipients.length;

    const blastId = uuidv4();
    await pool.execute(
        `INSERT INTO email_blast_logs (
            id, subject, target_audience, total_recipients, sent_count, failed_count,
            status, heading, message, badge_text, badge_type, action_text, action_url,
            created_by, started_at
         ) VALUES (?, ?, ?, ?, 0, 0, 'SENDING', ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
            blastId,
            subject.trim(),
            targetAudience,
            totalRecipients,
            heading.trim(),
            message.trim(),
            badgeText?.trim() || null,
            badgeType || 'info',
            actionText?.trim() || null,
            actionUrl?.trim() || null,
            createdBy || null,
        ]
    );

    if (totalRecipients === 0) {
        await pool.execute(
            `UPDATE email_blast_logs SET status = 'DONE', completed_at = NOW() WHERE id = ?`,
            [blastId]
        );
        return {
            blastId,
            totalRecipients: 0,
            message: 'Không tìm thấy người dùng nào phù hợp với bộ lọc đã chọn',
        };
    }

    // 2. Chạy tiến trình nền gửi email theo từng đợt (không chặn phản hồi HTTP của admin)
    setImmediate(async () => {
        let sentCount = 0;
        let failedCount = 0;
        const batchSize = 10; // Mỗi đợt 10 email

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);

            await Promise.all(
                batch.map(async (user) => {
                    try {
                        await sendDirectCustomEmail({
                            toEmail: user.email,
                            fullName: user.full_name,
                            subject: subject.trim(),
                            heading: heading.trim(),
                            badgeText: badgeText?.trim(),
                            badgeType: badgeType || 'info',
                            message: message.trim(),
                            actionText: actionText?.trim(),
                            actionUrl: actionUrl?.trim(),
                        });
                        sentCount++;
                    } catch (err) {
                        failedCount++;
                        console.error(`[Blast Failed] Gửi email đến ${user.email} thất bại:`, err);
                    }
                })
            );

            // Cập nhật tiến độ vào DB sau mỗi đợt
            await pool.execute(
                `UPDATE email_blast_logs SET sent_count = ?, failed_count = ? WHERE id = ?`,
                [sentCount, failedCount, blastId]
            );

            // Tạm dừng 1 giây giữa các đợt để tránh vượt giới hạn tốc độ của nhà cung cấp
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Hoàn tất toàn bộ tiến trình
        await pool.execute(
            `UPDATE email_blast_logs SET status = 'DONE', completed_at = NOW() WHERE id = ?`,
            [blastId]
        );
        console.log(`[Email Blast Finished] Id ${blastId}: Gửi thành công ${sentCount}/${totalRecipients}, thất bại ${failedCount}`);
    });

    return {
        blastId,
        totalRecipients,
        message: `Đã bắt đầu gửi email diện rộng đến ${totalRecipients} người dùng. Tiến độ sẽ được cập nhật trong bảng lịch sử.`,
    };
}
