import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import {
  createCourse, updateCourse, deleteCourse, getCourses,
  createFlashcard, updateFlashcard, deleteFlashcard, getFlashcards
} from './creator.controller';

const router = Router();

// Middleware áp dụng cho tất cả routes ở đây
router.use(requireAuth);
router.use(requireRole(['content_creator', 'admin']));

// Courses routes
router.get('/courses', getCourses);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

// Flashcards routes
router.get('/courses/:courseId/flashcards', getFlashcards);
router.post('/flashcards', createFlashcard);
router.put('/flashcards/:id', updateFlashcard);
router.delete('/flashcards/:id', deleteFlashcard);

export default router;
