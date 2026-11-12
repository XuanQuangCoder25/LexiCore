import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';

export interface SubscriptionCampaign {
    id: string;
    name: string;
    campaign_type: 'FREE_TRIAL' | 'DISCOUNT_SALE';
    target_package_id: string | null;
    custom_tier: 'STARTER' | 'PRO' | 'ELITE' | null;
    custom_duration_days: number | null;
    discount_percent: number;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    target_package_name?: string | null;
    target_tier?: string | null;
    target_duration_days?: number | null;
    target_features?: any | null;
    total_claims?: number;
}

// ── Admin: Lấy tất cả chiến dịch kèm thống kê lượt nhận ─────────────────────
export async function getAllCampaigns(): Promise<SubscriptionCampaign[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
            sc.*,
            cp.name AS target_package_name,
            cp.tier AS target_tier,
            cp.duration_days AS target_duration_days,
            COUNT(ucc.id) AS total_claims
         FROM subscription_campaigns sc
         LEFT JOIN credit_packages cp ON sc.target_package_id = cp.id
         LEFT JOIN user_campaign_claims ucc ON sc.id = ucc.campaign_id
         GROUP BY sc.id
         ORDER BY sc.created_at DESC`
    );
    return rows.map((r) => ({
        ...r,
        is_active: Boolean(r.is_active),
        discount_percent: Number(r.discount_percent),
        custom_duration_days: r.custom_duration_days ? Number(r.custom_duration_days) : null,
        total_claims: Number(r.total_claims || 0),
    })) as SubscriptionCampaign[];
}

// ── Lấy chi tiết chiến dịch theo ID ────────────────────────────────────────
export async function getCampaignById(id: string): Promise<SubscriptionCampaign | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
            sc.*,
            cp.name AS target_package_name,
            cp.tier AS target_tier,
            cp.duration_days AS target_duration_days,
            cp.features AS target_features
         FROM subscription_campaigns sc
         LEFT JOIN credit_packages cp ON sc.target_package_id = cp.id
         WHERE sc.id = ? LIMIT 1`,
        [id]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
        ...r,
        is_active: Boolean(r.is_active),
        discount_percent: Number(r.discount_percent),
        custom_duration_days: r.custom_duration_days ? Number(r.custom_duration_days) : null,
    } as SubscriptionCampaign;
}

// ── Lấy các chiến dịch đang có hiệu lực trong thời gian thực ────────────────
export async function getActiveCampaigns(): Promise<SubscriptionCampaign[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
            sc.*,
            cp.name AS target_package_name,
            cp.tier AS target_tier,
            cp.duration_days AS target_duration_days,
            cp.features AS target_features
         FROM subscription_campaigns sc
         LEFT JOIN credit_packages cp ON sc.target_package_id = cp.id
         WHERE sc.is_active = TRUE
           AND sc.starts_at <= NOW()
           AND sc.ends_at >= NOW()
         ORDER BY sc.created_at DESC`
    );
    return rows.map((r) => ({
        ...r,
        is_active: Boolean(r.is_active),
        discount_percent: Number(r.discount_percent),
        custom_duration_days: r.custom_duration_days ? Number(r.custom_duration_days) : null,
    })) as SubscriptionCampaign[];
}

// ── Admin: Tạo chiến dịch mới ──────────────────────────────────────────────
export async function createCampaign(data: {
    name: string;
    campaign_type: 'FREE_TRIAL' | 'DISCOUNT_SALE';
    target_package_id?: string | null;
    custom_tier?: 'STARTER' | 'PRO' | 'ELITE' | null;
    custom_duration_days?: number | null;
    discount_percent?: number;
    starts_at: string;
    ends_at: string;
    is_active?: boolean;
}): Promise<string> {
    const id = uuidv4();
    await pool.execute(
        `INSERT INTO subscription_campaigns (
            id, name, campaign_type, target_package_id, custom_tier, 
            custom_duration_days, discount_percent, starts_at, ends_at, is_active
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            data.name,
            data.campaign_type,
            data.target_package_id || null,
            data.custom_tier || null,
            data.custom_duration_days || null,
            data.discount_percent || 0,
            data.starts_at,
            data.ends_at,
            data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
        ]
    );
    return id;
}

// ── Admin: Bật/tắt trạng thái chiến dịch ───────────────────────────────────
export async function toggleCampaign(id: string): Promise<boolean> {
    await pool.execute(
        `UPDATE subscription_campaigns SET is_active = NOT is_active WHERE id = ?`,
        [id]
    );
    const updated = await getCampaignById(id);
    return updated ? updated.is_active : false;
}

// ── Admin: Xóa chiến dịch ──────────────────────────────────────────────────
export async function deleteCampaign(id: string): Promise<boolean> {
    const [result] = await pool.execute(
        `DELETE FROM subscription_campaigns WHERE id = ?`,
        [id]
    ) as any;
    return result.affectedRows > 0;
}

// ── Kiểm tra user đã nhận quà chiến dịch này chưa ──────────────────────────
export async function hasUserClaimedCampaign(userId: string, campaignId: string): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id FROM user_campaign_claims WHERE user_id = ? AND campaign_id = ? LIMIT 1`,
        [userId, campaignId]
    );
    return rows.length > 0;
}

// ── Ghi nhận user nhận quà chiến dịch (dùng connection transaction) ─────────
export async function recordUserClaim(conn: any, userId: string, campaignId: string): Promise<void> {
    const id = uuidv4();
    await conn.execute(
        `INSERT INTO user_campaign_claims (id, user_id, campaign_id, claimed_at)
         VALUES (?, ?, ?, NOW())`,
        [id, userId, campaignId]
    );
}

// ── Lấy danh sách campaign_id mà user này đã claim ─────────────────────────
export async function getUserClaimedCampaignIds(userId: string): Promise<string[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT campaign_id FROM user_campaign_claims WHERE user_id = ?`,
        [userId]
    );
    return rows.map((r) => r.campaign_id as string);
}

