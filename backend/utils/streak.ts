import { pool } from '../config/mysql';
import { updateAchievementProgress, setAchievementProgress, updateGoalProgress } from '../modules/gamification/gamification-repository';
import { getTierLimit, getUserTier, getVNDateKey } from './tierLimits';

function getVNDateString(): string {
    const key = getVNDateKey(); // YYYYMMDD theo múi giờ UTC+7
    return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
}

function parseIsoDateToUtcMs(dateStr: string): number {
    const [year, month, day] = dateStr.split('-').map(Number);
    return Date.UTC(year || 1970, (month || 1) - 1, day || 1);
}

export const updateStreak = async (userId: string): Promise<void> => {
    const [rows] = await pool.execute(
        `SELECT current_streak, longest_streak, DATE_FORMAT(last_study_date, '%Y-%m-%d') AS last_study_str
         FROM wallets
         WHERE user_id = ?`,
        [userId]
    );
    const wallet = (rows as any[])[0];
    if (!wallet) return;

    const todayStr = getVNDateString();
    const lastStudyStr: string | null = wallet.last_study_str || null;

    if (lastStudyStr === todayStr) return;

    let newStreak = 1;
    let newPreviousStreak: number | null = null;

    if (lastStudyStr) {
        const diffDays = Math.round(
            (parseIsoDateToUtcMs(todayStr) - parseIsoDateToUtcMs(lastStudyStr)) / (1000 * 60 * 60 * 24)
        );

        // Tránh xử lý nếu ngày học gần nhất lớn hơn hoặc bằng hôm nay do lệch múi giờ cũ
        if (diffDays <= 0) return;

        if (diffDays === 1) {
            newStreak = Number(wallet.current_streak || 0) + 1;
        } else {
            // Kiểm tra đặc quyền tự động bảo vệ chuỗi Streak cho gói ELITE trước
            const tier = await getUserTier(userId);
            const hasStreakImmunity = getTierLimit('autoStreakImmunity', tier);

            if (hasStreakImmunity) {
                const current = Number(wallet.current_streak || 0);
                newStreak = current > 0 ? current + 1 : 1;
            } else {
                const daysMissed = diffDays - 1;

                const [itemRows] = await pool.execute(
                    `SELECT ui.id, ui.quantity
                     FROM user_items ui
                     JOIN items i ON ui.item_id = i.id
                     WHERE ui.user_id = ? AND i.type = 'STREAK_FREEZE' AND ui.is_active = true`,
                    [userId]
                );
                const freezeItem = (itemRows as any[])[0];

                if (freezeItem && freezeItem.quantity >= daysMissed) {
                    const newQuantity = freezeItem.quantity - daysMissed;
                    if (newQuantity > 0) {
                        await pool.execute(`UPDATE user_items SET quantity = ? WHERE id = ?`, [newQuantity, freezeItem.id]);
                    } else {
                        await pool.execute(`DELETE FROM user_items WHERE id = ?`, [freezeItem.id]);
                    }
                    newStreak = Number(wallet.current_streak || 0) + 1;
                } else {
                    newStreak = 1;
                    newPreviousStreak = Number(wallet.current_streak || 0);
                }
            }
        }
    }

    const newLongest = Math.max(Number(wallet.longest_streak || 0), newStreak);

    // Cập nhật Database theo ngày Việt Nam (UTC+7)
    if (newPreviousStreak !== null) {
        await pool.execute(
            `UPDATE wallets
             SET current_streak = ?, longest_streak = ?, last_study_date = ?, previous_streak = ?
             WHERE user_id = ?`,
            [newStreak, newLongest, todayStr, newPreviousStreak, userId]
        );
    } else {
        await pool.execute(
            `UPDATE wallets
             SET current_streak = ?, longest_streak = ?, last_study_date = ?
             WHERE user_id = ?`,
            [newStreak, newLongest, todayStr, userId]
        );
    }

    // Kích hoạt Gamification Events
    // current_streak dùng SET (giá trị tuyệt đối), không phải cộng dồn
    await setAchievementProgress(userId, 'current_streak', newStreak);
    // total_active_days cộng dồn 1 mỗi ngày học
    await updateAchievementProgress(userId, 'total_active_days', 1);
    await updateGoalProgress(userId, 'total_active_days', 1);
};
