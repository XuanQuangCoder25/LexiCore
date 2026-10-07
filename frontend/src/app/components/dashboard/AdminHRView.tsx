import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Switch } from "../ui/switch";
import { Users, CircleDollarSign, Gem, Trophy, Star, CalendarDays, Mail } from "lucide-react";

const API_BASE = "";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: "USER" | "CONTENT_CREATOR" | "ADMIN";
  status: "PENDING" | "ACTIVE" | "BANNED";
  creator_status: "ACTIVE" | "SUSPENDED" | null;
  created_at: string;
  coin_balance: number | null;
  diamond_balance: number | null;
  level: number | null;
  rank_point: number | null;
}

export function AdminHRView() {
  const [activeTab, setActiveTab] = useState("all");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

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
    if (role === "ADMIN") return <Badge className="bg-red-500 hover:bg-red-600">Admin</Badge>;
    if (role === "CONTENT_CREATOR") return <Badge className="bg-amber-500 hover:bg-amber-600">Creator</Badge>;
    return <Badge className="bg-blue-500 hover:bg-blue-600">User</Badge>;
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
                <TableRow>
                  <TableHead className="pl-6">Người dùng</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right pr-6">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium pl-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        {user.full_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="secondary" size="sm" onClick={() => setSelectedUser(user)}>
                        Chi tiết
                      </Button>
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
              <DialogTitle className="text-xl flex items-center justify-between pr-6">
                <span>Thông tin Người dùng</span>
                {getStatusBadge(selectedUser)}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="flex items-start gap-4 pb-4 border-b">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold shrink-0">
                  {selectedUser.full_name.charAt(0).toUpperCase()}
                </div>
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
    </div>
  );
}
