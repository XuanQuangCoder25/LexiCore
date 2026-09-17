import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middlewares/requireAuth';
import { getLibraryHandler, getVideoDetailHandler, addVideoHandler, analyzeAudioHandler } from './shadowing-controller';

const router = Router();

// Configure multer to store file in memory (buffer) instead of disk
const upload = multer({ storage: multer.memoryStorage() });

router.get('/videos', requireAuth, getLibraryHandler);
router.get('/videos/:id', requireAuth, getVideoDetailHandler);
router.post('/videos', requireAuth, addVideoHandler);
router.post('/analyze/:segmentId', requireAuth, upload.single('audio'), analyzeAudioHandler);

export default router;
