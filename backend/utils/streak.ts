import { pool } from '../config/mysql';

export const updateStreak = async (userId: string): Promise<void> => {
    const [rows] = await pool.execute(
        `SELECT current_streak, longest_streak, last_study_date FROM wallets WHERE user_id = ?`,
        [userId]
    );
    const wallet = (rows as any[])[0];
    if (!wallet) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastStudy = wallet.last_study_date ? new Date(wallet.last_study_date) : null;
    if (lastStudy) lastStudy.setHours(0, 0, 0, 0);

    if (lastStudy && lastStudy.getTime() === today.getTime()) return;

    let newStreak = 1;
    let newPreviousStreak = null;

    if (lastStudy) {
        const diffTime = today.getTime() - lastStudy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            newStreak = wallet.current_streak + 1;
        } else if (diffDays > 1) {
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
                newStreak = wallet.current_streak + 1;
            } else {
                newStreak = 1;
                newPreviousStreak = wallet.current_streak;
            }
        }
    }

    const newLongest = Math.max(wallet.longest_streak, newStreak);

    // Cập nhật Database
    if (newPreviousStreak !== null) {
        await pool.execute(
            `UPDATE wallets 
             SET current_streak = ?, longest_streak = ?, last_study_date = CURDATE(), previous_streak = ?
             WHERE user_id = ?`,
            [newStreak, newLongest, newPreviousStreak, userId]
        );
    } else {
        await pool.execute(
            `UPDATE wallets 
             SET current_streak = ?, longest_streak = ?, last_study_date = CURDATE()
             WHERE user_id = ?`,
            [newStreak, newLongest, userId]
        );
    }

    // TODO: Kích hoạt Gamification Event để kiểm tra Achievement
    // await gamificationService.updateAchievementProgress(userId, 'current_streak', newStreak);
};
