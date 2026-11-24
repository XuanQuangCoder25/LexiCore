import { pool } from '../config/mysql';
import { RowDataPacket } from 'mysql2';

// ─── Kiểu dữ liệu các hạng gói hội viên ─────────────────────────────────────
export type Tier = 'FREE' | 'STARTER' | 'PRO' | 'ELITE';

// ─── Bảng giới hạn đặc quyền tập trung cho toàn hệ thống ───────────────────
export const TIER_LIMITS = {
  // Số câu luyện phát âm AI Whisper tối đa trong 1 ngày
  pronunciationSentencesPerDay: {
    FREE: 5,
    STARTER: 25,
    PRO: 60,
    ELITE: 120,
  },

  // Số lượng video YouTube cá nhân được phép lưu trên hệ thống
  shadowingVideos: {
    FREE: 3,
    STARTER: 10,
    PRO: 50,
    ELITE: -1,
  },

  // Thời lượng tối đa cho phép của 1 video khi import (đơn vị: phút, -1 là không giới hạn)
  shadowingVideoDurationMinutes: {
    FREE: 7,
    STARTER: 15,
    PRO: -1,
    ELITE: -1,
  },

  // Số trận Rank tối đa được phép đánh trong 1 ngày (-1 là không giới hạn)
  arenaDailyRankMatches: {
    FREE: 10,
    STARTER: -1,
    PRO: -1,
    ELITE: -1,
  },

  // Số trận được nhân đôi thưởng (x2 Coin và EXP) mỗi ngày
  arenaDailyDoubleRewardMatches: {
    FREE: 0,
    STARTER: 3,
    PRO: 5,
    ELITE: 10,
  },

  // Giới hạn từ vựng lưu vào SRS mỗi ngày
  srsWordsPerDay: {
    FREE: 50,
    STARTER: 100,
    PRO: -1,
    ELITE: -1,
  },

  // Mở khóa biểu đồ năng lực nâng cao trên trang Profile
  hasAdvancedProfileAnalytics: {
    FREE: false,
    STARTER: false,
    PRO: true,
    ELITE: true,
  },

  // Tự động bảo vệ chuỗi Streak không bao giờ đứt (Elite)
  autoStreakImmunity: {
    FREE: false,
    STARTER: false,
    PRO: false,
    ELITE: true,
  },

  // Loại gradient hiển thị cho tên người dùng ở Leaderboard và Arena
  vipStyling: {
    FREE: 'NONE',
    STARTER: 'NONE',
    PRO: 'OCEAN_BLUE',
    ELITE: 'ROYAL_GOLD',
  },
} as const;

// ─── Hàm tiện ích lấy giới hạn theo tier ────────────────────────────────────
export function getTierLimit<K extends keyof typeof TIER_LIMITS>(
  feature: K,
  tier: Tier
): (typeof TIER_LIMITS)[K][Tier] {
  const safeTier: Tier = tier || 'FREE';
  const featureLimits = TIER_LIMITS[feature] as Record<Tier, any>;
  return featureLimits[safeTier];
}

// ─── Lấy ngày định dạng YYYYMMDD theo múi giờ Việt Nam (UTC+7) ──────────────
export function getVNDateKey(): string {
  const now = new Date();
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const y = vnTime.getUTCFullYear();
  const m = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
  const d = String(vnTime.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// ─── Lấy tier hiện tại còn hiệu lực của người dùng từ cơ sở dữ liệu ──────────
export async function getUserTier(userId: string): Promise<Tier> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT tier FROM user_subscription WHERE user_id = ? AND status = 'ACTIVE' AND expires_at > NOW() LIMIT 1`,
      [userId]
    );
    if (!rows || rows.length === 0) return 'FREE';
    const tier = rows[0].tier as Tier;
    return tier || 'FREE';
  } catch {
    return 'FREE';
  }
}
