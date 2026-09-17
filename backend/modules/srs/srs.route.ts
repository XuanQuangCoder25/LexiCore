import express from 'express';
import { getDueCards, submitReview, getSrsStats } from './srs.controller';

const router = express.Router();

router.get('/due', getDueCards);
router.post('/review', submitReview);
router.get('/stats', getSrsStats);

export default router;
