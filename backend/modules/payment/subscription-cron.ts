import cron from 'node-cron';
import { pool } from '../../config/mysql';
import {
    getExpiringSubscriptions,
    expireSubscriptions,
    deductWalletVnd,
    activateSubscription,
} from '../payment/payment.repository';

// ============================================================
// Auto-renew: chạy hàng ngày lúc 00:05 giờ Việt Nam
// ============================================================

async function processAutoRenew(): Promise<void> {
    console.log('[Subscription Cron] Bat dau kiem tra tu dong gia han...');

    // 1. Expire các gói đã hết hạn
    const expired = await expireSubscriptions();
    if (expired > 0) {
        console.log(`[Subscription Cron] Da danh dau ${expired} goi het han.`);
    }

    // 2. Lấy gói sắp hết hạn trong 24h + auto_renew = TRUE
    const expiring = await getExpiringSubscriptions(1);
    if (expiring.length === 0) {
        console.log('[Subscription Cron] Khong co goi nao can gia han hom nay.');
        return;
    }

    console.log(`[Subscription Cron] Tim thay ${expiring.length} goi can tu dong gia han.`);

    for (const sub of expiring) {
        if (!sub.auto_renew) continue;

        const conn = await (pool as any).getConnection();
        try {
            await conn.beginTransaction();

            const price = Number(sub.price_vnd);
            const ok    = await deductWalletVnd(conn, sub.user_id, price);

            if (!ok) {
                // Không đủ số dư: tắt auto_renew, để gói tự expire
                await conn.execute(
                    `UPDATE subscriptions SET auto_renew = FALSE, updated_at = NOW() WHERE user_id = ?`,
                    [sub.user_id]
                );
                console.warn(
                    `[Subscription Cron] User ${sub.user_id} (${sub.email}) khong du so du Vi. Auto-renew da tat.`
                );
                // Ghi notification in-app
                const { v4: uuidv4 } = await import('uuid');
                await conn.execute(
                    `INSERT INTO notifications (id, user_id, type, title, body)
                     VALUES (?, ?, 'subscription', ?, ?)`,
                    [
                        uuidv4(),
                        sub.user_id,
                        'Khong the tu dong gia han goi hoi vien',
                        `So du Vi LexiCore cua ban (${Number(sub.vnd_balance).toLocaleString('vi-VN')}d) khong du de gia han goi ${sub.package_name}. Vui long nap them hoac gia han thu cong.`,
                    ]
                );
                await conn.commit();
                continue;
            }

            // Gia hạn gói: extend expires_at
            const { duration_days } = sub;
            const newExpiry = new Date(Date.now() + Number(duration_days) * 86400 * 1000);
            await conn.execute(
                `UPDATE subscriptions 
                 SET expires_at = ?, status = 'ACTIVE', updated_at = NOW()
                 WHERE user_id = ?`,
                [newExpiry, sub.user_id]
            );

            // Tạo payment_order ghi lại lịch sử gia hạn
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
                    'Goi hoi vien da duoc gia han',
                    `Goi ${sub.package_name} cua ban da duoc tu dong gia han den ${newExpiry.toLocaleDateString('vi-VN')}. So tien tru: ${price.toLocaleString('vi-VN')}d.`,
                ]
            );

            await conn.commit();
            console.log(`[Subscription Cron] Da gia han goi cho user ${sub.user_id} (${sub.email}).`);
        } catch (err) {
            await conn.rollback();
            console.error(`[Subscription Cron] Loi khi gia han cho user ${sub.user_id}:`, err);
        } finally {
            conn.release();
        }
    }
}

// ============================================================
// Email nhắc sắp hết hạn: chạy hàng ngày lúc 09:00
// ============================================================

async function sendExpiryReminders(): Promise<void> {
    // Lấy gói còn 3 ngày nữa hết hạn, email_reminder = TRUE
    const [rows] = await pool.execute(
        `SELECT s.user_id, s.expires_at, u.email, u.full_name, cp.name as package_name
         FROM subscriptions s
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
            // Ghi in-app notification (email có thể thêm sau qua mailer)
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
        } catch (err) {
            console.error(`[Subscription Cron] Loi gui nhac cho user ${sub.user_id}:`, err);
        }
    }
}

// ============================================================
// Init
// ============================================================

export const initSubscriptionCron = () => {
    // Auto-renew: 00:05 moi ngay
    cron.schedule('5 0 * * *', async () => {
        await processAutoRenew();
    }, { timezone: 'Asia/Ho_Chi_Minh' });

    // Nhac sap het han: 09:00 moi ngay
    cron.schedule('0 9 * * *', async () => {
        await sendExpiryReminders();
    }, { timezone: 'Asia/Ho_Chi_Minh' });

    console.log('Subscription Cron da khoi dong (auto-renew 00:05, nhac han 09:00 ICT).');
};

