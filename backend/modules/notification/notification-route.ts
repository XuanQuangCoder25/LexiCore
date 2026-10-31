import { Router } from 'express';
import { notificationController } from './notification-controller';
import { requireAuth } from '../../middlewares/requireAuth';

const router = Router();

// Tất cả endpoints đều yêu cầu đăng nhập
router.use(requireAuth);

// Cài đặt nhắc nhở học tập (Setting)
router.get('/settings', notificationController.getSettings);
router.put('/settings', notificationController.updateSettings);
router.patch('/settings', notificationController.updateSettings);

// Thông báo trong ứng dụng (In-app notifications)
router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;
