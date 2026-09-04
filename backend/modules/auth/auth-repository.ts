import { pool } from '../../config/mysql';
import redis from '../../config/redis';

export const createUserWithWallet = async (userData: any) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const insertUserQuery = `INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)`;
        await connection.execute(insertUserQuery, [userData.id, userData.email, userData.password_hash, userData.full_name]);

        const insertWalletQuery = `INSERT INTO wallets (user_id, coin_balance) VALUES (?, ?)`;
        await connection.execute(insertWalletQuery, [userData.id, 0]);

        await connection.commit();
        console.log("Tạo tài khoản và ví thành công cho:", userData.email);

        return true;

    } catch (error) {
        await connection.rollback();
        console.error("Lỗi khi tạo tài khoản, đã rollback:", error);
        throw error;

    } finally {
        connection.release();
    }
};

export const findUserByEmail = async (email: string) => {
    const [rows] = await pool.execute(
        `SELECT id, email, password_hash, full_name, status, role FROM users WHERE email = ? LIMIT 1`,
        [email]
    );
    const users = rows as any[];
    return users.length > 0 ? users[0] : null;
};

export const saveOtp = async (email: string, otp: string, type: string): Promise<void> => {
    // Lưu OTP vào Redis với TTL 15 phút (900 giây)
    const key = `otp:${type}:${email}`;
    await redis.set(key, otp, 'EX', 900);
};

export const verifyAndDeleteOtp = async (email: string, otp: string, type: string): Promise<boolean> => {
    const key = `otp:${type}:${email}`;
    const storedOtp = await redis.get(key);
    if (storedOtp !== otp) return false;
    await redis.del(key);
    return true;
};

export const activateUser = async (email: string): Promise<void> => {
    await pool.execute(
        `UPDATE users SET status = 'ACTIVE' WHERE email = ?`,
        [email]
    );
};

export const findUserById = async (id: string) => {
    const [rows] = await pool.execute(
        `SELECT u.id, u.email, u.full_name, u.role, u.status, u.created_at,
                w.coin_balance
         FROM users u
         LEFT JOIN wallets w ON w.user_id = u.id
         WHERE u.id = ? LIMIT 1`,
        [id]
    );
    const users = rows as any[];
    return users.length > 0 ? users[0] : null;
};

export const updatePassword = async (email: string, password_hash: string): Promise<void> => {
    await pool.execute(
        `UPDATE users SET password_hash = ? WHERE email = ?`,
        [password_hash, email]
    );
};