import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireCreator } from '../../middlewares/requireCreator';
import * as courseController from './course.controller';

const router = Router();

// Middleware áp dụng cho toàn bộ router này: Bắt buộc đăng nhập & quyền tác giả
router.use(requireAuth);
router.use(requireCreator);

// 1. Quản lý danh sách & Tài nguyên đính kèm
router.get('/my-courses', courseController.getMyCourses);
router.get('/resources', courseController.getMyResources); // Chỉ lấy Flashcard & Exam của chính chủ

// 2. Tạo & Tải dữ liệu Course Builder
router.post('/', courseController.createCourse);
router.get('/:id/builder', courseController.getCourseBuilderData);

// 3. Đồng bộ cây khóa học (Atomic Tree Sync) & Xuất bản
router.put('/:id/tree', courseController.syncCourseTree);
router.post('/:id/publish', courseController.publishCourse);
router.post('/:id/unpublish', courseController.unpublishCourse);

// 4. Cập nhật & Xóa cơ bản
router.put('/:id', courseController.updateCourse);
router.delete('/:id', courseController.deleteCourse);

// 5. Quản lý Chương (Legacy endpoints)
router.post('/:courseId/chapters', courseController.createChapter);
router.put('/:courseId/chapters/:chapterId', courseController.updateChapter);
router.delete('/:courseId/chapters/:chapterId', courseController.deleteChapter);

// 6. Quản lý Bài học (Legacy endpoints)
router.post('/:courseId/chapters/:chapterId/lessons', courseController.createLesson);
router.put('/:courseId/chapters/:chapterId/lessons/:lessonId', courseController.updateLesson);
router.delete('/:courseId/chapters/:chapterId/lessons/:lessonId', courseController.deleteLesson);

export default router;
