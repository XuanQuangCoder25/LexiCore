import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../database/models/User';
import Course from '../database/models/Course';
import Chapter from '../database/models/Chapter';
import Lesson from '../database/models/Lesson';
import CardReview from '../database/models/CardReview';
import ExamResult from '../database/models/ExamResult';
import {
  getStats,
  getRetention,
  getCoursesProgress,
  getNextLessons,
  getActivities
} from '../modules/dashboard/dashboard.controller';
import { completeLesson } from '../modules/course/student-course.controller';
import { pool } from '../config/mysql';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/LexiCoreDB';

function createMockReqRes(userId: string, body: any = {}, params: any = {}) {
  let statusCode = 200;
  let jsonData: any = null;

  const req: any = {
    user: { id: userId, role: 'user' },
    body,
    params,
    query: {}
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: any) {
      jsonData = payload;
      return res;
    }
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getData: () => jsonData
  };
}

async function runDashboardAuditTests() {
  console.log('==============================================================');
  console.log('🚀 RUNNING PHASE 3: DASHBOARD E2E DATA PIPELINE AUDIT TESTS');
  console.log('==============================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const testUserId = `audit_dash_${Date.now()}`;
  let testCourseId = '';
  let testChapterId = '';
  let lesson1Id = '';
  let lesson2Id = '';

  try {
    // ------------------------------------------------------------------
    // TEST CASE 1: Zero-State / Brand New User Verification
    // ------------------------------------------------------------------
    console.log('\n--- TEST CASE 1: Zero-State User (No Mock/Hardcode Data) ---');
    const mockStatsEmpty = createMockReqRes(testUserId);
    await getStats(mockStatsEmpty.req, mockStatsEmpty.res);
    const emptyStats = mockStatsEmpty.getData();

    if (
      emptyStats.lessonsCompleted !== 0 ||
      emptyStats.durationSeconds !== 0 ||
      emptyStats.wordsLearned !== 0 ||
      emptyStats.formattedDuration !== '0m'
    ) {
      throw new Error(`Expected zero stats for new user, got: ${JSON.stringify(emptyStats)}`);
    }

    const mockRetEmpty = createMockReqRes(testUserId);
    await getRetention(mockRetEmpty.req, mockRetEmpty.res);
    if (!Array.isArray(mockRetEmpty.getData()) || mockRetEmpty.getData().length !== 0) {
      throw new Error('Expected empty retention array [] for new user with no SRS history');
    }
    console.log('✅ Test Case 1 Passed: New user returns clean zero-state without mock data.');

    // ------------------------------------------------------------------
    // TEST CASE 2: Real Course Enrollment, Lesson Completion & Study Time
    // ------------------------------------------------------------------
    console.log('\n--- TEST CASE 2: Course Progress, Next Lessons & Sub-minute Study Time ---');
    await User.create({
      _id: testUserId,
      email: `${testUserId}@lexicore.test`,
      username: 'QA Dashboard Tester',
      passwordHash: 'test_hash',
      role: 'user',
      enrolledCourses: []
    });

    const course = await Course.create({
      title: 'IELTS Academic Mastery',
      creatorId: testUserId,
      level: 'B2',
      type: 'course',
      isPublished: true,
      status: 'published'
    });
    testCourseId = course._id.toString();

    const chapter = await Chapter.create({
      courseId: course._id,
      title: 'Chương 1: Academic Reading',
      order: 1
    });
    testChapterId = chapter._id.toString();

    const lesson1 = await Lesson.create({
      courseId: course._id,
      chapterId: chapter._id,
      title: 'Bài 1: Skimming & Scanning',
      type: 'vocabulary',
      durationMinutes: 10,
      order: 1,
      vocabulary: [
        { term: 'ubiquitous', meaning: 'phổ biến khắp nơi' },
        { term: 'mitigate', meaning: 'giảm thiểu' },
        { term: 'empirical', meaning: 'thực nghiệm' }
      ]
    });
    lesson1Id = lesson1._id.toString();

    const lesson2 = await Lesson.create({
      courseId: course._id,
      chapterId: chapter._id,
      title: 'Bài 2: Paraphrasing Techniques',
      type: 'reading',
      durationMinutes: 15,
      order: 2,
      content: 'Nội dung bài đọc...'
    });
    lesson2Id = lesson2._id.toString();

    // Học viên hoàn thành Bài 1 trong 45 giây thực tế
    const mockComplete = createMockReqRes(
      testUserId,
      { timeSpentSeconds: 45 },
      { courseId: testCourseId, lessonId: lesson1Id }
    );
    await completeLesson(mockComplete.req, mockComplete.res);
    if (mockComplete.getStatus() !== 200) {
      throw new Error(`completeLesson failed: ${JSON.stringify(mockComplete.getData())}`);
    }

    // Kiểm tra getCoursesProgress
    const mockCourses = createMockReqRes(testUserId);
    await getCoursesProgress(mockCourses.req, mockCourses.res);
    const coursesData = mockCourses.getData();
    if (!Array.isArray(coursesData) || coursesData.length !== 1 || coursesData[0].progress !== 50) {
      throw new Error(`Expected 1 course with 50% progress, got: ${JSON.stringify(coursesData)}`);
    }

    // Kiểm tra getNextLessons (Chỉ trả về Bài 2 chưa học)
    const mockNext = createMockReqRes(testUserId);
    await getNextLessons(mockNext.req, mockNext.res);
    const nextData = mockNext.getData();
    if (!Array.isArray(nextData) || nextData.length !== 1 || nextData[0].id !== lesson2Id) {
      throw new Error(`Expected Next Lesson to be Lesson 2 (${lesson2Id}), got: ${JSON.stringify(nextData)}`);
    }
    console.log('✅ Test Case 2 Passed: Course Progress = 50% (1/2) & Next Lesson accurately points to Lesson 2.');

    // ------------------------------------------------------------------
    // TEST CASE 3: SRS Flashcard Reviews, Due Cards & Retention Curve
    // ------------------------------------------------------------------
    console.log('\n--- TEST CASE 3: SRS Reviews, Words Learned & 7-Day Retention Curve ---');
    const elevenDaysAgo = new Date();
    elevenDaysAgo.setDate(elevenDaysAgo.getDate() - 11);
    elevenDaysAgo.setHours(9, 0, 0, 0);

    await CardReview.create({
      userId: testUserId,
      cardId: new mongoose.Types.ObjectId(),
      courseId: course._id,
      easeFactor: 2.6,
      interval: 3,
      repetitions: 2,
      nextReviewDate: new Date(Date.now() - 60000), // Due today!
      status: 'Review',
      reviewHistory: [
        {
          date: elevenDaysAgo,
          quality: 4,
          interval: 6,
          easeFactor: 2.5,
          responseTimeMs: 4000
        },
        {
          date: new Date(),
          quality: 5,
          interval: 3,
          easeFactor: 2.6,
          responseTimeMs: 4000 // Total 8 seconds
        }
      ]
    });

    const mockRetAfter = createMockReqRes(testUserId);
    await getRetention(mockRetAfter.req, mockRetAfter.res);
    const retPoints = mockRetAfter.getData();
    if (!Array.isArray(retPoints) || retPoints.length !== 7) {
      throw new Error(`Expected 7 retention curve points from SRS history, got: ${JSON.stringify(retPoints)}`);
    }
    if (retPoints[6].withReview <= retPoints[5].withReview) {
      throw new Error(`Expected today's SRS review to rebound withReview higher than yesterday (${retPoints[5].withReview}% -> ${retPoints[6].withReview}%)`);
    }
    if (retPoints[0].retention <= retPoints[6].retention) {
      throw new Error(`Expected Ebbinghaus natural forgetting curve to decay across the week (${retPoints[0].retention}% -> ${retPoints[6].retention}%)`);
    }
    console.log(`✅ Test Case 3 Passed: 7-day retention curve computed dynamically (yesterday = ${retPoints[5].withReview}% -> today after review = ${retPoints[6].withReview}%, Ebbinghaus curve = ${retPoints[0].retention}% -> ${retPoints[6].retention}%).`);

    // ------------------------------------------------------------------
    // TEST CASE 4: Exam Study Time & Aggregated Quick Stats + Activities
    // ------------------------------------------------------------------
    console.log('\n--- TEST CASE 4: Aggregated Stats (Lessons, Study Time, Words, Due Cards) & Activities ---');
    await ExamResult.create({
      userId: testUserId,
      examId: new mongoose.Types.ObjectId(),
      score: 90,
      passed: true,
      correctCount: 9,
      totalQuestions: 10,
      durationSpentSeconds: 30, // 30 seconds
      progress: 100,
      status: 'Completed',
      completedAt: new Date()
    });

    const mockStatsAfter = createMockReqRes(testUserId);
    await getStats(mockStatsAfter.req, mockStatsAfter.res);
    const statsAfter = mockStatsAfter.getData();
    console.log('   -> Aggregated Stats:', JSON.stringify(statsAfter));

    // lessonsCompleted = 1, wordsLearned = 3 (from lesson1) + 1 (from SRS) = 4, durationSeconds = 45 + 8 + 30 = 83s (1m 23s), dueCardsToday = 1
    if (statsAfter.lessonsCompleted !== 1) throw new Error(`Expected lessonsCompleted = 1, got ${statsAfter.lessonsCompleted}`);
    if (statsAfter.wordsLearned !== 4) throw new Error(`Expected wordsLearned = 4, got ${statsAfter.wordsLearned}`);
    if (statsAfter.durationSeconds !== 83) throw new Error(`Expected durationSeconds = 83, got ${statsAfter.durationSeconds}`);
    if (statsAfter.formattedDuration !== '1m 23s') throw new Error(`Expected formattedDuration = '1m 23s', got ${statsAfter.formattedDuration}`);
    if (statsAfter.dueCardsToday !== 1) throw new Error(`Expected dueCardsToday = 1, got ${statsAfter.dueCardsToday}`);

    const mockAct = createMockReqRes(testUserId);
    await getActivities(mockAct.req, mockAct.res);
    const actData = mockAct.getData();
    if (typeof actData.weeklyActivityScore !== 'number' || actData.weeklyActivityScore <= 0) {
      throw new Error(`Expected positive weeklyActivityScore, got: ${JSON.stringify(actData)}`);
    }
    console.log('✅ Test Case 4 Passed: All QuickStats & Activities match exact DB calculations.');

    // ------------------------------------------------------------------
    // TEST CASE 5: Real MySQL User Verification (modric@gmail.com)
    // ------------------------------------------------------------------
    console.log('\n--- TEST CASE 5: Verify Real MySQL User (modric@gmail.com) ---');
    const [modricRows] = await pool.execute('SELECT id, full_name FROM users WHERE email = ? LIMIT 1', ['modric@gmail.com']);
    const modric = (modricRows as any[])[0];
    if (modric) {
      const mockModricStats = createMockReqRes(modric.id);
      await getStats(mockModricStats.req, mockModricStats.res);
      const modricStats = mockModricStats.getData();
      console.log('   -> Modric Live Dashboard Stats:', JSON.stringify(modricStats));
      if (modricStats.userName !== modric.full_name) {
        throw new Error(`Expected userName = "${modric.full_name}", got "${modricStats.userName}"`);
      }
      console.log(`✅ Test Case 5 Passed: Real MySQL user "${modricStats.userName}" synced accurately (no "Sarah" hardcode).`);
    }

    console.log('\n==============================================================');
    console.log('🎉 ALL 5 DASHBOARD E2E AUDIT TEST SUITES PASSED 100%!');
    console.log('==============================================================');
  } finally {
    // Cleanup test artifacts
    await User.deleteOne({ _id: testUserId });
    if (testCourseId) {
      await Course.deleteOne({ _id: testCourseId });
      await Chapter.deleteMany({ courseId: testCourseId });
      await Lesson.deleteMany({ courseId: testCourseId });
    }
    await CardReview.deleteMany({ userId: testUserId });
    await ExamResult.deleteMany({ userId: testUserId });
    await mongoose.disconnect();
    await pool.end();
  }
}

runDashboardAuditTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Dashboard Audit Test Failed:', err);
    process.exit(1);
  });
