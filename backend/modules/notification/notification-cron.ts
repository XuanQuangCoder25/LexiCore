import cron from 'node-cron';
import { pool } from '../../config/mysql';
import { notificationRepository } from './notification-repository';
import { sendStudyReminderEmail } from '../../utils/mailer';

export const checkAndSendReminders = async (forcedTime?: string): Promise<number> => {
  try {
    const now = new Date();
    // Lấy giờ phút HH:mm hiện tại theo múi giờ Việt Nam
    const currentTime =
      forcedTime ||
      now.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

    // Tạo dạng 12h bổ trợ (ví dụ "15:44" -> "03:44") để bao quát mọi định dạng người dùng nhập
    const [h, m] = currentTime.split(':');
    const hourNum = parseInt(h || '0', 10);
    const h12 = (hourNum % 12 || 12).toString().padStart(2, '0');
    const altTime = h && m ? `${h12}:${m}` : currentTime;

    console.log(`[Notification Cron] Đang quét nhắc nhở cho khung giờ: ${currentTime} (hoặc ${altTime})`);

    // 1. Tìm các người dùng có reminder_time trùng với giờ hiện tại
    const [rows] = await pool.execute(
      `SELECT 
          s.user_id,
          s.enable_email_reminder,
          s.enable_in_app_reminder,
          s.reminder_time,
          s.timezone,
          u.email,
          u.full_name,
          COALESCE(w.current_streak, 0) AS current_streak
       FROM user_settings s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN wallets w ON s.user_id = w.user_id
       WHERE (s.reminder_time = ? OR s.reminder_time = ?)
         AND (s.enable_in_app_reminder = TRUE OR s.enable_email_reminder = TRUE)
         AND u.status = 'ACTIVE'`,
      [currentTime, altTime]
    );

    const candidates = rows as any[];
    if (candidates.length === 0) {
      return 0;
    }

    console.log(
      `[Notification Cron] Khung giờ ${currentTime}: Tìm thấy ${candidates.length} người dùng cần gửi nhắc nhở.`
    );

    let sentCount = 0;

    for (const candidate of candidates) {
      try {
        // 2. Chống gửi lặp: Chỉ chặn nếu trong vòng 2 phút gần nhất đã gửi thông báo reminder cho user này
        const [existing] = await pool.execute(
          `SELECT id FROM notifications 
           WHERE user_id = ? 
             AND type = 'reminder' 
             AND created_at >= NOW() - INTERVAL 2 MINUTE 
           LIMIT 1`,
          [candidate.user_id]
        );

        if ((existing as any[]).length > 0) {
          console.log(`[Notification Cron] User ${candidate.user_id} vừa nhận nhắc nhở trong 2 phút qua. Bỏ qua chống trùng lặp.`);
          continue;
        }

        // 3. Tạo thông báo In-app
        if (candidate.enable_in_app_reminder) {
          const notifId = await notificationRepository.createNotification({
            userId: candidate.user_id,
            type: 'reminder',
            title: '🔥 Đã đến giờ học từ vựng rồi!',
            body: `Chào ${candidate.full_name}, hãy dành 10-15 phút ôn luyện hôm nay để bảo vệ chuỗi ${candidate.current_streak} ngày Streak nhé!`,
          });
          console.log(`[Notification Cron] Đã tạo In-app Notification (ID: ${notifId}) cho user: ${candidate.full_name}`);
        }

        // 4. Gửi thông báo Email
        if (candidate.enable_email_reminder && candidate.email) {
          await sendStudyReminderEmail({
            toEmail: candidate.email,
            fullName: candidate.full_name,
            streakCount: candidate.current_streak,
            reminderTime: candidate.reminder_time,
          });
        }

        sentCount++;
      } catch (userError) {
        console.error(
          `[Notification Cron] Lỗi khi xử lý nhắc nhở cho user ${candidate.user_id}:`,
          userError
        );
      }
    }

    if (sentCount > 0) {
      console.log(`[Notification Cron] ✅ Đã gửi thành công nhắc nhở cho ${sentCount} người dùng.`);
    }

    return sentCount;
  } catch (error) {
    console.error('[Notification Cron] Lỗi trong quá trình quét nhắc nhở:', error);
    return 0;
  }
};

export const initNotificationCron = () => {
  // Lên lịch chạy mỗi phút: '* * * * *'
  cron.schedule('* * * * *', async () => {
    await checkAndSendReminders();
  });

  console.log('⏰ Notification Background Cronjob đã được khởi động (Quét định kỳ mỗi phút: * * * * *).');
};
