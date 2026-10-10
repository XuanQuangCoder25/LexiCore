import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import {
    getStoreItemsHandler,
    getInventoryHandler,
    buyItemHandler,
    equipItemHandler,
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

router.get('/items', requireAuth, getStoreItemsHandler);
router.get('/inventory', requireAuth, getInventoryHandler);
router.post('/buy/:itemId', requireAuth, buyItemHandler);
router.post('/equip/:itemId', requireAuth, equipItemHandler);

export default router;
