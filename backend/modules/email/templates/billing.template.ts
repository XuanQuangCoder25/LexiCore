// Template email liên quan đến thanh toán và gói hội viên (Phong cách Clean SaaS)
import { emailLayout } from './layout.template';

const clientUrl = process.env.CLIENT_URL || 'https://lexicore.site';

// Email xác nhận thanh toán thành công gói hội viên
export const subscriptionSuccessTemplate = ({
    fullName,
    packageName,
    orderCode,
    amountVnd,
    durationDays,
    expiresAt,
}: {
    fullName: string;
    packageName: string;
    orderCode: string;
    amountVnd: number;
    durationDays: number;
    expiresAt: string;
}) => {
    const formattedAmount = `${amountVnd.toLocaleString('vi-VN')} ₫`;
    const formattedDate = new Date(expiresAt).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });

    const bodyHtml = `
<h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0; letter-spacing: -0.5px;">
    Thanh toán thành công!
</h1>

<p style="color: #475569; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
    Chào <strong>${fullName || 'bạn'}</strong>, giao dịch nâng cấp gói hội viên của bạn đã được hệ thống kích hoạt thành công. Dưới đây là thông tin chi tiết đơn hàng của bạn:
</p>

<!-- BẢNG CHI TIẾT ĐƠN HÀNG (Phong cách phẳng, tối giản) -->
<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; background-color: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
    <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 16px; color: #64748b; font-weight: 500;">Mã đơn hàng</td>
        <td style="padding: 12px 16px; font-weight: 700; text-align: right; font-family: monospace; color: #0f172a;">${orderCode}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 16px; color: #64748b; font-weight: 500;">Gói dịch vụ</td>
        <td style="padding: 12px 16px; font-weight: 700; text-align: right; color: #0f172a;">${packageName} (${durationDays} ngày)</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 16px; color: #64748b; font-weight: 500;">Số tiền thanh toán</td>
        <td style="padding: 12px 16px; font-weight: 800; text-align: right; color: #16a34a; font-size: 15px;">${formattedAmount}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 16px; color: #64748b; font-weight: 500;">Phương thức</td>
        <td style="padding: 12px 16px; font-weight: 600; text-align: right; color: #0f172a;">Chuyển khoản VietQR (SePay)</td>
    </tr>
    <tr>
        <td style="padding: 12px 16px; color: #64748b; font-weight: 500;">Hạn sử dụng đến</td>
        <td style="padding: 12px 16px; font-weight: 700; text-align: right; color: #0f172a;">${formattedDate}</td>
    </tr>
</table>

<p style="color: #475569; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">
    Toàn bộ đặc quyền học tập không giới hạn (AI Voice, kiểm tra phát âm chi tiết, mở khóa tất cả các bộ từ vựng Arena) đã sẵn sàng để bạn trải nghiệm.
</p>

<div style="margin: 0 0 8px 0;">
    <a href="${clientUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
        Vào học ngay bây giờ
    </a>
</div>
`;

    return emailLayout({
        title: `Xác nhận thanh toán thành công gói ${packageName}`,
        badgeText: 'Hóa đơn',
        badgeColor: '#ecfdf5',
        badgeTextColor: '#047857',
        bodyHtml,
    });
};

// Email nhắc gói hội viên sắp hết hạn (3 ngày trước)
export const subscriptionExpiryTemplate = ({
    fullName,
    packageName,
    expiresAt,
}: {
    fullName: string;
    packageName: string;
    expiresAt: string;
}) => {
    const formattedDate = new Date(expiresAt).toLocaleDateString('vi-VN');

    const bodyHtml = `
<h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0; letter-spacing: -0.5px;">
    Gói hội viên sắp hết hạn
</h1>

<p style="color: #475569; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
    Chào <strong>${fullName || 'bạn'}</strong>, gói hội viên <strong>${packageName}</strong> của bạn tại LexiCore sẽ hết hạn vào ngày <strong>${formattedDate}</strong> (còn 3 ngày nữa).
</p>

<p style="color: #475569; line-height: 1.6; font-size: 14px; margin: 0 0 24px 0;">
    Để không bị gián đoạn các đặc quyền học tập không giới hạn, bạn có thể chủ động gia hạn gói bất cứ lúc nào.
</p>

<div style="margin: 0 0 8px 0;">
    <a href="${clientUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
        Gia hạn gói hội viên ngay
    </a>
</div>
`;

    return emailLayout({
        title: `Gói hội viên ${packageName} của bạn sắp hết hạn`,
        badgeText: 'Nhắc nhở',
        badgeColor: '#fffbeb',
        badgeTextColor: '#b45309',
        bodyHtml,
    });
};

// Email cảnh báo tự động gia hạn thất bại do số dư ví không đủ
export const autoRenewFailedTemplate = ({
    fullName,
    packageName,
    priceVnd,
    walletBalance,
}: {
    fullName: string;
    packageName: string;
    priceVnd: number;
    walletBalance: number;
}) => {
    const priceFormatted = `${priceVnd.toLocaleString('vi-VN')} ₫`;
    const balanceFormatted = `${walletBalance.toLocaleString('vi-VN')} ₫`;

    const bodyHtml = `
<h1 style="font-size: 22px; font-weight: 800; color: #991b1b; margin: 0 0 14px 0; letter-spacing: -0.5px;">
    Gia hạn tự động không thành công
</h1>

<p style="color: #475569; line-height: 1.6; font-size: 14px; margin: 0 0 12px 0;">Chào <strong>${fullName || 'bạn'}</strong>,</p>

<p style="color: #475569; line-height: 1.6; font-size: 14px; margin: 0 0 16px 0;">
    Hệ thống đã cố gắng thực hiện tự động gia hạn gói <strong>${packageName}</strong> với mức phí <strong>${priceFormatted}</strong>, tuy nhiên số dư Ví LexiCore hiện tại của bạn (<strong>${balanceFormatted}</strong>) không đủ để thanh toán.
</p>

<div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; font-size: 13px; color: #991b1b; line-height: 1.5;">
    Hệ thống đã tự động tắt tính năng tự động gia hạn trên tài khoản của bạn để tránh phát sinh lỗi lặp lại. Gói cước sẽ chuyển về hạng Miễn phí (Free) khi đến hạn.
</div>

<div style="margin: 0 0 8px 0;">
    <a href="${clientUrl}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
        Nạp tiền Ví LexiCore ngay
    </a>
</div>
`;

    return emailLayout({
        title: `Tự động gia hạn gói ${packageName} thất bại`,
        badgeText: 'Cảnh báo',
        badgeColor: '#fef2f2',
        badgeTextColor: '#dc2626',
        bodyHtml,
    });
};
