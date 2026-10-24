import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import { Progress } from "../../ui/progress";
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
  KeyRound,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Users,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { SettingsState } from "./settingsMock";
import { authService } from "../../../services/auth-service";
import { disconnectChatSocket } from "../../../features/social/chat-socket";

interface AccountSecuritySectionProps {
  settings: SettingsState;
  updateSetting?: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export function AccountSecuritySection({ settings }: AccountSecuritySectionProps) {
  const navigate = useNavigate();

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Danger Zone Dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  // Logout & Switch Account Dialogs
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showSwitchAccountDialog, setShowSwitchAccountDialog] = useState(false);
  const [isProcessingAuthAction, setIsProcessingAuthAction] = useState(false);

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

  // Xử lý Đăng xuất
  const handleLogout = async () => {
    setIsProcessingAuthAction(true);
    try {
      disconnectChatSocket();
      await authService.logout();
    } catch (error) {
      console.warn("Logout API warning:", error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      setIsProcessingAuthAction(false);
      setShowLogoutDialog(false);
      toast.success("Đã đăng xuất khỏi tài khoản thành công!");
      navigate("/login", { replace: true });
    }
  };

  // Xử lý Đổi tài khoản
  const handleSwitchAccount = async () => {
    setIsProcessingAuthAction(true);
    try {
      disconnectChatSocket();
      await authService.logout();
    } catch (error) {
      console.warn("Switch account logout API warning:", error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      setIsProcessingAuthAction(false);
      setShowSwitchAccountDialog(false);
      toast.info("Vui lòng đăng nhập với tài khoản mới của bạn.");
      navigate("/login", { replace: true, state: { switchAccount: true } });
    }
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

      {/* 3. Session & Account Actions (Đổi tài khoản & Đăng xuất) */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Phiên đăng nhập & Tài khoản</CardTitle>
              <CardDescription>
                Quản lý trạng thái đăng nhập, chuyển đổi giữa các tài khoản học tập hoặc kết thúc phiên làm việc.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nút Đổi tài khoản */}
            <div className="p-4 rounded-xl border bg-muted/20 flex flex-col justify-between gap-3">
              <div>
                <p className="font-semibold text-sm text-foreground">Đổi tài khoản khác</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Đăng xuất tài khoản hiện tại và chuyển hướng đến trang đăng nhập để vào tài khoản khác.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowSwitchAccountDialog(true)}
                className="w-full sm:w-auto gap-2 text-xs font-semibold self-start"
              >
                <Users className="w-3.5 h-3.5" /> Đổi tài khoản
              </Button>
            </div>

            {/* Nút Đăng xuất */}
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col justify-between gap-3">
              <div>
                <p className="font-semibold text-sm text-destructive">Đăng xuất</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Đóng phiên làm việc trên thiết bị này và xóa thông tin phiên xác thực an toàn.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowLogoutDialog(true)}
                className="w-full sm:w-auto gap-2 text-xs font-semibold self-start"
              >
                <LogOut className="w-3.5 h-3.5" /> Đăng xuất ngay
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Danger Zone */}
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

      {/* Confirm Logout Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <LogOut className="w-5 h-5" /> Xác nhận đăng xuất
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản <strong>{settings.email}</strong>? Bạn sẽ cần đăng nhập lại để tiếp tục học tập.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingAuthAction}>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={isProcessingAuthAction}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {isProcessingAuthAction ? "Đang xử lý..." : "Đăng xuất"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Switch Account Dialog */}
      <AlertDialog open={showSwitchAccountDialog} onOpenChange={setShowSwitchAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Chuyển sang tài khoản khác?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hệ thống sẽ lưu lại phiên làm việc hiện tại và đưa bạn về màn hình Đăng nhập để sử dụng tài khoản khác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingAuthAction}>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSwitchAccount}
              disabled={isProcessingAuthAction}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isProcessingAuthAction ? "Đang xử lý..." : "Đồng ý chuyển"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <ShieldAlert className="w-5 h-5 text-destructive" /> Cảnh báo: Xóa vĩnh viễn tài khoản
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
