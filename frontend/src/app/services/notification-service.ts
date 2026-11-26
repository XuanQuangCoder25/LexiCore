import httpClient from './httpClient';

export interface UserNotificationSettings {
  user_id: string;
  enable_email_reminder: boolean;
  enable_in_app_reminder: boolean;
  reminder_time: string;
  timezone: string;
}

export type NotificationType =
  | 'reminder'
  | 'srs'
  | 'challenge'
  | 'system'
  | 'achievement'
  | 'friend_request'
  | 'friend_accepted'
  | 'reward'
  | 'sale'
  | 'subscription';

export interface InAppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  getSettings: async (): Promise<UserNotificationSettings> => {
    const res = await httpClient.get('/api/notifications/settings');
    return res.data?.data;
  },

  updateSettings: async (
    data: Partial<Omit<UserNotificationSettings, 'user_id'>>
  ): Promise<UserNotificationSettings> => {
    const res = await httpClient.put('/api/notifications/settings', data);
    return res.data?.data;
  },

  getNotifications: async (
    limit: number = 20
  ): Promise<{ notifications: InAppNotification[]; unreadCount: number }> => {
    const res = await httpClient.get('/api/notifications', { params: { limit } });
    return res.data?.data || { notifications: [], unreadCount: 0 };
  },

  markAsRead: async (id: string): Promise<void> => {
    await httpClient.patch(`/api/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await httpClient.patch('/api/notifications/read-all');
  },

  deleteNotification: async (id: string): Promise<void> => {
    await httpClient.delete(`/api/notifications/${id}`);
  },
};
