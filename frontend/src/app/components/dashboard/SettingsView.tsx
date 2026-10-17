import { useState } from "react";
import {
  ShieldCheck,
  Bell,
  Palette,
  CreditCard,
  Save,
  RotateCcw,
  ChevronRight,
  Settings,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { initialSettingsMock, SettingsState } from "./settings/settingsMock";
import { AccountSecuritySection } from "./settings/AccountSecuritySection";
import { NotificationsSection } from "./settings/NotificationsSection";
import { AppearanceSection } from "./settings/AppearanceSection";
import { BillingWalletSection } from "./settings/BillingWalletSection";

interface SettingsViewProps {
  onNavigateTab?: (tab: string) => void;
  userRole?: string;
}

type SettingsTab =
  | "account"
  | "notifications"
  | "appearance"
  | "billing";

export function SettingsView({ onNavigateTab }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [savedSettings, setSavedSettings] = useState<SettingsState>(initialSettingsMock);
  const [settings, setSettings] = useState<SettingsState>(initialSettingsMock);

  // Check if current settings differ from savedSettings
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const updateSetting = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveChanges = () => {
    setSavedSettings(settings);
    toast.success("Đã lưu toàn bộ cài đặt thành công!", {
      description: "Các tùy chỉnh đã được áp dụng ngay lập tức.",
    });
  };

  const handleDiscardChanges = () => {
    setSettings(savedSettings);
    toast.info("Đã khôi phục cài đặt về trạng thái đã lưu trước đó.");
  };

  const navItems: Array<{
    id: SettingsTab;
    label: string;
    description: string;
    icon: typeof ShieldCheck;
    badge?: string;
  }> = [
    {
      id: "account",
      label: "Tài khoản & Bảo mật",
      description: "Email tài khoản, mật khẩu đăng nhập và quản trị bảo mật",
      icon: ShieldCheck,
    },
    {
      id: "notifications",
      label: "Thông báo & Âm thanh",
      description: "Nhắc nhở học hàng ngày, email, push PvP, hiệu ứng",
      icon: Bell,
    },
    {
      id: "appearance",
      label: "Giao diện & Hiển thị",
      description: "Chủ đề Sáng/Tối và hiệu ứng giao diện",
      icon: Palette,
    },
    {
      id: "billing",
      label: "Gói cước & Ví xu",
      description: "Gói LexiCore Pro, số dư LexiCoins, lịch sử giao dịch",
      icon: CreditCard,
      badge: settings.currentPlan === "pro" ? "PRO" : undefined,
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-28">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Cài đặt & Tùy chỉnh (Settings)
              </h1>
              <p className="text-sm text-muted-foreground">
                Cá nhân hóa trải nghiệm học tập, bảo mật tài khoản và quản trị dịch vụ LexiCore
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Header */}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-xs px-2.5 py-1 animate-pulse">
              Có thay đổi chưa lưu
            </Badge>
          )}
        </div>
      </div>

      {/* Main Settings Layout (Sidebar Navigation + Section Content) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Tabs (Desktop: col 4, Mobile: col 12) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="sticky top-6 rounded-2xl border bg-card/60 backdrop-blur-xs p-2 shadow-xs space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Danh mục cài đặt
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  type="button"
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all group ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "hover:bg-muted text-foreground/80 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg transition-colors shrink-0 ${
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                              isActive
                                ? "bg-primary-foreground text-primary"
                                : "bg-primary/15 text-primary"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs truncate ${
                          isActive
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isActive
                        ? "translate-x-0.5 opacity-100"
                        : "opacity-40 group-hover:opacity-80"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Section Content (Desktop: col 8, Mobile: col 12) */}
        <div className="lg:col-span-8">
          {activeTab === "account" && (
            <AccountSecuritySection
              settings={settings}
              updateSetting={updateSetting}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationsSection
              settings={settings}
              updateSetting={updateSetting}
            />
          )}

          {activeTab === "appearance" && (
            <AppearanceSection
              settings={settings}
              updateSetting={updateSetting}
            />
          )}

          {activeTab === "billing" && (
            <BillingWalletSection
              settings={settings}
              updateSetting={updateSetting}
              onNavigateTab={onNavigateTab}
            />
          )}
        </div>
      </div>

      {/* Sticky Bottom Floating Bar when changes are made */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-card/95 border-2 border-primary/30 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-amber-500 animate-ping shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Bạn có các tùy chỉnh chưa được lưu
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Nhấn Lưu thay đổi để áp dụng ngay các cập nhật mới.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscardChanges}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Hủy bỏ
              </Button>
              <Button
                size="sm"
                onClick={handleSaveChanges}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/20 text-xs px-4"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" /> Lưu thay đổi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
