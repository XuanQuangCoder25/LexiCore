import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';

// ============================================================
// Types
// ============================================================

export interface CreditPackage {
    id: string;
    name: string;
    slug: string;
    package_type: 'SUBSCRIPTION' | 'COIN_PACK' | 'DIAMOND_PACK' | 'BUNDLE';
    tier: 'STARTER' | 'PRO' | 'ELITE' | 'TRIAL' | null;
    price_vnd: number;
    price_usd: number;
    coin_amount: number;
    diamond_amount: number;
    duration_days: number | null;
    sale_percent: number;
    sale_ends_at: string | null;
    features: string[] | null;
    display_order: number;
    is_active: boolean;
    is_trial: boolean;
}

export interface PaymentOrder {
    id: string;
    user_id: string;
    package_id: string;
    amount_vnd: number;
    gateway: 'SEPAY' | 'WALLET' | 'MOCK';
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
    gateway_txn_id: string | null;
    gateway_response: object | null;
    payment_reference: string | null;
    metadata: object | null;
    created_at: string;
}

export interface Subscription {
    id: string;
    user_id: string;
    package_id: string;
    tier: 'STARTER' | 'PRO' | 'ELITE' | 'TRIAL';
    started_at: string;
    expires_at: string;
    auto_renew: boolean;
    email_reminder: boolean;
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
}

export interface UserTransaction {
    id: string;
    date: string;        // định dạng "DD/MM/YYYY HH:mm"
    description: string; // tên gói hoặc nội dung
    amountVnd: number;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
}

// ============================================================
// Packages
// ============================================================

export async function getAllPackages(): Promise<CreditPackage[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM credit_packages WHERE is_active = TRUE ORDER BY display_order ASC`
    );
    return rows.map(row => ({
        ...row,
        features: row.features ? JSON.parse(row.features as string) : null,
        is_trial: Boolean(row.is_trial),
    })) as CreditPackage[];
}

export async function getPackageById(id: string): Promise<CreditPackage | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM credit_packages WHERE id = ? AND is_active = TRUE`,
        [id]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
        ...row,
        features: row.features ? JSON.parse(row.features as string) : null,
        is_trial: Boolean(row.is_trial),
    } as CreditPackage;
}

// ============================================================
// Payment Orders
// ============================================================

export async function createPaymentOrder(
    userId: string,
    packageId: string,
    amountVnd: number,
    gateway: PaymentOrder['gateway'],
    paymentReference?: string
): Promise<string> {
    const orderId = uuidv4();
    await pool.execute(
        `INSERT INTO payment_orders (id, user_id, package_id, amount_vnd, gateway, payment_reference, status)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
        [orderId, userId, packageId, amountVnd, gateway, paymentReference || null]
    );
    return orderId;
}

export async function getOrderByReference(paymentReference: string): Promise<any | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT po.*, cp.coin_amount, cp.diamond_amount, cp.package_type, cp.duration_days, cp.tier, cp.name as package_name
         FROM payment_orders po
         JOIN credit_packages cp ON po.package_id = cp.id
         WHERE po.payment_reference = ? LIMIT 1`,
        [paymentReference]
    );
    if (rows.length === 0) return null;
    return rows[0];
}

export async function updateOrderStatus(
    orderId: string,
    status: PaymentOrder['status'],
    gatewayTxnId?: string,
    gatewayResponse?: object
): Promise<void> {
    await pool.execute(
        `UPDATE payment_orders 
         SET status = ?, gateway_txn_id = ?, gateway_response = ?, updated_at = NOW()
         WHERE id = ?`,
        [status, gatewayTxnId || null, gatewayResponse ? JSON.stringify(gatewayResponse) : null, orderId]
    );
}

// Lấy lịch sử đơn của user (hiển thị trong TransactionTable)
export async function getUserOrders(userId: string, limit = 20): Promise<PaymentOrder[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT po.*, cp.name as package_name, cp.package_type
         FROM payment_orders po
         JOIN credit_packages cp ON po.package_id = cp.id
         WHERE po.user_id = ?
         ORDER BY po.created_at DESC
         LIMIT ?`,
        [userId, limit]
    );
    return rows as PaymentOrder[];
}

// Lấy lịch sử giao dịch đã format cho frontend
export async function getUserTransactions(userId: string, limit = 30): Promise<UserTransaction[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
            po.id,
            po.created_at,
            cp.name         AS package_name,
            cp.package_type,
            cp.coin_amount,
            cp.diamond_amount,
            po.amount_vnd,
            po.status
         FROM payment_orders po
         JOIN credit_packages cp ON po.package_id = cp.id
         WHERE po.user_id = ?
         ORDER BY po.created_at DESC
         LIMIT ?`,
        [userId, limit]
    );

    return rows.map((r) => {
        const d = new Date(r.created_at as string);
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

        // Tạo nội dung mô tả
        let description = r.package_name as string;
        if (r.package_type === 'COIN_PACK' && r.coin_amount) {
            description = `Nap ${Number(r.coin_amount).toLocaleString('vi-VN')} Coin`;
        } else if (r.package_type === 'DIAMOND_PACK' && r.diamond_amount) {
            description = `Nap ${Number(r.diamond_amount).toLocaleString('vi-VN')} Diamond`;
        } else if (r.package_type === 'SUBSCRIPTION') {
            description = `Goi ${r.package_name} - 1 thang`;
        }

        const status = (r.status as string).toUpperCase();
        return {
            id: r.id as string,
            date: dateStr,
            description,
            amountVnd: Number(r.amount_vnd),
            status: (status === 'SUCCESS' ? 'SUCCESS' : status === 'PENDING' ? 'PENDING' : 'FAILED') as UserTransaction['status'],
        };
    });
}

// ============================================================
// Subscription
// ============================================================

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM user_subscription WHERE user_id = ? AND status = 'ACTIVE'`,
        [userId]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
        ...r,
        auto_renew: Boolean(r.auto_renew),
        email_reminder: Boolean(r.email_reminder),
    } as Subscription;
}

// Upsert subscription (tạo mới hoặc cập nhật nếu đã có)
export async function activateSubscription(
    conn: any,
    userId: string,
    packageId: string,
    tier: Subscription['tier'],
    durationDays: number
): Promise<void> {
    const subId = uuidv4();
    const expiresAt = new Date(Date.now() + durationDays * 86400 * 1000);

    await conn.execute(
        `INSERT INTO user_subscription (id, user_id, package_id, tier, duration_days, started_at, expires_at, status)
         VALUES (?, ?, ?, ?, ?, NOW(), ?, 'ACTIVE')
         ON DUPLICATE KEY UPDATE
             package_id    = VALUES(package_id),
             tier          = VALUES(tier),
             duration_days = VALUES(duration_days),
             started_at    = NOW(),
             expires_at    = VALUES(expires_at),
             status        = 'ACTIVE',
             updated_at    = NOW()`,
        [subId, userId, packageId, tier, durationDays, expiresAt]
    );
}

export async function updateSubscriptionSettings(
    userId: string,
    autoRenew?: boolean,
    emailReminder?: boolean
): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (autoRenew !== undefined) { fields.push('auto_renew = ?');     values.push(autoRenew ? 1 : 0); }
    if (emailReminder !== undefined) { fields.push('email_reminder = ?'); values.push(emailReminder ? 1 : 0); }

    if (fields.length === 0) return;
    values.push(userId);

    await pool.execute(
        `UPDATE user_subscription SET ${fields.join(', ')}, updated_at = NOW() WHERE user_id = ?`,
        values
    );
}

// Đánh dấu các subscription hết hạn (dành cho cron)
export async function expireSubscriptions(): Promise<number> {
    const [result] = await pool.execute(
        `UPDATE user_subscription SET status = 'EXPIRED', updated_at = NOW()
         WHERE status = 'ACTIVE' AND expires_at < NOW()`
    ) as any;
    return result.affectedRows as number;
}

// Lấy danh sách subscription sắp hết hạn trong vòng N ngày (dành cho cron)
export async function getExpiringSubscriptions(withinDays: number): Promise<any[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT s.*, u.email, u.full_name, cp.price_vnd, cp.name as package_name, w.vnd_balance
         FROM user_subscription s
         JOIN users u           ON s.user_id    = u.id
         JOIN credit_packages cp ON s.package_id = cp.id
         JOIN wallets w         ON s.user_id    = w.user_id
         WHERE s.status = 'ACTIVE'
           AND s.expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)`,
        [withinDays]
    );
    return rows as any[];
}

// ============================================================
// Wallet VND (Ví LexiCore)
// ============================================================

export async function getVndBalance(userId: string): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT vnd_balance FROM wallets WHERE user_id = ?`,
        [userId]
    );
    return rows.length > 0 ? Number(rows[0].vnd_balance) : 0;
}

export async function topupWalletVnd(conn: any, userId: string, amount: number): Promise<void> {
    await conn.execute(
        `UPDATE wallets SET vnd_balance = vnd_balance + ? WHERE user_id = ?`,
        [amount, userId]
    );
}

// Trừ tiền ví, trả về false nếu không đủ số dư
export async function deductWalletVnd(conn: any, userId: string, amount: number): Promise<boolean> {
    const [result] = await conn.execute(
        `UPDATE wallets SET vnd_balance = vnd_balance - ?
         WHERE user_id = ? AND vnd_balance >= ?`,
        [amount, userId, amount]
    ) as any;
    return result.affectedRows === 1;
}

// ============================================================
// Coin & Diamond
// ============================================================

export async function creditWalletAfterPurchase(
    conn: any,
    userId: string,
    coinAmount: number,
    diamondAmount: number
): Promise<void> {
    await conn.execute(
        `UPDATE wallets 
         SET coin_balance    = coin_balance    + ?,
             diamond_balance = diamond_balance + ?
         WHERE user_id = ?`,
        [coinAmount, diamondAmount, userId]
    );
}

// ============================================================
// Trial
// ============================================================

export async function hasUsedTrial(userId: string): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT has_used_trial FROM users WHERE id = ?`,
        [userId]
    );
    return rows.length > 0 && Boolean(rows[0].has_used_trial);
}

export async function markTrialUsed(conn: any, userId: string): Promise<void> {
    await conn.execute(
        `UPDATE users SET has_used_trial = TRUE WHERE id = ?`,
        [userId]
    );
}
