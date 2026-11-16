// Template email nhac nho hoc tap va giu chuoi Streak
import { emailLayout } from './layout.template';

const clientUrl = process.env.CLIENT_URL || 'https://lexicore.site';

export const studyReminderTemplate = ({
    fullName,
    streakCount,
    reminderTime,
}: {
    fullName: string;
    streakCount: number;
    reminderTime: string;
}) => {
    const bodyHtml = `
<div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
    <h2 style="color: #1e293b; font-size: 18px; font-weight: 700; margin: 0 0 8px 0;">Chao ${fullName || 'ban'},</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
        Da den gio ren luyen phan xa tieng Anh theo khung gio ban da cai dat (<strong>${reminderTime}</strong>).
    </p>

    <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin: 16px 0;">
        <span style="color: #92400e; font-weight: 700; font-size: 14px;">
            Chuoi hoc tap hien tai: ${streakCount} ngay lien tiep!
        </span>
        <p style="color: #b45309; font-size: 12px; margin: 4px 0 0 0;">
            Dung de bi dut chuoi hom nay nhe, chi can 10-15 phut luyen tap de giu vung phong do!
        </p>
    </div>

    <p style="color: #475569; font-size: 13px; line-height: 1.6; margin: 0;">
        Cac the tu vung SRS va phong luyen Shadowing AI da san sang de ban chinh phuc.
    </p>
</div>

<div style="text-align: center; margin: 28px 0 12px 0;">
    <a href="${clientUrl}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
        Vao hoc ngay bay gio
    </a>
</div>
`;

    return emailLayout({
        title: 'Da den gio hoc tu vung cung LexiCore!',
        badgeText: 'Loi nhac hoc tap',
        badgeColor: '#fef3c7',
        badgeTextColor: '#92400e',
        bodyHtml,
    });
};
