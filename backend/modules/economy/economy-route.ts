import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import {
    getAllItemsHandler,
    createItemHandler,
    updateItemHandler,
    deactivateItemHandler,
    activateItemHandler,
    getStoreItemsHandler,
    getInventoryHandler,
    buyItemHandler,
} from './economy-controller';

const router = Router();

const requireAdmin = (req: any, res: any, next: any) => {
    requireAuth(req, res, () => {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ status: 'error', message: 'Truy cập bị từ chối. Chỉ Admin mới có quyền này.' });
        }
        next();
    });
};

// ==================== ADMIN ROUTES ====================
router.get('/admin/items', requireAdmin, getAllItemsHandler);
router.post('/admin/items', requireAdmin, createItemHandler);
router.put('/admin/items/:id', requireAdmin, updateItemHandler);
router.delete('/admin/items/:id', requireAdmin, deactivateItemHandler);
router.patch('/admin/items/:id/activate', requireAdmin, activateItemHandler);

// ==================== USER ROUTES ====================
router.get('/items', getStoreItemsHandler);
router.get('/inventory', requireAuth, getInventoryHandler);
router.post('/buy/:itemId', requireAuth, buyItemHandler);

export default router;
