import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireCreator } from '../../middlewares/requireCreator';
import * as courseController from './course.controller';

const router = Router();

// Middleware áp dụng cho toàn bộ router này
router.use(requireAuth);
router.use(requireCreator);

// Course Management
router.post('/', courseController.createCourse);
router.get('/my-courses', courseController.getMyCourses);
router.put('/:id', courseController.updateCourse);
router.delete('/:id', courseController.deleteCourse);
router.get('/:id/builder', courseController.getCourseBuilderData);

// Chapter Management
router.post('/:courseId/chapters', courseController.createChapter);
router.put('/:courseId/chapters/:chapterId', courseController.updateChapter);

// Lesson Management
router.post('/:courseId/chapters/:chapterId/lessons', courseController.createLesson);
router.put('/:courseId/chapters/:chapterId/lessons/:lessonId', courseController.updateLesson);

export default router;
