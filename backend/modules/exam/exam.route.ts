import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { 
  createExam, 
  updateExam, 
  getExams, 
  getExamById, 
  submitExam,
  verifyPassword,
  reportExam,
  rateExam,
  getExamRatings
} from './exam.controller';

const router = Router();

// Routes cho trang Exam (Hiển thị & Làm bài)
router.get('/', requireAuth, getExams);
router.get('/:id/ratings', requireAuth, getExamRatings);
router.get('/:id', requireAuth, getExamById);
router.post('/:id/submit', requireAuth, submitExam);
router.post('/:id/verify-password', requireAuth, verifyPassword);
router.post('/:id/report', requireAuth, reportExam);
router.post('/:id/rate', requireAuth, rateExam);

// Routes cho Creator Studio (Quản lý)
router.post('/', requireAuth, requireRole(['content_creator', 'admin']), createExam);
router.put('/:id', requireAuth, requireRole(['content_creator', 'admin']), updateExam);

export default router;
