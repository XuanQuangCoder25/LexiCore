export interface IUserSettings {
  user_id: string;
  enable_email_reminder: boolean;
  enable_in_app_reminder: boolean;
  reminder_time: string; // "20:00"
  timezone: string; // "Asia/Ho_Chi_Minh"
  created_at?: Date;
  updated_at?: Date;
}

export interface INotification {
  id: string;
  user_id: string;
  type: 'reminder' | 'srs' | 'challenge' | 'system' | 'achievement';
  title: string;
  body: string;
  is_read: boolean;
  created_at?: Date;
}
