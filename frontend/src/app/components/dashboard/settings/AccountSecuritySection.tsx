import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Switch } from "../../ui/switch";
import { Separator } from "../../ui/separator";
import { Progress } from "../../ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import {
  ShieldCheck,
  KeyRound,
  Mail,
  CheckCircle2,
  Smartphone,
  Laptop,
  LogOut,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { SettingsState } from "./settingsMock";

interface AccountSecuritySectionProps {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export function AccountSecuritySection({ settings, updateSetting }: AccountSecuritySectionProps) {
  // Password Change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Email Change Dialog
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  // Danger Zone Dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  // Password strength calculator
  const calculateStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score += 30;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 20;
    return score;
  };

  const pwdStrength = calculateStrength(newPassword);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Mật khẩu mới phải có ít nhất 8 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Xác nhận mật khẩu không khớp");
      return;
    }

    setIsUpdatingPassword(true);
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Mật khẩu đã được cập nhật thành công!");
    }, 600);
  };

  const handleEmailChange = () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }
    updateSetting("email", newEmail);
    setShowEmailDialog(false);
    setNewEmail("");
    toast.success("Mã xác minh đã được gửi đến email mới của bạn!");
  };

  const handleRevokeOtherSessions = () => {
    const updated = settings.activeSessions.filter((s) => s.isCurrent);
    updateSetting("activeSessions", updated);
    toast.success("Đã đăng xuất khỏi tất cả các thiết bị khác!");
  };

  return (
    <div className="space-y-6">
      {/* 1. Email Account Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-500" />
            <div>
              <CardTitle className="text-lg">Địa chỉ Email</CardTitle>
              <CardDescription>Email được sử dụng để đăng nhập và nhận thông báo quan trọng.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base">{settings.email}</span>
                {settings.isEmailVerified && (
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đã xác thực
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Email chính của tài khoản LexiCore</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(true)}>
              Thay đổi Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-500" />
            <div>
              <CardTitle className="text-lg">Đổi mật khẩu</CardTitle>
              <CardDescription>Cập nhật mật khẩu thường xuyên để tăng cường an toàn tài khoản.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="current-pwd">Mật khẩu hiện tại</Label>
              <div className="relative">
                <Input
                  id="current-pwd"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-pwd">Mật khẩu mới</Label>
              <Input
                id="new-pwd"
                type={showPassword ? "text" : "password"}
                placeholder="Tối thiểu 8 ký tự, gồm số và ký tự đặc biệt"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              {newPassword && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Độ mạnh mật khẩu</span>
                    <span className={pwdStrength >= 75 ? "text-emerald-500 font-medium" : pwdStrength >= 50 ? "text-amber-500 font-medium" : "text-destructive font-medium"}>
                      {pwdStrength >= 75 ? "Mạnh" : pwdStrength >= 50 ? "Trung bình" : "Yếu"}
                    </span>
                  </div>
                  <Progress
                    value={pwdStrength}
                    className={`h-1.5 ${pwdStrength >= 75 ? "[&>div]:bg-emerald-500" : pwdStrength >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-destructive"}`}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pwd">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirm-pwd"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={isUpdatingPassword || !currentPassword || !newPassword} className="gap-2">
              <Lock className="w-4 h-4" /> {isUpdatingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 3. Two-Factor Authentication (2FA) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <div>
                <CardTitle className="text-lg">Xác thực 2 yếu tố (2FA)</CardTitle>
                <CardDescription>Bảo vệ tài khoản bằng mã bảo mật bổ sung mỗi khi đăng nhập trên thiết bị lạ.</CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.twoFactorEnabled}
              onCheckedChange={(checked) => {
                updateSetting("twoFactorEnabled", checked);
                toast.success(checked ? "Đã bật xác thực 2 bước (2FA)" : "Đã tắt xác thực 2 bước");
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground p-3 bg-muted/40 rounded-lg border">
            Khi bật 2FA, hệ thống sẽ tự động gửi mã OTP gồm 6 chữ số đến email <strong>{settings.email}</strong> để xác minh danh tính trước khi cấp quyền truy cập.
          </div>
        </CardContent>
      </Card>

      {/* 4. Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Laptop className="w-5 h-5 text-blue-500" />
              <div>
                <CardTitle className="text-lg">Phiên đăng nhập đang hoạt động</CardTitle>
                <CardDescription>Danh sách các thiết bị hiện đang đăng nhập vào tài khoản của bạn.</CardDescription>
              </div>
            </div>
            {settings.activeSessions.length > 1 && (
              <Button variant="outline" size="sm" onClick={handleRevokeOtherSessions} className="gap-1.5 text-xs text-destructive hover:bg-destructive/10">
                <LogOut className="w-3.5 h-3.5" /> Đăng xuất thiết bị khác
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y border rounded-xl overflow-hidden">
            {settings.activeSessions.map((session) => (
              <div key={session.id} className="p-4 flex items-center justify-between gap-4 bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {session.device.includes("iPhone") || session.device.includes("Mobile") ? (
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Laptop className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{session.device}</p>
                      {session.isCurrent && (
                        <Badge variant="default" className="text-[10px] bg-emerald-600 text-white">
                          Thiết bị này
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.browser} • {session.location} ({session.ip})
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs text-muted-foreground block">{session.lastActive}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 5. Danger Zone */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <CardTitle className="text-lg text-destructive">Khu vực nguy hiểm</CardTitle>
              <CardDescription>Các thao tác bên dưới có tác động vĩnh viễn đến quyền truy cập và dữ liệu của bạn.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div>
              <p className="font-semibold text-sm">Tạm khóa tài khoản</p>
              <p className="text-xs text-muted-foreground">Tài khoản sẽ bị ẩn khỏi bảng xếp hạng PvP và cộng đồng cho đến khi bạn đăng nhập lại.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowDeactivateDialog(true)} className="border-destructive/30 text-destructive hover:bg-destructive/10">
              Tạm khóa
            </Button>
          </div>

          <Separator className="bg-destructive/10" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm text-destructive">Xóa tài khoản vĩnh viễn</p>
              <p className="text-xs text-muted-foreground">Toàn bộ tiến độ học tập, chuỗi Streak, số dư Coins và bộ thẻ cá nhân sẽ bị xóa hoàn toàn.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              Xóa tài khoản
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thay đổi Email tài khoản</DialogTitle>
            <DialogDescription>Nhập địa chỉ email mới. Hệ thống sẽ gửi mã xác minh OTP để hoàn tất thay đổi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-email-input">Email mới</Label>
              <Input
                id="new-email-input"
                type="email"
                placeholder="example@lexicore.edu.vn"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Hủy</Button>
            <Button onClick={handleEmailChange} disabled={!newEmail}>Gửi mã xác minh</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Account Alert Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc muốn tạm khóa tài khoản?</AlertDialogTitle>
            <AlertDialogDescription>
              Tài khoản của bạn sẽ tạm dừng hoạt động và bạn sẽ được đăng xuất khỏi hệ thống. Bạn có thể kích hoạt lại bất kỳ lúc nào bằng cách đăng nhập lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeactivateDialog(false);
                toast.info("Tài khoản của bạn đã được tạm khóa.");
              }}
            >
              Xác nhận tạm khóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Alert Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Cảnh báo: Xóa vĩnh viễn tài khoản
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này <strong>KHÔNG THỂ HOÀN TÁC</strong>. Toàn bộ chuỗi Streak, điểm PvP Arena, khóa học đã lưu và các bộ Flashcard cá nhân sẽ bị xóa vĩnh viễn khỏi máy chủ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                setShowDeleteDialog(false);
                toast.error("Yêu cầu xóa tài khoản đã được tiếp nhận.");
              }}
            >
              Tôi hiểu và muốn xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
