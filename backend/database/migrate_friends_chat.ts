import 'dotenv/config';
import { pool } from '../config/mysql';

/**
 * Migration: tạo các bảng cho tính năng Kết bạn & Nhắn tin trực tiếp.
 *   - friendships
 *   - conversations
 *   - messages
 * Chạy:  npx tsx database/migrate_friends_chat.ts
 * Idempotent (CREATE TABLE IF NOT EXISTS) nên có thể chạy lại nhiều lần.
 *
 * Lưu ý thiết kế:
 *  - Không dùng CHECK/generated column trên các cột có FK ... ON DELETE CASCADE
 *    (MySQL cấm kết hợp này), nên các quy tắc "không tự kết bạn" và "user1 < user2"
 *    được đảm bảo ở tầng service. DB vẫn chặn trùng bằng UNIQUE KEY.
 */
async function runMigration() {
  console.log('--- Đang chạy migration: friendships, conversations, messages ---');
  const connection = await pool.getConnection();

  try {
    // 1. Quan hệ kết bạn
    // pair_key = "<id nhỏ hơn>:<id lớn hơn>" do service tính => chặn trùng A→B và B→A.
    // Với status 'blocked', requester_id chính là người chặn.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS friendships (
          id VARCHAR(36) PRIMARY KEY,
          requester_id VARCHAR(36) NOT NULL,
          receiver_id VARCHAR(36) NOT NULL,
          pair_key VARCHAR(73) NOT NULL,
          status ENUM('pending', 'accepted', 'rejected', 'blocked') NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_friendship_pair (pair_key),
          INDEX idx_friendships_receiver (receiver_id, status),
          INDEX idx_friendships_requester (requester_id, status),
          FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Bảng friendships đã sẵn sàng.');

    // 2. Phòng chat 1-1 (Direct Message). Luôn lưu user1_id < user2_id (service chuẩn hoá).
    await connection.query(`
      CREATE TABLE IF NOT EXISTS conversations (
          id VARCHAR(36) PRIMARY KEY,
          user1_id VARCHAR(36) NOT NULL,
          user2_id VARCHAR(36) NOT NULL,
          last_message_at TIMESTAMP(3) NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_conversation_pair (user1_id, user2_id),
          INDEX idx_conversations_user2 (user2_id),
          INDEX idx_conversations_last_message (last_message_at),
          FOREIGN KEY (user1_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (user2_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Bảng conversations đã sẵn sàng.');

    // 3. Tin nhắn. id tăng dần (BIGINT) để phân trang cursor-based ổn định:
    //    WHERE conversation_id = ? AND id < :cursor ORDER BY id DESC LIMIT n
    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          conversation_id VARCHAR(36) NOT NULL,
          sender_id VARCHAR(36) NOT NULL,
          content TEXT NOT NULL,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          read_at TIMESTAMP(3) NULL DEFAULT NULL,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX idx_messages_conversation_id (conversation_id, id),
          INDEX idx_messages_unread (conversation_id, sender_id, is_read),
          FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Bảng messages đã sẵn sàng.');

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
