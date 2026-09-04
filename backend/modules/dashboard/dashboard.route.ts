import express from 'express';
import { getStats, getRetention } from './dashboard.controller';

const router = express.Router();

router.get('/stats', getStats);
router.get('/retention', getRetention);

export default router;
