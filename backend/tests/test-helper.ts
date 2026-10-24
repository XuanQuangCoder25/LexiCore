import 'dotenv/config';
import jwt from 'jsonwebtoken';
import express from 'express';
import cookieParser from 'cookie-parser';
import { pool } from '../config/mysql';
import socialRoute from '../modules/social/social.route';
import { globalErrorHandler } from '../middlewares/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Định danh User A, User B, User C cố định cho môi trường test
export const TEST_USERS = {
  USER_A: {
    id: '00000000-0000-0000-0000-00000000000a',
    email: 'test_user_a@lexicore.test',
    full_name: 'Test User A',
    role: 'USER',
    status: 'ACTIVE',
  },
  USER_B: {
    id: '00000000-0000-0000-0000-00000000000b',
    email: 'test_user_b@lexicore.test',
    full_name: 'Test User B',
    role: 'USER',
    status: 'ACTIVE',
  },
  USER_C: {
    id: '00000000-0000-0000-0000-00000000000c',
    email: 'test_user_c@lexicore.test',
    full_name: 'Test User C (Stranger)',
    role: 'USER',
    status: 'ACTIVE',
  },
} as const;

/**
 * Sinh JWT token chuẩn có chữ ký hợp lệ để gửi qua Cookie hoặc Authorization header
 */
export function generateTestToken(userId: string, role = 'USER'): string {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

export const TOKENS = {
  USER_A: generateTestToken(TEST_USERS.USER_A.id, TEST_USERS.USER_A.role),
  USER_B: generateTestToken(TEST_USERS.USER_B.id, TEST_USERS.USER_B.role),
  USER_C: generateTestToken(TEST_USERS.USER_C.id, TEST_USERS.USER_C.role),
};

/**
 * Tạo Express App độc lập để chạy test với Supertest mà không cần chiếm dụng port 5000
 */
export function createTestApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/social', socialRoute);
  app.use(globalErrorHandler);
  return app;
}

/**
 * Dọn sạch dữ liệu test (friendships, conversations, messages, notifications) của các user test
 */
export async function cleanupTestData(): Promise<void> {
  const testIds = [TEST_USERS.USER_A.id, TEST_USERS.USER_B.id, TEST_USERS.USER_C.id];

  // 1. Dọn dẹp tin nhắn test
  await pool.query(
    `DELETE FROM messages WHERE sender_id IN (?, ?, ?)`,
    testIds
  );

  // 2. Dọn dẹp cuộc trò chuyện test
  await pool.query(
    `DELETE FROM conversations WHERE user1_id IN (?, ?, ?) OR user2_id IN (?, ?, ?)`,
    [...testIds, ...testIds]
  );

  // 3. Dọn dẹp quan hệ bạn bè test
  await pool.query(
    `DELETE FROM friendships WHERE requester_id IN (?, ?, ?) OR receiver_id IN (?, ?, ?)`,
    [...testIds, ...testIds]
  );

  // 4. Dọn dẹp thông báo test
  await pool.query(
    `DELETE FROM notifications WHERE user_id IN (?, ?, ?)`,
    testIds
  );
}

/**
 * Khởi tạo dữ liệu mồi (Seed Data):
 * Đảm bảo User A, User B, User C tồn tại trong bảng `users` và `wallets` với trạng thái ACTIVE.
 */
export async function seedTestUsers(): Promise<void> {
  // Dọn dẹp dữ liệu rác từ các lần test trước
  await cleanupTestData();

  for (const u of Object.values(TEST_USERS)) {
    // 1. Upsert users
    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, status)
       VALUES (?, ?, 'dummy_hash', ?, ?, ?)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), status = VALUES(status), role = VALUES(role)`,
      [u.id, u.email, u.full_name, u.role, u.status]
    );

    // 2. Upsert wallets
    await pool.query(
      `INSERT INTO wallets (user_id, coin_balance, level, current_streak, arena_rank)
       VALUES (?, 500, 5, 3, 'GOLD')
       ON DUPLICATE KEY UPDATE level = VALUES(level)`,
      [u.id]
    );
  }
}

/**
 * Xóa sạch cả user test ra khỏi Database khi kết thúc toàn bộ phiên test (nếu cần)
 */
export async function teardownTestUsers(): Promise<void> {
  await cleanupTestData();
  const testIds = [TEST_USERS.USER_A.id, TEST_USERS.USER_B.id, TEST_USERS.USER_C.id];
  await pool.query(`DELETE FROM wallets WHERE user_id IN (?, ?, ?)`, testIds);
  await pool.query(`DELETE FROM users WHERE id IN (?, ?, ?)`, testIds);
}
