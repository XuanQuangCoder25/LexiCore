import { Router } from 'express';
import { requireAuth, optionalAuth } from '../../middlewares/requireAuth';
import * as studentCourseController from './student-course.controller';

const router = Router();

// Public routes (Khám phá) - Không cần requireAuth để ai cũng có thể xem
router.get('/', studentCourseController.getPublishedCourses);
router.get('/:id', optionalAuth, studentCourseController.getCourseDetails);

// Protected routes (Học viên) - Phải đăng nhập
router.use(requireAuth);
router.post('/:id/enroll', studentCourseController.enrollCourse);
router.get('/:courseId/lessons/:lessonId', studentCourseController.getLessonContent);
router.post('/:courseId/lessons/:lessonId/complete', studentCourseController.completeLesson);

export default router;
