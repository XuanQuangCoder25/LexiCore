import { pool } from '../../config/mysql';
import { IUserSettings, INotification } from '../../database/models/Notification';
import { v4 as uuidv4 } from 'uuid';

export const notificationRepository = {
  // 1. Lấy User Settings (tạo mới mặc định nếu chưa tồn tại)
  async getUserSettings(userId: string): Promise<IUserSettings> {
    const [rows] = await pool.execute(
      `SELECT user_id, enable_email_reminder, enable_in_app_reminder, reminder_time, timezone, created_at, updated_at
       FROM user_settings
       WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    const settings = (rows as any[])[0];
    if (settings) {
      return {
        ...settings,
        enable_email_reminder: Boolean(settings.enable_email_reminder),
        enable_in_app_reminder: Boolean(settings.enable_in_app_reminder),
      };
    }

    // Nếu chưa có, tạo mặc định
    const defaultSettings: IUserSettings = {
      user_id: userId,
      enable_email_reminder: true,
      enable_in_app_reminder: true,
      reminder_time: '20:00',
      timezone: 'Asia/Ho_Chi_Minh',
    };

    await pool.execute(
      `INSERT INTO user_settings (user_id, enable_email_reminder, enable_in_app_reminder, reminder_time, timezone)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         enable_email_reminder = VALUES(enable_email_reminder),
         enable_in_app_reminder = VALUES(enable_in_app_reminder)`,
      [
        defaultSettings.user_id,
        defaultSettings.enable_email_reminder,
        defaultSettings.enable_in_app_reminder,
        defaultSettings.reminder_time,
        defaultSettings.timezone,
      ]
    );

    return defaultSettings;
  },

  // 2. Cập nhật User Settings
  async updateUserSettings(
    userId: string,
    data: Partial<Pick<IUserSettings, 'enable_email_reminder' | 'enable_in_app_reminder' | 'reminder_time' | 'timezone'>>
  ): Promise<IUserSettings> {
    // Đảm bảo bản ghi đã tồn tại
    await this.getUserSettings(userId);

    const fields: string[] = [];
    const values: any[] = [];

    if (data.enable_email_reminder !== undefined) {
      fields.push('enable_email_reminder = ?');
      values.push(data.enable_email_reminder ? 1 : 0);
    }
    if (data.enable_in_app_reminder !== undefined) {
      fields.push('enable_in_app_reminder = ?');
      values.push(data.enable_in_app_reminder ? 1 : 0);
    }
    if (data.reminder_time !== undefined) {
      fields.push('reminder_time = ?');
      values.push(data.reminder_time);
    }
    if (data.timezone !== undefined) {
      fields.push('timezone = ?');
      values.push(data.timezone);
    }

    if (fields.length > 0) {
      values.push(userId);
      await pool.execute(
        `UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`,
        values
      );
    }

    return this.getUserSettings(userId);
  },

  // 3. Lấy danh sách notifications của user
  async getUserNotifications(userId: string, limit: number = 20): Promise<INotification[]> {
    const [rows] = await pool.execute(
      `SELECT id, user_id, type, title, body, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, String(limit)]
    );

    return (rows as any[]).map((row) => ({
      ...row,
      is_read: Boolean(row.is_read),
    }));
  },

  // 4. Đếm số lượng thông báo chưa đọc
  async getUnreadCount(userId: string): Promise<number> {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );
    const result = (rows as any[])[0];
    return Number(result?.unread_count || 0);
  },

  // 5. Đánh dấu một thông báo là đã đọc
  async markAsRead(id: string, userId: string): Promise<boolean> {
    const [result] = await pool.execute(
      `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return (result as any).affectedRows > 0;
  },

  // 6. Đánh dấu tất cả thông báo là đã đọc
  async markAllAsRead(userId: string): Promise<void> {
    await pool.execute(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );
  },

  // 7. Xóa một thông báo
  async deleteNotification(id: string, userId: string): Promise<boolean> {
    const [result] = await pool.execute(
      `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return (result as any).affectedRows > 0;
  },

  // 8. Tạo thông báo mới (hỗ trợ cho cronjob và event hệ thống)
  async createNotification(data: {
    userId: string;
    type?: string;
    title: string;
    body: string;
  }): Promise<string> {
    const id = uuidv4();
    await pool.execute(
      `INSERT INTO notifications (id, user_id, type, title, body, is_read)
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [id, data.userId, data.type || 'reminder', data.title, data.body]
    );
    return id;
  },
};
