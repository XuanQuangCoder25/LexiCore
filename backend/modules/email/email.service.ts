import { Resend } from 'resend';
import { otpTemplate } from './templates/auth.template';
import {
    subscriptionSuccessTemplate,
    subscriptionExpiryTemplate,
    autoRenewFailedTemplate,
} from './templates/billing.template';
import { studyReminderTemplate } from './templates/reminder.template';

const resend = new Resend(process.env.RESEND_API_KEY);

// Danh sach dia chi gui theo tung phan he (chi hoat dong sau khi verify domain tren Resend)
const SENDERS = {
    AUTH:     process.env.EMAIL_FROM_AUTH     || process.env.EMAIL_FROM || 'LexiCore <onboarding@resend.dev>',
    BILLING:  process.env.EMAIL_FROM_BILLING  || process.env.EMAIL_FROM || 'LexiCore <onboarding@resend.dev>',
    REMINDER: process.env.EMAIL_FROM_REMINDER || process.env.EMAIL_FROM || 'LexiCore <onboarding@resend.dev>',
};

// ============================================================
// Auth
// ============================================================

export const sendOtpEmail = async (toEmail: string, otp: string) => {
    try {
        const data = await resend.emails.send({
            from:    SENDERS.AUTH,
            to:      toEmail,
            subject: 'Ma xac thuc LexiCore cua ban',
            html:    otpTemplate({ otp }),
        });
        console.log('[Email] Gui OTP thanh cong:', data);
        return data;
    } catch (error) {
        console.error('[Email] Loi khi gui OTP:', error);
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
            from:    SENDERS.BILLING,
            to:      toEmail,
            subject: `[LexiCore] Xac nhan thanh toan thanh cong goi ${params.packageName}`,
            html:    subscriptionSuccessTemplate(templateParams),
        });
        console.log(`[Email] Gui xac nhan thanh toan thanh cong den ${toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Loi khi gui xac nhan thanh toan den ${toEmail}:`, error);
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
            from:    SENDERS.BILLING,
            to:      toEmail,
            subject: `Goi hoi vien ${params.packageName} cua ban sap het han`,
            html:    subscriptionExpiryTemplate(templateParams),
        });
        console.log(`[Email] Gui nhac het han thanh cong den ${toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Loi khi gui nhac het han den ${toEmail}:`, error);
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
            from:    SENDERS.BILLING,
            to:      toEmail,
            subject: `[LexiCore] Khong the tu dong gia han goi ${params.packageName} do so du vi khong du`,
            html:    autoRenewFailedTemplate(templateParams),
        });
        console.log(`[Email] Gui canh bao gia han that bai den ${toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Loi khi gui canh bao gia han that bai den ${toEmail}:`, error);
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
            console.log(`[Email Mock] Nhac hoc tap den ${toEmail} (${params.fullName}) luc ${params.reminderTime}. Streak: ${params.streakCount} ngay.`);
            return { id: 'mock-email-id', mock: true };
        }
        const data = await resend.emails.send({
            from:    SENDERS.REMINDER,
            to:      toEmail,
            subject: 'Da den gio hoc tu vung cung LexiCore!',
            html:    studyReminderTemplate(templateParams),
        });
        console.log(`[Email] Gui nhac hoc tap thanh cong den ${toEmail}:`, data);
        return data;
    } catch (error) {
        console.error(`[Email] Loi khi gui nhac hoc tap den ${toEmail}:`, error);
        return { error };
    }
};
