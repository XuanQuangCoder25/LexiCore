import { Request, Response } from 'express';
import Course from '../../database/models/Course';
import Chapter from '../../database/models/Chapter';
import Lesson from '../../database/models/Lesson';

// --- COURSE APIS ---
export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, thumbnail, level, tags, price } = req.body;
    const creatorId = req.user?.id;

    if (!title) {
       res.status(400).json({ status: 'error', message: 'Thiếu tiêu đề khóa học.' });
       return;
    }

    const course = new Course({
      title,
      description,
      thumbnail,
      creatorId,
      level,
      tags,
      price,
      isPublished: false,
      type: 'course'
    });

    await course.save();
    res.status(201).json({ status: 'success', data: course });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMyCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const creatorId = req.user?.id;
    const courses = await Course.find({ creatorId, type: 'course' }).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: courses });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const creatorId = req.user?.id;

    // Chặn role user xuất bản khóa học ra cộng đồng
    if (req.body.isPublished === true) {
      const role = req.user?.role?.toLowerCase().replace(/\s+/g, '_');
      const creatorStatus = req.user?.creator_status;
      const isAdmin = role === 'admin';
      const isActiveCreator = role === 'content_creator' && creatorStatus !== 'SUSPENDED';
      if (!isAdmin && !isActiveCreator) {
        res.status(403).json({
          status: 'error',
          message: 'Chỉ tài khoản Content Creator hoặc Admin mới có quyền xuất bản khóa học ra cộng đồng.',
          requires_creator: true
        });
        return;
      }
    }

    const course = await Course.findOneAndUpdate(
      { _id: id, creatorId },
      { $set: req.body },
      { new: true }
    );
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
    const course = await Course.findOneAndDelete({ _id: id, creatorId: req.user?.id, type: 'course' });
    if (!course) {
      res.status(404).json({ status: 'error', message: 'Không tìm thấy khóa học' });
      return;
    }
    
    await Chapter.deleteMany({ courseId: id });
    await Lesson.deleteMany({ courseId: id });

    res.status(200).json({ status: 'success', message: 'Đã xóa khóa học' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// --- CHAPTER APIS ---
export const createChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { title, description, order } = req.body;

    const course = await Course.findById(courseId);
    if (!course || course.creatorId !== req.user?.id) {
       res.status(403).json({ status: 'error', message: 'Không có quyền truy cập hoặc khóa học không tồn tại.' });
       return;
    }

    const chapter = new Chapter({ courseId, title, description, order });
    await chapter.save();
    res.status(201).json({ status: 'success', data: chapter });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, chapterId } = req.params;
    
    const course = await Course.findById(courseId);
    if (!course || course.creatorId !== req.user?.id) {
       res.status(403).json({ status: 'error', message: 'Không có quyền truy cập.' });
       return;
    }

    const chapter = await Chapter.findOneAndUpdate(
      { _id: chapterId, courseId },
      { $set: req.body },
      { new: true }
    );
    res.status(200).json({ status: 'success', data: chapter });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// --- LESSON APIS ---
export const createLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, chapterId } = req.params;
    const { title, durationMinutes, order, videoUrl, content, blocks, attachedExamId, attachedFlashcardId, isRequiredToPassExam } = req.body;

    const course = await Course.findById(courseId);
    if (!course || course.creatorId !== req.user?.id) {
       res.status(403).json({ status: 'error', message: 'Không có quyền truy cập.' });
       return;
    }

    const lesson = new Lesson({
      courseId, 
      chapterId, 
      title, 
      durationMinutes, 
      order, 
      videoUrl, 
      content, 
      blocks, 
      attachedExamId: attachedExamId && attachedExamId !== "none" ? attachedExamId : null, 
      attachedFlashcardId: attachedFlashcardId && attachedFlashcardId !== "none" ? attachedFlashcardId : null, 
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
    
    const course = await Course.findById(courseId);
    if (!course || course.creatorId !== req.user?.id) {
       res.status(403).json({ status: 'error', message: 'Không có quyền truy cập.' });
       return;
    }

    const updateData: any = { ...req.body };
    if ('attachedExamId' in updateData) {
      updateData.attachedExamId = updateData.attachedExamId && updateData.attachedExamId !== "none" ? updateData.attachedExamId : null;
    }
    if ('attachedFlashcardId' in updateData) {
      updateData.attachedFlashcardId = updateData.attachedFlashcardId && updateData.attachedFlashcardId !== "none" ? updateData.attachedFlashcardId : null;
    }

    const lesson = await Lesson.findOneAndUpdate(
      { _id: lessonId, courseId, chapterId },
      { $set: updateData },
      { new: true }
    );
    res.status(200).json({ status: 'success', data: lesson });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getCourseBuilderData = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const course = await Course.findOne({ _id: id, creatorId: req.user?.id }).lean();
        if (!course) {
            res.status(404).json({ status: 'error', message: 'Không tìm thấy khóa học.' });
            return;
        }

        const chapters = await Chapter.find({ courseId: id }).sort({ order: 1 }).lean();
        const lessons = await Lesson.find({ courseId: id }).sort({ order: 1 }).lean();

        const chaptersWithLessons = chapters.map(chapter => {
            return {
                ...chapter,
                lessons: lessons.filter(lesson => lesson.chapterId.toString() === chapter._id.toString())
            };
        });

        res.status(200).json({
            status: 'success',
            data: {
                course,
                chapters: chaptersWithLessons
            }
        });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
}
