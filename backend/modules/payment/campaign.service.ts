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
import { getPackageById, activateSubscription } from './payment.repository';

// ── Admin: Lấy danh sách chiến dịch ────────────────────────────────────────
export async function adminGetCampaigns(): Promise<SubscriptionCampaign[]> {
    return getAllCampaigns();
}

// ── Admin: Tạo chiến dịch mới ──────────────────────────────────────────────
export async function adminCreateCampaign(data: {
    name: string;
    campaign_type: 'FREE_TRIAL' | 'DISCOUNT_SALE';
    target_package_id?: string | null;
    custom_tier?: 'STARTER' | 'PRO' | 'ELITE' | null;
    custom_duration_days?: number | null;
    discount_percent?: number;
    starts_at: string;
    ends_at: string;
    is_active?: boolean;
}): Promise<{ id: string; message: string }> {
    if (!data.name || data.name.trim() === '') {
        throw new AppError('Tên chiến dịch không được để trống', 400);
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

    if (data.campaign_type === 'FREE_TRIAL') {
        // Cách 1: Chọn gói có sẵn
        if (data.target_package_id) {
            const pkg = await getPackageById(data.target_package_id);
            if (!pkg) throw new AppError('Gói chỉ định không tồn tại', 404);
        } else {
            // Cách 2: Custom tự do
            if (!data.custom_tier) {
                throw new AppError('Vui lòng chọn hạng (Starter, Pro hoặc Elite) cho gói quà tặng', 400);
            }
            if (!data.custom_duration_days || data.custom_duration_days <= 0) {
                throw new AppError('Số ngày quà tặng phải lớn hơn 0', 400);
            }
        }
    } else if (data.campaign_type === 'DISCOUNT_SALE') {
        if (!data.discount_percent || data.discount_percent <= 0 || data.discount_percent > 100) {
            throw new AppError('Phần trăm giảm giá phải từ 1% đến 100%', 400);
        }
        if (data.target_package_id) {
            const pkg = await getPackageById(data.target_package_id);
            if (!pkg) throw new AppError('Gói chỉ định không tồn tại', 404);
        }
    } else {
        throw new AppError('Loại chiến dịch không hợp lệ', 400);
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

    if (campaign.campaign_type !== 'FREE_TRIAL') {
        throw new AppError('Chiến dịch này không phải là sự kiện tặng gói miễn phí', 400);
    }

    // Kiểm tra xem user này đã nhận quà của chiến dịch này chưa
    const alreadyClaimed = await hasUserClaimedCampaign(userId, campaignId);
    if (alreadyClaimed) {
        throw new AppError('Bạn đã nhận quà của sự kiện này rồi', 400);
    }

    // Xác định hạng và số ngày được tặng
    let tier: 'STARTER' | 'PRO' | 'ELITE' = 'PRO';
    let durationDays: number = 7;
    let targetPackageId: string = campaign.target_package_id || 'campaign-custom';

    if (campaign.target_package_id) {
        const pkg = await getPackageById(campaign.target_package_id);
        if (pkg && pkg.tier) {
            tier = pkg.tier as 'STARTER' | 'PRO' | 'ELITE';
            durationDays = pkg.duration_days || 7;
        }
    } else {
        tier = campaign.custom_tier || 'PRO';
        durationDays = campaign.custom_duration_days || 7;
    }

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

