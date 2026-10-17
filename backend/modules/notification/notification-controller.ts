import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification-service';

export const notificationController = {
  // GET /api/notifications/settings
  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const settings = await notificationService.getSettings(userId);
      res.status(200).json({
        status: 'success',
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/notifications/settings
  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const updated = await notificationService.updateSettings(userId, req.body);
      res.status(200).json({
        status: 'success',
        message: 'Cập nhật cài đặt nhắc nhở thành công',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/notifications
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await notificationService.getNotifications(userId, limit);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/notifications/:id/read
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      await notificationService.markAsRead(id, userId);
      res.status(200).json({
        status: 'success',
        message: 'Đã đánh dấu thông báo là đã đọc',
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/notifications/read-all
  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      await notificationService.markAllAsRead(userId);
      res.status(200).json({
        status: 'success',
        message: 'Đã đánh dấu tất cả thông báo là đã đọc',
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/notifications/:id
  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      await notificationService.deleteNotification(id, userId);
      res.status(200).json({
        status: 'success',
        message: 'Đã xóa thông báo thành công',
      });
    } catch (error) {
      next(error);
    }
  },
};
