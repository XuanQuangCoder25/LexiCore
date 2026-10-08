import { pool } from '../config/mysql';


// Calculates new EXP and Level based on linear progression.
// Formula: EXP cần để lên cấp tiếp theo = 100 + (Level_hiện_tại - 1) * 20

export const calculateNewLevel = (currentLevel: number, currentExp: number, expToAdd: number) => {
    let newExp = currentExp + expToAdd;
    let newLevel = currentLevel;
    let requiredExp = 100 + (newLevel - 1) * 20;
    let leveledUp = false;

    while (newExp >= requiredExp) {
        newExp -= requiredExp;
        newLevel += 1;
        requiredExp = 100 + (newLevel - 1) * 20;
        leveledUp = true;
    }

    return { newLevel, newExp, leveledUp };
};

// Utility to directly add EXP to a user without a running transaction.

export const addExp = async (userId: string, expToAdd: number): Promise<{ oldLevel: number, newLevel: number, newExp: number }> => {
    if (expToAdd <= 0) return { oldLevel: 0, newLevel: 0, newExp: 0 };

    const [rows] = await pool.execute(
        `SELECT exp, level FROM wallets WHERE user_id = ?`,
        [userId]
    );
    const wallet = (rows as any[])[0];
    if (!wallet) return { oldLevel: 0, newLevel: 0, newExp: 0 };

    const oldLevel = wallet.level;
    const { newLevel, newExp, leveledUp } = calculateNewLevel(oldLevel, wallet.exp, expToAdd);

    await pool.execute(
        `UPDATE wallets SET exp = ?, level = ? WHERE user_id = ?`,
        [newExp, newLevel, userId]
    );

    // TODO: Add level up rewards here if needed

    return { oldLevel, newLevel, newExp };
};
