import { Resend } from 'resend';
import { otpTemplate, OtpEmailType } from './templates/auth.template';
import {
    subscriptionSuccessTemplate,
    subscriptionExpiryTemplate,
    autoRenewFailedTemplate,
} from './templates/billing.template';
import { studyReminderTemplate } from './templates/reminder.template';

const resend = new Resend(process.env.RESEND_API_KEY);

// Danh sách địa chỉ gửi theo từng phân hệ (chỉ hoạt động sau khi verify domain trên Resend)
const SENDERS = {
    AUTH: process.env.EMAIL_FROM_AUTH || process.env.EMAIL_FROM || 'LexiCore <onboarding@resend.dev>',
    BILLING: process.env.EMAIL_FROM_BILLING || process.env.EMAIL_FROM || 'LexiCore <onboarding@resend.dev>',
    REMINDER: process.env.EMAIL_FROM_REMINDER || process.env.EMAIL_FROM || 'LexiCore <onboarding@resend.dev>',
};

// ============================================================
// Auth
// ============================================================

export const sendOtpEmail = async (
    toEmail: string,
    otp: string,
    type: OtpEmailType = 'REGISTER'
) => {
    try {
        const subject = type === 'FORGOT_PASSWORD'
            ? '[LexiCore] Yêu cầu đặt lại mật khẩu'
            : '[LexiCore] Mã xác thực tài khoản của bạn';

        const data = await resend.emails.send({
            from: SENDERS.AUTH,
            to: toEmail,
            subject,
            html: otpTemplate({ otp, type }),
        });
        console.log(`[Email] Gửi OTP (${type}) thành công:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Lỗi khi gửi OTP (${type}):`, error);
        throw error;
    }
};

// ============================================================
// Billing
// ============================================================

export const sendSubscriptionSuccessEmail = async (params: {
    toEmail: string;
    fullName: string;
    packageName: string;
    orderCode: string;
    amountVnd: number;
    durationDays: number;
    expiresAt: string;
}) => {
    const { toEmail, ...templateParams } = params;
    try {
        const data = await resend.emails.send({
            from: SENDERS.BILLING,
            to: toEmail,
            subject: `[LexiCore] Xác nhận thanh toán thành công gói ${params.packageName}`,
            html: subscriptionSuccessTemplate(templateParams),
        });
        console.log(`[Email] Gửi xác nhận thanh toán thành công đến ${toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Lỗi khi gửi xác nhận thanh toán đến ${toEmail}:`, error);
        return { error };
    }
};

export const sendSubscriptionExpiryEmail = async (params: {
    toEmail: string;
    fullName: string;
    packageName: string;
    expiresAt: string;
}) => {
    const { toEmail, ...templateParams } = params;
    try {
        const data = await resend.emails.send({
            from: SENDERS.BILLING,
            to: toEmail,
            subject: `[LexiCore] Gói hội viên ${params.packageName} của bạn sắp hết hạn`,
            html: subscriptionExpiryTemplate(templateParams),
        });
        console.log(`[Email] Gửi nhắc hết hạn thành công đến ${toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Lỗi khi gửi nhắc hết hạn đến ${toEmail}:`, error);
        return { error };
    }
};

export const sendAutoRenewFailedEmail = async (params: {
    toEmail: string;
    fullName: string;
    packageName: string;
    priceVnd: number;
    walletBalance: number;
}) => {
    const { toEmail, ...templateParams } = params;
    try {
        const data = await resend.emails.send({
            from: SENDERS.BILLING,
            to: toEmail,
            subject: `[LexiCore] Không thể tự động gia hạn gói ${params.packageName} do số dư ví không đủ`,
            html: autoRenewFailedTemplate(templateParams),
        });
        console.log(`[Email] Gửi cảnh báo gia hạn thất bại đến ${toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Lỗi khi gửi cảnh báo gia hạn thất bại đến ${toEmail}:`, error);
        return { error };
    }
};

// ============================================================
// Reminder
// ============================================================

export const sendStudyReminderEmail = async (params: {
    toEmail: string;
    fullName: string;
    streakCount: number;
    reminderTime: string;
}) => {
    const { toEmail, ...templateParams } = params;
    try {
        if (!process.env.RESEND_API_KEY) {
            console.log(`[Email Mock] Nhắc học tập đến ${toEmail} (${params.fullName}) lúc ${params.reminderTime}. Streak: ${params.streakCount} ngày.`);
            return { id: 'mock-email-id', mock: true };
        }
        const data = await resend.emails.send({
            from: SENDERS.REMINDER,
            to: toEmail,
            subject: '[LexiCore] Đã đến giờ học từ vựng hôm nay!',
            html: studyReminderTemplate(templateParams),
        });
        console.log(`[Email] Gửi nhắc học tập thành công đến ${toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Lỗi khi gửi nhắc học tập đến ${toEmail}:`, error);
        return { error };
    }
};
