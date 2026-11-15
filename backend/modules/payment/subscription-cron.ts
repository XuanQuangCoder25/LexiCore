import cron from 'node-cron';
import { pool } from '../../config/mysql';
import { sendSubscriptionExpiryEmail } from '../../utils/mailer';
import {
    getExpiringSubscriptions,
    expireSubscriptions,
    deductWalletVnd,
    activateSubscription,
    cleanupOldOrders,
} from '../payment/payment.repository';

// ============================================================
// Auto-renew: chạy hàng ngày lúc 00:05 giờ Việt Nam
// ============================================================

async function processAutoRenew(): Promise<void> {
    console.log('[Subscription Cron] Bắt đầu kiểm tra tự động gia hạn...');

    // 1. Lấy danh sách gói cần tự động gia hạn (gói trả phí sắp hết hạn hoặc vừa hết hạn trong 24h qua có auto_renew = TRUE)
    // Xử lý gia hạn TRƯỚC KHI đánh dấu expire để không làm mất lượt của người dùng
    const expiring = await getExpiringSubscriptions(1);
    if (expiring.length > 0) {
        console.log(`[Subscription Cron] Tìm thấy ${expiring.length} gói đủ điều kiện tự động gia hạn.`);

        for (const sub of expiring) {
            if (!sub.auto_renew) continue;

            const conn = await (pool as any).getConnection();
            try {
                await conn.beginTransaction();

                const price = Number(sub.price_vnd);
                const ok = await deductWalletVnd(conn, sub.user_id, price);

                if (!ok) {
                    // Không đủ số dư: tắt auto_renew, để gói tự expire
                    await conn.execute(
                        `UPDATE user_subscription SET auto_renew = FALSE, updated_at = NOW() WHERE user_id = ?`,
                        [sub.user_id]
                    );
                    console.warn(
                        `[Subscription Cron] User ${sub.user_id} (${sub.email}) không đủ số dư Ví. Đã tắt auto-renew.`
                    );
                    // Ghi notification in-app
                    const { v4: uuidv4 } = await import('uuid');
                    await conn.execute(
                        `INSERT INTO notifications (id, user_id, type, title, body)
                         VALUES (?, ?, 'subscription', ?, ?)`,
                        [
                            uuidv4(),
                            sub.user_id,
                            'Không thể tự động gia hạn gói hội viên',
                            `Số dư Ví LexiCore của bạn (${Number(sub.vnd_balance).toLocaleString('vi-VN')}đ) không đủ để gia hạn gói ${sub.package_name}. Vui lòng nạp thêm tiền vào ví để duy trì quyền lợi.`,
                        ]
                    );
                    await conn.commit();
                    continue;
                }

                // Gia hạn đúng gói đang sử dụng: cộng nối tiếp vào thời hạn hiện tại để không mất ngày
                const durationDays = Number(sub.pkg_duration_days || sub.duration_days || 30);
                const currentExpiryTime = new Date(sub.expires_at).getTime();
                const baseTime = currentExpiryTime > Date.now() ? currentExpiryTime : Date.now();
                const newExpiry = new Date(baseTime + durationDays * 86400 * 1000);

                await conn.execute(
                    `UPDATE user_subscription 
                     SET expires_at = ?, status = 'ACTIVE', updated_at = NOW()
                     WHERE user_id = ?`,
                    [newExpiry, sub.user_id]
                );

                // Tạo payment_order ghi lại lịch sử gia hạn đúng gói đó
                const { v4: uuidv4 } = await import('uuid');
                const orderId = uuidv4();
                await conn.execute(
                    `INSERT INTO payment_orders (id, user_id, package_id, amount_vnd, gateway, status, gateway_txn_id)
                     VALUES (?, ?, ?, ?, 'WALLET', 'SUCCESS', ?)`,
                    [orderId, sub.user_id, sub.package_id, price, `RENEW_${orderId.slice(0, 8).toUpperCase()}`]
                );

                // Thông báo gia hạn thành công
                await conn.execute(
                    `INSERT INTO notifications (id, user_id, type, title, body)
                     VALUES (?, ?, 'subscription', ?, ?)`,
                    [
                        uuidv4(),
                        sub.user_id,
                        'Gói hội viên đã được gia hạn',
                        `Gói ${sub.package_name} của bạn đã được tự động gia hạn thành công đến ngày ${newExpiry.toLocaleDateString('vi-VN')}. Số tiền đã trừ: ${price.toLocaleString('vi-VN')}đ.`,
                    ]
                );

                await conn.commit();
                console.log(`[Subscription Cron] Đã gia hạn thành công gói ${sub.package_name} cho user ${sub.user_id} (${sub.email}).`);
            } catch (err) {
                await conn.rollback();
                console.error(`[Subscription Cron] Lỗi khi gia hạn cho user ${sub.user_id}:`, err);
            } finally {
                conn.release();
            }
        }
    } else {
        console.log('[Subscription Cron] Không có gói nào cần tự động gia hạn hôm nay.');
    }

    // 2. Sau khi đã xử lý auto-renew xong, đánh dấu EXPIRED cho các gói quá hạn còn lại (những người không bật auto-renew hoặc không đủ tiền)
    const expired = await expireSubscriptions();
    if (expired > 0) {
        console.log(`[Subscription Cron] Đã đánh dấu ${expired} gói hết hạn.`);
    }
}

// ============================================================
// Email nhắc sắp hết hạn: chạy hàng ngày lúc 09:00
// ============================================================

async function sendExpiryReminders(): Promise<void> {
    // Lấy gói còn 3 ngày nữa hết hạn, email_reminder = TRUE
    const [rows] = await pool.execute(
        `SELECT s.user_id, s.expires_at, u.email, u.full_name, cp.name as package_name
         FROM user_subscription s
         JOIN users u            ON s.user_id    = u.id
         JOIN credit_packages cp ON s.package_id = cp.id
         WHERE s.status = 'ACTIVE'
           AND s.email_reminder = TRUE
           AND s.expires_at BETWEEN DATE_ADD(NOW(), INTERVAL 2 DAY) AND DATE_ADD(NOW(), INTERVAL 3 DAY)`
    ) as any;

    const expiring = rows as any[];
    console.log(`[Subscription Cron] Nhac han goi: ${expiring.length} nguoi dung.`);

    for (const sub of expiring) {
        try {
            // 1. Ghi in-app notification
            const { v4: uuidv4 } = await import('uuid');
            await pool.execute(
                `INSERT INTO notifications (id, user_id, type, title, body)
                 VALUES (?, ?, 'subscription', ?, ?)`,
                [
                    uuidv4(),
                    sub.user_id,
                    'Goi hoi vien sap het han',
                    `Goi ${sub.package_name} cua ban se het han vao ${new Date(sub.expires_at).toLocaleDateString('vi-VN')}. Hay gia han de khong gian doan.`,
                ]
            );

            // 2. Gửi email thông báo nhắc nhở
            if (sub.email) {
                await sendSubscriptionExpiryEmail({
                    toEmail: sub.email,
                    fullName: sub.full_name,
                    packageName: sub.package_name,
                    expiresAt: sub.expires_at,
                });
            }
        } catch (err) {
            console.error(`[Subscription Cron] Loi gui nhac cho user ${sub.user_id}:`, err);
        }
    }
}

// ============================================================
// Dọn dẹp khuyến mãi hết hạn: chạy lúc 00:00 hàng ngày
// ============================================================

async function cleanupExpiredSales(): Promise<void> {
    try {
        console.log('[Subscription Cron] Bat dau quét don dep khuyen mai het han...');
        const [result] = await pool.execute(
            `UPDATE credit_packages 
             SET sale_percent = 0, sale_ends_at = NULL 
             WHERE sale_ends_at IS NOT NULL AND sale_ends_at < NOW()`
        ) as any;

        if (result.affectedRows > 0) {
            console.log(`[Subscription Cron] 🧹 Da don dep ${result.affectedRows} goi khuyen mai het han trong DB.`);
        }
    } catch (err) {
        console.error('[Subscription Cron] Loi don dep khuyen mai het han:', err);
    }
}

// ============================================================
// Dọn dẹp đơn hàng PENDING > 24h và CANCELLED > 7 ngày
// ============================================================

async function cleanupHousekeepingOrders(): Promise<void> {
    try {
        console.log('[Subscription Cron] Bắt đầu dọn dẹp đơn hàng PENDING và CANCELLED cũ...');
        const result = await cleanupOldOrders();
        if (result.deletedPending > 0 || result.deletedCancelled > 0) {
            console.log(
                `[Subscription Cron] 🧹 Đã dọn dẹp ${result.deletedPending} đơn PENDING quá 24h và ${result.deletedCancelled} đơn CANCELLED quá 7 ngày.`
            );
        }
    } catch (err) {
        console.error('[Subscription Cron] Lỗi khi dọn dẹp đơn hàng cũ:', err);
    }
}

// ============================================================
// Init
// ============================================================

export const initSubscriptionCron = () => {
    // Dọn dẹp khuyến mãi hết hạn: 00:00 mỗi ngày
    cron.schedule('0 0 * * *', async () => {
        await cleanupExpiredSales();
    }, { timezone: 'Asia/Ho_Chi_Minh' });

    // Auto-renew: 00:05 mỗi ngày
    cron.schedule('5 0 * * *', async () => {
        await processAutoRenew();
    }, { timezone: 'Asia/Ho_Chi_Minh' });

    // Dọn dẹp đơn hàng rác PENDING (>24h) và CANCELLED (>7d): 00:30 mỗi ngày
    cron.schedule('30 0 * * *', async () => {
        await cleanupHousekeepingOrders();
    }, { timezone: 'Asia/Ho_Chi_Minh' });

    // Nhắc sắp hết hạn (3 ngày): 09:00 mỗi ngày
    cron.schedule('0 9 * * *', async () => {
        await sendExpiryReminders();
    }, { timezone: 'Asia/Ho_Chi_Minh' });

    // Chạy dọn dẹp 1 lần khi server vừa khởi động
    cleanupHousekeepingOrders().catch(() => {});

    console.log('Subscription Cron đã khởi động (dọn dẹp 00:00, auto-renew 00:05, housekeeping 00:30, nhắn hạn 09:00 ICT).');
};

