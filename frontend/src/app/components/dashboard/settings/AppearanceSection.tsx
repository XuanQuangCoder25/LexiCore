import { Sun, Moon, Monitor, Type, Sparkles, Check, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { Badge } from "../../ui/badge";
import { SettingsState } from "./settingsMock";

interface AppearanceSectionProps {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export function AppearanceSection({ settings, updateSetting }: AppearanceSectionProps) {
  const themeOptions: Array<{
    id: "light" | "dark" | "system";
    title: string;
    description: string;
    icon: typeof Sun;
    previewBg: string;
    previewCard: string;
    previewText: string;
  }> = [
    {
      id: "light",
      title: "Giao diện Sáng",
      description: "Thanh lịch, rõ ràng trong môi trường đủ ánh sáng",
      icon: Sun,
      previewBg: "bg-slate-100",
      previewCard: "bg-white border-slate-200",
      previewText: "text-slate-800",
    },
    {
      id: "dark",
      title: "Giao diện Tối",
      description: "Dịu mắt, tiết kiệm pin cho màn hình OLED/ban đêm",
      icon: Moon,
      previewBg: "bg-zinc-950",
      previewCard: "bg-zinc-900 border-zinc-800",
      previewText: "text-zinc-100",
    },
    {
      id: "system",
      title: "Tự động (Hệ thống)",
      description: "Đồng bộ tự động theo cài đặt của thiết bị của bạn",
      icon: Monitor,
      previewBg: "bg-gradient-to-r from-slate-100 to-zinc-900",
      previewCard: "bg-white/80 dark:bg-zinc-900/80 border-slate-300 dark:border-zinc-700",
      previewText: "text-slate-800 dark:text-zinc-100",
    },
  ];

  const fontSizes: Array<{
    id: "small" | "medium" | "large";
    label: string;
    desc: string;
    sizeClass: string;
  }> = [
    { id: "small", label: "Nhỏ (Compact)", desc: "14px - Hiển thị nhiều nội dung hơn", sizeClass: "text-sm" },
    { id: "medium", label: "Tiêu chuẩn (Khuyên dùng)", desc: "16px - Độ cân đối tối ưu cho học tập", sizeClass: "text-base" },
    { id: "large", label: "Lớn (Dễ đọc)", desc: "18px - Chữ to, thoải mái quan sát", sizeClass: "text-lg" },
  ];

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Chủ đề giao diện (Theme)</CardTitle>
              <CardDescription>
                Tùy chỉnh tông màu hiển thị theo sở thích và thói quen học tập của bạn
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = settings.theme === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => updateSetting("theme", opt.id)}
                  className={`group relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                      : "border-border hover:border-border/80 bg-card"
                  }`}
                >
                  {/* Active Badge */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}

                  {/* Header info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`p-2 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{opt.title}</h4>
                      {opt.id === "system" && (
                        <span className="text-[10px] text-muted-foreground font-mono">Sync OS</span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                    {opt.description}
                  </p>

                  {/* Mini UI Preview Box */}
                  <div className={`w-full h-20 rounded-lg p-2.5 flex flex-col justify-between border ${opt.previewBg}`}>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-red-400" />
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className={`p-2 rounded border shadow-xs ${opt.previewCard}`}>
                      <div className="h-2 w-16 bg-primary/40 rounded mb-1" />
                      <div className="h-1.5 w-24 bg-muted-foreground/30 rounded" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Ngôn ngữ ứng dụng (Language)</CardTitle>
              <CardDescription>
                Chọn ngôn ngữ hiển thị giao diện của LexiCore
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => updateSetting("language", "vi")}
              className={`flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                settings.language === "vi"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-border/80 bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇻🇳</span>
                <div>
                  <p className="text-sm font-semibold">Tiếng Việt</p>
                  <p className="text-xs text-muted-foreground">Vietnamese (Mặc định)</p>
                </div>
              </div>
              {settings.language === "vi" && (
                <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => updateSetting("language", "en")}
              className={`flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                settings.language === "en"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-border/80 bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇺🇸</span>
                <div>
                  <p className="text-sm font-semibold">English</p>
                  <p className="text-xs text-muted-foreground">United States</p>
                </div>
              </div>
              {settings.language === "en" && (
                <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Font Size & Live Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Type className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Kích thước chữ (Font Size)</CardTitle>
              <CardDescription>
                Điều chỉnh kích thước font chữ nội dung bài giảng và thẻ flashcard
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {fontSizes.map((f) => {
              const isSelected = settings.fontSize === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => updateSetting("fontSize", f.id)}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border hover:border-border/80 bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{f.label}</span>
                    {isSelected && <Badge variant="default" className="text-[10px] h-4 px-1.5">Active</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Live Preview Sample */}
          <div className="rounded-xl border border-dashed border-border p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Bản xem trước hiển thị mẫu
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {settings.fontSize === "small" ? "14px" : settings.fontSize === "large" ? "18px" : "16px"}
              </span>
            </div>
            <div
              className={`p-4 rounded-lg bg-background border transition-all duration-150 leading-relaxed ${
                settings.fontSize === "small"
                  ? "text-sm"
                  : settings.fontSize === "large"
                  ? "text-lg font-normal"
                  : "text-base"
              }`}
            >
              <p className="font-semibold text-primary mb-1">
                Vocab: Resilience /rɪˈzɪl.jəns/ (noun)
              </p>
              <p className="text-foreground">
                Khả năng phục hồi, kiên cường vượt qua khó khăn.
              </p>
              <p className="text-muted-foreground italic mt-1 text-[0.9em]">
                &quot;The quick brown fox jumps over the lazy dog — LexiCore empowers your language mastery every single day.&quot;
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility / Motion */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Trải nghiệm & Khả năng tiếp cận</CardTitle>
              <CardDescription>
                Tối ưu hiệu năng và độ mượt mà khi tương tác
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3.5 rounded-lg border bg-card">
            <div className="space-y-0.5 max-w-[80%]">
              <Label className="text-sm font-semibold cursor-pointer" htmlFor="reduce-motion-switch">
                Giảm hiệu ứng động (Reduce Motion)
              </Label>
              <p className="text-xs text-muted-foreground">
                Tắt bớt các hiệu ứng lật thẻ 3D, particle ăn mừng và chuyển cảnh mượt. Khuyên dùng nếu thiết bị cấu hình yếu hoặc bạn dễ chóng mặt.
              </p>
            </div>
            <Switch
              id="reduce-motion-switch"
              checked={settings.reduceMotion}
              onCheckedChange={(checked) => updateSetting("reduceMotion", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
