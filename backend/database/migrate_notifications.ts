import 'dotenv/config';
import { pool } from '../config/mysql';

async function runMigration() {
  console.log('--- Đang chạy migration tạo bảng user_settings và notifications ---');
  const connection = await pool.getConnection();

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
          user_id VARCHAR(36) PRIMARY KEY,
          enable_email_reminder BOOLEAN DEFAULT TRUE,
          enable_in_app_reminder BOOLEAN DEFAULT TRUE,
          reminder_time VARCHAR(10) DEFAULT '20:00',
          timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Bảng user_settings đã sẵn sàng.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          type VARCHAR(50) DEFAULT 'reminder',
          title VARCHAR(255) NOT NULL,
          body TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          INDEX idx_notifications_user (user_id),
          INDEX idx_notifications_created (created_at)
      );
    `);
    console.log('✅ Bảng notifications đã sẵn sàng.');

    console.log('Migration hoàn tất thành công!');
  } catch (err) {
    console.error('Lỗi khi migrate:', err);
    throw err;
  } finally {
    connection.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
