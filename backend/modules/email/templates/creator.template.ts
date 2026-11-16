// Template email liên quan đến hồ sơ và tài khoản Content Creator (Phong cách Clean SaaS)
import { emailLayout } from './layout.template';

const clientUrl = process.env.CLIENT_URL || 'https://lexicore.site';

// 1. Template email duyệt đơn đăng ký Content Creator thành công
export const creatorApprovedTemplate = ({ fullName }: { fullName: string }) => {
    const bodyHtml = `
<h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0; letter-spacing: -0.5px;">
    Chúc mừng bạn đã trở thành Content Creator!
</h1>

<p style="color: #475569; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
    Xin chào <strong>${fullName || 'bạn'}</strong>, ban quản trị LexiCore rất vui mừng thông báo đơn đăng ký trở thành Content Creator của bạn đã được <strong>phê duyệt chính thức</strong>.
</p>

<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
    <p style="color: #15803d; font-size: 14px; font-weight: 700; margin: 0 0 6px 0;">
        Các đặc quyền mới đã được kích hoạt trên tài khoản của bạn:
    </p>
    <ul style="color: #166534; font-size: 13px; margin: 0; padding-left: 18px; line-height: 1.6;">
        <li>Quyền tạo và xuất bản các bộ thẻ từ vựng công khai cho cộng đồng.</li>
        <li>Quyền mở và quản lý phòng học trực tuyến (Arena Room).</li>
        <li>Huy hiệu Creator độc quyền trên hồ sơ cá nhân và bảng xếp hạng.</li>
        <li>Công cụ thống kê lượt học và tương tác nội dung tại Creator Studio.</li>
    </ul>
</div>

<p style="color: #475569; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">
    Hãy truy cập vào Creator Studio để bắt đầu sáng tạo nội dung và lan tỏa kiến thức tiếng Anh đến cộng đồng học viên LexiCore ngay hôm nay!
</p>

<div style="margin: 0 0 8px 0;">
    <a href="${clientUrl}/creator" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
        Truy cập Creator Studio
    </a>
</div>
`;

    return emailLayout({
        title: 'Chúc mừng bạn đã trở thành Content Creator LexiCore',
        badgeText: 'Đã duyệt',
        badgeColor: '#ecfdf5',
        badgeTextColor: '#047857',
        bodyHtml,
    });
};

// 2. Template email từ chối đơn đăng ký Content Creator (kèm lý do adminNote)
export const creatorRejectedTemplate = ({
    fullName,
    adminNote,
}: {
    fullName: string;
    adminNote: string;
}) => {
    const bodyHtml = `
<h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0; letter-spacing: -0.5px;">
    Thông báo kết quả xét duyệt đơn Creator
</h1>

<p style="color: #475569; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
    Xin chào <strong>${fullName || 'bạn'}</strong>, cảm ơn bạn đã quan tâm và nộp đơn ứng tuyển Content Creator tại LexiCore. Sau khi xem xét kỹ lưỡng hồ sơ, ban quản trị rất tiếc chưa thể phê duyệt đơn của bạn tại thời điểm này.
</p>

<!-- LÝ DO TỪ CHỐI TỪ ADMIN -->
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
    <p style="color: #0f172a; font-size: 13px; font-weight: 700; margin: 0 0 6px 0;">
        Nhận xét từ ban quản trị:
    </p>
    <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.6; font-style: italic;">
        "${adminNote}"
    </p>
</div>

<p style="color: #475569; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
    Bạn hoàn toàn có thể hoàn thiện hồ sơ và gửi lại đơn đăng ký mới sau khi đã bổ sung các tiêu chí theo nhận xét trên. Tài khoản học viên của bạn vẫn hoạt động bình thường với đầy đủ các tính năng hiện tại.
</p>

<div style="margin: 0 0 8px 0;">
    <a href="${clientUrl}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
        Quay lại trang chủ LexiCore
    </a>
</div>
`;

    return emailLayout({
        title: 'Thông báo kết quả đơn đăng ký Content Creator',
        badgeText: 'Chưa đạt',
        badgeColor: '#f1f5f9',
        badgeTextColor: '#475569',
        bodyHtml,
    });
};

// 3. Template email đình chỉ tài khoản Creator (SUSPENDED)
export const creatorSuspendedTemplate = ({
    fullName,
    reason,
}: {
    fullName: string;
    reason?: string;
}) => {
    const defaultReason = reason || 'Tạm đình chỉ quyền Content Creator do phát hiện nội dung hoặc hành vi chưa phù hợp với Tiêu chuẩn Sáng tạo của nền tảng.';

    const bodyHtml = `
<h1 style="font-size: 22px; font-weight: 800; color: #991b1b; margin: 0 0 14px 0; letter-spacing: -0.5px;">
    Thông báo tạm đình chỉ quyền Creator
</h1>

<p style="color: #475569; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
    Xin chào <strong>${fullName || 'bạn'}</strong>, ban quản trị LexiCore xin thông báo quyền hạn Content Creator trên tài khoản của bạn hiện đã bị <strong>tạm thời đình chỉ</strong>.
</p>

<div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
    <p style="color: #991b1b; font-size: 13px; font-weight: 700; margin: 0 0 4px 0;">
        Thông tin ghi nhận:
    </p>
    <p style="color: #b91c1c; font-size: 13px; margin: 0; line-height: 1.5;">
        ${defaultReason}
    </p>
</div>

<!-- LƯU Ý PHẠM VI ẢNH HƯỞNG -->
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
    <p style="color: #0f172a; font-size: 13px; font-weight: 700; margin: 0 0 6px 0;">
        Phạm vi áp dụng trên tài khoản của bạn:
    </p>
    <ul style="color: #475569; font-size: 13px; margin: 0; padding-left: 18px; line-height: 1.6;">
        <li>Tạm khóa quyền xuất bản bài học mới và quyền mở phòng học trực tuyến.</li>
        <li>Các bài học và nội dung bạn đã tạo trước đây vẫn được lưu trữ an toàn trong hệ thống.</li>
        <li><strong>Bạn vẫn sử dụng tài khoản để học tập, làm bài kiểm tra và tham gia mọi hoạt động như một học viên bình thường.</strong></li>
    </ul>
</div>

<p style="color: #475569; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
    Nếu bạn cần giải đáp thêm hoặc muốn khiếu nại về quyết định này, vui lòng liên hệ với bộ phận hỗ trợ của chúng tôi để được hỗ trợ kiểm tra và mở lại quyền Creator khi phù hợp.
</p>

<div style="margin: 0 0 8px 0;">
    <a href="mailto:support@lexicore.site" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
        Liên hệ hỗ trợ: support@lexicore.site
    </a>
</div>
`;

    return emailLayout({
        title: 'Thông báo tạm đình chỉ quyền Content Creator',
        badgeText: 'Tạm đình chỉ',
        badgeColor: '#fffbeb',
        badgeTextColor: '#b45309',
        bodyHtml,
    });
};
