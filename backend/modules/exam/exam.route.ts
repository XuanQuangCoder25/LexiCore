import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { 
  createExam, 
  updateExam, 
  getExams, 
  getExamById, 
  submitExam 
} from './exam.controller';

const router = Router();

// Routes cho trang Exam (Hiển thị & Làm bài)
router.get('/', requireAuth, getExams);
router.get('/:id', requireAuth, getExamById);
router.post('/:id/submit', requireAuth, submitExam);

// Routes cho Creator Studio (Quản lý)
router.post('/', requireAuth, requireRole(['content_creator', 'admin']), createExam);
router.put('/:id', requireAuth, requireRole(['content_creator', 'admin']), updateExam);

export default router;
