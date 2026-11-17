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
    getAllUsers,
    banUser,
    unbanUser,
    sendUserDirectEmail,
} from './admin.controller';
import {
    getCampaigns,
    createNewCampaign,
    toggleCampaignStatus,
    removeCampaign
} from './campaign.controller';
import {
    getPackagesWithSale,
    setPackageSale,
    listRewardCampaigns,
    createRewardCampaign,
    toggleRewardCampaign,
    deleteRewardCampaign,
    getSystemAnnouncements,
    startMaintenance,
    endMaintenance,
    sendEmailBlast,
    getEmailBlastLogs,
} from './marketing.controller';

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

// HR / User Management
router.get('/users', getAllUsers);
router.post('/users/:userId/ban', banUser);
router.post('/users/:userId/unban', unbanUser);
router.post('/users/:userId/send-email', sendUserDirectEmail);

// -- Subscription Campaigns Management ------------------------------
router.get('/campaigns', getCampaigns);
router.post('/campaigns', createNewCampaign);
router.patch('/campaigns/:id/toggle', toggleCampaignStatus);
router.delete('/campaigns/:id', removeCampaign);

// -- Marketing & Sale Management ------------------------------------
router.get('/packages/with-sale', getPackagesWithSale);
router.patch('/packages/:id/sale', setPackageSale);

// -- Reward Campaigns Management -----------------------------------
router.get('/campaigns/reward', listRewardCampaigns);
router.post('/campaigns/reward', createRewardCampaign);
router.patch('/campaigns/reward/:id/toggle', toggleRewardCampaign);
router.delete('/campaigns/reward/:id', deleteRewardCampaign);

// -- System Announcements & Maintenance -----------------------------
router.get('/system-announcements', getSystemAnnouncements);
router.post('/maintenance/start', startMaintenance);
router.patch('/maintenance/:id/end', endMaintenance);
router.patch('/maintenance/end', endMaintenance);

// -- Email Blast ---------------------------------------------------
router.get('/email-blast/logs', getEmailBlastLogs);
router.post('/email-blast', sendEmailBlast);

export default router;
