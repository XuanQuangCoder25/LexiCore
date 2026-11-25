import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middlewares/requireAuth';
import {
    getLibraryHandler,
    getVideoDetailHandler,
    addVideoHandler,
    deleteVideoHandler,
    checkManualSubHandler,
    analyzeAudioHandler,
    getVideoSummaryHandler,
    getNoteHandler,
    saveNoteHandler,
    explainWordHandler,
} from './shadowing-controller';

const router = Router();

// Cấu hình multer lưu file âm thanh tạm trong bộ nhớ thay vì ổ đĩa
const upload = multer({ storage: multer.memoryStorage() });

router.get('/videos', requireAuth, getLibraryHandler);
router.get('/videos/:id', requireAuth, getVideoDetailHandler);
router.post('/check-sub', requireAuth, checkManualSubHandler);
router.post('/videos', requireAuth, addVideoHandler);
router.delete('/videos/:videoId', requireAuth, deleteVideoHandler);
router.post('/analyze/:segmentId', requireAuth, upload.single('audio'), analyzeAudioHandler);

// Tóm tắt & từ vựng Gemini AI (lazy-load, cache dùng chung trong DB)
router.get('/videos/:id/summary', requireAuth, getVideoSummaryHandler);

// Sổ tay cá nhân
router.get('/notes/:videoId', requireAuth, getNoteHandler);
router.put('/notes/:videoId', requireAuth, saveNoteHandler);

// Từ điển ngữ cảnh thông minh (Gemini)
router.post('/dictionary/explain', requireAuth, explainWordHandler);

export default router;
