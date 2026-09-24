import { Router } from 'express';
import * as gamificationController from './gamification-controller';
import { requireAuth } from '../../middlewares/requireAuth';

const router = Router();

// Các API này cần người dùng đăng nhập
router.use(requireAuth);

router.get('/daily-goals', gamificationController.getDailyGoals);
router.post('/daily-goals/claim/:goalId', gamificationController.claimDailyGoal);

router.get('/achievements', gamificationController.getAchievements);

router.get('/leaderboard', gamificationController.getLeaderboard);

router.get('/collections', gamificationController.getCollections);

export default router;
