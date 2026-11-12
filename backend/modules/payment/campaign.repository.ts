import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';

export interface SubscriptionCampaign {
    id: string;
    name: string;
    tier: 'STARTER' | 'PRO' | 'ELITE';
    duration_days: number;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
    created_at: string;
    total_claims?: number;
}

// ── Admin: Lấy tất cả chiến dịch kèm thống kê lượt nhận ─────────────────────
export async function getAllCampaigns(): Promise<SubscriptionCampaign[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
            sc.*,
            COUNT(ucc.id) AS total_claims
         FROM subscription_campaigns sc
         LEFT JOIN user_campaign_claims ucc ON sc.id = ucc.campaign_id
         GROUP BY sc.id
         ORDER BY sc.created_at DESC`
    );
    return rows.map((r) => ({
        ...r,
        is_active: Boolean(r.is_active),
        duration_days: Number(r.duration_days),
        total_claims: Number(r.total_claims || 0),
    })) as SubscriptionCampaign[];
}

// ── Lấy chi tiết chiến dịch theo ID ────────────────────────────────────────
export async function getCampaignById(id: string): Promise<SubscriptionCampaign | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM subscription_campaigns WHERE id = ? LIMIT 1`,
        [id]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
        ...r,
        is_active: Boolean(r.is_active),
        duration_days: Number(r.duration_days),
    } as SubscriptionCampaign;
}

// ── Lấy các chiến dịch đang có hiệu lực trong thời gian thực ────────────────
export async function getActiveCampaigns(): Promise<SubscriptionCampaign[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM subscription_campaigns 
         WHERE is_active = TRUE
           AND starts_at <= NOW()
           AND ends_at >= NOW()
         ORDER BY created_at DESC`
    );
    return rows.map((r) => ({
        ...r,
        is_active: Boolean(r.is_active),
        duration_days: Number(r.duration_days),
    })) as SubscriptionCampaign[];
}

// ── Admin: Tạo chiến dịch mới ──────────────────────────────────────────────
export async function createCampaign(data: {
    name: string;
    tier: 'STARTER' | 'PRO' | 'ELITE';
    duration_days: number;
    starts_at: string;
    ends_at: string;
    is_active?: boolean;
}): Promise<string> {
    const id = uuidv4();
    await pool.execute(
        `INSERT INTO subscription_campaigns (
            id, name, tier, duration_days, starts_at, ends_at, is_active
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            data.name,
            data.tier,
            data.duration_days,
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
