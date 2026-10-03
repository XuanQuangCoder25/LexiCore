import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import {
    getCreatorApplications,
    approveApplication,
    rejectApplication,
    getCreators,
    suspendCreator,
    reactivateCreator,
    getPendingCounts,
} from './admin.controller';

const router = Router();

// Tất cả routes trong module này đều yêu cầu Admin
router.use(requireAuth);
router.use(requireRole(['admin']));

// Stats cho badge thông báo
router.get('/stats/pending', getPendingCounts);

// Creator Applications
router.get('/creator-applications', getCreatorApplications);
router.post('/creator-applications/:id/approve', approveApplication);
router.post('/creator-applications/:id/reject', rejectApplication);

// Creator Management
router.get('/creators', getCreators);
router.post('/creators/:userId/suspend', suspendCreator);
router.post('/creators/:userId/reactivate', reactivateCreator);

export default router;
