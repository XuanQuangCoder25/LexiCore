import { Router } from 'express';
import { requireAuth, optionalAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import {
    bulkCreateWords,
    listWords,
    editWord,
    removeWord,
    listTopics,
} from './arena-word.controller';
import {
    getMyArenaProfile,
    getMyArenaMatches,
    getArenaMatchById,
    getArenaLeaderboardData,
    getArenaRankTiers,
} from './arena.controller';

const router = Router();

// ─── User routes (Dành cho người chơi Arena) ──────────────────────────────────
router.get('/profile/me', requireAuth, getMyArenaProfile);
router.get('/matches', requireAuth, getMyArenaMatches);
router.get('/matches/:id', requireAuth, getArenaMatchById);
router.get('/leaderboard', optionalAuth, getArenaLeaderboardData);
router.get('/ranks', getArenaRankTiers);

// ─── Admin routes (yêu cầu ADMIN) ────────────────────────────────────────────
router.use('/admin', requireAuth, requireRole(['admin']));
router.get('/admin/words/topics', listTopics); // phải đặt TRƯỚC /:id để tránh conflict
router.get('/admin/words', listWords);
router.post('/admin/words/bulk', bulkCreateWords);
router.put('/admin/words/:id', editWord);
router.delete('/admin/words/:id', removeWord);

export default router;
