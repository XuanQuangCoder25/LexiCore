import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import User from './database/models/User';
import Course from './database/models/Course';
import Lesson from './database/models/Lesson';
import Achievement from './database/models/Achievement';
import StudySession from './database/models/StudySession';
import RetentionLog from './database/models/RetentionLog';
import { connectMySQL, pool } from './config/mysql';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lexicore';

async function seedDatabase() {
  try {
    console.log('🔗 Đang kết nối tới MySQL...');
    await connectMySQL();
    
    console.log('🔗 Đang kết nối tới MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Kết nối thành công.');

    console.log('🧹 Đang xóa dữ liệu cũ...');
    // Delete MongoDB collections
    await User.deleteMany({});
    await Course.deleteMany({});
    await Lesson.deleteMany({});
    await Achievement.deleteMany({});
    await StudySession.deleteMany({});
    await RetentionLog.deleteMany({});
    
    // Delete from MySQL users if they exist
    await pool.execute('DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email IN (?, ?))', ['newbie@lexicore.com', 'pro@lexicore.com']);
    await pool.execute('DELETE FROM users WHERE email IN (?, ?)', ['newbie@lexicore.com', 'pro@lexicore.com']);

    console.log('🌱 Đang chèn Courses & Lessons...');
    const course1 = await Course.create({
      title: 'Business English Mastery',
      description: 'Làm chủ tiếng Anh giao tiếp công sở.'
    });
    const course2 = await Course.create({
      title: 'Advanced Grammar',
      description: 'Ngữ pháp nâng cao.'
    });

    const c1l1 = await Lesson.create({ courseId: course1._id, title: 'Business Presentations', durationMinutes: 30, order: 1 });
    const c1l2 = await Lesson.create({ courseId: course1._id, title: 'Email Etiquette', durationMinutes: 20, order: 2 });
    const c2l1 = await Lesson.create({ courseId: course2._id, title: 'Conditional Sentences', durationMinutes: 25, order: 1 });
    const c2l2 = await Lesson.create({ courseId: course2._id, title: 'Passive Voice', durationMinutes: 15, order: 2 });

    console.log('🏆 Đang chèn Achievements...');
    const ach1 = await Achievement.create({ title: 'Grammar Master', description: 'Đã hoàn thành khóa ngữ pháp', criteria: 'grammar_master' });
    const ach2 = await Achievement.create({ title: 'Vocabulary Wizard', description: 'Đã học 1000+ từ vựng', criteria: 'vocab_wizard' });
    
    console.log('👤 Đang chèn Users (MySQL & MongoDB) (Mật khẩu mặc định: password123)...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const newUserId = uuidv4();
    const activeUserId = uuidv4();

    // 1. Chèn vào MySQL (Auth)
    await pool.execute(`INSERT INTO users (id, email, password_hash, full_name, status, role) VALUES (?, ?, ?, ?, 'ACTIVE', 'USER')`, 
      [newUserId, 'newbie@lexicore.com', hashedPassword, 'New Learner']);
    await pool.execute(`INSERT INTO wallets (user_id, coin_balance) VALUES (?, 0)`, [newUserId]);

    await pool.execute(`INSERT INTO users (id, email, password_hash, full_name, status, role) VALUES (?, ?, ?, ?, 'ACTIVE', 'USER')`, 
      [activeUserId, 'pro@lexicore.com', hashedPassword, 'Sarah Pro']);
    await pool.execute(`INSERT INTO wallets (user_id, coin_balance) VALUES (?, 1000)`, [activeUserId]);

    // 2. Chèn vào MongoDB (Dashboard)
    const newUser = await User.create({
      _id: newUserId,
      email: 'newbie@lexicore.com',
      username: 'NewLearner',
      passwordHash: hashedPassword,
      level: 'A1 Beginner',
      streak: 0,
      totalWordsLearned: 0,
      weeklyActivityScore: 0,
      enrolledCourses: [],
      completedLessons: [],
      unlockedAchievements: []
    });

    const activeUser = await User.create({
      _id: activeUserId,
      email: 'pro@lexicore.com',
      username: 'Sarah',
      passwordHash: hashedPassword,
      level: 'B2 Upper Intermediate',
      streak: 7,
      totalWordsLearned: 1250,
      weeklyActivityScore: 85,
      enrolledCourses: [
        { courseId: course1._id, progressPercentage: 75 },
        { courseId: course2._id, progressPercentage: 92 }
      ],
      completedLessons: [c1l1._id, c2l1._id],
      unlockedAchievements: [
        { achievementId: ach1._id, unlockedAt: new Date() },
        { achievementId: ach2._id, unlockedAt: new Date() }
      ]
    });

    console.log('📊 Đang chèn Stats & Logs cho Active User...');
    await StudySession.create([
      { userId: activeUserId, durationMinutes: 420, lessonsCompleted: 2, date: new Date() },
      { userId: activeUserId, durationMinutes: 300, lessonsCompleted: 1, date: new Date(Date.now() - 86400000) }
    ]);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const retentions = [100, 80, 65, 55, 45, 35, 30];
    const withReviews = [100, 95, 92, 90, 94, 91, 93];
    
    for (let i = 0; i < 7; i++) {
      await RetentionLog.create({
        userId: activeUserId,
        day: days[i],
        retention: retentions[i],
        withReview: withReviews[i],
        date: new Date(Date.now() - (6 - i) * 86400000)
      });
    }

    console.log('🎉 QUÁ TRÌNH SEED HOÀN TẤT!');
    console.log('-------------------------------------------');
    console.log(`👤 New User ID: ${newUserId}`);
    console.log(`👤 Active User ID: ${activeUserId}`);
    console.log('-------------------------------------------');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed database:', error);
    process.exit(1);
  }
}

seedDatabase();
