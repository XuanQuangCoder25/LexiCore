import { pool } from '../../config/mysql';

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