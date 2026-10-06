import { Request, Response } from 'express';
import Course from '../../database/models/Course';
import Chapter from '../../database/models/Chapter';
import Lesson from '../../database/models/Lesson';
import User from '../../database/models/User';
import mongoose from 'mongoose';

// 1. Khám phá khóa học (Marketplace)
export const getPublishedCourses = async (req: Request, res: Response): Promise<void> => {
    try {
        const { level, search } = req.query;
        
        let query: any = { isPublished: true, type: 'course' };
        
        if (level && level !== 'All Levels') {
            query.level = level;
        }
        
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const courses = await Course.find(query).sort({ createdAt: -1 });
        res.status(200).json({ status: 'success', data: courses });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// 2. Xem chi tiết khóa học & Lộ trình (Syllabus)
export const getCourseDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.id; // Có thể null nếu gọi API public

        const course = await Course.findOne({ _id: id, isPublished: true }).lean();
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
                    // Chỉ trả về các trường cần thiết, giấu content/video để bắt buộc enroll
                    .map(l => ({ _id: l._id, title: l.title, durationMinutes: l.durationMinutes, order: l.order }))
            };
        });

        let isEnrolled = false;
        let progress = 0;
        let completedLessons: string[] = [];
        
        if (userId) {
            const user = await User.findById(userId);
            if (user) {
                const enrollment = user.enrolledCourses.find(e => e.courseId.toString() === id);
                if (enrollment) {
                    isEnrolled = true;
                    progress = enrollment.progressPercentage;
                }
                completedLessons = user.completedLessons.map(id => id.toString());
            }
        }

        res.status(200).json({
            status: 'success',
            data: {
                course,
                syllabus: chaptersWithLessons,
                isEnrolled,
                progress,
                completedLessons
            }
        });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// 3. Đăng ký học (Enroll)
export const enrollCourse = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const course = await Course.findById(id);
        if (!course || !course.isPublished) {
            res.status(404).json({ status: 'error', message: 'Khóa học không hợp lệ.' });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ status: 'error', message: 'Người dùng không tồn tại.' });
            return;
        }

        // Kiểm tra đã đăng ký chưa
        const isEnrolled = user.enrolledCourses.some(e => e.courseId.toString() === id);
        if (isEnrolled) {
            res.status(400).json({ status: 'error', message: 'Bạn đã đăng ký khóa học này rồi.' });
            return;
        }
        
        user.enrolledCourses.push({
            courseId: new mongoose.Types.ObjectId(id),
            progressPercentage: 0
        });

        await user.save();
        res.status(200).json({ status: 'success', message: 'Đăng ký thành công.' });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// 4. Lấy nội dung bài học (Chỉ khi đã enroll)
export const getLessonContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { courseId, lessonId } = req.params;
        const userId = req.user?.id;

        const user = await User.findById(userId);
        const isEnrolled = user?.enrolledCourses.some(e => e.courseId.toString() === courseId);
        
        if (!isEnrolled) {
            res.status(403).json({ status: 'error', message: 'Vui lòng đăng ký khóa học trước khi xem nội dung.' });
            return;
        }

        const lesson = await Lesson.findOne({ _id: lessonId, courseId });
        if (!lesson) {
            res.status(404).json({ status: 'error', message: 'Bài học không tồn tại.' });
            return;
        }

        res.status(200).json({ status: 'success', data: lesson });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// 5. Hoàn thành bài học (Mark as Complete)
export const completeLesson = async (req: Request, res: Response): Promise<void> => {
    try {
        const { courseId, lessonId } = req.params;
        const userId = req.user?.id;

        const user = await User.findById(userId);
        if (!user) {
             res.status(404).json({ status: 'error', message: 'Người dùng không tồn tại' });
             return;
        }

        const lessonObjId = new mongoose.Types.ObjectId(lessonId);
        
        // Kiểm tra đã hoàn thành chưa?
        if (user.completedLessons.includes(lessonObjId)) {
            res.status(400).json({ status: 'error', message: 'Bài học đã được hoàn thành từ trước.' });
            return;
        }
        
        user.completedLessons.push(lessonObjId);

        // --- Cập nhật % tiến độ khóa học ---
        const totalLessons = await Lesson.countDocuments({ courseId });
        const courseLessons = await Lesson.find({ courseId }).select('_id');
        const courseLessonIds = courseLessons.map(l => l._id.toString());
        
        // Đếm số bài trong course này mà user đã hoàn thành
        const completedInThisCourse = user.completedLessons.filter(cl => 
            courseLessonIds.includes(cl.toString())
        ).length;

        const progress = totalLessons === 0 ? 0 : Math.round((completedInThisCourse / totalLessons) * 100);

        // Cập nhật tiến độ vào enrolledCourses
        const enrollmentIndex = user.enrolledCourses.findIndex(e => e.courseId.toString() === courseId);
        if (enrollmentIndex > -1) {
            user.enrolledCourses[enrollmentIndex].progressPercentage = progress;
        }

        // --- Tích hợp Gamification ---
        user.weeklyActivityScore += 10; // Tăng exp cho user (điểm tích cực)
        
        await user.save();

        res.status(200).json({ 
            status: 'success', 
            message: 'Chúc mừng bạn đã hoàn thành bài học!',
            data: { progressPercentage: progress }
        });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
