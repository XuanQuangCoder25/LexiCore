import dotenv from 'dotenv';
dotenv.config();

import { Resend } from 'resend';
import {
    otpTemplate,
    OtpEmailType,
    accountActivatedTemplate,
    userBannedTemplate,
} from './templates/auth.template';
import {
    creatorApprovedTemplate,
    creatorRejectedTemplate,
    creatorSuspendedTemplate,
} from './templates/creator.template';
import {
    subscriptionSuccessTemplate,
    subscriptionExpiryTemplate,
    autoRenewFailedTemplate,
} from './templates/billing.template';
import { studyReminderTemplate } from './templates/reminder.template';

const resend = new Resend(process.env.RESEND_API_KEY);

// Danh sách địa chỉ gửi theo từng phân hệ (chỉ hoạt động sau khi verify domain trên Resend)
const SENDERS = {
    AUTH: process.env.EMAIL_FROM_AUTH || process.env.EMAIL_FROM || 'LexiCore Account <onboarding@resend.dev>',
    BILLING: process.env.EMAIL_FROM_BILLING || process.env.EMAIL_FROM || 'LexiCore Billing <onboarding@resend.dev>',
    REMINDER: process.env.EMAIL_FROM_REMINDER || process.env.EMAIL_FROM || 'LexiCore Reminder <onboarding@resend.dev>',
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
            ? 'Yêu cầu đặt lại mật khẩu'
            : 'Mã xác thực tài khoản của bạn';

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

export const sendAccountActivatedEmail = async (params: {
    toEmail: string;
    fullName: string;
}) => {
    try {
        const data = await resend.emails.send({
            from: SENDERS.AUTH,
            to: params.toEmail,
            subject: 'Chào mừng bạn đến với LexiCore - Tài khoản đã kích hoạt',
            html: accountActivatedTemplate({ fullName: params.fullName }),
        });
        console.log(`[Email] Gửi thông báo kích hoạt tài khoản thành công đến ${params.toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Lỗi khi gửi thông báo kích hoạt đến ${params.toEmail}:`, error);
        return { error };
    }
};

export const sendUserBannedEmail = async (params: {
    toEmail: string;
    fullName: string;
    reason?: string;
}) => {
    try {
        const data = await resend.emails.send({
            from: SENDERS.AUTH,
            to: params.toEmail,
            subject: 'Thông báo khóa tài khoản người dùng LexiCore',
            html: userBannedTemplate({ fullName: params.fullName, reason: params.reason }),
        });
        console.log(`[Email] Gửi thông báo khóa tài khoản đến ${params.toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Lỗi khi gửi thông báo khóa tài khoản đến ${params.toEmail}:`, error);
        return { error };
    }
};

// ============================================================
// Creator
// ============================================================

export const sendCreatorApprovedEmail = async (params: {
    toEmail: string;
    fullName: string;
}) => {
    try {
        const data = await resend.emails.send({
            from: SENDERS.AUTH,
            to: params.toEmail,
            subject: 'Chúc mừng bạn đã trở thành Content Creator tại LexiCore',
            html: creatorApprovedTemplate({ fullName: params.fullName }),
        });
        console.log(`[Email] Gửi thông báo duyệt Creator đến ${params.toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Lỗi khi gửi thông báo duyệt Creator đến ${params.toEmail}:`, error);
        return { error };
    }
};

export const sendCreatorRejectedEmail = async (params: {
    toEmail: string;
    fullName: string;
    adminNote: string;
}) => {
    try {
        const data = await resend.emails.send({
            from: SENDERS.AUTH,
            to: params.toEmail,
            subject: 'Thông báo kết quả xét duyệt đơn Content Creator',
            html: creatorRejectedTemplate({
                fullName: params.fullName,
                adminNote: params.adminNote,
            }),
        });
        console.log(`[Email] Gửi thông báo từ chối Creator đến ${params.toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Lỗi khi gửi thông báo từ chối Creator đến ${params.toEmail}:`, error);
        return { error };
    }
};

export const sendCreatorSuspendedEmail = async (params: {
    toEmail: string;
    fullName: string;
    reason?: string;
}) => {
    try {
        const data = await resend.emails.send({
            from: SENDERS.AUTH,
            to: params.toEmail,
            subject: 'Thông báo tạm đình chỉ quyền Content Creator trên LexiCore',
            html: creatorSuspendedTemplate({
                fullName: params.fullName,
                reason: params.reason,
            }),
        });
        console.log(`[Email] Gửi thông báo đình chỉ Creator đến ${params.toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Lỗi khi gửi thông báo đình chỉ Creator đến ${params.toEmail}:`, error);
        return { error };
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
            subject: `Xác nhận thanh toán thành công gói ${params.packageName}`,
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
            subject: `Gói hội viên ${params.packageName} của bạn sắp hết hạn`,
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
            subject: `Không thể tự động gia hạn gói ${params.packageName} do số dư ví không đủ`,
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
            subject: 'Đã đến giờ học từ vựng hôm nay!',
            html: studyReminderTemplate(templateParams),
        });
        console.log(`[Email] Gửi nhắc học tập thành công đến ${toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Lỗi khi gửi nhắc học tập đến ${toEmail}:`, error);
        return { error };
    }
};
