import { Request, Response } from 'express';
import Course from '../../database/models/Course';
import Chapter from '../../database/models/Chapter';
import Lesson from '../../database/models/Lesson';
import Exam from '../../database/models/Exam';
import {
  syncCourseTreeService,
  publishCourseService,
  unpublishCourseService,
  ensureOwnerEnrolled
} from './course.service';

// --- COURSE CREATION & MANAGEMENT ---

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, shortDescription, description, thumbnail, level, tags, objectives, price } = req.body;
    const creatorId = req.user?.id;

    if (!creatorId) {
      res.status(401).json({ status: 'error', message: 'Vui lòng đăng nhập.' });
      return;
    }

    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle) {
      res.status(400).json({ status: 'error', message: 'Tiêu đề khóa học không được để trống.' });
      return;
    }

    const course = new Course({
      title: trimmedTitle,
      shortDescription: (shortDescription || '').trim(),
      description: description || '',
      thumbnail: (thumbnail || '').trim(),
      creatorId,
      level: level || 'ALL',
      tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [],
      objectives: Array.isArray(objectives) ? objectives.map(o => String(o).trim()).filter(Boolean) : [],
      price: typeof price === 'number' ? Math.max(0, price) : 0,
      isPublished: false,
      status: 'draft',
      type: 'course',
      stats: { totalChapters: 0, totalLessons: 0, totalDurationMinutes: 0 }
    });

    await course.save();

    // Tự động ghi nhận enrollment cho chủ khóa học để có thể tự học thử (Sửa lỗi D7)
    await ensureOwnerEnrolled(course._id.toString(), creatorId);

    res.status(201).json({ status: 'success', data: course });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMyCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const creatorId = req.user?.id;
    if (!creatorId) {
      res.status(401).json({ status: 'error', message: 'Vui lòng đăng nhập.' });
      return;
    }

    const courses = await Course.find({ creatorId, type: 'course' }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ status: 'success', data: courses });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getCourseBuilderData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const isAdmin = req.user?.role?.toLowerCase() === 'admin';

    const query: any = { _id: id, type: 'course' };
    if (!isAdmin) {
      query.creatorId = userId;
    }

    const course = await Course.findOne(query).lean();
    if (!course) {
      res.status(404).json({ status: 'error', message: 'Không tìm thấy khóa học.' });
      return;
    }

    const chapters = await Chapter.find({ courseId: id }).sort({ order: 1 }).lean();
    const lessons = await Lesson.find({ courseId: id }).sort({ order: 1 }).lean();

    const chaptersWithLessons = chapters.map(chapter => {
      const chapterLessons = lessons.filter(l => l.chapterId.toString() === chapter._id.toString());
      return {
        ...chapter,
        id: chapter._id.toString(),
        summary: chapter.summary || '',
        keyTakeaways: chapter.keyTakeaways || [],
        lessons: chapterLessons.map(lesson => ({
          ...lesson,
          id: lesson._id.toString(),
          type: lesson.type || 'reading',
          durationMinutes: lesson.durationMinutes || 5,
          vocabulary: lesson.vocabulary || [],
          quiz: lesson.quiz || [],
          notes: lesson.notes || '',
          content: lesson.content || '',
          blocks: lesson.blocks || []
        }))
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        course: {
          ...course,
          id: course._id.toString(),
          shortDescription: course.shortDescription || '',
          objectives: course.objectives || [],
          level: course.level || 'ALL',
          status: course.status || (course.isPublished ? 'published' : 'draft')
        },
        chapters: chaptersWithLessons
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// --- ATOMIC TREE SYNC & PUBLISH APIS ---

export const syncCourseTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;
    const isAdmin = req.user?.role?.toLowerCase() === 'admin';

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Vui lòng đăng nhập.' });
      return;
    }

    const result = await syncCourseTreeService(id, userId, req.body, isAdmin);
    res.status(200).json({
      status: 'success',
      message: 'Đã lưu cấu trúc khóa học thành công.',
      data: result
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      status: 'error',
      message: error.message,
      errors: error.errors
    });
  }
};

export const publishCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const result = await publishCourseService(id, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Đã xuất bản khóa học công khai thành công.',
      data: result
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      status: 'error',
      code: error.code,
      requires_creator: !!error.requires_creator,
      message: error.message,
      errors: error.errors
    });
  }
};

export const unpublishCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const result = await unpublishCourseService(id, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Đã chuyển khóa học về trạng thái bản nháp.',
      data: result
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Lấy tài nguyên cá nhân để đính kèm vào bài học (Flashcard decks & Exams).
 * KHẮC PHỤC LỖ HỔNG BẢO MẬT B6: Chỉ trả về bộ thẻ và đề thi của CHÍNH USER này.
 */
export const getMyResources = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Vui lòng đăng nhập.' });
      return;
    }

    const [flashcardDecks, exams] = await Promise.all([
      Course.find({ creatorId: userId, type: 'flashcard' }).select('_id title description thumbnail level').sort({ createdAt: -1 }).lean(),
      Exam.find({ createdBy: userId }).select('_id title description thumbnail totalQuestions status').sort({ createdAt: -1 }).lean()
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        flashcards: flashcardDecks,
        exams
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const creatorId = req.user?.id;
    const isAdmin = req.user?.role?.toLowerCase() === 'admin';

    const query: any = { _id: id, type: 'course' };
    if (!isAdmin) {
      query.creatorId = creatorId;
    }

    // Whitelist cập nhật cơ bản
    const allowedUpdates: any = {};
    if (req.body.title !== undefined) allowedUpdates.title = String(req.body.title).trim();
    if (req.body.shortDescription !== undefined) allowedUpdates.shortDescription = String(req.body.shortDescription).trim();
    if (req.body.description !== undefined) allowedUpdates.description = req.body.description;
    if (req.body.thumbnail !== undefined) allowedUpdates.thumbnail = String(req.body.thumbnail).trim();
    if (req.body.level !== undefined) allowedUpdates.level = req.body.level;
    if (Array.isArray(req.body.tags)) allowedUpdates.tags = req.body.tags;
    if (Array.isArray(req.body.objectives)) allowedUpdates.objectives = req.body.objectives;

    const course = await Course.findOneAndUpdate(query, { $set: allowedUpdates }, { new: true });
    if (!course) {
      res.status(404).json({ status: 'error', message: 'Không tìm thấy khóa học hoặc bạn không có quyền.' });
      return;
    }
    res.status(200).json({ status: 'success', data: course });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const creatorId = req.user?.id;
    const isAdmin = req.user?.role?.toLowerCase() === 'admin';

    const query: any = { _id: id, type: 'course' };
    if (!isAdmin) {
      query.creatorId = creatorId;
    }

    const course = await Course.findOneAndDelete(query);
    if (!course) {
      res.status(404).json({ status: 'error', message: 'Không tìm thấy khóa học.' });
      return;
    }

    await Chapter.deleteMany({ courseId: id });
    await Lesson.deleteMany({ courseId: id });

    res.status(200).json({ status: 'success', message: 'Đã xóa khóa học thành công.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// --- LEGACY INDIVIDUAL CHAPTER/LESSON APIS (Duy trì tính tương thích ngược) ---

export const createChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { title, description, summary, keyTakeaways, order } = req.body;
    const isAdmin = req.user?.role?.toLowerCase() === 'admin';

    const course = await Course.findById(courseId);
    if (!course || (!isAdmin && course.creatorId !== req.user?.id)) {
      res.status(403).json({ status: 'error', message: 'Không có quyền truy cập.' });
      return;
    }

    const nextOrder = order || ((await Chapter.countDocuments({ courseId })) + 1);
    const chapter = new Chapter({
      courseId,
      title: (title || '').trim(),
      description: description || '',
      summary: summary || '',
      keyTakeaways: Array.isArray(keyTakeaways) ? keyTakeaways : [],
      order: nextOrder
    });
    await chapter.save();
    res.status(201).json({ status: 'success', data: chapter });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, chapterId } = req.params;
    const isAdmin = req.user?.role?.toLowerCase() === 'admin';

    const course = await Course.findById(courseId);
    if (!course || (!isAdmin && course.creatorId !== req.user?.id)) {
      res.status(403).json({ status: 'error', message: 'Không có quyền truy cập.' });
      return;
    }

    const allowedUpdates: any = {};
    if (req.body.title !== undefined) allowedUpdates.title = String(req.body.title).trim();
    if (req.body.description !== undefined) allowedUpdates.description = req.body.description;
    if (req.body.summary !== undefined) allowedUpdates.summary = req.body.summary;
    if (Array.isArray(req.body.keyTakeaways)) allowedUpdates.keyTakeaways = req.body.keyTakeaways;
    if (typeof req.body.order === 'number') allowedUpdates.order = req.body.order;

    const chapter = await Chapter.findOneAndUpdate(
      { _id: chapterId, courseId },
      { $set: allowedUpdates },
      { new: true }
    );
    res.status(200).json({ status: 'success', data: chapter });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, chapterId } = req.params;
    const isAdmin = req.user?.role?.toLowerCase() === 'admin';

    const course = await Course.findById(courseId);
    if (!course || (!isAdmin && course.creatorId !== req.user?.id)) {
      res.status(403).json({ status: 'error', message: 'Không có quyền truy cập.' });
      return;
    }

    await Chapter.findOneAndDelete({ _id: chapterId, courseId });
    await Lesson.deleteMany({ chapterId, courseId });
    res.status(200).json({ status: 'success', message: 'Đã xóa chương thành công.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, chapterId } = req.params;
    const isAdmin = req.user?.role?.toLowerCase() === 'admin';

    const course = await Course.findById(courseId);
    if (!course || (!isAdmin && course.creatorId !== req.user?.id)) {
      res.status(403).json({ status: 'error', message: 'Không có quyền truy cập.' });
      return;
    }

    const chapter = await Chapter.findOne({ _id: chapterId, courseId });
    if (!chapter) {
      res.status(404).json({ status: 'error', message: 'Không tìm thấy chương trong khóa học này.' });
      return;
    }

    const {
      title, durationMinutes, order, videoUrl, notes, content, blocks,
      type, vocabulary, quiz, attachedExamId, attachedFlashcardId, isRequiredToPassExam
    } = req.body;

    const nextOrder = order || ((await Lesson.countDocuments({ chapterId })) + 1);

    const lesson = new Lesson({
      courseId,
      chapterId,
      title: (title || '').trim(),
      type: type || 'reading',
      durationMinutes: Math.max(1, parseInt(durationMinutes) || 5),
      order: nextOrder,
      videoUrl: videoUrl || '',
      notes: notes || '',
      content: content || '',
      blocks: blocks || [],
      vocabulary: Array.isArray(vocabulary) ? vocabulary : [],
      quiz: Array.isArray(quiz) ? quiz : [],
      attachedExamId: attachedExamId && attachedExamId !== 'none' ? attachedExamId : null,
      attachedFlashcardId: attachedFlashcardId && attachedFlashcardId !== 'none' ? attachedFlashcardId : null,
      isRequiredToPassExam: !!isRequiredToPassExam
    });

    await lesson.save();
    res.status(201).json({ status: 'success', data: lesson });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, chapterId, lessonId } = req.params;
    const isAdmin = req.user?.role?.toLowerCase() === 'admin';

    const course = await Course.findById(courseId);
    if (!course || (!isAdmin && course.creatorId !== req.user?.id)) {
      res.status(403).json({ status: 'error', message: 'Không có quyền truy cập.' });
      return;
    }

    const allowedUpdates: any = {};
    if (req.body.title !== undefined) allowedUpdates.title = String(req.body.title).trim();
    if (req.body.type !== undefined) allowedUpdates.type = req.body.type;
    if (req.body.durationMinutes !== undefined) allowedUpdates.durationMinutes = Math.max(1, parseInt(req.body.durationMinutes) || 5);
    if (typeof req.body.order === 'number') allowedUpdates.order = req.body.order;
    if (req.body.videoUrl !== undefined) allowedUpdates.videoUrl = req.body.videoUrl;
    if (req.body.notes !== undefined) allowedUpdates.notes = req.body.notes;
    if (req.body.content !== undefined) allowedUpdates.content = req.body.content;
    if (Array.isArray(req.body.blocks)) allowedUpdates.blocks = req.body.blocks;
    if (Array.isArray(req.body.vocabulary)) allowedUpdates.vocabulary = req.body.vocabulary;
    if (Array.isArray(req.body.quiz)) allowedUpdates.quiz = req.body.quiz;
    if ('attachedExamId' in req.body) {
      allowedUpdates.attachedExamId = req.body.attachedExamId && req.body.attachedExamId !== 'none' ? req.body.attachedExamId : null;
    }
    if ('attachedFlashcardId' in req.body) {
      allowedUpdates.attachedFlashcardId = req.body.attachedFlashcardId && req.body.attachedFlashcardId !== 'none' ? req.body.attachedFlashcardId : null;
    }
    if (req.body.isRequiredToPassExam !== undefined) allowedUpdates.isRequiredToPassExam = !!req.body.isRequiredToPassExam;

    const lesson = await Lesson.findOneAndUpdate(
      { _id: lessonId, courseId, chapterId },
      { $set: allowedUpdates },
      { new: true }
    );
    res.status(200).json({ status: 'success', data: lesson });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, chapterId, lessonId } = req.params;
    const isAdmin = req.user?.role?.toLowerCase() === 'admin';

    const course = await Course.findById(courseId);
    if (!course || (!isAdmin && course.creatorId !== req.user?.id)) {
      res.status(403).json({ status: 'error', message: 'Không có quyền truy cập.' });
      return;
    }

    await Lesson.findOneAndDelete({ _id: lessonId, courseId, chapterId });
    res.status(200).json({ status: 'success', message: 'Đã xóa bài học thành công.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
