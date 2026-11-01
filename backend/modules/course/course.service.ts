import mongoose from 'mongoose';
import Course, { ICourse } from '../../database/models/Course';
import Chapter from '../../database/models/Chapter';
import Lesson from '../../database/models/Lesson';
import User from '../../database/models/User';
import { findUserById } from '../auth/auth-repository';
import { CourseTreeDTO, ValidationErrorItem, ChapterDTO, LessonDTO } from './course.types';

export const VALID_LEVELS = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

/**
 * Kiểm tra quyền xuất bản khóa học công khai.
 * Chỉ Admin hoặc Content Creator có trạng thái hoạt động (khác SUSPENDED) mới được xuất bản.
 */
export const canPublishCourse = (user?: { role?: string; creator_status?: string | null }): boolean => {
  const role = user?.role?.toLowerCase().replace(/\s+/g, '_');
  const creatorStatus = user?.creator_status;
  const isAdmin = role === 'admin';
  const isActiveCreator = role === 'content_creator' && creatorStatus !== 'SUSPENDED';
  return isAdmin || isActiveCreator;
};

/**
 * Đảm bảo document User trong MongoDB tồn tại và được đồng bộ từ MySQL nếu cần.
 */
export const ensureMongoUser = async (userId: string) => {
  let user = await User.findById(userId);
  if (!user) {
    let email = `user_${userId}@lexicore.local`;
    let username = 'User';
    let role: any = 'user';
    try {
      const mysqlUser = await findUserById(userId);
      if (mysqlUser) {
        email = mysqlUser.email;
        username = mysqlUser.full_name || 'User';
        role = (mysqlUser.role || 'user').toLowerCase();
      }
    } catch (e) {
      // MySQL connect error / test user fallback
    }

    try {
      user = await User.create({
        _id: userId,
        email,
        username,
        passwordHash: 'synced_from_mysql',
        role
      });
    } catch (createErr) {
      // Phòng trường hợp race condition tạo song song
      user = await User.findById(userId);
    }
  }
  return user;
};

/**
 * Đảm bảo chủ sở hữu khóa học được tự động ghi nhận vào enrolledCourses (kể cả khóa Private),
 * giúp học viên / creator tự học, hoàn thành bài, mở khóa chương và xem tổng kết bình thường (Sửa lỗi D7).
 */
export const ensureOwnerEnrolled = async (courseId: string, userId: string) => {
  const user = await ensureMongoUser(userId);
  if (!user) return null;

  const exists = user.enrolledCourses.some(e => e.courseId.toString() === courseId);
  if (!exists) {
    user.enrolledCourses.push({
      courseId: new mongoose.Types.ObjectId(courseId),
      progressPercentage: 0,
      completedChapters: [],
      isCompleted: false,
      completedAt: null
    });
    await user.save();
  }
  return user;
};

/**
 * Validate cấu trúc cây khóa học (cho cả lưu nháp và xuất bản).
 */
export const validateCourseTree = (
  tree: CourseTreeDTO, 
  isPublishing = false
): { isValid: boolean; errors: ValidationErrorItem[] } => {
  const errors: ValidationErrorItem[] = [];
  const { course, chapters = [] } = tree;

  // 1. Validate Course Metadata
  const title = (course?.title || '').trim();
  if (!title) {
    errors.push({ path: 'course.title', message: 'Tiêu đề khóa học không được để trống.' });
  } else if (title.length < 3) {
    errors.push({ path: 'course.title', message: 'Tiêu đề khóa học phải có ít nhất 3 ký tự.' });
  } else if (title.length > 120) {
    errors.push({ path: 'course.title', message: 'Tiêu đề khóa học không được vượt quá 120 ký tự.' });
  }

  if (course?.shortDescription && course.shortDescription.length > 250) {
    errors.push({ path: 'course.shortDescription', message: 'Mô tả ngắn không được vượt quá 250 ký tự.' });
  }

  if (Array.isArray(course?.objectives) && course.objectives.length > 12) {
    errors.push({ path: 'course.objectives', message: 'Tối đa 12 mục tiêu đầu ra.' });
  }

  if (Array.isArray(course?.tags) && course.tags.length > 10) {
    errors.push({ path: 'course.tags', message: 'Tối đa 10 tags phân loại.' });
  }

  // 2. Kiểm tra khi xuất bản: bắt buộc có ít nhất 1 chương
  if (isPublishing && chapters.length === 0) {
    errors.push({ path: 'chapters', message: 'Khóa học phải có ít nhất một chương để xuất bản.' });
  }

  // 3. Validate từng Chương và Bài học
  chapters.forEach((chapter, cIdx) => {
    const chapterTitle = (chapter.title || '').trim();
    if (!chapterTitle) {
      errors.push({
        path: `chapters[${cIdx}].title`,
        message: `Chương số ${cIdx + 1} chưa có tên chương.`
      });
    }

    const lessons = chapter.lessons || [];
    // Yêu cầu bắt buộc: Chương không được rỗng (phải có ít nhất 1 bài học)
    if (lessons.length === 0) {
      errors.push({
        path: `chapters[${cIdx}].lessons`,
        message: `Chương "${chapterTitle || `số ${cIdx + 1}`}" chưa có bài học nào. Vui lòng thêm bài học hoặc xóa chương rỗng.`
      });
    }

    lessons.forEach((lesson, lIdx) => {
      const lessonTitle = (lesson.title || '').trim();
      if (!lessonTitle) {
        errors.push({
          path: `chapters[${cIdx}].lessons[${lIdx}].title`,
          message: `Bài học ${lIdx + 1} của chương ${cIdx + 1} chưa có tiêu đề.`
        });
      }

      if (lesson.durationMinutes !== undefined && lesson.durationMinutes < 1) {
        errors.push({
          path: `chapters[${cIdx}].lessons[${lIdx}].durationMinutes`,
          message: `Thời lượng bài học phải tối thiểu 1 phút.`
        });
      }

      // Kiểm tra nội dung chặt hơn khi xuất bản
      if (isPublishing) {
        const type = lesson.type || 'reading';
        if (type === 'video' && !(lesson.videoUrl || '').trim()) {
          errors.push({
            path: `chapters[${cIdx}].lessons[${lIdx}].videoUrl`,
            message: `Bài học video "${lessonTitle || lIdx + 1}" cần có link video.`
          });
        }

        if (type === 'reading' && !(lesson.content || '').trim() && (!lesson.blocks || lesson.blocks.length === 0)) {
          errors.push({
            path: `chapters[${cIdx}].lessons[${lIdx}].content`,
            message: `Bài học lý thuyết "${lessonTitle || lIdx + 1}" cần có nội dung văn bản.`
          });
        }

        if (type === 'vocabulary') {
          const hasVocabList = Array.isArray(lesson.vocabulary) && lesson.vocabulary.length > 0;
          const hasDeck = !!lesson.attachedFlashcardId && lesson.attachedFlashcardId !== 'none';
          if (!hasVocabList && !hasDeck) {
            errors.push({
              path: `chapters[${cIdx}].lessons[${lIdx}].vocabulary`,
              message: `Bài từ vựng "${lessonTitle || lIdx + 1}" cần nhập danh sách từ vựng hoặc liên kết với một bộ Flashcard.`
            });
          }
        }

        if (type === 'quiz') {
          const questions = lesson.quiz || [];
          if (questions.length === 0 && (!lesson.attachedExamId || lesson.attachedExamId === 'none')) {
            errors.push({
              path: `chapters[${cIdx}].lessons[${lIdx}].quiz`,
              message: `Bài Mini-quiz "${lessonTitle || lIdx + 1}" cần có ít nhất 1 câu hỏi trắc nghiệm.`
            });
          } else {
            questions.forEach((q, qIdx) => {
              if (!(q.question || '').trim()) {
                errors.push({
                  path: `chapters[${cIdx}].lessons[${lIdx}].quiz[${qIdx}].question`,
                  message: `Câu hỏi ${qIdx + 1} trong bài quiz chưa có nội dung câu hỏi.`
                });
              }
              if (!Array.isArray(q.options) || q.options.length < 2) {
                errors.push({
                  path: `chapters[${cIdx}].lessons[${lIdx}].quiz[${qIdx}].options`,
                  message: `Câu hỏi ${qIdx + 1} phải có ít nhất 2 đáp án lựa chọn.`
                });
              }
            });
          }
        }
      }
    });
  });

  return { isValid: errors.length === 0, errors };
};

/**
 * Đồng bộ toàn bộ cây khóa học (Atomic Tree Synchronization).
 * Xử lý: Tạo mới (tmp_), Cập nhật (whitelist), Xóa mồ côi và tự động đánh lại số thứ tự (order).
 */
export const syncCourseTreeService = async (
  courseId: string,
  userId: string,
  tree: CourseTreeDTO,
  isAdmin = false
) => {
  // 1. Kiểm tra tồn tại khóa học & quyền sở hữu
  const query: any = { _id: courseId, type: 'course' };
  if (!isAdmin) {
    query.creatorId = userId;
  }
  const course = await Course.findOne(query);
  if (!course) {
    const error: any = new Error('Không tìm thấy khóa học hoặc bạn không có quyền chỉnh sửa.');
    error.statusCode = 404;
    throw error;
  }

  // 2. Validate cấu trúc cây (cho phép lưu nháp nhưng vẫn chặn tiêu đề rỗng và chương rỗng)
  const validation = validateCourseTree(tree, false);
  if (!validation.isValid) {
    const error: any = new Error('Dữ liệu khóa học chưa hợp lệ.');
    error.statusCode = 400;
    error.errors = validation.errors;
    throw error;
  }

  const idMap: Record<string, string> = {};

  // 3. Cập nhật Metadata khóa học (Dùng whitelist chặt chẽ để chống mass-assignment)
  if (tree.course) {
    const c = tree.course;
    if (c.title !== undefined) course.title = c.title.trim();
    if (c.shortDescription !== undefined) course.shortDescription = c.shortDescription.trim();
    if (c.description !== undefined) course.description = c.description;
    if (c.thumbnail !== undefined) course.thumbnail = c.thumbnail.trim();
    if (c.level !== undefined && c.level) course.level = c.level;
    if (Array.isArray(c.tags)) course.tags = c.tags.map(t => t.trim()).filter(Boolean);
    if (Array.isArray(c.objectives)) course.objectives = c.objectives.map(o => o.trim()).filter(Boolean);
    if (c.price !== undefined && typeof c.price === 'number') course.price = Math.max(0, c.price);
  }

  // 4. Lấy danh sách chapters và lessons hiện có trong DB của khóa học này
  const existingChapters = await Chapter.find({ courseId: course._id });
  const existingLessons = await Lesson.find({ courseId: course._id });

  const preservedChapterIds: string[] = [];
  const preservedLessonIds: string[] = [];
  let totalDurationMinutes = 0;

  // 5. Duyệt và đồng bộ các Chapters
  const chaptersPayload = tree.chapters || [];
  const syncedChapters: any[] = [];

  for (let cIdx = 0; cIdx < chaptersPayload.length; cIdx++) {
    const chapterData = chaptersPayload[cIdx];
    const clientChapterId = chapterData.id || chapterData._id;
    const isNewChapter = !clientChapterId || String(clientChapterId).startsWith('tmp_') || !mongoose.isValidObjectId(String(clientChapterId));

    let chapterDoc: any;
    if (!isNewChapter) {
      chapterDoc = existingChapters.find(ch => ch._id.toString() === String(clientChapterId));
    }

    if (chapterDoc) {
      // Cập nhật chapter hiện có
      chapterDoc.title = (chapterData.title || '').trim();
      chapterDoc.description = chapterData.description || '';
      chapterDoc.summary = chapterData.summary || '';
      chapterDoc.keyTakeaways = Array.isArray(chapterData.keyTakeaways) ? chapterData.keyTakeaways : [];
      chapterDoc.order = cIdx + 1;
      await chapterDoc.save();
    } else {
      // Tạo mới chapter
      chapterDoc = new Chapter({
        courseId: course._id,
        title: (chapterData.title || '').trim(),
        description: chapterData.description || '',
        summary: chapterData.summary || '',
        keyTakeaways: Array.isArray(chapterData.keyTakeaways) ? chapterData.keyTakeaways : [],
        order: cIdx + 1
      });
      await chapterDoc.save();
      if (clientChapterId && String(clientChapterId).startsWith('tmp_')) {
        idMap[String(clientChapterId)] = chapterDoc._id.toString();
      }
    }

    preservedChapterIds.push(chapterDoc._id.toString());

    // 6. Duyệt và đồng bộ các Lessons trong Chapter
    const lessonsPayload = chapterData.lessons || [];
    const syncedLessons: any[] = [];

    for (let lIdx = 0; lIdx < lessonsPayload.length; lIdx++) {
      const lessonData = lessonsPayload[lIdx];
      const clientLessonId = lessonData.id || lessonData._id;
      const isNewLesson = !clientLessonId || String(clientLessonId).startsWith('tmp_') || !mongoose.isValidObjectId(String(clientLessonId));

      const lessonDuration = Math.max(1, parseInt(String(lessonData.durationMinutes || 5)) || 5);
      totalDurationMinutes += lessonDuration;

      let lessonDoc: any;
      if (!isNewLesson) {
        lessonDoc = existingLessons.find(ls => ls._id.toString() === String(clientLessonId));
      }

      // Xử lý đính kèm hợp lệ
      const attachedExamId = lessonData.attachedExamId && lessonData.attachedExamId !== 'none' && mongoose.isValidObjectId(String(lessonData.attachedExamId))
        ? new mongoose.Types.ObjectId(String(lessonData.attachedExamId))
        : null;

      const attachedFlashcardId = lessonData.attachedFlashcardId && lessonData.attachedFlashcardId !== 'none' && mongoose.isValidObjectId(String(lessonData.attachedFlashcardId))
        ? new mongoose.Types.ObjectId(String(lessonData.attachedFlashcardId))
        : null;

      const cleanVocabulary = Array.isArray(lessonData.vocabulary)
        ? lessonData.vocabulary.map((v, idx) => ({
            id: v.id || `v_${idx}_${Date.now()}`,
            term: (v.term || '').trim(),
            phonetic: (v.phonetic || '').trim(),
            partOfSpeech: (v.partOfSpeech || '').trim(),
            meaning: (v.meaning || '').trim(),
            example: (v.example || '').trim()
          })).filter(v => v.term && v.meaning)
        : [];

      const cleanQuiz = Array.isArray(lessonData.quiz)
        ? lessonData.quiz.map((q, idx) => ({
            id: q.id || `q_${idx}_${Date.now()}`,
            question: (q.question || '').trim(),
            options: Array.isArray(q.options) ? q.options.map(o => String(o).trim()).filter(Boolean) : [],
            correctIndex: typeof q.correctIndex === 'number' ? Math.max(0, q.correctIndex) : 0,
            explanation: (q.explanation || '').trim()
          })).filter(q => q.question && q.options.length >= 2)
        : [];

      if (lessonDoc) {
        // Cập nhật lesson
        lessonDoc.chapterId = chapterDoc._id; // Hỗ trợ chuyển bài học sang chapter khác
        lessonDoc.title = (lessonData.title || '').trim();
        lessonDoc.type = lessonData.type || 'reading';
        lessonDoc.durationMinutes = lessonDuration;
        lessonDoc.order = lIdx + 1;
        lessonDoc.videoUrl = (lessonData.videoUrl || '').trim();
        lessonDoc.notes = lessonData.notes || '';
        lessonDoc.content = lessonData.content || '';
        lessonDoc.blocks = Array.isArray(lessonData.blocks) ? lessonData.blocks : [];
        lessonDoc.vocabulary = cleanVocabulary;
        lessonDoc.quiz = cleanQuiz;
        lessonDoc.attachedExamId = attachedExamId;
        lessonDoc.attachedFlashcardId = attachedFlashcardId;
        lessonDoc.isRequiredToPassExam = !!lessonData.isRequiredToPassExam;
        await lessonDoc.save();
      } else {
        // Tạo mới lesson
        lessonDoc = new Lesson({
          courseId: course._id,
          chapterId: chapterDoc._id,
          title: (lessonData.title || '').trim(),
          type: lessonData.type || 'reading',
          durationMinutes: lessonDuration,
          order: lIdx + 1,
          videoUrl: (lessonData.videoUrl || '').trim(),
          notes: lessonData.notes || '',
          content: lessonData.content || '',
          blocks: Array.isArray(lessonData.blocks) ? lessonData.blocks : [],
          vocabulary: cleanVocabulary,
          quiz: cleanQuiz,
          attachedExamId,
          attachedFlashcardId,
          isRequiredToPassExam: !!lessonData.isRequiredToPassExam
        });
        await lessonDoc.save();
        if (clientLessonId && String(clientLessonId).startsWith('tmp_')) {
          idMap[String(clientLessonId)] = lessonDoc._id.toString();
        }
      }

      preservedLessonIds.push(lessonDoc._id.toString());
      syncedLessons.push(lessonDoc.toObject());
    }

    syncedChapters.push({
      ...chapterDoc.toObject(),
      lessons: syncedLessons
    });
  }

  // 7. Xóa sạch các Chapter và Lesson mồ côi (đã bị xóa trên UI cây)
  await Chapter.deleteMany({
    courseId: course._id,
    _id: { $nin: preservedChapterIds }
  });
  await Lesson.deleteMany({
    courseId: course._id,
    _id: { $nin: preservedLessonIds }
  });

  // 8. Cập nhật thống kê stats cho khóa học
  course.stats = {
    totalChapters: preservedChapterIds.length,
    totalLessons: preservedLessonIds.length,
    totalDurationMinutes
  };
  await course.save();

  // Đảm bảo chủ sở hữu có bản ghi enrollment để có thể tự học thử (Sửa lỗi D7)
  await ensureOwnerEnrolled(course._id.toString(), userId);

  return {
    course: course.toObject(),
    chapters: syncedChapters,
    idMap
  };
};

/**
 * Xuất bản khóa học công khai.
 * Kiểm tra phân quyền và validate toàn diện toàn bộ cây bài học trước khi public.
 */
export const publishCourseService = async (courseId: string, user: any) => {
  if (!canPublishCourse(user)) {
    const error: any = new Error('Chỉ tài khoản Content Creator hoặc Admin mới có quyền xuất bản khóa học ra cộng đồng.');
    error.statusCode = 403;
    error.code = 'CREATOR_REQUIRED';
    error.requires_creator = true;
    throw error;
  }

  const isAdmin = user.role?.toLowerCase() === 'admin';
  const query: any = { _id: courseId, type: 'course' };
  if (!isAdmin) {
    query.creatorId = user.id;
  }

  const course = await Course.findOne(query);
  if (!course) {
    const error: any = new Error('Không tìm thấy khóa học hoặc bạn không có quyền.');
    error.statusCode = 404;
    throw error;
  }

  // Lấy toàn bộ cây để validate nghiêm ngặt
  const chapters = await Chapter.find({ courseId: course._id }).sort({ order: 1 }).lean();
  const lessons = await Lesson.find({ courseId: course._id }).sort({ order: 1 }).lean();

  const fullTree: CourseTreeDTO = {
    course: course.toObject() as any,
    chapters: chapters.map(ch => ({
      ...ch,
      id: ch._id.toString(),
      lessons: lessons.filter(ls => ls.chapterId.toString() === ch._id.toString()).map(ls => ({
        ...ls,
        id: ls._id.toString()
      })) as any
    })) as any
  };

  const validation = validateCourseTree(fullTree, true);
  if (!validation.isValid) {
    const error: any = new Error('Khóa học chưa đạt tiêu chuẩn để xuất bản. Vui lòng hoàn thiện các nội dung còn thiếu.');
    error.statusCode = 400;
    error.errors = validation.errors;
    throw error;
  }

  course.isPublished = true;
  course.status = 'published';
  course.publishedAt = new Date();
  await course.save();

  return course.toObject();
};

/**
 * Hủy xuất bản (chuyển về bản nháp cá nhân).
 */
export const unpublishCourseService = async (courseId: string, user: any) => {
  const isAdmin = user.role?.toLowerCase() === 'admin';
  const query: any = { _id: courseId, type: 'course' };
  if (!isAdmin) {
    query.creatorId = user.id;
  }

  const course = await Course.findOne(query);
  if (!course) {
    const error: any = new Error('Không tìm thấy khóa học hoặc bạn không có quyền.');
    error.statusCode = 404;
    throw error;
  }

  course.isPublished = false;
  course.status = 'draft';
  await course.save();

  return course.toObject();
};
