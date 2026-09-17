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

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const newStreak = (lastStudy && lastStudy.getTime() === yesterday.getTime())
        ? wallet.current_streak + 1
        : 1;

    const newLongest = Math.max(wallet.longest_streak, newStreak);

    await pool.execute(
        `UPDATE wallets 
         SET current_streak = ?, longest_streak = ?, last_study_date = CURDATE()
         WHERE user_id = ?`,
        [newStreak, newLongest, userId]
    );
};
