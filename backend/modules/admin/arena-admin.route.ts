import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import {
    adminGetWords,
    adminGetTopics,
    adminCreateWord,
    adminUpdateWord,
    adminDeleteWord,
    adminImportWords,
} from './arena-admin.controller';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['admin']));

router.get('/words', adminGetWords);
router.get('/topics', adminGetTopics);
router.post('/words/import', adminImportWords);   // phải trước /words/:id
router.post('/words', adminCreateWord);
router.put('/words/:id', adminUpdateWord);
router.delete('/words/:id', adminDeleteWord);

export default router;

