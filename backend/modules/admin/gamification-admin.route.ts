import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import {
    getAllGoals, toggleGoalActive,
    getAllAchievements, createAchievement, updateAchievement, deleteAchievement,
    getAllCollections, createCollection, updateCollection, deleteCollection,
    getAllItems, createItem, updateItem, toggleItemActive
} from './gamification-admin.controller';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['admin']));

// Goals
router.get('/goals', getAllGoals);
router.put('/goals/:id/toggle', toggleGoalActive);

// Achievements
router.get('/achievements', getAllAchievements);
router.post('/achievements', createAchievement);
router.put('/achievements/:id', updateAchievement);
router.delete('/achievements/:id', deleteAchievement);

// Collections
router.get('/collections', getAllCollections);
router.post('/collections', createCollection);
router.put('/collections/:id', updateCollection);
router.delete('/collections/:id', deleteCollection);

// Items
router.get('/items', getAllItems);
router.post('/items', createItem);
router.put('/items/:id', updateItem);
router.put('/items/:id/toggle', toggleItemActive);

export default router;
