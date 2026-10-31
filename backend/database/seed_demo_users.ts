import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/mysql';

const DEMO_USERS = [
  {
    email: 'alex@example.com',
    full_name: 'Alex',
    password: 'Password123!',
    role: 'USER',
    status: 'ACTIVE',
    wallet: { coin_balance: 1500, level: 5, current_streak: 7, rank_point: 120, arena_rank: 'GOLD' },
  },
  {
    email: 'bella@example.com',
    full_name: 'Bella',
    password: 'Password123!',
    role: 'USER',
    status: 'ACTIVE',
    wallet: { coin_balance: 2000, level: 6, current_streak: 5, rank_point: 140, arena_rank: 'GOLD' },
  },
];

async function seedDemoUsers() {
  console.log('--- Đang khởi tạo tài khoản Demo cho Alex và Bella ---');

  for (const u of DEMO_USERS) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(u.password, salt);

    // 1. Kiểm tra xem user đã tồn tại theo email chưa
    const [existingRows] = await pool.query('SELECT id FROM users WHERE email = ?', [u.email]);
    const existing = (existingRows as any[])[0];

    const userId = existing ? existing.id : uuidv4();

    if (existing) {
      await pool.query(
        `UPDATE users 
         SET full_name = ?, password_hash = ?, status = 'ACTIVE', role = 'USER' 
         WHERE id = ?`,
        [u.full_name, password_hash, userId]
      );
      console.log(`✅ Đã cập nhật thông tin & mật khẩu cho ${u.full_name} (${u.email})`);
    } else {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, u.email, password_hash, u.full_name, u.role, u.status]
      );
      console.log(`✅ Đã tạo mới tài khoản ${u.full_name} (${u.email}) [ID: ${userId}]`);
    }

    // 2. Cập nhật Ví (Wallets)
    await pool.query(
      `INSERT INTO wallets (user_id, coin_balance, level, current_streak, rank_point, arena_rank)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         coin_balance = VALUES(coin_balance),
         level = VALUES(level),
         current_streak = VALUES(current_streak)`,
      [
        userId,
        u.wallet.coin_balance,
        u.wallet.level,
        u.wallet.current_streak,
        u.wallet.rank_point,
        u.wallet.arena_rank,
      ]
    );
  }

  // 3. Reset quan hệ kết bạn và cuộc trò chuyện giữa Alex và Bella để bắt đầu test từ đầu
  const [alexRow] = await pool.query('SELECT id FROM users WHERE email = ?', ['alex@example.com']);
  const [bellaRow] = await pool.query('SELECT id FROM users WHERE email = ?', ['bella@example.com']);
  const alexId = (alexRow as any[])[0]?.id;
  const bellaId = (bellaRow as any[])[0]?.id;

  if (alexId && bellaId) {
    await pool.query(
      `DELETE FROM friendships 
       WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)`,
      [alexId, bellaId, bellaId, alexId]
    );
    await pool.query(
      `DELETE FROM conversations 
       WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`,
      [alexId, bellaId, bellaId, alexId]
    );
    console.log('✅ Đã reset trạng thái quan hệ giữa Alex và Bella (bắt đầu mới)');
  }

  console.log('\n--- THÔNG TIN ĐĂNG NHẬP THÀNH CÔNG ---');
  console.log('User A: alex@example.com | Mật khẩu: Password123!');
  console.log('User B: bella@example.com | Mật khẩu: Password123!');
  process.exit(0);
}

seedDemoUsers().catch((err) => {
  console.error('Lỗi khi seed demo users:', err);
  process.exit(1);
});
