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