import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Switch } from "../ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import {
  Users,
  CircleDollarSign,
  Gem,
  Trophy,
  Star,
  CalendarDays,
  Mail,
  Send,
  Loader2,
  AlertTriangle,
  AlertOctagon,
  Bell,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { optimizeAvatarUrl } from "../../services/arena-service";

const API_BASE = "";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  role: "USER" | "CONTENT_CREATOR" | "ADMIN";
  status: "PENDING" | "ACTIVE" | "BANNED";
  creator_status: "ACTIVE" | "SUSPENDED" | null;
  created_at: string;
  coin_balance: number | null;
  diamond_balance: number | null;
  level: number | null;
  rank_point: number | null;
}

const EMAIL_CATEGORIES = [
  {
    id: "notice",
    label: "Thông báo",
    type: "info" as const,
    text: "Thông báo",
    icon: Bell,
    activeClass: "bg-indigo-500/15 border-indigo-500/60 text-indigo-700 dark:text-indigo-400 font-bold shadow-xs",
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
    glowColor: "border-t-indigo-500",
    headerIconColor: "text-indigo-500 bg-indigo-500/10",
  },
  {
    id: "warning",
    label: "Cảnh báo",
    type: "warning" as const,
    text: "Cảnh báo",
    icon: AlertTriangle,
    activeClass: "bg-amber-500/15 border-amber-500/60 text-amber-700 dark:text-amber-400 font-bold shadow-xs",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    glowColor: "border-t-amber-500",
    headerIconColor: "text-amber-500 bg-amber-500/10",
  },
  {
    id: "danger",
    label: "Khẩn cấp",
    type: "danger" as const,
    text: "Khẩn cấp",
    icon: AlertOctagon,
    activeClass: "bg-rose-500/15 border-rose-500/60 text-rose-700 dark:text-rose-400 font-bold shadow-xs",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    glowColor: "border-t-rose-500",
    headerIconColor: "text-rose-500 bg-rose-500/10",
  },
  {
    id: "success",
    label: "Khen thưởng",
    type: "success" as const,
    text: "Khen thưởng",
    icon: Award,
    activeClass: "bg-emerald-500/15 border-emerald-500/60 text-emerald-700 dark:text-emerald-400 font-bold shadow-xs",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    glowColor: "border-t-emerald-500",
    headerIconColor: "text-emerald-500 bg-emerald-500/10",
  },
];

export function AdminHRView() {
  const [activeTab, setActiveTab] = useState("all");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // State cho Modal Soạn thư trực tiếp
  const [emailTargetUser, setEmailTargetUser] = useState<UserProfile | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBadgeText, setEmailBadgeText] = useState("Thông báo");
  const [emailBadgeType, setEmailBadgeType] = useState<"warning" | "info" | "danger" | "success">("info");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailActionText, setEmailActionText] = useState("");
  const [emailActionUrl, setEmailActionUrl] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const resetEmailForm = () => {
    setEmailTargetUser(null);
    setEmailSubject("");
    setEmailBadgeText("Thông báo");
    setEmailBadgeType("info");
    setEmailMessage("");
    setEmailActionText("");
    setEmailActionUrl("");
    setSendingEmail(false);
  };

  const openEmailModalForUser = (user: UserProfile) => {
    setEmailTargetUser(user);
    setEmailSubject("");
    setEmailBadgeText("Thông báo");
    setEmailBadgeType("info");
    setEmailMessage("");
    setEmailActionText("");
    setEmailActionUrl("");
  };

  const handleSendDirectEmail = async () => {
    if (!emailTargetUser) return;
    if (!emailSubject.trim()) {
      toast.error("Vui lòng nhập tiêu đề thư");
      return;
    }
    if (!emailMessage.trim()) {
      toast.error("Vui lòng nhập nội dung thư");
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${emailTargetUser.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject: emailSubject.trim(),
          heading: emailSubject.trim(),
          badgeText: emailBadgeText.trim() || "Thông báo",
          badgeType: emailBadgeType,
          message: emailMessage.trim(),
          actionText: emailActionText.trim() || undefined,
          actionUrl: emailActionUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gửi thư thất bại");
      }

      toast.success(`Đã gửi thư thành công đến ${emailTargetUser.email}`);
      resetEmailForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Không thể gửi thư");
    } finally {
      setSendingEmail(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleUserBan = async (user: UserProfile) => {
    const isBanned = user.status === "BANNED";
    const endpoint = isBanned ? "unban" : "ban";
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${user.id}/${endpoint}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        // Update local state and modal state immediately for snappiness
        const updatedStatus = isBanned ? "ACTIVE" : "BANNED";
        setUsers(users.map(u => u.id === user.id ? { ...u, status: updatedStatus } : u));
        if (selectedUser?.id === user.id) {
          setSelectedUser({ ...selectedUser, status: updatedStatus });
        }
      } else {
        alert("Có lỗi xảy ra khi cập nhật trạng thái.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    }
  };

  const toggleCreatorSuspend = async (user: UserProfile) => {
    const isSuspended = user.creator_status === "SUSPENDED";
    const endpoint = isSuspended ? "reactivate" : "suspend";
    try {
      const res = await fetch(`${API_BASE}/api/admin/creators/${user.id}/${endpoint}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const updatedStatus = isSuspended ? "ACTIVE" : "SUSPENDED";
        setUsers(users.map(u => u.id === user.id ? { ...u, creator_status: updatedStatus } : u));
        if (selectedUser?.id === user.id) {
          setSelectedUser({ ...selectedUser, creator_status: updatedStatus });
        }
      } else {
        alert("Có lỗi xảy ra khi cập nhật trạng thái Creator.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    }
  };

  const filteredUsers = users.filter(u => {
    if (activeTab === "all") return true;
    if (activeTab === "users") return u.role === "USER";
    if (activeTab === "creators") return u.role === "CONTENT_CREATOR";
    return true;
  });

  const getRoleBadge = (role: string) => {
    const badgeStyle = "w-20 justify-center text-center";
    if (role === "ADMIN") return <Badge className={`bg-red-500 hover:bg-red-600 ${badgeStyle}`}>Admin</Badge>;
    if (role === "CONTENT_CREATOR") return <Badge className={`bg-amber-500 hover:bg-amber-600 ${badgeStyle}`}>Creator</Badge>;
    return <Badge className={`bg-blue-500 hover:bg-blue-600 ${badgeStyle}`}>User</Badge>;
  };

  const getStatusBadge = (user: UserProfile) => {
    if (user.status === "BANNED") {
      return <Badge variant="outline" className="text-destructive border-destructive bg-destructive/10">Banned</Badge>;
    }
    if (user.role === "CONTENT_CREATOR" && user.creator_status === "SUSPENDED") {
      return <Badge variant="outline" className="text-amber-500 border-amber-500 bg-amber-500/10">Suspended</Badge>;
    }
    return <Badge variant="outline" className="text-emerald-500 border-emerald-500 bg-emerald-500/10">Active</Badge>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 p-6 rounded-2xl border bg-card shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Human Resources</h1>
          <p className="text-muted-foreground mt-1">Quản lý toàn bộ Người dùng và Content Creators trong hệ thống.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="users">Người dùng</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="bg-card border rounded-xl shadow-sm overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Chưa có dữ liệu nào để hiển thị.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5 hover:bg-primary/5">
                  <TableHead className="pl-6 font-bold">Người dùng</TableHead>
                  <TableHead className="font-bold">Email</TableHead>
                  <TableHead className="font-bold">Vai trò</TableHead>
                  <TableHead className="font-bold">Trạng thái</TableHead>
                  <TableHead className="text-right pr-6 font-bold">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium pl-6 py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border shadow-xs shrink-0">
                          {user.avatar_url && (
                            <AvatarImage
                              src={optimizeAvatarUrl(user.avatar_url, 100)}
                              alt={user.full_name}
                              className="object-cover"
                            />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {(user.full_name || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-sm text-foreground">{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground py-2.5">{user.email}</TableCell>
                    <TableCell className="py-2.5">{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="py-2.5">{getStatusBadge(user)}</TableCell>
                    <TableCell className="text-right pr-6 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedUser(user)}>
                          Chi tiết
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 w-8 p-0 border border-border/80 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                          title="Gửi thư cho người này"
                          onClick={() => openEmailModalForUser(user)}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* User Detail Modal */}
      <Dialog open={selectedUser !== null} onOpenChange={(open) => {
        if (!open) setSelectedUser(null);
      }}>
        {selectedUser && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="text-xl">
                  Thông tin Người dùng
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-semibold"
                    onClick={() => {
                      const target = selectedUser;
                      setSelectedUser(null);
                      openEmailModalForUser(target);
                    }}
                  >
                    <Send className="w-3.5 h-3.5 text-primary" />
                    Gửi thư
                  </Button>
                  {getStatusBadge(selectedUser)}
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="flex items-start gap-4 pb-4 border-b">
                <Avatar className="w-16 h-16 rounded-2xl border-2 border-primary/20 shadow-xs shrink-0 overflow-hidden">
                  {selectedUser.avatar_url && (
                    <AvatarImage
                      src={optimizeAvatarUrl(selectedUser.avatar_url, 160)}
                      alt={selectedUser.full_name}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                    {(selectedUser.full_name || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 flex-1">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    {selectedUser.full_name}
                    {getRoleBadge(selectedUser.role)}
                  </h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Mail className="w-4 h-4" /> {selectedUser.email}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> Tham gia từ: {new Date(selectedUser.created_at).toLocaleDateString("vi-VN")}</p>
                </div>
              </div>

              {/* Gamification Stats */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Tài sản & Thành tích</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted/50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                    <Star className="w-5 h-5 text-violet-600 mb-1" />
                    <span className="text-xs text-muted-foreground">Level</span>
                    <span className="font-bold">{selectedUser.level ?? 1}</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                    <Trophy className="w-5 h-5 text-amber-500 mb-1" />
                    <span className="text-xs text-muted-foreground">Rank</span>
                    <span className="font-bold">{selectedUser.rank_point ?? 0}</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                    <CircleDollarSign className="w-5 h-5 text-emerald-600 mb-1" />
                    <span className="text-xs text-muted-foreground">Xu</span>
                    <span className="font-bold">{selectedUser.coin_balance?.toLocaleString() ?? 0}</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                    <Gem className="w-5 h-5 text-fuchsia-500 mb-1" />
                    <span className="text-xs text-muted-foreground">Kim cương</span>
                    <span className="font-bold">{selectedUser.diamond_balance?.toLocaleString() ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-3 text-destructive uppercase tracking-wider">Khu vực nguy hiểm</h3>

                <div className="space-y-4 bg-destructive/5 border border-destructive/10 p-4 rounded-xl">
                  {/* General Ban */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Khóa tài khoản</p>
                      <p className="text-xs text-muted-foreground">Cấm người dùng này đăng nhập vào hệ thống.</p>
                    </div>
                    <Switch
                      checked={selectedUser.status === "BANNED"}
                      onCheckedChange={() => toggleUserBan(selectedUser)}
                    />
                  </div>

                  {/* Creator Suspend (Only for Creators) */}
                  {selectedUser.role === "CONTENT_CREATOR" && (
                    <div className="flex items-center justify-between pt-3 border-t border-destructive/10">
                      <div>
                        <p className="font-medium text-amber-600">Đình chỉ chức danh Creator</p>
                        <p className="text-xs text-muted-foreground">Không cho phép tạo hay sửa khóa học. Vẫn có thể học bình thường.</p>
                      </div>
                      <Switch
                        checked={selectedUser.creator_status === "SUSPENDED"}
                        onCheckedChange={() => toggleCreatorSuspend(selectedUser)}
                      />
                    </div>
                  )}
                </div>
              </div>

            </div>
          </DialogContent>
        )}
      </Dialog>
      {/* Modal Soạn thư trực tiếp cho người dùng */}
      <Dialog open={emailTargetUser !== null} onOpenChange={(open) => {
        if (!open && !sendingEmail) resetEmailForm();
      }}>
        {emailTargetUser && (() => {
          const activeCategory = EMAIL_CATEGORIES.find(
            (c) => c.text === emailBadgeText && c.type === emailBadgeType
          ) || EMAIL_CATEGORIES[0];
          const HeaderIcon = activeCategory.icon;

          return (
            <DialogContent className={`max-w-lg overflow-hidden border-t-4 ${activeCategory.glowColor} transition-colors duration-200`}>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${activeCategory.headerIconColor} transition-colors duration-200`}>
                      <HeaderIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold">
                        Gửi thư trực tiếp
                      </DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Người gửi: <span className="font-mono font-medium text-foreground">no-reply@lexicore.site</span>
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider ${activeCategory.badgeClass}`}>
                    {activeCategory.text}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Thông tin người nhận */}
                <div className="bg-muted/40 p-3 rounded-xl border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-7 w-7 rounded-lg border shrink-0">
                      {emailTargetUser.avatar_url && (
                        <AvatarImage
                          src={optimizeAvatarUrl(emailTargetUser.avatar_url, 60)}
                          alt={emailTargetUser.full_name}
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                        {(emailTargetUser.full_name || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground leading-tight truncate">{emailTargetUser.full_name}</p>
                      <p className="text-muted-foreground font-mono text-[11px] leading-tight truncate">{emailTargetUser.email}</p>
                    </div>
                  </div>
                  {getRoleBadge(emailTargetUser.role)}
                </div>

                {/* Chọn phân loại thông báo */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phân loại thư</Label>
                  <div className="flex flex-wrap gap-2">
                    {EMAIL_CATEGORIES.map((cat) => {
                      const IconComp = cat.icon;
                      const isSelected = emailBadgeText === cat.text && emailBadgeType === cat.type;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setEmailBadgeType(cat.type);
                            setEmailBadgeText(cat.text);
                          }}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${isSelected
                            ? cat.activeClass
                            : "bg-muted/30 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                          <IconComp className="w-3.5 h-3.5 shrink-0" />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tiêu đề thư */}
                <div className="space-y-1.5">
                  <Label htmlFor="email-subject" className="text-xs font-semibold">Tiêu đề email</Label>
                  <Input
                    id="email-subject"
                    placeholder="Ví dụ: Cảnh báo hành vi bất thường"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    disabled={sendingEmail}
                    className="text-sm"
                  />
                </div>

                {/* Nội dung thư */}
                <div className="space-y-1.5">
                  <Label htmlFor="email-message" className="text-xs font-semibold">Nội dung thư</Label>
                  <Textarea
                    id="email-message"
                    placeholder="Nhập nội dung cần gửi đến người dùng"
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    disabled={sendingEmail}
                    rows={5}
                    className="text-sm leading-relaxed resize-none"
                  />
                </div>

                {/* Tùy chọn nút liên kết trong thư */}
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Nút bấm liên kết đính kèm (không bắt buộc)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="Nhãn nút"
                      value={emailActionText}
                      onChange={(e) => setEmailActionText(e.target.value)}
                      disabled={sendingEmail}
                      className="text-xs"
                    />
                    <Input
                      placeholder="Đường dẫn URL"
                      value={emailActionUrl}
                      onChange={(e) => setEmailActionUrl(e.target.value)}
                      disabled={sendingEmail}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Footer hành động */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetEmailForm}
                  disabled={sendingEmail}
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 font-bold"
                  onClick={handleSendDirectEmail}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Gửi thư ngay
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
}
