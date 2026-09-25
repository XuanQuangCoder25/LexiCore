import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';

export const getDailyGoals = async (userId: string) => {
    const now = new Date();
    // Ngày hôm nay (YYYY-MM-DD)
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // Đầu tuần (Thứ 2) để scope weekly goals
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceMonday);
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;

    // === DAILY GOALS ===
    let [dailyRows] = await pool.execute(
        `SELECT udg.id as user_goal_id, d.title, d.description, d.icon, d.target_value, d.reward_coin, d.reward_exp, d.type,
                udg.current_progress, udg.is_completed, udg.is_claimed
         FROM user_daily_goals udg
         JOIN daily_goal_definitions d ON udg.goal_id = d.id
         WHERE udg.user_id = ? AND udg.date = ? AND d.type = 'DAILY'`,
        [userId, today]
    );
    let dailyGoals = dailyRows as any[];

    // Nếu hôm nay chưa có daily goals → auto-assign tất cả daily definitions
    if (dailyGoals.length === 0) {
        const [defs] = await pool.execute(
            `SELECT id FROM daily_goal_definitions WHERE is_active = TRUE AND type = 'DAILY'`,
            []
        );
        for (const def of (defs as any[])) {
            await pool.execute(
                `INSERT IGNORE INTO user_daily_goals (id, user_id, goal_id, date) VALUES (?, ?, ?, ?)`,
                [uuidv4(), userId, def.id, today]
            );
        }
        const [newRows] = await pool.execute(
            `SELECT udg.id as user_goal_id, d.title, d.description, d.icon, d.target_value, d.reward_coin, d.reward_exp, d.type,
                    udg.current_progress, udg.is_completed, udg.is_claimed
             FROM user_daily_goals udg
             JOIN daily_goal_definitions d ON udg.goal_id = d.id
             WHERE udg.user_id = ? AND udg.date = ? AND d.type = 'DAILY'`,
            [userId, today]
        );
        dailyGoals = newRows as any[];
    }

    // === WEEKLY GOALS ===
    let [weeklyRows] = await pool.execute(
        `SELECT udg.id as user_goal_id, d.title, d.description, d.icon, d.target_value, d.reward_coin, d.reward_exp, d.type,
                udg.current_progress, udg.is_completed, udg.is_claimed
         FROM user_daily_goals udg
         JOIN daily_goal_definitions d ON udg.goal_id = d.id
         WHERE udg.user_id = ? AND udg.date = ? AND d.type = 'WEEKLY'`,
        [userId, weekStartStr]
    );
    let weeklyGoals = weeklyRows as any[];

    // Nếu tuần này chưa có weekly goals → auto-assign tất cả weekly definitions
    if (weeklyGoals.length === 0) {
        const [defs] = await pool.execute(
            `SELECT id FROM daily_goal_definitions WHERE is_active = TRUE AND type = 'WEEKLY'`,
            []
        );
        for (const def of (defs as any[])) {
            await pool.execute(
                `INSERT IGNORE INTO user_daily_goals (id, user_id, goal_id, date) VALUES (?, ?, ?, ?)`,
                [uuidv4(), userId, def.id, weekStartStr]
            );
        }
        const [newRows] = await pool.execute(
            `SELECT udg.id as user_goal_id, d.title, d.description, d.icon, d.target_value, d.reward_coin, d.reward_exp, d.type,
                    udg.current_progress, udg.is_completed, udg.is_claimed
             FROM user_daily_goals udg
             JOIN daily_goal_definitions d ON udg.goal_id = d.id
             WHERE udg.user_id = ? AND udg.date = ? AND d.type = 'WEEKLY'`,
            [userId, weekStartStr]
        );
        weeklyGoals = newRows as any[];
    }

    return [...dailyGoals, ...weeklyGoals];
};

export const claimDailyGoal = async (userId: string, userGoalId: string) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT udg.is_completed, udg.is_claimed, d.reward_coin, d.reward_exp 
             FROM user_daily_goals udg
             JOIN daily_goal_definitions d ON udg.goal_id = d.id
             WHERE udg.id = ? AND udg.user_id = ?`,
            [userGoalId, userId]
        );
        const goal = (rows as any[])[0];

        if (!goal) throw new Error("Không tìm thấy nhiệm vụ");
        if (!goal.is_completed) throw new Error("Nhiệm vụ chưa hoàn thành");
        if (goal.is_claimed) throw new Error("Đã nhận thưởng rồi");

        await connection.execute(
            `UPDATE user_daily_goals SET is_claimed = TRUE WHERE id = ?`,
            [userGoalId]
        );

        await connection.execute(
            `UPDATE wallets SET coin_balance = coin_balance + ?, exp = exp + ? WHERE user_id = ?`,
            [goal.reward_coin, goal.reward_exp, userId]
        );

        await connection.execute(
            `INSERT INTO billing_transactions (id, user_id, amount, transaction_type, metadata)
             VALUES (?, ?, ?, 'EARN_DAILY_GOAL', ?)`,
            [uuidv4(), userId, goal.reward_coin, JSON.stringify({ source: 'daily_goal', user_goal_id: userGoalId })]
        );

        await connection.commit();
        return { message: "Nhận thưởng thành công", reward_coin: goal.reward_coin, reward_exp: goal.reward_exp };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export const getAchievements = async (userId: string) => {
    // Trả về toàn bộ danh sách thành tựu kèm theo tiến độ của user hiện tại
    const [rows] = await pool.execute(
        `SELECT a.id as achievement_id, a.title, a.description, a.icon, a.category, a.target_value, 
                a.reward_coin, a.reward_diamond, a.reward_exp,
                IFNULL(ua.current_progress, 0) as current_progress, 
                IFNULL(ua.is_unlocked, 0) as is_unlocked, 
                ua.unlocked_at
         FROM achievement_definitions a
         LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
         ORDER BY a.category, a.target_value`,
        [userId]
    );
    return rows;
};

export const getLeaderboard = async () => {
    const [rows] = await pool.execute(
        `SELECT u.id, u.full_name, w.rank_point, w.level
         FROM wallets w
         JOIN users u ON w.user_id = u.id
         WHERE w.rank_point > 0
         ORDER BY w.rank_point DESC
         LIMIT 50`,
        []
    );
    // TODO: Join bảng túi đồ lấy Avatar + Cover (nếu có)
    return rows;
};

export const getCollections = async (userId: string) => {
    const [rows] = await pool.execute(
        `SELECT c.id, c.name, c.description, c.unlock_level, c.theme_color,
                (uc.user_id IS NOT NULL) as is_unlocked
         FROM collections c
         LEFT JOIN user_collections uc ON c.id = uc.collection_id AND uc.user_id = ?
         ORDER BY c.unlock_level ASC`,
        [userId]
    );

    return rows;
};

export const updateAchievementProgress = async (userId: string, metricKey: string, incrementValue: number = 1) => {
    const [achievements] = await pool.execute(
        `SELECT id, target_value FROM achievement_definitions WHERE metric_key = ?`,
        [metricKey]
    );

    const defs = achievements as any[];
    if (defs.length === 0) return;

    for (const def of defs) {
        await pool.execute(
            `INSERT INTO user_achievements (id, user_id, achievement_id, current_progress)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE current_progress = current_progress + ?`,
            [uuidv4(), userId, def.id, incrementValue, incrementValue]
        );

        await pool.execute(
            `UPDATE user_achievements 
             SET is_unlocked = TRUE, unlocked_at = CURRENT_TIMESTAMP
             WHERE user_id = ? AND achievement_id = ? AND current_progress >= ? AND is_unlocked = FALSE`,
            [userId, def.id, def.target_value]
        );
    }
};
