import axios from 'axios';

const api = axios.create({
  baseURL: '/api/notifications',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface UserNotificationSettings {
  user_id: string;
  enable_email_reminder: boolean;
  enable_in_app_reminder: boolean;
  reminder_time: string;
  timezone: string;
}

export interface InAppNotification {
  id: string;
  user_id: string;
  type: 'reminder' | 'srs' | 'challenge' | 'system' | 'achievement' | 'friend_request' | 'friend_accepted';
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  getSettings: async (): Promise<UserNotificationSettings> => {
    const res = await api.get('/settings');
    return res.data?.data;
  },

  updateSettings: async (
    data: Partial<Omit<UserNotificationSettings, 'user_id'>>
  ): Promise<UserNotificationSettings> => {
    const res = await api.put('/settings', data);
    return res.data?.data;
  },

  getNotifications: async (
    limit: number = 20
  ): Promise<{ notifications: InAppNotification[]; unreadCount: number }> => {
    const res = await api.get('/', { params: { limit } });
    return res.data?.data || { notifications: [], unreadCount: 0 };
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch('/read-all');
  },

  deleteNotification: async (id: string): Promise<void> => {
    await api.delete(`/${id}`);
  },
};
