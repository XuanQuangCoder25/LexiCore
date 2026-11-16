// Khung Master Layout chuẩn phong cách hiện đại (Clean & Minimalist - giống Upstash / Google)

const clientUrl = process.env.CLIENT_URL || 'https://lexicore.site';

export interface EmailLayoutOptions {
    title: string;          // Tiêu đề email (hiển thị trên tab/header)
    badgeText?: string;     // Nhãn góc phải (ví dụ: HÓA ĐƠN, XÁC THỰC)
    badgeColor?: string;    // Màu nền nhãn
    badgeTextColor?: string;// Màu chữ nhãn
    bodyHtml: string;       // Nội dung HTML chính của email
}

export const emailLayout = ({
    title,
    badgeText,
    badgeColor = '#f1f5f9',
    badgeTextColor = '#475569',
    bodyHtml,
}: EmailLayoutOptions): string => {
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; padding: 24px 12px;">
        <tr>
            <td align="center">
                <!-- KHUNG CHÍNH (Border mỏng, nền trắng phẳng, không lồng màu) -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; text-align: left;">
                    
                    <!-- HEADER (Logo + Tên ở góc trên bên trái theo phong cách Upstash) -->
                    <tr>
                        <td style="padding: 24px 28px 16px 28px; border-bottom: 1px solid #f1f5f9;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="left" style="vertical-align: middle;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="vertical-align: middle; padding-right: 10px;">
                                                    <img src="${clientUrl}/assets/favicon_whale.png" alt="LexiCore Logo" width="28" height="28" style="display: block; border-radius: 6px;" />
                                                </td>
                                                <td style="vertical-align: middle;">
                                                    <span style="font-size: 19px; font-weight: 800; color: #1e1b4b; letter-spacing: -0.5px;">LexiCore</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    ${badgeText ? `
                                    <td align="right" style="vertical-align: middle;">
                                        <span style="display: inline-block; background-color: ${badgeColor}; color: ${badgeTextColor}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 6px;">
                                            ${badgeText}
                                        </span>
                                    </td>
                                    ` : ''}
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- BODY CONTENT (Căn lề trái tự nhiên, chữ to rõ ràng) -->
                    <tr>
                        <td style="padding: 28px 28px 24px 28px; font-size: 14px; line-height: 1.6; color: #334155;">
                            ${bodyHtml}
                        </td>
                    </tr>

                    <!-- FOOTER (Tối giản, chân trang mờ nhẹ thanh lịch) -->
                    <tr>
                        <td style="padding: 20px 28px 24px 28px; border-top: 1px solid #f1f5f9; background-color: #fafafa; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                            <div style="margin-bottom: 10px;">
                                <a href="${clientUrl}" style="color: #6366f1; text-decoration: none; margin-right: 14px; font-weight: 600;">Trang chủ</a>
                                <a href="${clientUrl}" style="color: #6366f1; text-decoration: none; margin-right: 14px; font-weight: 600;">Điều khoản</a>
                                <a href="${clientUrl}" style="color: #6366f1; text-decoration: none; margin-right: 14px; font-weight: 600;">Bảo mật</a>
                                <a href="mailto:support@lexicore.site" style="color: #6366f1; text-decoration: none; font-weight: 600;">Hỗ trợ</a>
                            </div>
                            <p style="margin: 0 0 4px 0; color: #64748b; font-weight: 500;">
                                (c) 2026 LexiCore Education Platform. Tất cả các quyền được bảo lưu.
                            </p>
                            <p style="margin: 0; font-size: 11px;">
                                Bạn nhận được email này vì đã đăng ký tài khoản tại lexicore.site.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};
