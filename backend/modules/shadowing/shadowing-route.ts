import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middlewares/requireAuth';
import {
    getLibraryHandler,
    getVideoDetailHandler,
    addVideoHandler,
    analyzeAudioHandler,
    getVideoSummaryHandler,
    getNoteHandler,
    saveNoteHandler,
    explainWordHandler,
} from './shadowing-controller';

const router = Router();

// Configure multer to store file in memory (buffer) instead of disk
const upload = multer({ storage: multer.memoryStorage() });

router.get('/videos', requireAuth, getLibraryHandler);
router.get('/videos/:id', requireAuth, getVideoDetailHandler);
router.post('/videos', requireAuth, addVideoHandler);
router.post('/analyze/:segmentId', requireAuth, upload.single('audio'), analyzeAudioHandler);

// Gemini AI Summary (lazy-load, cached in DB)
router.get('/videos/:id/summary', requireAuth, getVideoSummaryHandler);

// Notebook (Sổ tay cá nhân)
router.get('/notes/:videoId', requireAuth, getNoteHandler);
router.put('/notes/:videoId', requireAuth, saveNoteHandler);

// Interactive Dictionary (Gemini contextual explanation)
router.post('/dictionary/explain', requireAuth, explainWordHandler);

export default router;
