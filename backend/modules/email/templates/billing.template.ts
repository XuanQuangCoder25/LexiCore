// Template email lien quan den thanh toan va goi hoi vien
import { emailLayout } from './layout.template';

const clientUrl = process.env.CLIENT_URL || 'https://lexicore.site';

// Email xac nhan thanh toan thanh cong goi hoi vien
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
    const formattedAmount = amountVnd.toLocaleString('vi-VN') + ' d';
    const formattedDate = new Date(expiresAt).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });

    const bodyHtml = `
<div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; border-left: 4px solid #16a34a; margin-bottom: 24px;">
    <h2 style="color: #15803d; font-size: 19px; font-weight: 700; margin: 0 0 6px 0;">Thanh toan thanh cong!</h2>
    <p style="color: #334155; font-size: 14px; margin: 0; line-height: 1.6;">
        Chao <strong>${fullName || 'ban'}</strong>, giao dich nang cap goi hoi vien <strong>${packageName}</strong> cua ban da duoc kich hoat thanh cong tren he thong LexiCore.
    </p>
</div>

<p style="color: #1e293b; font-size: 14px; font-weight: 700; margin: 0 0 10px 0;">Chi tiet giao dich:</p>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 4px; color: #64748b;">Ma don hang</td>
        <td style="padding: 10px 4px; font-weight: 700; text-align: right; font-family: monospace; color: #0f172a;">${orderCode}</td>
    </tr>
    <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 4px; color: #64748b;">Goi dich vu</td>
        <td style="padding: 10px 4px; font-weight: 700; text-align: right; color: #0f172a;">${packageName} (${durationDays} ngay)</td>
    </tr>
    <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 4px; color: #64748b;">So tien thanh toan</td>
        <td style="padding: 10px 4px; font-weight: 800; text-align: right; color: #16a34a; font-size: 16px;">${formattedAmount}</td>
    </tr>
    <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 4px; color: #64748b;">Phuong thuc</td>
        <td style="padding: 10px 4px; font-weight: 600; text-align: right; color: #0f172a;">Chuyen khoan VietQR (SePay)</td>
    </tr>
    <tr>
        <td style="padding: 10px 4px; color: #64748b;">Han su dung den</td>
        <td style="padding: 10px 4px; font-weight: 700; text-align: right; color: #0f172a;">${formattedDate}</td>
    </tr>
</table>

<div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px;">
    <p style="color: #6b21a8; font-size: 13px; font-weight: 600; margin: 0 0 4px 0;">Dac quyen cua ban da duoc mo khoa:</p>
    <p style="color: #475569; font-size: 12px; margin: 0; line-height: 1.5;">
        Khong gioi han phong luyen Shadowing AI, cham diem phat am chi tiet, va toan quyen truy cap tat ca bo tu vung doc quyen.
    </p>
</div>

<div style="text-align: center; margin: 28px 0 12px 0;">
    <a href="${clientUrl}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
        Vao hoc ngay bay gio
    </a>
</div>
`;

    return emailLayout({
        title: `Xac nhan thanh toan thanh cong goi ${packageName}`,
        badgeText: 'Bien lai thanh toan',
        badgeColor: '#dcfce7',
        badgeTextColor: '#15803d',
        bodyHtml,
    });
};

// Email nhac goi hoi vien sap het han (3 ngay truoc)
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
<div style="background-color: #fffbeb; padding: 20px; border-radius: 12px; border-left: 4px solid #f59e0b; margin-bottom: 24px;">
    <h2 style="color: #b45309; font-size: 19px; font-weight: 700; margin: 0 0 6px 0;">Thong bao het han goi hoi vien</h2>
    <p style="color: #334155; font-size: 14px; margin: 0; line-height: 1.6;">
        Chao <strong>${fullName || 'ban'}</strong>, goi hoi vien <strong>${packageName}</strong> cua ban tai LexiCore se het han vao ngay <strong>${formattedDate}</strong> (con 3 ngay nua).
    </p>
</div>

<p style="color: #334155; line-height: 1.6; font-size: 14px; margin-bottom: 20px;">
    De khong bi gian doan cac dac quyen hoc tap khong gioi han (AI Voice, kiem tra phat am, mo khoa toan bo tu vung Arena), ban co the chu dong gia han goi bat cu luc nao.
</p>

<div style="text-align: center; margin: 28px 0 12px 0;">
    <a href="${clientUrl}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
        Gia han goi hoi vien ngay
    </a>
</div>
`;

    return emailLayout({
        title: `Goi hoi vien ${packageName} cua ban sap het han`,
        badgeText: 'Nhac nho dich vu',
        badgeColor: '#fef3c7',
        badgeTextColor: '#92400e',
        bodyHtml,
    });
};

// Email canh bao tu dong gia han that bai do so du vi khong du
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
    const priceFormatted = priceVnd.toLocaleString('vi-VN') + ' d';
    const balanceFormatted = walletBalance.toLocaleString('vi-VN') + ' d';

    const bodyHtml = `
<div style="background-color: #fef2f2; padding: 20px; border-radius: 12px; border-left: 4px solid #ef4444; margin-bottom: 24px;">
    <h2 style="color: #991b1b; font-size: 18px; font-weight: 700; margin: 0 0 6px 0;">Gia han tu dong khong thanh cong</h2>
    <p style="color: #334155; line-height: 1.6; font-size: 14px; margin: 0;">Chao <strong>${fullName || 'ban'}</strong>,</p>
    <p style="color: #334155; line-height: 1.6; font-size: 14px; margin: 8px 0 0 0;">
        He thong da co gang thuc hien tu dong gia han goi <strong>${packageName}</strong> voi muc phi <strong>${priceFormatted}</strong>, tuy nhien so du Vi LexiCore hien tai cua ban (<strong>${balanceFormatted}</strong>) khong du de thanh toan.
    </p>
    <p style="color: #b91c1c; line-height: 1.6; font-size: 13px; font-weight: 700; margin: 10px 0 0 0;">
        He thong da tu dong tat tinh nang tu dong gia han tren tai khoan cua ban de tranh phat sinh loi lap lai.
    </p>
</div>

<div style="background-color: #f8fafc; padding: 16px 20px; border-radius: 10px; margin-bottom: 24px; font-size: 13px; color: #475569; border: 1px solid #e2e8f0;">
    <p style="margin: 0 0 6px 0;"><strong>Trang thai tai khoan:</strong> Goi cuoc cua ban se chuyen ve hang Mien phi (Free) khi den han.</p>
    <p style="margin: 0;">Ban co the nap them tien vao Vi LexiCore va bat lai tinh nang nay bat cu luc nao.</p>
</div>

<div style="text-align: center; margin: 28px 0 12px 0;">
    <a href="${clientUrl}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
        Nap tien Vi LexiCore ngay
    </a>
</div>
`;

    return emailLayout({
        title: `Tu dong gia han goi ${packageName} that bai`,
        badgeText: 'Canh bao gia han',
        badgeColor: '#fee2e2',
        badgeTextColor: '#991b1b',
        bodyHtml,
    });
};
