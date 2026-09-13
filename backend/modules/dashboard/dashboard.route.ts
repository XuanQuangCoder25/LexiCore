import express from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { 
  getStats, 
  getRetention, 
  getCoursesProgress, 
  getNextLessons, 
  getActivities 
} from './dashboard.controller';

const router = express.Router();

// Áp dụng middleware xác thực cho TẤT CẢ các routes của dashboard
router.use(requireAuth);

router.get('/stats', getStats);
router.get('/retention', getRetention);
router.get('/courses', getCoursesProgress);
router.get('/lessons', getNextLessons);
router.get('/activities', getActivities);

export default router;
