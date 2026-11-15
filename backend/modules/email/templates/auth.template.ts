// Template email xác thực và bảo mật tài khoản

export const otpTemplate = ({ otp }: { otp: string }) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px;">LexiCore</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Xác thực tài khoản</p>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
        <p style="color: #334155; font-size: 15px; margin-top: 0;">Mã xác thực OTP của bạn là:</p>
        <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 12px 28px; border-radius: 8px; margin: 8px 0;">
            ${otp}
        </div>
        <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">Mã có hiệu lực trong <strong>5 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
    </div>
    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        Nếu bạn không yêu cầu mã này, hãy bỏ qua email. Tài khoản của bạn vẫn an toàn.
    </p>
</div>
`;
