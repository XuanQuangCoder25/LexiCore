// Template email nhắc nhở học tập và giữ chuỗi Streak (Phong cách Clean SaaS)
import { emailLayout } from './layout.template';

const clientUrl = process.env.CLIENT_URL || 'https://lexicore.site';

export const studyReminderTemplate = ({
    fullName,
    streakCount,
    reminderTime,
}: {
    fullName: string;
    streakCount: number;
    reminderTime: string;
}) => {
    const bodyHtml = `
<h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0; letter-spacing: -0.5px;">
    Đã đến giờ học từ vựng hôm nay!
</h1>

<p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
    Chào <strong>${fullName || 'bạn'}</strong>, đây là lời nhắc học tập theo khung giờ bạn đã cài đặt (<strong>${reminderTime}</strong>).
</p>

<!-- KHỐI STREAK NHỎ GỌN -->
<div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
    <div style="font-weight: 700; color: #854d0e; font-size: 14px;">
        Chuỗi học tập: ${streakCount} ngày liên tiếp
    </div>
    <div style="color: #a16207; font-size: 12px; margin-top: 2px;">
        Chỉ cần 10-15 phút ôn luyện flashcard SRS hoặc luyện nghe Shadowing để duy trì phong độ hôm nay!
    </div>
</div>

<div style="margin: 0 0 8px 0;">
    <a href="${clientUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
        Vào học ngay bây giờ
    </a>
</div>
`;

    return emailLayout({
        title: 'Đã đến giờ học từ vựng cùng LexiCore!',
        badgeText: 'Học tập',
        badgeColor: '#fefce8',
        badgeTextColor: '#854d0e',
        bodyHtml,
    });
};
