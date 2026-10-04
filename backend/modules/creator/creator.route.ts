import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireCreator } from '../../middlewares/requireCreator';
import {
  createCourse, updateCourse, deleteCourse, getCourses,
  createFlashcard, updateFlashcard, deleteFlashcard, getFlashcards,
  createExam, updateExam, deleteExam, saveExamQuestions, getCreatorExams, getCreatorExamById, bulkActionExams, getExamRatings
} from './creator.controller';

const router = Router();

// Middleware áp dụng cho tất cả routes ở đây
router.use(requireAuth);
router.use(requireCreator);

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

// Exams routes (Creator)
router.get('/exams', getCreatorExams);
router.post('/exams/bulk-action', bulkActionExams);
router.get('/exams/:id', getCreatorExamById);
router.get('/exams/:id/ratings', getExamRatings);
router.post('/exams', createExam);
router.put('/exams/:id', updateExam);
router.delete('/exams/:id', deleteExam);
router.post('/exams/:id/questions', saveExamQuestions);

export default router;
