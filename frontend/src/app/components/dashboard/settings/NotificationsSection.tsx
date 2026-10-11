import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Bell,
  Clock,
  Mail,
  Smartphone,
  Swords,
  Brain,
  FileCheck2,
  Volume2,
} from "lucide-react";
import { SettingsState } from "./settingsMock";

interface NotificationsSectionProps {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export function NotificationsSection({ settings, updateSetting }: NotificationsSectionProps) {
  return (
    <div className="space-y-6">
      {/* 1. Daily Streak Reminder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <CardTitle className="text-lg">Nhắc nhở chuỗi học (Daily Streak)</CardTitle>
                <CardDescription>
                  Gửi lời nhắc nhở học bài để bạn không bao giờ bị đứt chuỗi ngọn lửa Streak.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.streakReminderEnabled}
              onCheckedChange={(checked) => updateSetting("streakReminderEnabled", checked)}
            />
          </div>
        </CardHeader>
        {settings.streakReminderEnabled && (
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border">
              <div>
                <p className="font-medium text-sm">Thời gian nhắc nhở hàng ngày</p>
                <p className="text-xs text-muted-foreground">Chọn khung giờ rảnh rỗi thuận tiện nhất cho bạn.</p>
              </div>
              <Select
                value={settings.streakReminderTime}
                onValueChange={(val) => updateSetting("streakReminderTime", val)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Chọn giờ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00">08:00 sáng</SelectItem>
                  <SelectItem value="12:00">12:00 trưa</SelectItem>
                  <SelectItem value="19:00">19:00 tối</SelectItem>
                  <SelectItem value="20:00">20:00 tối (Chuẩn)</SelectItem>
                  <SelectItem value="21:00">21:00 tối</SelectItem>
                  <SelectItem value="22:00">22:00 đêm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 2. In-App & Push Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-500" />
            <div>
              <CardTitle className="text-lg">Thông báo trong ứng dụng (In-App Push)</CardTitle>
              <CardDescription>Các thông báo tức thì hiển thị trên trình duyệt và thanh thông báo.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Swords className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <Label className="text-sm font-semibold">Lời mời thách đấu PvP Arena</Label>
                <p className="text-xs text-muted-foreground">Thông báo ngay khi có bạn bè hoặc đối thủ mời bạn đấu từ vựng 1vs1.</p>
              </div>
            </div>
            <Switch
              checked={settings.pushPvPChallenges}
              onCheckedChange={(checked) => updateSetting("pushPvPChallenges", checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
              <div>
                <Label className="text-sm font-semibold">Thẻ Flashcard đến hạn ôn tập</Label>
                <p className="text-xs text-muted-foreground">Báo khi có thẻ nhớ SRS bước vào chu kỳ ôn tập hôm nay.</p>
              </div>
            </div>
            <Switch
              checked={settings.pushDueCards}
              onCheckedChange={(checked) => updateSetting("pushDueCards", checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t">
            <div className="flex items-start gap-3">
              <FileCheck2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <Label className="text-sm font-semibold">Kết quả bài thi & Điểm số</Label>
                <p className="text-xs text-muted-foreground">Nhận thông báo khi đề thi của bạn đã được hệ thống tính điểm xong.</p>
              </div>
            </div>
            <Switch
              checked={settings.pushExamGraded}
              onCheckedChange={(checked) => updateSetting("pushExamGraded", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            <div>
              <CardTitle className="text-lg">Thông báo qua Email</CardTitle>
              <CardDescription>Gửi các báo cáo tổng hợp và cập nhật tới email {settings.email}.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Báo cáo tiến độ học tập hàng tuần</Label>
              <p className="text-xs text-muted-foreground">Gửi email tóm tắt số từ vựng đã thuộc, thời gian học và thứ hạng tuần.</p>
            </div>
            <Switch
              checked={settings.emailWeeklyDigest}
              onCheckedChange={(checked) => updateSetting("emailWeeklyDigest", checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Khóa học mới từ Creator bạn theo dõi</Label>
              <p className="text-xs text-muted-foreground">Nhận tin khi tác giả bạn yêu thích xuất bản thêm bộ thẻ hoặc khóa học mới.</p>
            </div>
            <Switch
              checked={settings.emailNewCourses}
              onCheckedChange={(checked) => updateSetting("emailNewCourses", checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Bản tin khuyến mãi & Sự kiện</Label>
              <p className="text-xs text-muted-foreground">Thông tin các mùa giải PvP Arena, giftcode coin và ưu đãi nâng cấp Pro.</p>
            </div>
            <Switch
              checked={settings.emailPromotions}
              onCheckedChange={(checked) => updateSetting("emailPromotions", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. Sound Effects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-emerald-500" />
              <div>
                <CardTitle className="text-lg">Hiệu ứng âm thanh (Sound FX)</CardTitle>
                <CardDescription>Phát tiếng khi trả lời đúng, nhận coin hoặc chiến thắng trận đấu PvP.</CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.soundEffectsEnabled}
              onCheckedChange={(checked) => updateSetting("soundEffectsEnabled", checked)}
            />
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
