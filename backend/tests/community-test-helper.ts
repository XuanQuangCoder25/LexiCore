import 'dotenv/config';
import jwt from 'jsonwebtoken';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { pool } from '../config/mysql';
import { connectMongoDB } from '../config/mongo';
import communityRoute from '../modules/community/community.route';
import { globalErrorHandler } from '../middlewares/errorHandler';
import CommunityPost from '../database/models/CommunityPost';
import CommunityComment from '../database/models/CommunityComment';
import CommunityReaction from '../database/models/CommunityReaction';

const JWT_SECRET = process.env.JWT_SECRET || 'lexicore_a_secret_makes_a_woman_woman';

export const TEST_USERS = {
  CREATOR: {
    id: '00000000-0000-0000-0001-000000000001',
    email: 'community_creator@lexicore.test',
    full_name: 'Teacher Lexi (Creator)',
    role: 'CONTENT_CREATOR',
    status: 'ACTIVE',
  },
  USER_A: {
    id: '00000000-0000-0000-0001-000000000002',
    email: 'community_user_a@lexicore.test',
    full_name: 'Student Minh (Asker)',
    role: 'USER',
    status: 'ACTIVE',
  },
  USER_B: {
    id: '00000000-0000-0000-0001-000000000003',
    email: 'community_user_b@lexicore.test',
    full_name: 'Student Lan (Answerer)',
    role: 'USER',
    status: 'ACTIVE',
  },
} as const;

export function generateTestToken(userId: string, role = 'USER'): string {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

export const TOKENS = {
  CREATOR: generateTestToken(TEST_USERS.CREATOR.id, TEST_USERS.CREATOR.role),
  USER_A: generateTestToken(TEST_USERS.USER_A.id, TEST_USERS.USER_A.role),
  USER_B: generateTestToken(TEST_USERS.USER_B.id, TEST_USERS.USER_B.role),
};

export function createCommunityTestApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/community', communityRoute);
  app.use(globalErrorHandler);
  return app;
}

export async function cleanupCommunityTestData(): Promise<void> {
  const testIds = [TEST_USERS.CREATOR.id, TEST_USERS.USER_A.id, TEST_USERS.USER_B.id];

  // 1. Dọn dẹp MongoDB
  try {
    await CommunityPost.deleteMany({ authorId: { $in: testIds } });
    await CommunityComment.deleteMany({ authorId: { $in: testIds } });
    await CommunityReaction.deleteMany({ userId: { $in: testIds } });
  } catch (err) {
    console.error('[TEST CLEANUP] Lỗi dọn MongoDB:', err);
  }

  // 2. Dọn dẹp MySQL billing_transactions & notifications
  try {
    await pool.query(
      `DELETE FROM billing_transactions WHERE user_id IN (?, ?, ?)`,
      testIds
    );
    await pool.query(
      `DELETE FROM notifications WHERE user_id IN (?, ?, ?)`,
      testIds
    );
  } catch (err) {
    console.error('[TEST CLEANUP] Lỗi dọn MySQL:', err);
  }
}

export async function seedCommunityTestUsers(): Promise<void> {
  // Đảm bảo kết nối MongoDB
  if (mongoose.connection.readyState === 0) {
    await connectMongoDB();
  }

  // Dọn dẹp dữ liệu cũ trước khi nạp
  await cleanupCommunityTestData();

  const testIds = [TEST_USERS.CREATOR.id, TEST_USERS.USER_A.id, TEST_USERS.USER_B.id];
  const testEmails = [TEST_USERS.CREATOR.email, TEST_USERS.USER_A.email, TEST_USERS.USER_B.email];

  // Xóa trước để tránh xung đột email UNIQUE từ các lần chạy trước
  await pool.query(`DELETE FROM wallets WHERE user_id IN (?, ?, ?)`, testIds);
  await pool.query(
    `DELETE FROM users WHERE id IN (?, ?, ?) OR email IN (?, ?, ?)`,
    [...testIds, ...testEmails]
  );

  for (const u of Object.values(TEST_USERS)) {
    // 1. Insert users trong MySQL
    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, status)
       VALUES (?, ?, 'dummy_hash', ?, ?, ?)`,
      [u.id, u.email, u.full_name, u.role, u.status]
    );

    // 2. Insert wallets trong MySQL
    await pool.query(
      `INSERT INTO wallets (user_id, coin_balance, exp, level, current_streak, arena_rank)
       VALUES (?, 500, 100, 5, 3, 'GOLD')`,
      [u.id]
    );
  }
}

export async function teardownCommunityTestUsers(): Promise<void> {
  await cleanupCommunityTestData();
  const testIds = [TEST_USERS.CREATOR.id, TEST_USERS.USER_A.id, TEST_USERS.USER_B.id];
  await pool.query(`DELETE FROM wallets WHERE user_id IN (?, ?, ?)`, testIds);
  await pool.query(`DELETE FROM users WHERE id IN (?, ?, ?)`, testIds);
}
