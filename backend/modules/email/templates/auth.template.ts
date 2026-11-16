// Template email xác thực và bảo mật tài khoản (Phong cách Clean SaaS)
import { emailLayout } from './layout.template';

const clientUrl = process.env.CLIENT_URL || 'https://lexicore.site';

export type OtpEmailType = 'REGISTER' | 'FORGOT_PASSWORD';

// 1. Template gửi mã OTP
export const otpTemplate = ({ otp, type = 'REGISTER' }: { otp: string; type?: OtpEmailType }) => {
    const isForgot = type === 'FORGOT_PASSWORD';
    const heading = isForgot ? 'Yêu cầu đặt lại mật khẩu' : 'Xác thực địa chỉ email';
    const description = isForgot
        ? 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản LexiCore của bạn. Sử dụng mã OTP dưới đây để tiến hành đổi mật khẩu mới:'
        : 'Cảm ơn bạn đã tham gia LexiCore! Vui lòng nhập mã xác thực gồm 6 chữ số dưới đây để kích hoạt tài khoản của bạn:';
    const badgeText = isForgot ? 'Bảo mật' : 'Xác thực';

    const bodyHtml = `
<h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0; letter-spacing: -0.5px;">
    ${heading}
</h1>

<p style="color: #475569; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
    ${description}
</p>

<!-- KHUNG MÃ OTP (Phong cách phẳng tối giản, hiện đại) -->
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 16px; margin: 0 0 20px 0; text-align: center;">
    <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4338ca; font-family: monospace;">
        ${otp}
    </div>
    <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0; font-weight: 500;">
        Mã này có hiệu lực trong vòng 5 phút
    </p>
</div>

<p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
    <strong>Lưu ý an toàn:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email và tài khoản của bạn vẫn được an toàn.
</p>
`;

    return emailLayout({
        title: isForgot ? 'Đặt lại mật khẩu LexiCore' : 'Mã xác thực LexiCore của bạn',
        badgeText,
        badgeColor: isForgot ? '#fffbeb' : '#f1f5f9',
        badgeTextColor: isForgot ? '#b45309' : '#475569',
        bodyHtml,
    });
};

// 2. Template email thông báo tài khoản đã được kích hoạt thành công
export const accountActivatedTemplate = ({ fullName }: { fullName: string }) => {
    const bodyHtml = `
<h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0; letter-spacing: -0.5px;">
    Chào mừng bạn đến với LexiCore!
</h1>

<p style="color: #475569; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
    Xin chào <strong>${fullName || 'bạn'}</strong>, tài khoản LexiCore của bạn đã được kích hoạt thành công.
</p>

<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
    <p style="color: #15803d; font-size: 14px; font-weight: 700; margin: 0 0 6px 0;">
        Món quà chào mừng dành riêng cho bạn
    </p>
    <p style="color: #166534; font-size: 13px; margin: 0; line-height: 1.5;">
        Bạn được tặng ngay <strong>3 ngày trải nghiệm miễn phí gói Pro</strong> với toàn bộ tính năng cao cấp: AI Voice nhận diện giọng nói, phản hồi AI không giới hạn và phân tích lộ trình học tập chuyên sâu.
    </p>
</div>

<p style="color: #475569; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">
    Hãy bắt đầu buổi học đầu tiên ngay hôm nay để duy trì chuỗi học tập (Streak) và xây dựng vốn từ vựng phản xạ vượt trội mỗi ngày.
</p>

<div style="margin: 0 0 8px 0;">
    <a href="${clientUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
        Bắt đầu học ngay
    </a>
</div>
`;

    return emailLayout({
        title: 'Tài khoản LexiCore của bạn đã được kích hoạt',
        badgeText: 'Thành công',
        badgeColor: '#ecfdf5',
        badgeTextColor: '#047857',
        bodyHtml,
    });
};

// 3. Template email thông báo tài khoản bị khóa (BANNED)
export const userBannedTemplate = ({
    fullName,
    reason,
}: {
    fullName: string;
    reason?: string;
}) => {
    const defaultReason = reason || 'Vi phạm Tiêu chuẩn Cộng đồng hoặc Điều khoản Sử dụng của nền tảng LexiCore.';

    const bodyHtml = `
<h1 style="font-size: 22px; font-weight: 800; color: #991b1b; margin: 0 0 14px 0; letter-spacing: -0.5px;">
    Thông báo khóa tài khoản
</h1>

<p style="color: #475569; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
    Xin chào <strong>${fullName || 'bạn'}</strong>, hệ thống quản trị LexiCore xin thông báo tài khoản của bạn hiện đã bị khóa quyền truy cập.
</p>

<div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
    <p style="color: #991b1b; font-size: 13px; font-weight: 700; margin: 0 0 4px 0;">
        Lý do ghi nhận từ ban quản trị:
    </p>
    <p style="color: #b91c1c; font-size: 13px; margin: 0; line-height: 1.5;">
        ${defaultReason}
    </p>
</div>

<p style="color: #475569; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
    Trong thời gian tài khoản bị khóa, bạn sẽ không thể đăng nhập hoặc sử dụng các dịch vụ của LexiCore. Nếu bạn cho rằng quyết định này có sự nhầm lẫn, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi để được xem xét lại.
</p>

<div style="margin: 0 0 8px 0;">
    <a href="mailto:support@lexicore.site" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
        Liên hệ hỗ trợ: support@lexicore.site
    </a>
</div>
`;

    return emailLayout({
        title: 'Thông báo khóa tài khoản LexiCore',
        badgeText: 'Đã khóa',
        badgeColor: '#fef2f2',
        badgeTextColor: '#dc2626',
        bodyHtml,
    });
};

// 3. Template email gửi thư trực tiếp từ Admin (cảnh báo, nhắc nhở, thông báo cá nhân)
export const customDirectMessageTemplate = ({
    fullName,
    heading,
    badgeText = 'Thông báo',
    badgeType = 'info',
    message,
    actionText,
    actionUrl,
}: {
    fullName: string;
    heading: string;
    badgeText?: string;
    badgeType?: 'info' | 'warning' | 'danger' | 'success';
    message: string;
    actionText?: string;
    actionUrl?: string;
}) => {
    let badgeColor = '#f1f5f9';
    let badgeTextColor = '#475569';

    if (badgeType === 'warning') {
        badgeColor = '#fffbeb';
        badgeTextColor = '#b45309';
    } else if (badgeType === 'danger') {
        badgeColor = '#fef2f2';
        badgeTextColor = '#dc2626';
    } else if (badgeType === 'success') {
        badgeColor = '#ecfdf5';
        badgeTextColor = '#047857';
    } else if (badgeType === 'info') {
        badgeColor = '#e0e7ff';
        badgeTextColor = '#4338ca';
    }

    // Biến đổi các đoạn văn bản xuống dòng thành thẻ paragraph
    const paragraphsHtml = message
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((p) => `<p style="color: #475569; font-size: 14px; margin: 0 0 14px 0; line-height: 1.6;">${p}</p>`)
        .join('');

    const actionButtonHtml = (actionText && actionUrl)
        ? `
<div style="margin: 20px 0 8px 0;">
    <a href="${actionUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
        ${actionText}
    </a>
</div>
`
        : '';

    const bodyHtml = `
<h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0; letter-spacing: -0.5px;">
    ${heading}
</h1>

<p style="color: #475569; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
    Kính gửi <strong>${fullName || 'bạn'}</strong>,
</p>

${paragraphsHtml}

${actionButtonHtml}
`;

    return emailLayout({
        title: heading,
        badgeText,
        badgeColor,
        badgeTextColor,
        bodyHtml,
    });
};
