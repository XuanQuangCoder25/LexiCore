import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import {
    bulkCreateWords,
    listWords,
    editWord,
    removeWord,
    listTopics,
} from './arena-word.controller';

const router = Router();

// ─── Admin routes (yêu cầu ADMIN) ────────────────────────────────────────────
router.use('/admin', requireAuth, requireRole(['admin']));
// phải đặt TRƯỚC /:id để tránh conflict
router.get('/admin/words/topics', listTopics);
router.get('/admin/words', listWords);
router.post('/admin/words/bulk', bulkCreateWords);
router.put('/admin/words/:id', editWord);
router.delete('/admin/words/:id', removeWord);

export default router;
