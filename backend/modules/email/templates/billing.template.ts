// Template email liên quan đến thanh toán và gói hội viên

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
    const formattedAmount = amountVnd.toLocaleString('vi-VN') + 'd';
    const formattedDate = new Date(expiresAt).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px;">LexiCore</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Xac nhan thanh toan</p>
    </div>
    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a; margin-bottom: 20px;">
        <h2 style="color: #15803d; font-size: 18px; margin-top: 0;">Thanh toan thanh cong!</h2>
        <p style="color: #334155; font-size: 15px;">Chao ${fullName || 'ban'},</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Giao dich dang ky goi hoi vien <strong>${packageName}</strong> cua ban da duoc kich hoat thanh cong tren he thong LexiCore.
        </p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 4px; color: #64748b;">Ma don hang</td>
            <td style="padding: 10px 4px; font-weight: bold; text-align: right;">${orderCode}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 4px; color: #64748b;">Goi dich vu</td>
            <td style="padding: 10px 4px; font-weight: bold; text-align: right;">${packageName} (${durationDays} ngay)</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 4px; color: #64748b;">So tien da thanh toan</td>
            <td style="padding: 10px 4px; font-weight: bold; text-align: right; color: #16a34a;">${formattedAmount}</td>
        </tr>
        <tr>
            <td style="padding: 10px 4px; color: #64748b;">Han su dung den</td>
            <td style="padding: 10px 4px; font-weight: bold; text-align: right;">${formattedDate}</td>
        </tr>
    </table>
    <div style="text-align: center; margin: 28px 0;">
        <a href="${clientUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
            Bat dau hoc ngay
        </a>
    </div>
    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        Cam on ban da su dung LexiCore. Email nay la bien lai tu dong, vui long khong tra loi.
    </p>
</div>
`;
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
    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px;">LexiCore</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Thong bao goi dich vu</p>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Chao ${fullName || 'ban'},</h2>
        <p style="color: #334155; line-height: 1.6; font-size: 15px;">
            Goi hoi vien <strong>${packageName}</strong> cua ban tai LexiCore se het han vao ngay <strong>${formattedDate}</strong> (con 3 ngay nua).
        </p>
        <p style="color: #334155; line-height: 1.6; font-size: 15px;">
            De khong bi gian doan cac dac quyen hoc tap khong gioi han (AI Voice, kiem tra phat am, mo khoa toan bo tu vung Arena), ban co the gia han bat cu luc nao.
        </p>
    </div>
    <div style="text-align: center; margin: 28px 0;">
        <a href="${clientUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
            Gia han goi hoi vien ngay
        </a>
    </div>
    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        Ban nhan duoc email nay vi da bat tuy chon "Nhac nho qua email" trong muc quan ly Goi Hoi vien cua LexiCore.
    </p>
</div>
`;
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
    const priceFormatted = priceVnd.toLocaleString('vi-VN') + 'd';
    const balanceFormatted = walletBalance.toLocaleString('vi-VN') + 'd';
    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px;">LexiCore</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Thong bao gia han goi dich vu</p>
    </div>
    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 20px;">
        <h2 style="color: #991b1b; font-size: 17px; margin-top: 0;">Gia han tu dong khong thanh cong</h2>
        <p style="color: #334155; line-height: 1.6; font-size: 14px;">Chao <strong>${fullName || 'ban'}</strong>,</p>
        <p style="color: #334155; line-height: 1.6; font-size: 14px;">
            He thong vua co gang thuc hien tu dong gia han goi hoi vien <strong>${packageName}</strong> cho ban voi muc phi <strong>${priceFormatted}</strong>,
            tuy nhien so du Vi LexiCore hien tai cua ban (<strong>${balanceFormatted}</strong>) khong du de thanh toan.
        </p>
        <p style="color: #b91c1c; line-height: 1.6; font-size: 14px; font-weight: bold; margin-top: 12px;">
            He thong da tu dong tat tinh nang tu dong gia han tren tai khoan cua ban de tranh phat sinh loi lap lai.
        </p>
    </div>
    <div style="background-color: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; color: #475569;">
        <p style="margin: 0 0 6px 0;"><strong>Trang thai tai khoan:</strong> Goi cuoc cua ban se chuyen ve hang Mien phi (Free) khi het han.</p>
        <p style="margin: 0;">Ban co the nap them tien vao Vi LexiCore va bat lai tinh nang nay, hoac chu dong gia han goi bat cu luc nao de duy tri dac quyen hoc tap.</p>
    </div>
    <div style="text-align: center; margin: 28px 0;">
        <a href="${clientUrl}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
            Nap tien Vi LexiCore ngay
        </a>
    </div>
    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        Email tu dong tu he thong quan ly Goi Hoi vien LexiCore. Vui long khong tra loi email nay.
    </p>
</div>
`;
};
