import { Router } from 'express';
import * as gamificationController from './gamification-controller';
import { requireAuth, optionalAuth } from '../../middlewares/requireAuth';

const router = Router();

// Bảng xếp hạng cho phép xem công khai / tuỳ chọn auth
router.get('/leaderboard', optionalAuth, gamificationController.getLeaderboard);

// Các API này cần người dùng đăng nhập
router.use(requireAuth);

router.get('/daily-goals', gamificationController.getDailyGoals);
router.post('/daily-goals/claim/:goalId', gamificationController.claimDailyGoal);

router.get('/achievements', gamificationController.getAchievements);

router.get('/collections', gamificationController.getCollections);

export default router;
