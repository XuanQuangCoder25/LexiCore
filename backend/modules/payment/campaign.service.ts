import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../errors/AppError';
import {
    getAllCampaigns,
    getCampaignById,
    createCampaign,
    toggleCampaign,
    deleteCampaign,
    hasUserClaimedCampaign,
    recordUserClaim,
    SubscriptionCampaign,
} from './campaign.repository';
import { activateSubscription } from './payment.repository';

// ── Admin: Lấy danh sách chiến dịch ────────────────────────────────────────
export async function adminGetCampaigns(): Promise<SubscriptionCampaign[]> {
    return getAllCampaigns();
}

// ── Admin: Tạo chiến dịch mới ──────────────────────────────────────────────
export async function adminCreateCampaign(data: {
    name: string;
    tier: 'STARTER' | 'PRO' | 'ELITE';
    duration_days: number;
    starts_at: string;
    ends_at: string;
    is_active?: boolean;
}): Promise<{ id: string; message: string }> {
    if (!data.name || data.name.trim() === '') {
        throw new AppError('Tên chiến dịch không được để trống', 400);
    }

    if (!data.tier || !['STARTER', 'PRO', 'ELITE'].includes(data.tier)) {
        throw new AppError('Hạng gói (tier) phải là STARTER, PRO hoặc ELITE', 400);
    }

    if (!data.duration_days || data.duration_days <= 0) {
        throw new AppError('Số ngày quà tặng phải lớn hơn 0', 400);
    }

    if (!data.starts_at || !data.ends_at) {
        throw new AppError('Thời gian bắt đầu và kết thúc là bắt buộc', 400);
    }

    const start = new Date(data.starts_at);
    const end = new Date(data.ends_at);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError('Định dạng thời gian không hợp lệ', 400);
    }

    if (start >= end) {
        throw new AppError('Thời gian bắt đầu phải trước thời gian kết thúc', 400);
    }

    const id = await createCampaign(data);
    return { id, message: 'Tạo chiến dịch thành công' };
}

// ── Admin: Bật/tắt trạng thái chiến dịch ───────────────────────────────────
export async function adminToggleCampaign(id: string): Promise<{ is_active: boolean; message: string }> {
    const campaign = await getCampaignById(id);
    if (!campaign) throw new AppError('Chiến dịch không tồn tại', 404);

    const is_active = await toggleCampaign(id);
    return {
        is_active,
        message: is_active ? 'Đã kích hoạt chiến dịch' : 'Đã tạm dừng chiến dịch',
    };
}

// ── Admin: Xóa chiến dịch ──────────────────────────────────────────────────
export async function adminDeleteCampaign(id: string): Promise<{ message: string }> {
    const campaign = await getCampaignById(id);
    if (!campaign) throw new AppError('Chiến dịch không tồn tại', 404);

    await deleteCampaign(id);
    return { message: 'Đã xóa chiến dịch thành công' };
}

// ── User: Nhận quà gói sự kiện (ACID Transaction) ──────────────────────────
export async function claimCampaignGift(userId: string, campaignId: string) {
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
        throw new AppError('Chiến dịch không tồn tại', 404);
    }

    if (!campaign.is_active) {
        throw new AppError('Chiến dịch hiện đang tạm dừng', 400);
    }

    const now = new Date();
    const start = new Date(campaign.starts_at);
    const end = new Date(campaign.ends_at);

    if (now < start) {
        throw new AppError('Chiến dịch chưa bắt đầu', 400);
    }
    if (now > end) {
        throw new AppError('Chiến dịch này đã kết thúc', 400);
    }

    // Kiểm tra xem user này đã nhận quà của chiến dịch này chưa
    const alreadyClaimed = await hasUserClaimedCampaign(userId, campaignId);
    if (alreadyClaimed) {
        throw new AppError('Bạn đã nhận quà của sự kiện này rồi', 400);
    }

    const tier = campaign.tier;
    const durationDays = campaign.duration_days;
    const targetPackageId = `campaign-${campaign.id}`;

    // Thực hiện ACID transaction
    const conn = await (pool as any).getConnection();
    try {
        await conn.beginTransaction();

        // 1. Ghi nhận lượt claim
        await recordUserClaim(conn, userId, campaignId);

        // 2. Kích hoạt subscription cho user
        await activateSubscription(conn, userId, targetPackageId, tier, durationDays);

        // 3. Tạo thông báo in-app chúc mừng
        const notifId = uuidv4();
        await conn.execute(
            `INSERT INTO notifications (id, user_id, type, title, body)
             VALUES (?, ?, 'subscription', ?, ?)`,
            [
                notifId,
                userId,
                'Nhận quà sự kiện thành công',
                `Chúc mừng bạn đã nhận thành công gói trải nghiệm ${tier} (${durationDays} ngày) từ sự kiện "${campaign.name}"!`,
            ]
        );

        await conn.commit();

        return {
            success: true,
            message: `Kích hoạt thành công gói ${tier} ${durationDays} ngày từ sự kiện "${campaign.name}"!`,
            data: {
                campaignId: campaign.id,
                campaignName: campaign.name,
                tier,
                durationDays,
            },
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}
