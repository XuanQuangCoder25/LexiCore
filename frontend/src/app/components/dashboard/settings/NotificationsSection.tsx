import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
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
  Save,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { SettingsState } from "./settingsMock";
import { notificationService, UserNotificationSettings } from "../../../services/notification-service";

interface NotificationsSectionProps {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export function NotificationsSection({ settings, updateSetting }: NotificationsSectionProps) {
  const [dbSettings, setDbSettings] = useState<UserNotificationSettings>({
    user_id: "",
    enable_email_reminder: true,
    enable_in_app_reminder: true,
    reminder_time: "20:00",
    timezone: "Asia/Ho_Chi_Minh",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch cài đặt nhắc nhở từ Backend
  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const data = await notificationService.getSettings();
        if (isMounted && data) {
          setDbSettings(data);
        }
      } catch (error) {
        console.error("Không thể tải cấu hình thông báo từ server:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // Lưu cài đặt nhắc nhở xuống DB
  const handleSaveReminderSettings = async (partialUpdate?: Partial<UserNotificationSettings>) => {
    const toSave = partialUpdate ? { ...dbSettings, ...partialUpdate } : dbSettings;
    setIsSaving(true);
    try {
      const updated = await notificationService.updateSettings({
        enable_email_reminder: toSave.enable_email_reminder,
        enable_in_app_reminder: toSave.enable_in_app_reminder,
        reminder_time: toSave.reminder_time,
        timezone: toSave.timezone,
      });
      setDbSettings(updated);
      toast.success("Đã cập nhật cài đặt nhắc nhở học tập thành công!", {
        description: `Hệ thống sẽ gửi thông báo vào lúc ${updated.reminder_time} hàng ngày.`,
      });
    } catch (error: any) {
      toast.error(error?.message || "Không thể lưu cài đặt nhắc nhở. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HỆ THỐNG NHẮC NHỞ HỌC TẬP TỰ ĐỘNG (IN-APP & EMAIL) */}
      <Card className="border-primary/20 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -z-10" />
        
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Nhắc nhở học tập (Study Reminders)</CardTitle>
                  <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/20">
                    Background Worker
                  </Badge>
                </div>
                <CardDescription>
                  Tự động quét và nhắc nhở ôn luyện từ vựng hàng ngày để duy trì ngọn lửa Streak.
                </CardDescription>
              </div>
            </div>

            {isLoading && (
              <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin self-end sm:self-auto" />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Channel Toggles (In-App & Email) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kênh In-App */}
            <div className={`p-4 rounded-xl border-2 transition-all flex items-start justify-between gap-3 ${
              dbSettings.enable_in_app_reminder ? "border-primary/40 bg-primary/5" : "border-border bg-card"
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <Label htmlFor="toggle-in-app" className="font-semibold text-sm cursor-pointer">
                    Thông báo trong ứng dụng (In-app)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hiển thị chuông thông báo trên thanh Header và gửi thông báo hệ thống.
                </p>
              </div>
              <Switch
                id="toggle-in-app"
                checked={dbSettings.enable_in_app_reminder}
                onCheckedChange={(checked) => {
                  const updated = { ...dbSettings, enable_in_app_reminder: checked };
                  setDbSettings(updated);
                  handleSaveReminderSettings({ enable_in_app_reminder: checked });
                }}
              />
            </div>

            {/* Kênh Email */}
            <div className={`p-4 rounded-xl border-2 transition-all flex items-start justify-between gap-3 ${
              dbSettings.enable_email_reminder ? "border-indigo-500/40 bg-indigo-500/5" : "border-border bg-card"
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  <Label htmlFor="toggle-email" className="font-semibold text-sm cursor-pointer">
                    Thông báo qua Email
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gửi thư điện tử nhắc nhở cùng thống kê chuỗi Streak tới email tài khoản.
                </p>
              </div>
              <Switch
                id="toggle-email"
                checked={dbSettings.enable_email_reminder}
                onCheckedChange={(checked) => {
                  const updated = { ...dbSettings, enable_email_reminder: checked };
                  setDbSettings(updated);
                  handleSaveReminderSettings({ enable_email_reminder: checked });
                }}
              />
            </div>
          </div>

          {/* Time Picker & Timezone */}
          <div className="p-4 rounded-xl border bg-muted/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Thời gian nhắc nhở hàng ngày (Reminder Time)
                </p>
                <p className="text-xs text-muted-foreground">
                  Chọn khung giờ thuận tiện nhất để Cronjob gửi thông báo đến bạn mỗi ngày.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Time Input trực tiếp */}
                <Input
                  type="time"
                  value={dbSettings.reminder_time}
                  onChange={(e) => {
                    const newTime = e.target.value;
                    setDbSettings((prev) => ({ ...prev, reminder_time: newTime }));
                  }}
                  className="w-32 font-mono font-semibold text-center bg-background"
                />

                {/* Chọn nhanh mốc giờ phổ biến */}
                <Select
                  value={dbSettings.reminder_time}
                  onValueChange={(val) => {
                    const updated = { ...dbSettings, reminder_time: val };
                    setDbSettings(updated);
                    handleSaveReminderSettings({ reminder_time: val });
                  }}
                >
                  <SelectTrigger className="w-36 text-xs bg-background">
                    <SelectValue placeholder="Chọn mốc giờ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="07:00">07:00 sáng</SelectItem>
                    <SelectItem value="08:00">08:00 sáng</SelectItem>
                    <SelectItem value="12:00">12:00 trưa</SelectItem>
                    <SelectItem value="18:00">18:00 chiều</SelectItem>
                    <SelectItem value="20:00">20:00 tối (Khuyên dùng)</SelectItem>
                    <SelectItem value="21:00">21:00 tối</SelectItem>
                    <SelectItem value="22:00">22:00 đêm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t text-xs text-muted-foreground">
              <span>Múi giờ hoạt động: <strong className="text-foreground">{dbSettings.timezone} (UTC+07:00)</strong></span>
              <Button
                size="sm"
                variant="outline"
                disabled={isSaving}
                onClick={() => handleSaveReminderSettings()}
                className="gap-1.5 h-8 text-xs font-semibold self-end sm:self-auto"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? "Đang lưu..." : "Lưu giờ nhắc nhở"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. In-App Other Events Push */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-500" />
            <div>
              <CardTitle className="text-lg">Sự kiện tương tác (In-App Events)</CardTitle>
              <CardDescription>Các sự kiện thi đấu, kết quả bài test và bảng xếp hạng.</CardDescription>
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

      {/* 3. Email Newsletters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            <div>
              <CardTitle className="text-lg">Bản tin định kỳ (Email Newsletters)</CardTitle>
              <CardDescription>Báo cáo thành tích tổng hợp và các ưu đãi học viên.</CardDescription>
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
