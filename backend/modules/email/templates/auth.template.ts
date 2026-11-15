// Template email xác thực và bảo mật tài khoản

export type OtpEmailType = 'REGISTER' | 'FORGOT_PASSWORD';

export const otpTemplate = ({
    otp,
    type = 'REGISTER',
}: {
    otp: string;
    type?: OtpEmailType;
}) => {
    const isForgotPassword = type === 'FORGOT_PASSWORD';
    const subtitle = isForgotPassword ? 'Dat lai mat khau' : 'Xac thuc tai khoan';
    const description = isForgotPassword
        ? 'Ban vua gui yeu cau dat lai mat khau cho tai khoan LexiCore. Ma OTP xac thuc cua ban la:'
        : 'Chao mung ban den voi LexiCore! Ma OTP de hoan tat dang ky tai khoan cua ban la:';
    const warning = isForgotPassword
        ? 'Neu ban khong yeu cau dat lai mat khau, vui long kiem tra lai bao mat tai khoan hoac bo qua email nay.'
        : 'Neu ban khong yeu cau ma nay, hay bo qua email. Tai khoan cua ban van an toan.';

    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px;">LexiCore</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">${subtitle}</p>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
        <p style="color: #334155; font-size: 15px; margin-top: 0; line-height: 1.5;">${description}</p>
        <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 12px 28px; border-radius: 8px; margin: 12px 0;">
            ${otp}
        </div>
        <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">Ma co hieu luc trong <strong>5 phut</strong>. Vui long khong chia se ma nay cho bat ky ai.</p>
    </div>
    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        ${warning}
    </p>
</div>
`;
};
