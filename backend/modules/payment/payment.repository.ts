import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';

export interface CreditPackage {
    id: string;
    name: string;
    slug: string;
    package_type: 'SUBSCRIPTION' | 'COIN_PACK' | 'DIAMOND_PACK' | 'BUNDLE';
    tier: 'STARTER' | 'PRO' | 'ELITE' | null;
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
}

export interface PaymentOrder {
    id: string;
    user_id: string;
    package_id: string;
    amount_vnd: number;
    gateway: 'VNPAY' | 'MOMO' | 'STRIPE' | 'MOCK';
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
    gateway_txn_id: string | null;
    gateway_response: object | null;
    metadata: object | null;
    created_at: string;
}

// Lấy tất cả gói active, nhóm theo package_type
export async function getAllPackages(): Promise<CreditPackage[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM credit_packages WHERE is_active = TRUE ORDER BY display_order ASC`
    );
    return rows.map(row => ({
        ...row,
        features: row.features ? JSON.parse(row.features as string) : null,
    })) as CreditPackage[];
}

// Lấy 1 gói theo id
export async function getPackageById(id: string): Promise<CreditPackage | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM credit_packages WHERE id = ? AND is_active = TRUE`,
        [id]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return { ...row, features: row.features ? JSON.parse(row.features as string) : null } as CreditPackage;
}

// Tạo đơn thanh toán mới
export async function createPaymentOrder(
    userId: string,
    packageId: string,
    amountVnd: number,
    gateway: PaymentOrder['gateway']
): Promise<string> {
    const orderId = uuidv4();
    await pool.execute(
        `INSERT INTO payment_orders (id, user_id, package_id, amount_vnd, gateway, status)
         VALUES (?, ?, ?, ?, ?, 'PENDING')`,
        [orderId, userId, packageId, amountVnd, gateway]
    );
    return orderId;
}

// Cập nhật trạng thái đơn sau khi gateway callback
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

// Cộng coin/diamond vào ví sau khi thanh toán thành công
export async function creditWalletAfterPurchase(
    conn: any,
    userId: string,
    coinAmount: number,
    diamondAmount: number
): Promise<void> {
    await conn.execute(
        `UPDATE wallets 
         SET coin_balance = coin_balance + ?,
             diamond_balance = diamond_balance + ?
         WHERE user_id = ?`,
        [coinAmount, diamondAmount, userId]
    );
}

// Lịch sử đơn của user
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