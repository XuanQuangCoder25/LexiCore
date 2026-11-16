// Khung Master Layout chuan cho toan bo email cua LexiCore

const clientUrl = process.env.CLIENT_URL || 'https://lexicore.site';

export interface EmailLayoutOptions {
    title: string;          // Tieu de email (hien thi tren tab/header)
    badgeText?: string;     // Nhan phan loai (vi du: Xac thuc, Hoa don, Nhac hoc)
    badgeColor?: string;    // Mau nen nhan
    badgeTextColor?: string;// Mau chu nhan
    bodyHtml: string;       // Noi dung HTML chinh cua email
}

export const emailLayout = ({
    title,
    badgeText,
    badgeColor = '#e0e7ff',
    badgeTextColor = '#4338ca',
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
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    
                    <!-- HEADER -->
                    <tr>
                        <td align="center" style="padding: 32px 24px 20px 24px; background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%); border-bottom: 1px solid #f1f5f9;">
                            <img src="${clientUrl}/assets/logo_lc.png" alt="LexiCore Logo" width="56" height="56" style="display: block; border-radius: 12px; margin: 0 auto 12px auto; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);" />
                            <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #4338ca; letter-spacing: -0.5px;">LexiCore</h1>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500;">Learn smarter, remember longer</p>
                            ${badgeText ? `
                            <div style="margin-top: 14px;">
                                <span style="display: inline-block; background-color: ${badgeColor}; color: ${badgeTextColor}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 14px; border-radius: 9999px;">
                                    ${badgeText}
                                </span>
                            </div>
                            ` : ''}
                        </td>
                    </tr>

                    <!-- BODY CONTENT -->
                    <tr>
                        <td style="padding: 28px 28px 20px 28px;">
                            ${bodyHtml}
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="padding: 24px 28px 32px 28px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #334155;">
                                LexiCore Education Platform
                            </p>
                            <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                                Nen tang hoc tu vung va luyen giao tiep tieng Anh thong minh ung dung AI.
                            </p>
                            <div style="margin: 0 0 16px 0; font-size: 12px;">
                                <a href="${clientUrl}" style="color: #4f46e5; text-decoration: none; margin: 0 8px; font-weight: 600;">Trang chu</a>
                                <span style="color: #cbd5e1;">|</span>
                                <a href="${clientUrl}" style="color: #4f46e5; text-decoration: none; margin: 0 8px; font-weight: 600;">Dieu khoan</a>
                                <span style="color: #cbd5e1;">|</span>
                                <a href="${clientUrl}" style="color: #4f46e5; text-decoration: none; margin: 0 8px; font-weight: 600;">Bao mat</a>
                                <span style="color: #cbd5e1;">|</span>
                                <a href="mailto:support@lexicore.site" style="color: #4f46e5; text-decoration: none; margin: 0 8px; font-weight: 600;">Ho tro</a>
                            </div>
                            <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                                (c) 2026 LexiCore. All rights reserved.<br />
                                Ban nhan duoc email nay vi da dang ky tai khoan tai lexicore.site. Vui long khong tra loi truc tiep email tu dong nay.
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
