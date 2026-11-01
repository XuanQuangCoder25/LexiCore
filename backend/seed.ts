import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import User from './database/models/User';
import Course from './database/models/Course';
import Chapter from './database/models/Chapter';
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
    await Chapter.deleteMany({});
    await Lesson.deleteMany({});
    await Achievement.deleteMany({});
    await StudySession.deleteMany({});
    await RetentionLog.deleteMany({});
    
    // Delete from MySQL users if they exist
    await pool.execute('DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email IN (?, ?))', ['newbie@lexicore.com', 'pro@lexicore.com']);
    await pool.execute('DELETE FROM users WHERE email IN (?, ?)', ['newbie@lexicore.com', 'pro@lexicore.com']);

    console.log('🌱 Đang chèn Courses, Chapters & Lessons...');
    const course1 = await Course.create({
      title: 'Business English Mastery',
      shortDescription: 'Làm chủ kỹ năng tiếng Anh giao tiếp và thuyết trình công sở.',
      description: 'Khóa học chuyên sâu trang bị từ vựng thương mại, cách viết email chuyên nghiệp và phong thái thuyết trình tự tin.',
      creatorId: '00000000-0000-0000-0000-000000000001',
      level: 'B2',
      tags: ['Business', 'Communication'],
      objectives: ['Soạn thảo email công việc chuẩn mực', 'Thuyết trình mạch lạc trước đối tác quốc tế'],
      isPublished: true,
      status: 'published'
    });

    const c1_ch1 = await Chapter.create({
      courseId: course1._id,
      title: 'Giao tiếp nơi công sở',
      description: 'Làm quen với các tình huống giao tiếp thông dụng tại nơi làm việc.',
      summary: 'Hoàn thành chương này, bạn đã tự tin viết email công việc và chuẩn bị slide thuyết trình mạch lạc.',
      keyTakeaways: ['Nguyên tắc viết email ngắn gọn (KISS)', 'Cấu trúc bài thuyết trình 3 phần'],
      order: 1
    });

    const course2 = await Course.create({
      title: 'Advanced Grammar',
      shortDescription: 'Ngữ pháp nâng cao chinh phục các kỳ thi học thuật.',
      description: 'Hệ thống hóa toàn bộ các chủ điểm ngữ pháp nâng cao như câu điều kiện hỗn hợp, thể bị động đặc biệt.',
      creatorId: '00000000-0000-0000-0000-000000000001',
      level: 'C1',
      tags: ['Grammar', 'IELTS'],
      objectives: ['Nắm vững cấu trúc câu phức tạp', 'Áp dụng linh hoạt vào bài thi viết'],
      isPublished: true,
      status: 'published'
    });

    const c2_ch1 = await Chapter.create({
      courseId: course2._id,
      title: 'Các cấu trúc ngữ pháp trọng điểm',
      description: 'Đi sâu vào các cấu trúc câu điều kiện và bị động nâng cao.',
      summary: 'Bạn đã nắm vững cách biến đổi linh hoạt câu chủ động sang bị động và điều kiện hỗn hợp.',
      keyTakeaways: ['Phân biệt câu điều kiện loại 2 & 3', 'Thể bị động kép'],
      order: 1
    });

    const c1l1 = await Lesson.create({
      courseId: course1._id,
      chapterId: c1_ch1._id,
      title: 'Business Presentations',
      type: 'video',
      durationMinutes: 30,
      order: 1,
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      notes: 'Lưu ý phong thái mở đầu và ngôn ngữ hình thể khi thuyết trình.'
    });

    const c1l2 = await Lesson.create({
      courseId: course1._id,
      chapterId: c1_ch1._id,
      title: 'Email Etiquette',
      type: 'reading',
      durationMinutes: 20,
      order: 2,
      content: '## Quy tắc gửi Email công sở\nLuôn có tiêu đề rõ ràng, lời chào trang trọng và chữ ký đầy đủ.'
    });

    const c2l1 = await Lesson.create({
      courseId: course2._id,
      chapterId: c2_ch1._id,
      title: 'Conditional Sentences',
      type: 'reading',
      durationMinutes: 25,
      order: 1,
      content: '## Câu điều kiện nâng cao\nTìm hiểu về đảo ngữ và câu điều kiện hỗn hợp trong văn phong học thuật.'
    });

    const c2l2 = await Lesson.create({
      courseId: course2._id,
      chapterId: c2_ch1._id,
      title: 'Passive Voice',
      type: 'reading',
      durationMinutes: 15,
      order: 2,
      content: '## Bị động đặc biệt\nCấu trúc `It is said that...` và `have something done`.'
    });

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
