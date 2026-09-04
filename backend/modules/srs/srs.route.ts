import express from 'express';
import { getDueCards, submitReview } from './srs.controller';

const router = express.Router();

router.get('/due', getDueCards);
router.post('/review', submitReview);

export default router;
