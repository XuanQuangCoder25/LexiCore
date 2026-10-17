import { Sun, Moon, Monitor, Sparkles, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
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
