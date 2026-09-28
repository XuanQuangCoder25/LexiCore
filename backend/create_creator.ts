import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from './config/mysql';

async function createCreator() {
    const email = 'creator@test.com';
    const password = 'password123';
    const fullName = 'Test Content Creator';

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const id = uuidv4();

    try {
        const [rows]: any = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length > 0) {
            console.log(`[INFO] Tài khoản ${email} đã tồn tại trong DB! Cập nhật role thành content_creator và kích hoạt...`);
            await pool.execute('UPDATE users SET role = "content_creator", status = "ACTIVE", password_hash = ? WHERE email = ?', [password_hash, email]);
            console.log("✅ Cập nhật thành công! Bạn có thể đăng nhập với thông tin sau:");
            console.log(`📧 Email: ${email}`);
            console.log(`🔑 Mật khẩu: ${password}`);
        } else {
            console.log(`[INFO] Đang tạo tài khoản mới: ${email}...`);
            const insertQuery = `INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, 'content_creator', 'ACTIVE')`;
            await pool.execute(insertQuery, [id, email, password_hash, fullName]);
            
            const insertWalletQuery = `INSERT INTO wallets (user_id, coin_balance) VALUES (?, ?)`;
            await pool.execute(insertWalletQuery, [id, 0]);

            console.log("✅ Đã tạo thành công tài khoản Creator mới!");
            console.log(`📧 Email: ${email}`);
            console.log(`🔑 Mật khẩu: ${password}`);
        }
    } catch (err) {
        console.error("❌ Lỗi khi thao tác DB:", err);
    } finally {
        process.exit(0);
    }
}

createCreator();
