import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (toEmail: string, otp: string) => {
    try {
        const data = await resend.emails.send({
            from: 'LexiCore <onboarding@resend.dev>',
            to: toEmail,
            subject: 'Mã xác thực LexiCore của bạn',
            html: `<p>Mã OTP của bạn là: <strong>${otp}</strong>. Mã này có hiệu lực trong 5 phút.</p>`
        });
        console.log('Gửi email thành công:', data);
        return data;
    } catch (error) {
        console.error('Lỗi khi gửi email:', error);
        throw error;
    }
};

export const sendStudyReminderEmail = async (params: {
    toEmail: string;
    fullName: string;
    streakCount: number;
    reminderTime: string;
}) => {
    const { toEmail, fullName, streakCount, reminderTime } = params;
    try {
        if (!process.env.RESEND_API_KEY) {
            console.log(`[Email Reminder Mock] Đã gửi email nhắc nhở học tập đến ${toEmail} (${fullName}) cho khung giờ ${reminderTime}. Streak hiện tại: ${streakCount} ngày.`);
            return { id: 'mock-email-id', mock: true };
        }

        const data = await resend.emails.send({
            from: 'LexiCore <onboarding@resend.dev>',
            to: toEmail,
            subject: '🔥 Đã đến giờ học từ vựng cùng LexiCore!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #4f46e5; margin: 0; font-size: 26px;">LexiCore</h1>
                        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Learn smarter, remember longer</p>
                    </div>
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Chào ${fullName || 'bạn'},</h2>
                        <p style="color: #334155; line-height: 1.6; font-size: 15px;">
                            Đây là thông báo nhắc nhở học tập theo khung giờ bạn đã cài đặt (<strong>${reminderTime}</strong>).
                        </p>
                        <div style="background: #fef3c7; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 16px 0;">
                            <span style="color: #92400e; font-weight: bold; font-size: 14px;">🔥 Chuỗi học tập hiện tại: ${streakCount} ngày liên tiếp! Đừng để bị đứt chuỗi hôm nay nhé!</span>
                        </div>
                        <p style="color: #334155; line-height: 1.6; font-size: 14px;">
                            Chỉ cần 10-15 phút ôn luyện flashcard SRS hoặc luyện nghe Shadowing mỗi ngày để duy trì phản xạ tiếng Anh vượt trội.
                        </p>
                    </div>
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
                            Vào học ngay bây giờ →
                        </a>
                    </div>
                    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                        Bạn nhận được email này vì đã bật tính năng Nhắc nhở qua Email trong phần Cài đặt tài khoản LexiCore.
                    </p>
                </div>
            `
        });
        console.log(`[Email Reminder] Đã gửi thành công đến ${toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email Reminder Error] Lỗi khi gửi email đến ${toEmail}:`, error);
        return { error };
    }
};