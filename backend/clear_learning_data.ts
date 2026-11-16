import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import mongoose from 'mongoose';
import Course from './database/models/Course';
import Chapter from './database/models/Chapter';
import Lesson from './database/models/Lesson';
import Flashcard from './database/models/Flashcard';
import CardReview from './database/models/CardReview';
import Exam from './database/models/Exam';
import Question from './database/models/Question';
import ExamResult from './database/models/ExamResult';
import ExamRating from './database/models/ExamRating';
import ExamReport from './database/models/ExamReport';
import StudySession from './database/models/StudySession';
import RetentionLog from './database/models/RetentionLog';
import User from './database/models/User';

async function clearData() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in .env');
  }

  console.log('🔗 Đang kết nối tới MongoDB Atlas...');
  await mongoose.connect(mongoUri);
  console.log('✅ Đã kết nối thành công tới MongoDB.');

  console.log('\n📊 THỐNG KÊ DỮ LIỆU HIỆN TẠI:');
  const before = {
    courses: await Course.countDocuments(),
    chapters: await Chapter.countDocuments(),
    lessons: await Lesson.countDocuments(),
    flashcards: await Flashcard.countDocuments(),
    cardReviews: await CardReview.countDocuments(),
    exams: await Exam.countDocuments(),
    questions: await Question.countDocuments(),
    examResults: await ExamResult.countDocuments(),
    examRatings: await ExamRating.countDocuments(),
    examReports: await ExamReport.countDocuments(),
    studySessions: await StudySession.countDocuments(),
    retentionLogs: await RetentionLog.countDocuments(),
  };
  console.table(before);

  console.log('\n🧹 ĐANG TIẾN HÀNH XÓA DỮ LIỆU...');
  
  // 1. Xóa Courses, Chapters, Lessons
  const delCourses = await Course.deleteMany({});
  const delChapters = await Chapter.deleteMany({});
  const delLessons = await Lesson.deleteMany({});
  console.log(`- Đã xóa ${delCourses.deletedCount} Courses`);
  console.log(`- Đã xóa ${delChapters.deletedCount} Chapters`);
  console.log(`- Đã xóa ${delLessons.deletedCount} Lessons`);

  // 2. Xóa Flashcards & CardReviews (tiến trình SRS)
  const delFlashcards = await Flashcard.deleteMany({});
  const delCardReviews = await CardReview.deleteMany({});
  console.log(`- Đã xóa ${delFlashcards.deletedCount} Flashcards`);
  console.log(`- Đã xóa ${delCardReviews.deletedCount} CardReviews (SRS)`);

  // 3. Xóa Exams, Questions, ExamResults, ExamRatings, ExamReports
  const delExams = await Exam.deleteMany({});
  const delQuestions = await Question.deleteMany({});
  const delResults = await ExamResult.deleteMany({});
  const delRatings = await ExamRating.deleteMany({});
  const delReports = await ExamReport.deleteMany({});
  console.log(`- Đã xóa ${delExams.deletedCount} Exams`);
  console.log(`- Đã xóa ${delQuestions.deletedCount} Questions`);
  console.log(`- Đã xóa ${delResults.deletedCount} ExamResults`);
  console.log(`- Đã xóa ${delRatings.deletedCount} ExamRatings`);
  console.log(`- Đã xóa ${delReports.deletedCount} ExamReports`);

  // 4. Xóa StudySessions & RetentionLogs liên quan
  const delSessions = await StudySession.deleteMany({});
  const delRetention = await RetentionLog.deleteMany({});
  console.log(`- Đã xóa ${delSessions.deletedCount} StudySessions`);
  console.log(`- Đã xóa ${delRetention.deletedCount} RetentionLogs`);

  // 5. Reset tiến trình học tập của Users trong MongoDB (giữ nguyên tài khoản và mật khẩu)
  const userUpdate = await User.updateMany({}, {
    $set: {
      enrolledCourses: [],
      completedLessons: [],
      totalWordsLearned: 0,
    }
  });
  console.log(`- Đã làm sạch tiến trình học (enrolledCourses, completedLessons, words) của ${userUpdate.modifiedCount} Users`);

  console.log('\n✅ KIỂM TRA LẠI DỮ LIỆU SAU KHI DỌN DẸP:');
  const after = {
    courses: await Course.countDocuments(),
    chapters: await Chapter.countDocuments(),
    lessons: await Lesson.countDocuments(),
    flashcards: await Flashcard.countDocuments(),
    cardReviews: await CardReview.countDocuments(),
    exams: await Exam.countDocuments(),
    questions: await Question.countDocuments(),
    examResults: await ExamResult.countDocuments(),
    examRatings: await ExamRating.countDocuments(),
    examReports: await ExamReport.countDocuments(),
    studySessions: await StudySession.countDocuments(),
    retentionLogs: await RetentionLog.countDocuments(),
  };
  console.table(after);

  await mongoose.disconnect();
  console.log('\n🎉 Toàn bộ dữ liệu Flashcard, Exam, Course đã được xóa sạch và reset chuẩn xác!');
}

clearData().catch((err) => {
  console.error('❌ Lỗi dọn dẹp dữ liệu:', err);
  process.exit(1);
});
