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
    RewardCampaign,
    getRewardCampaignById,
    getActiveRewardCampaigns,
    hasUserClaimedRewardCampaign,
    recordUserRewardClaim,
} from './campaign.repository';
import { activateSubscription, getUserSubscription, TIER_RANKS } from './payment.repository';

export { getActiveRewardCampaigns };

// -- Admin: Lấy danh sách chiến dịch ----------------------------------------
export async function adminGetCampaigns(): Promise<SubscriptionCampaign[]> {
    return getAllCampaigns();
}

// -- Admin: Tạo chiến dịch mới ----------------------------------------------
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

// -- Admin: Bật/tắt trạng thái chiến dịch -----------------------------------
export async function adminToggleCampaign(id: string): Promise<{ is_active: boolean; message: string }> {
    const campaign = await getCampaignById(id);
    if (!campaign) throw new AppError('Chiến dịch không tồn tại', 404);

    const is_active = await toggleCampaign(id);
    return {
        is_active,
        message: is_active ? 'Đã kích hoạt chiến dịch' : 'Đã tạm dừng chiến dịch',
    };
}

// -- Admin: Xóa chiến dịch --------------------------------------------------
export async function adminDeleteCampaign(id: string): Promise<{ message: string }> {
    const campaign = await getCampaignById(id);
    if (!campaign) throw new AppError('Chiến dịch không tồn tại', 404);

    await deleteCampaign(id);
    return { message: 'Đã xóa chiến dịch thành công' };
}

// -- User: Nhận quà gói sự kiện (ACID Transaction) --------------------------
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

    // Kiểm tra gói hiện tại của user để tránh hạ gói (Downgrade Prevention)
    const currentSub = await getUserSubscription(userId);
    const hasActiveSub = Boolean(currentSub && currentSub.tier && currentSub.tier !== 'FREE' && currentSub.expires_at && new Date(currentSub.expires_at).getTime() > Date.now());
    const currentTier = hasActiveSub ? currentSub!.tier : 'FREE';

    const currentRank = TIER_RANKS[currentTier] ?? 0;
    const targetRank = TIER_RANKS[tier] ?? 1;

    // Chặn nhận nếu user đang ở hạng cao hơn gói sự kiện
    if (currentRank > targetRank) {
        throw new AppError(`Bạn đang sử dụng gói hội viên ${currentTier} cao cấp hơn gói sự kiện (${tier}). Đặc quyền này đã bao gồm trong tài khoản của bạn.`, 400);
    }

    const isUpgrade = targetRank > currentRank && currentTier !== 'FREE';

    // Thực hiện ACID transaction
    const conn = await (pool as any).getConnection();
    try {
        await conn.beginTransaction();

        // 1. Ghi nhận lượt claim
        await recordUserClaim(conn, userId, campaignId);

        // 2. Kích hoạt subscription cho user (hỗ trợ cộng dồn ngày nếu cùng tier hoặc nâng cấp bảo toàn hạn)
        await activateSubscription(conn, userId, targetPackageId, tier, durationDays, isUpgrade);

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

// -- User: Nhận quà Reward Campaign (Coin / Diamond / Item) (ACID Transaction) --
export async function claimRewardCampaign(userId: string, campaignId: string) {
    const campaign = await getRewardCampaignById(campaignId);
    if (!campaign) {
        throw new AppError('Chiến dịch quà tặng không tồn tại', 404);
    }

    if (!campaign.is_active) {
        throw new AppError('Chiến dịch hiện đang tạm dừng', 400);
    }

    const now = new Date();
    const start = new Date(campaign.starts_at);
    const end = new Date(campaign.ends_at);

    if (now < start) {
        throw new AppError('Chiến dịch quà tặng chưa bắt đầu', 400);
    }
    if (now > end) {
        throw new AppError('Chiến dịch quà tặng này đã kết thúc', 400);
    }

    // Kiểm tra user đã nhận quà chưa
    const alreadyClaimed = await hasUserClaimedRewardCampaign(userId, campaignId);
    if (alreadyClaimed) {
        throw new AppError('Bạn đã nhận quà của sự kiện này rồi', 400);
    }

    const conn = await (pool as any).getConnection();
    try {
        await conn.beginTransaction();

        // 1. Ghi nhận lượt nhận quà
        await recordUserRewardClaim(conn, userId, campaignId);

        // 2. Cộng Coin & Diamond vào ví nếu có
        let bonusCoin = campaign.coin_amount;
        let bonusDiamond = campaign.diamond_amount;
        let usedFallback = false;
        let fallbackCoin = 0;
        let itemName = campaign.item_name || null;

        // 3. Xử lý item nếu sự kiện có tặng kèm
        if (campaign.item_id) {
            const [itemRows] = await conn.execute(
                `SELECT id, name, type FROM items WHERE id = ?`,
                [campaign.item_id]
            );

            if (itemRows && itemRows.length > 0) {
                const item = itemRows[0];
                itemName = item.name;

                // Kiểm tra xem user đã sở hữu item này trong kho chưa
                const [userItemRows] = await conn.execute(
                    `SELECT id, quantity FROM user_items WHERE user_id = ? AND item_id = ?`,
                    [userId, campaign.item_id]
                );

                if (userItemRows && userItemRows.length > 0) {
                    // Đã sở hữu
                    if (item.type === 'AVATAR' || item.type === 'COVER_PHOTO') {
                        // Đền bù Coin nếu đã có Avatar hoặc Ảnh bìa
                        usedFallback = true;
                        fallbackCoin = campaign.fallback_coin || 50;
                        bonusCoin += fallbackCoin;
                    } else if (item.type === 'STREAK_FREEZE' || item.type === 'STREAK_RESTORE') {
                        // Cộng thêm số lượng cho vật phẩm tiêu hao
                        await conn.execute(
                            `UPDATE user_items SET quantity = quantity + 1 WHERE user_id = ? AND item_id = ?`,
                            [userId, campaign.item_id]
                        );
                    }
                } else {
                    // Chưa sở hữu -> thêm mới vào kho đồ
                    const userItemId = uuidv4();
                    await conn.execute(
                        `INSERT INTO user_items (id, user_id, item_id, quantity, is_active)
                         VALUES (?, ?, ?, 1, FALSE)`,
                        [userItemId, userId, campaign.item_id]
                    );
                }
            }
        }

        // Cập nhật số dư ví
        if (bonusCoin > 0 || bonusDiamond > 0) {
            await conn.execute(
                `UPDATE wallets 
                 SET coin_balance = coin_balance + ?,
                     diamond_balance = diamond_balance + ?
                 WHERE user_id = ?`,
                [bonusCoin, bonusDiamond, userId]
            );
        }

        // Lấy số dư ví mới nhất để trả về cho frontend cập nhật thanh điều hướng
        const [walletRows] = await conn.execute(
            `SELECT coin_balance, diamond_balance FROM wallets WHERE user_id = ?`,
            [userId]
        );
        const newCoinBalance = walletRows[0]?.coin_balance ?? 0;
        const newDiamondBalance = walletRows[0]?.diamond_balance ?? 0;

        // 4. Tạo thông báo in-app chúc mừng
        const notifId = uuidv4();
        const details: string[] = [];
        if (campaign.coin_amount > 0) details.push(`+${campaign.coin_amount.toLocaleString('vi-VN')} Coin`);
        if (campaign.diamond_amount > 0) details.push(`+${campaign.diamond_amount.toLocaleString('vi-VN')} Diamond`);
        if (itemName) {
            if (usedFallback) {
                details.push(`Vật phẩm "${itemName}" (đã sở hữu, quy đổi thành +${fallbackCoin} Coin)`);
            } else {
                details.push(`Vật phẩm "${itemName}"`);
            }
        }

        await conn.execute(
            `INSERT INTO notifications (id, user_id, type, title, body)
             VALUES (?, ?, 'reward', 'Nhận quà sự kiện thành công', ?)`,
            [
                notifId,
                userId,
                `Chúc mừng bạn đã nhận phần thưởng từ sự kiện "${campaign.name}": ${details.join(', ')}!`,
            ]
        );

        await conn.commit();

        return {
            success: true,
            message: `Nhận quà thành công từ sự kiện "${campaign.name}"!`,
            data: {
                campaignId: campaign.id,
                campaignName: campaign.name,
                coinEarned: campaign.coin_amount,
                diamondEarned: campaign.diamond_amount,
                itemName,
                usedFallback,
                fallbackCoin,
                newCoinBalance: Number(newCoinBalance),
                newDiamondBalance: Number(newDiamondBalance),
            },
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}
