import express from 'express';
import { getDueCards, submitReview, getSrsStats, getDecks } from './srs.controller';
import { requireAuth } from '../../middlewares/requireAuth';

const router = express.Router();

router.use(requireAuth);

router.get('/due', getDueCards);
router.post('/review', submitReview);
router.get('/stats', getSrsStats);
router.get('/decks', getDecks);

export default router;
