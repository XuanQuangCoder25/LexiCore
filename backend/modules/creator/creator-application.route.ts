import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { applyForCreator, getMyApplication } from './creator-application.controller';

const router = Router();

router.use(requireAuth);

router.post('/apply', applyForCreator);
router.get('/my-application', getMyApplication);

export default router;
