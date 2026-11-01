import 'dotenv/config';
import mongoose from 'mongoose';
import Course from '../database/models/Course';
import Chapter from '../database/models/Chapter';
import Lesson from '../database/models/Lesson';
import User from '../database/models/User';
import {
  syncCourseTreeService,
  publishCourseService,
  unpublishCourseService,
  validateCourseTree,
  ensureOwnerEnrolled
} from '../modules/course/course.service';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lexicore';

async function runPhase2Tests() {
  console.log('🚀 Chạy bài kiểm tra tự động Phase 2 Backend & Database...');
  await mongoose.connect(MONGO_URI);

  const testUserId = 'test_owner_99999999';

  try {
    // 1. Tạo khóa học nháp
    console.log('Test 1: Tạo khóa học nháp...');
    const course = await Course.create({
      title: 'Khóa học Thử Nghiệm IELTS',
      shortDescription: 'Mô tả ngắn gọn',
      description: 'Mô tả chi tiết',
      creatorId: testUserId,
      level: 'B2',
      tags: ['IELTS'],
      objectives: ['Mục tiêu 1', 'Mục tiêu 2'],
      isPublished: false,
      status: 'draft',
      type: 'course'
    });

    console.log(`✅ Tạo thành công khóa học: ${course._id}`);

    // 2. Test validation: Chặn chương rỗng
    console.log('Test 2: Kiểm tra validation chặn chương rỗng (0 bài học)...');
    const invalidTree = {
      course: { title: 'Test Empty Chapter' },
      chapters: [
        {
          title: 'Chương 1 không có bài',
          lessons: []
        }
      ]
    };
    const valResult = validateCourseTree(invalidTree as any, false);
    if (valResult.isValid || valResult.errors.length === 0) {
      throw new Error('❌ Thất bại: Hệ thống không chặn chương rỗng!');
    }
    console.log(`✅ Bắt lỗi thành công: "${valResult.errors[0].message}"`);

    // 3. Test syncCourseTreeService với các loại bài học (Video, Reading, Vocab, Quiz)
    console.log('Test 3: Đồng bộ toàn bộ cây khóa học (Tree Sync)...');
    const validTree = {
      course: {
        title: 'IELTS Mastery 7.5+',
        shortDescription: 'Khóa học thực chiến',
        description: 'Chi tiết khóa học...',
        level: 'B2',
        tags: ['IELTS', 'Speaking'],
        objectives: ['Nói lưu loát Part 2', 'Nâng cao từ vựng C1']
      },
      chapters: [
        {
          id: 'tmp_ch_1',
          title: 'Chương 1: Khởi động phát âm',
          description: 'Luyện ngữ điệu và phát âm chuẩn',
          summary: 'Tóm tắt: Bạn đã nắm trọn cách phát âm đuôi ed và s/es.',
          keyTakeaways: ['Nguyên tắc phát âm s/es', 'Quy tắc nuốt âm'],
          lessons: [
            {
              id: 'tmp_ls_1',
              title: 'Bài 1: Nguyên âm đơn',
              type: 'video',
              durationMinutes: 12,
              videoUrl: 'https://youtube.com/watch?v=example1',
              notes: 'Ghi chú bài giảng phát âm'
            },
            {
              id: 'tmp_ls_2',
              title: 'Bài 2: Từ vựng cốt lõi',
              type: 'vocabulary',
              durationMinutes: 10,
              vocabulary: [
                { term: 'eloquent', meaning: 'hùng hồn, lưu loát', phonetic: '/ˈel.ə.kwənt/' }
              ]
            },
            {
              id: 'tmp_ls_3',
              title: 'Bài 3: Trắc nghiệm củng cố',
              type: 'quiz',
              durationMinutes: 5,
              quiz: [
                {
                  question: 'Từ nào có trọng âm rơi vào âm tiết thứ 2?',
                  options: ['eloquent', 'articulate', 'confident'],
                  correctIndex: 1,
                  explanation: 'articulate có trọng âm ở âm tiết 2.'
                }
              ]
            }
          ]
        }
      ]
    };

    const syncResult = await syncCourseTreeService(course._id.toString(), testUserId, validTree as any, false);
    if (!syncResult || syncResult.chapters.length !== 1 || syncResult.chapters[0].lessons.length !== 3) {
      throw new Error('❌ Đồng bộ cây thất bại!');
    }
    console.log(`✅ Đồng bộ cây thành công!`);
    console.log(`   - Số chương: ${syncResult.chapters.length}`);
    console.log(`   - Số bài học: ${syncResult.chapters[0].lessons.length}`);
    console.log(`   - ID Map:`, JSON.stringify(syncResult.idMap));
    console.log(`   - Thống kê stats:`, JSON.stringify(syncResult.course.stats));

    // 4. Test tự động enroll chủ khóa học để tự học (Sửa lỗi D7)
    console.log('Test 4: Kiểm tra ghi nhận enrollment cho chủ sở hữu...');
    const ownerUser = await User.findById(testUserId);
    const hasEnrollment = ownerUser?.enrolledCourses.some(e => e.courseId.toString() === course._id.toString());
    if (!hasEnrollment) {
      throw new Error('❌ Chủ sở hữu chưa được ghi nhận enrollment!');
    }
    console.log('✅ Chủ sở hữu đã tự động có enrollment để học thử khóa private!');

    // 5. Test quyền xuất bản: User thường không được xuất bản
    console.log('Test 5: Kiểm tra quyền xuất bản (Phân quyền)...');
    try {
      await publishCourseService(course._id.toString(), { id: testUserId, role: 'user' });
      throw new Error('❌ Lỗi: User thường không được phép xuất bản mà không có lỗi!');
    } catch (err: any) {
      if (err.requires_creator) {
        console.log(`✅ Phân quyền chuẩn xác: Chặn user thường kèm cờ requires_creator = true`);
      } else {
        throw err;
      }
    }

    // 6. Test xuất bản với tài khoản Content Creator
    console.log('Test 6: Xuất bản khóa học với quyền Content Creator...');
    const publishedCourse = await publishCourseService(course._id.toString(), {
      id: testUserId,
      role: 'content_creator',
      creator_status: 'ACTIVE'
    });
    if (!publishedCourse.isPublished || publishedCourse.status !== 'published') {
      throw new Error('❌ Khóa học chưa được cập nhật status = published!');
    }
    console.log('✅ Xuất bản thành công với Content Creator!');

    // 7. Cleanup
    await Course.findByIdAndDelete(course._id);
    await Chapter.deleteMany({ courseId: course._id });
    await Lesson.deleteMany({ courseId: course._id });
    await User.findByIdAndDelete(testUserId);
    console.log('🧹 Dọn dẹp dữ liệu test thành công.');

    console.log('\n🎉 TẤT CẢ 6 BÀI TEST BACKEND PHASE 2 ĐỀU VƯỢT QUA 100%!');
  } finally {
    await mongoose.disconnect();
  }
}

runPhase2Tests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Thử nghiệm thất bại:', err);
    process.exit(1);
  });
