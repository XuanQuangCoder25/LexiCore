import express from 'express';
import {
  getDueCards,
  submitReview,
  getSrsStats,
  getDecks,
  getReviewedCards,
  getCardCurve,
  getReviewForecast
} from './srs.controller';
import { requireAuth } from '../../middlewares/requireAuth';

const router = express.Router();

router.use(requireAuth);

router.get('/due', getDueCards);
router.post('/review', submitReview);
router.get('/stats', getSrsStats);
router.get('/decks', getDecks);
router.get('/reviewed-cards', getReviewedCards);
router.get('/card-curve/:cardId', getCardCurve);
router.get('/forecast', getReviewForecast);

export default router;
