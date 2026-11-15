// Template email nhac nho hoc tap va giu chuoi Streak

const clientUrl = process.env.CLIENT_URL || 'https://lexicore.site';

export const studyReminderTemplate = ({
    fullName,
    streakCount,
    reminderTime,
}: {
    fullName: string;
    streakCount: number;
    reminderTime: string;
}) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px;">LexiCore</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Learn smarter, remember longer</p>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Chao ${fullName || 'ban'},</h2>
        <p style="color: #334155; line-height: 1.6; font-size: 15px;">
            Day la thong bao nhac nho hoc tap theo khung gio ban da cai dat (<strong>${reminderTime}</strong>).
        </p>
        <div style="background: #fef3c7; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 16px 0;">
            <span style="color: #92400e; font-weight: bold; font-size: 14px;">
                Chuoi hoc tap hien tai: ${streakCount} ngay lien tiep! Dung de bi dut chuoi hom nay nhe!
            </span>
        </div>
        <p style="color: #334155; line-height: 1.6; font-size: 14px;">
            Chi can 10-15 phut on luyen flashcard SRS hoac luyen nghe Shadowing moi ngay de duy tri phan xa tieng Anh vuot troi.
        </p>
    </div>
    <div style="text-align: center; margin: 28px 0;">
        <a href="${clientUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
            Vao hoc ngay bay gio
        </a>
    </div>
    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        Ban nhan duoc email nay vi da bat tinh nang Nhac nho qua Email trong phan Cai dat tai khoan LexiCore.
    </p>
</div>
`;
