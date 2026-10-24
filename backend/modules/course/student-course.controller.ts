import { Request, Response } from 'express';
import Course from '../../database/models/Course';
import Chapter from '../../database/models/Chapter';
import Lesson from '../../database/models/Lesson';
import User from '../../database/models/User';
import '../../database/models/Exam';
import mongoose from 'mongoose';
import { findUserById } from '../auth/auth-repository';

// ---------------------------------------------------------------------------
// Helpers dùng chung cho luồng tiến độ (Chapter / Course completion)
// ---------------------------------------------------------------------------

// Lấy bản ghi enrollment của user cho 1 khóa học
const getEnrollment = (user: any, courseId: string) =>
    user.enrolledCourses.find((e: any) => e.courseId.toString() === courseId);

// Tải cấu trúc khóa học (chương + bài học) đã sắp xếp theo thứ tự
const loadCourseStructure = async (courseId: string) => {
    const [chapters, lessons] = await Promise.all([
        Chapter.find({ courseId }).sort({ order: 1 }).lean(),
        Lesson.find({ courseId }).sort({ order: 1 }).lean()
    ]);
    return { chapters, lessons };
};

/**
 * Tính danh sách chương đã được mở khóa.
 * - Chương đầu tiên luôn mở.
 * - Chương N mở khi chương N-1 nằm trong completedChapters.
 * - Tương thích dữ liệu cũ: chương đã có ít nhất 1 bài được hoàn thành
 *   (học viên đã học trước khi có tính năng khóa chương) cũng coi là đã mở.
 */
const computeUnlockedChapterIds = (
    chapters: any[],
    lessons: any[],
    completedChapterIds: Set<string>,
    completedLessonIds: Set<string>
): string[] => {
    return chapters
        .filter((chapter, index) => {
            if (index === 0) return true;
            if (completedChapterIds.has(chapters[index - 1]._id.toString())) return true;
            return lessons.some(l =>
                l.chapterId.toString() === chapter._id.toString() &&
                completedLessonIds.has(l._id.toString())
            );
        })
        .map(c => c._id.toString());
};

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

        const course = await Course.findById(id).lean();
        if (!course) {
            res.status(404).json({ status: 'error', message: 'Không tìm thấy khóa học.' });
            return;
        }

        const isOwner = userId && course.creatorId?.toString() === userId.toString();
        const isAdmin = req.user?.role?.toLowerCase() === 'admin';

        if (!course.isPublished && !isOwner && !isAdmin) {
            res.status(404).json({ status: 'error', message: 'Khóa học này đang ở chế độ riêng tư.' });
            return;
        }

        const chapters = await Chapter.find({ courseId: id }).sort({ order: 1 }).lean();
        const lessons = await Lesson.find({ courseId: id }).sort({ order: 1 }).lean();

        const chaptersWithLessons = chapters.map(chapter => {
            return {
                ...chapter,
                lessons: lessons.filter(lesson => lesson.chapterId.toString() === chapter._id.toString())
                    // Chỉ trả về các trường cần thiết, giấu content/video để bắt buộc enroll
                    .map(l => ({ 
                        _id: l._id, 
                        title: l.title, 
                        durationMinutes: l.durationMinutes, 
                        order: l.order,
                        attachedExamId: l.attachedExamId,
                        attachedFlashcardId: l.attachedFlashcardId,
                        isRequiredToPassExam: l.isRequiredToPassExam
                    }))
            };
        });

        let isEnrolled = false;
        let progress = 0;
        let completedLessons: string[] = [];
        let completedChapters: string[] = [];
        let isCompleted = false;
        let completedAt: Date | null = null;
        
        if (userId) {
            if (course.creatorId?.toString() === userId?.toString()) {
                isEnrolled = true;
            }
            const user = await User.findById(userId);
            if (user) {
                const enrollment = user.enrolledCourses.find(e => e.courseId.toString() === id);
                if (enrollment) {
                    isEnrolled = true;
                    progress = enrollment.progressPercentage;
                    completedChapters = (enrollment.completedChapters ?? []).map(cid => cid.toString());
                    isCompleted = !!enrollment.isCompleted;
                    completedAt = enrollment.completedAt ?? null;
                }
                completedLessons = user.completedLessons.map(id => id.toString());
            }
        }

        res.status(200).json({
            status: 'success',
            data: {
                course,
                syllabus: chaptersWithLessons,
                completedChapters,
                isCompleted,
                completedAt,
                // Owner/Admin xem trước toàn bộ; học viên chỉ mở chương theo tiến độ
                unlockedChapterIds: (isOwner || isAdmin)
                    ? chapters.map(c => c._id.toString())
                    : computeUnlockedChapterIds(chapters, lessons, new Set(completedChapters), new Set(completedLessons)),
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

        let user = await User.findById(userId);
        if (!user && userId) {
            const mysqlUser = await findUserById(userId);
            if (mysqlUser) {
                user = await User.create({
                    _id: mysqlUser.id,
                    email: mysqlUser.email,
                    username: mysqlUser.full_name,
                    passwordHash: 'synced_from_mysql',
                    role: mysqlUser.role ? mysqlUser.role.toLowerCase() : 'user'
                });
            } else {
                res.status(404).json({ status: 'error', message: 'Người dùng không tồn tại.' });
                return;
            }
        }

        // Kiểm tra đã đăng ký chưa
        const isEnrolled = user.enrolledCourses.some(e => e.courseId.toString() === id);
        if (isEnrolled) {
            res.status(400).json({ status: 'error', message: 'Bạn đã đăng ký khóa học này rồi.' });
            return;
        }
        
        user.enrolledCourses.push({
            courseId: new mongoose.Types.ObjectId(String(id)),
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

        const course = await Course.findById(courseId);
        if (!course) {
            res.status(404).json({ status: 'error', message: 'Không tìm thấy khóa học.' });
            return;
        }

        const isCreator = userId && course.creatorId?.toString() === userId.toString();
        const isAdmin = req.user?.role?.toLowerCase() === 'admin';

        if (!course.isPublished && !isCreator && !isAdmin) {
            res.status(404).json({ status: 'error', message: 'Khóa học này đang ở chế độ riêng tư.' });
            return;
        }

        const user = await User.findById(userId);
        const isEnrolled = isCreator || isAdmin || user?.enrolledCourses.some(e => e.courseId.toString() === courseId);
        
        if (!isEnrolled) {
            res.status(403).json({ status: 'error', message: 'Vui lòng đăng ký khóa học trước khi xem nội dung.' });
            return;
        }

        const lesson = await Lesson.findOne({ _id: lessonId, courseId })
            .populate('attachedExamId', 'title description totalQuestions status averageRating')
            .populate('attachedFlashcardId', 'title description')
            .lean();
        if (!lesson) {
            res.status(404).json({ status: 'error', message: 'Bài học không tồn tại.' });
            return;
        }

        // Chặn truy cập bài học thuộc chương chưa được mở khóa (bảo mật phía server)
        if (!isCreator && !isAdmin && user) {
            const enrollment = getEnrollment(user, String(courseId));
            const { chapters, lessons } = await loadCourseStructure(String(courseId));
            const unlocked = computeUnlockedChapterIds(
                chapters,
                lessons,
                new Set((enrollment?.completedChapters ?? []).map((cid: any) => cid.toString())),
                new Set(user.completedLessons.map(l => l.toString()))
            );
            if (!unlocked.includes(lesson.chapterId.toString())) {
                res.status(403).json({ status: 'error', message: 'Bạn cần hoàn thành chương trước để mở khóa chương này.' });
                return;
            }
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

        if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId)) {
            res.status(400).json({ status: 'error', message: 'ID không hợp lệ.' });
            return;
        }

        // Bài học phải thuộc đúng khóa học này
        const lesson = await Lesson.findOne({ _id: lessonId, courseId }).select('_id chapterId').lean();
        if (!lesson) {
            res.status(404).json({ status: 'error', message: 'Bài học không tồn tại trong khóa học này.' });
            return;
        }

        // User phải đã đăng ký khóa học
        const enrollmentOfLesson = getEnrollment(user, String(courseId));
        if (!enrollmentOfLesson) {
            res.status(403).json({ status: 'error', message: 'Vui lòng đăng ký khóa học trước khi học.' });
            return;
        }

        // Chương chứa bài học phải đã được mở khóa
        const structure = await loadCourseStructure(String(courseId));
        const unlockedIds = computeUnlockedChapterIds(
            structure.chapters,
            structure.lessons,
            new Set((enrollmentOfLesson.completedChapters ?? []).map((cid: any) => cid.toString())),
            new Set(user.completedLessons.map(l => l.toString()))
        );
        if (!unlockedIds.includes(lesson.chapterId.toString())) {
            res.status(403).json({ status: 'error', message: 'Chương này chưa được mở khóa.' });
            return;
        }

        const lessonObjId = new mongoose.Types.ObjectId(String(lessonId));
        
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

// 6. Hoàn thành chương (Mark chapter as complete) - validate phía server
export const completeChapter = async (req: Request, res: Response): Promise<void> => {
    try {
        const { courseId, chapterId } = req.params as { courseId: string; chapterId: string };
        const userId = req.user?.id;

        if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(chapterId)) {
            res.status(400).json({ status: 'error', message: 'ID không hợp lệ.' });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ status: 'error', message: 'Người dùng không tồn tại' });
            return;
        }

        const enrollment = getEnrollment(user, courseId);
        if (!enrollment) {
            res.status(403).json({ status: 'error', message: 'Vui lòng đăng ký khóa học trước khi học.' });
            return;
        }

        const { chapters, lessons } = await loadCourseStructure(courseId);
        const chapterIndex = chapters.findIndex(c => c._id.toString() === chapterId);
        if (chapterIndex === -1) {
            res.status(404).json({ status: 'error', message: 'Chương không tồn tại trong khóa học này.' });
            return;
        }

        const completedLessonIds = new Set<string>(user.completedLessons.map(l => l.toString()));
        const completedChapterIds = new Set<string>((enrollment.completedChapters ?? []).map((cid: any) => cid.toString()));

        const nextChapter = chapters[chapterIndex + 1];
        const nextChapterLessons = nextChapter
            ? lessons.filter(l => l.chapterId.toString() === nextChapter._id.toString())
            : [];
        const buildPayload = (completedIds: Set<string>) => ({
            chapterId,
            completedChapters: Array.from(completedIds),
            isLastChapter: !nextChapter,
            nextChapterId: nextChapter ? nextChapter._id.toString() : null,
            nextLessonId: nextChapterLessons.length > 0 ? nextChapterLessons[0]._id.toString() : null,
            unlockedChapterIds: computeUnlockedChapterIds(chapters, lessons, completedIds, completedLessonIds)
        });

        // Idempotent: đã hoàn thành thì trả về trạng thái hiện tại
        if (completedChapterIds.has(chapterId)) {
            res.status(200).json({
                status: 'success',
                message: 'Chương này đã được hoàn thành trước đó.',
                data: { ...buildPayload(completedChapterIds), alreadyCompleted: true }
            });
            return;
        }

        // Chương phải đã được mở khóa (chương trước đó đã hoàn thành)
        const unlocked = computeUnlockedChapterIds(chapters, lessons, completedChapterIds, completedLessonIds);
        if (!unlocked.includes(chapterId)) {
            res.status(403).json({ status: 'error', message: 'Bạn cần hoàn thành chương trước đó trước.' });
            return;
        }

        // Phải học hết toàn bộ bài học của chương (chống gọi API ảo để tua nhanh)
        const chapterLessons = lessons.filter(l => l.chapterId.toString() === chapterId);
        const missingLessonIds = chapterLessons
            .filter(l => !completedLessonIds.has(l._id.toString()))
            .map(l => l._id.toString());
        if (missingLessonIds.length > 0) {
            res.status(400).json({
                status: 'error',
                message: `Bạn còn ${missingLessonIds.length} bài học chưa hoàn thành trong chương này.`,
                data: { missingLessonIds }
            });
            return;
        }

        // Ghi nhận nguyên tử, không trùng lặp
        await User.updateOne(
            { _id: userId, 'enrolledCourses.courseId': new mongoose.Types.ObjectId(courseId) },
            { $addToSet: { 'enrolledCourses.$.completedChapters': new mongoose.Types.ObjectId(chapterId) } }
        );

        completedChapterIds.add(chapterId);
        res.status(200).json({
            status: 'success',
            message: 'Chúc mừng bạn đã hoàn thành chương!',
            data: { ...buildPayload(completedChapterIds), alreadyCompleted: false }
        });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// 7. Hoàn thành khóa học (is_completed = true, completed_at = now) - validate phía server
export const completeCourse = async (req: Request, res: Response): Promise<void> => {
    try {
        const { courseId } = req.params as { courseId: string };
        const userId = req.user?.id;

        if (!mongoose.isValidObjectId(courseId)) {
            res.status(400).json({ status: 'error', message: 'ID không hợp lệ.' });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ status: 'error', message: 'Người dùng không tồn tại' });
            return;
        }

        const enrollment = getEnrollment(user, courseId);
        if (!enrollment) {
            res.status(403).json({ status: 'error', message: 'Vui lòng đăng ký khóa học trước khi học.' });
            return;
        }

        const { chapters, lessons } = await loadCourseStructure(courseId);
        if (chapters.length === 0 || lessons.length === 0) {
            res.status(400).json({ status: 'error', message: 'Khóa học chưa có nội dung để hoàn thành.' });
            return;
        }

        const totalDurationMinutes = lessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
        const stats = {
            totalChapters: chapters.length,
            totalLessons: lessons.length,
            completedLessons: lessons.length,
            totalDurationMinutes,
            progressPercentage: 100
        };

        // Idempotent: đã hoàn thành thì giữ nguyên completedAt cũ
        if (enrollment.isCompleted) {
            res.status(200).json({
                status: 'success',
                message: 'Bạn đã hoàn thành khóa học này trước đó.',
                data: { ...stats, isCompleted: true, completedAt: enrollment.completedAt, alreadyCompleted: true }
            });
            return;
        }

        // 1) Mọi bài học của khóa phải đã hoàn thành
        const completedLessonIds = new Set<string>(user.completedLessons.map(l => l.toString()));
        const missingLessons = lessons.filter(l => !completedLessonIds.has(l._id.toString()));
        if (missingLessons.length > 0) {
            res.status(400).json({
                status: 'error',
                message: `Bạn còn ${missingLessons.length} bài học chưa hoàn thành.`,
                data: { missingLessonIds: missingLessons.map(l => l._id.toString()) }
            });
            return;
        }

        // 2) Mọi chương phải đã được xác nhận hoàn thành
        const completedChapterIds = new Set((enrollment.completedChapters ?? []).map((cid: any) => cid.toString()));
        const missingChapters = chapters.filter(c => !completedChapterIds.has(c._id.toString()));
        if (missingChapters.length > 0) {
            res.status(400).json({
                status: 'error',
                message: `Bạn còn ${missingChapters.length} chương chưa hoàn thành.`,
                data: { missingChapterIds: missingChapters.map(c => c._id.toString()) }
            });
            return;
        }

        const completedAt = new Date();
        // Điều kiện isCompleted != true để tránh ghi đè completedAt khi có request song song
        await User.updateOne(
            {
                _id: userId,
                enrolledCourses: {
                    $elemMatch: { courseId: new mongoose.Types.ObjectId(courseId), isCompleted: { $ne: true } }
                }
            },
            {
                $set: {
                    'enrolledCourses.$.isCompleted': true,
                    'enrolledCourses.$.completedAt': completedAt,
                    'enrolledCourses.$.progressPercentage': 100
                }
            }
        );

        // Đọc lại để trả về completedAt chính xác (phòng trường hợp request song song)
        const fresh = await User.findById(userId).select('enrolledCourses');
        const freshEnrollment = fresh ? getEnrollment(fresh, courseId) : null;

        res.status(200).json({
            status: 'success',
            message: 'Chúc mừng bạn đã hoàn thành khóa học!',
            data: {
                ...stats,
                isCompleted: true,
                completedAt: freshEnrollment?.completedAt ?? completedAt,
                alreadyCompleted: false
            }
        });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

