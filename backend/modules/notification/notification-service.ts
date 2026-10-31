import { notificationRepository } from './notification-repository';
import { IUserSettings, INotification } from '../../database/models/Notification';
import { AppError } from '../../errors/AppError';

export const notificationService = {
  // Lấy cài đặt thông báo của user
  async getSettings(userId: string): Promise<IUserSettings> {
    return await notificationRepository.getUserSettings(userId);
  },

  // Cập nhật cài đặt thông báo
  async updateSettings(
    userId: string,
    data: Partial<Pick<IUserSettings, 'enable_email_reminder' | 'enable_in_app_reminder' | 'reminder_time' | 'timezone'>>
  ): Promise<IUserSettings> {
    // Validate reminder_time nếu có truyền lên (format HH:mm)
    if (data.reminder_time !== undefined) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(data.reminder_time)) {
        throw new AppError('Định dạng giờ không hợp lệ. Vui lòng sử dụng định dạng HH:mm (ví dụ: 20:00)', 400);
      }
    }

    return await notificationRepository.updateUserSettings(userId, data);
  },

  // Lấy danh sách thông báo kèm số lượng chưa đọc
  async getNotifications(userId: string, limit: number = 20): Promise<{
    notifications: INotification[];
    unreadCount: number;
  }> {
    const [notifications, unreadCount] = await Promise.all([
      notificationRepository.getUserNotifications(userId, limit),
      notificationRepository.getUnreadCount(userId),
    ]);

    return {
      notifications,
      unreadCount,
    };
  },

  // Đánh dấu 1 thông báo là đã đọc
  async markAsRead(id: string, userId: string): Promise<void> {
    const success = await notificationRepository.markAsRead(id, userId);
    if (!success) {
      throw new AppError('Không tìm thấy thông báo hoặc bạn không có quyền cập nhật.', 404);
    }
  },

  // Đánh dấu tất cả là đã đọc
  async markAllAsRead(userId: string): Promise<void> {
    await notificationRepository.markAllAsRead(userId);
  },

  // Xóa thông báo
  async deleteNotification(id: string, userId: string): Promise<void> {
    const success = await notificationRepository.deleteNotification(id, userId);
    if (!success) {
      throw new AppError('Không tìm thấy thông báo hoặc bạn không có quyền xóa.', 404);
    }
  },
};
