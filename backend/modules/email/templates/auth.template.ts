// Template email xac thuc va bao mat tai khoan
import { emailLayout } from './layout.template';

export type OtpEmailType = 'REGISTER' | 'FORGOT_PASSWORD';

export const otpTemplate = ({ otp, type = 'REGISTER' }: { otp: string; type?: OtpEmailType }) => {
    const isForgot = type === 'FORGOT_PASSWORD';
    const heading = isForgot ? 'Yeu cau dat lai mat khau' : 'Xac thuc dia chi email';
    const description = isForgot
        ? 'Chung toi nhan duoc yeu cau dat lai mat khau cho tai khoan LexiCore cua ban. Su dung ma OTP duoi day de tiep tuc:'
        : 'Cam on ban da tham gia LexiCore! Su dung ma OTP duoi day de hoan tat xac thuc tai khoan cua ban.';
    const badgeText = isForgot ? 'Bao mat tai khoan' : 'Xac thuc tai khoan';

    const bodyHtml = `
<div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #1e293b; font-size: 20px; font-weight: 700; margin: 0 0 8px 0;">${heading}</h2>
    <p style="color: #64748b; font-size: 14px; margin: 0; line-height: 1.6;">
        ${description}
    </p>
</div>

<div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px 16px; margin: 20px 0; text-align: center;">
    <p style="color: #475569; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">Ma xac thuc cua ban</p>
    <div style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-size: 34px; font-weight: 800; letter-spacing: 8px; padding: 12px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
        ${otp}
    </div>
    <p style="color: #dc2626; font-size: 12px; font-weight: 600; margin: 12px 0 0 0;">
        Ma co hieu luc trong 5 phut
    </p>
</div>

<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 12px 16px; margin: 20px 0; text-align: left;">
    <p style="color: #1e40af; font-size: 13px; margin: 0; line-height: 1.5;">
        <strong>Luu y bao mat:</strong> Tuyet doi khong chia se ma OTP nay cho bat ky ai, ke ca nhan vien ho tro LexiCore. Neu ban khong yeu cau thao tac nay, vui long bo qua email.
    </p>
</div>
`;

    return emailLayout({
        title: isForgot ? 'Dat lai mat khau LexiCore' : 'Ma xac thuc LexiCore cua ban',
        badgeText,
        badgeColor: isForgot ? '#fef3c7' : '#e0e7ff',
        badgeTextColor: isForgot ? '#92400e' : '#4338ca',
        bodyHtml,
    });
};
