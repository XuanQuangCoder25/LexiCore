import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Clock, CheckCircle2, XCircle, Mail, FileText, User, ShieldAlert, Eye, MessageSquareWarning } from "lucide-react";

const API_BASE = "";

interface Application {
  id: string;
  full_name: string;
  email: string;
  reason: string;
  qualifications: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

export function AdminModerationView() {
  const [activeTab, setActiveTab] = useState("pending");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/creator-applications`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setApplications(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleApprove = async () => {
    if (!selectedApp) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/creator-applications/${selectedApp.id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        await fetchApplications();
        setSelectedApp(null);
      } else {
        const data = await res.json();
        alert(data.message || "Lỗi phê duyệt.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/creator-applications/${selectedApp.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_note: rejectionReason }),
        credentials: "include",
      });
      if (res.ok) {
        await fetchApplications();
        setSelectedApp(null);
        setIsRejecting(false);
        setRejectionReason("");
      } else {
        const data = await res.json();
        alert(data.message || "Lỗi từ chối.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setProcessing(false);
    }
  };

  const pendingApps = applications.filter((a) => a.status === "PENDING");
  const processedApps = applications.filter((a) => a.status !== "PENDING");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge variant="outline" className="text-amber-500 border-amber-500 bg-amber-500/10"><Clock className="w-3 h-3 mr-1" /> Chờ duyệt</Badge>;
      case "APPROVED": return <Badge variant="outline" className="text-emerald-500 border-emerald-500 bg-emerald-500/10"><CheckCircle2 className="w-3 h-3 mr-1" /> Đã duyệt</Badge>;
      case "REJECTED": return <Badge variant="outline" className="text-destructive border-destructive bg-destructive/10"><XCircle className="w-3 h-3 mr-1" /> Từ chối</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 p-6 rounded-2xl border bg-card shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Moderation</h1>
          <p className="text-muted-foreground mt-1">Quản lý kiểm duyệt ứng viên Creator và nội dung vi phạm.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="pending" className="relative">
            Đơn chờ duyệt
            {pendingApps.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingApps.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="processed">Lịch sử xử lý</TabsTrigger>
          <TabsTrigger value="reports">Báo cáo vi phạm</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="bg-card border rounded-xl shadow-sm overflow-hidden">
          {pendingApps.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Hiện không có đơn đăng ký nào chờ duyệt.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Ứng viên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ngày nộp</TableHead>
                  <TableHead>Lý do (Tóm tắt)</TableHead>
                  <TableHead className="text-right pr-6">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium pl-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {app.full_name.charAt(0).toUpperCase()}
                        </div>
                        {app.full_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{app.email}</TableCell>
                    <TableCell>{new Date(app.created_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{app.reason}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="secondary" size="sm" onClick={() => setSelectedApp(app)}>
                        <Eye className="w-4 h-4 mr-1.5" /> Xem chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="processed" className="bg-card border rounded-xl shadow-sm overflow-hidden">
          {processedApps.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>Chưa có lịch sử xử lý đơn nào.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Ứng viên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ngày nộp</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right pr-6">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium pl-6">{app.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{app.email}</TableCell>
                    <TableCell>{new Date(app.created_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedApp(app)}>
                        Chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="reports" className="bg-card border rounded-xl shadow-sm">
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquareWarning className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Chưa có báo cáo vi phạm nào được ghi nhận.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Application Detail Modal */}
      <Dialog open={selectedApp !== null} onOpenChange={(open) => {
        if (!open) { setSelectedApp(null); setIsRejecting(false); setRejectionReason(""); }
      }}>
        {selectedApp && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                Chi tiết Đơn ứng tuyển
                {getStatusBadge(selectedApp.status)}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><User className="w-4 h-4" /> Ứng viên</p>
                  <p className="font-semibold">{selectedApp.full_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Mail className="w-4 h-4" /> Email</p>
                  <p className="font-semibold">{selectedApp.email}</p>
                </div>
              </div>

              <div className="space-y-2 bg-muted/50 p-4 rounded-xl">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><FileText className="w-4 h-4" /> Lý do ứng tuyển</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedApp.reason}</p>
              </div>

              <div className="space-y-2 bg-muted/50 p-4 rounded-xl">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><FileText className="w-4 h-4" /> Link Bằng cấp</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-primary">{selectedApp.qualifications}</p>
              </div>

              {selectedApp.status === "REJECTED" && selectedApp.admin_note && (
                <div className="space-y-2 bg-destructive/10 border border-destructive/20 p-4 rounded-xl">
                  <p className="text-sm font-bold text-destructive">Lý do từ chối (Admin ghi chú):</p>
                  <p className="text-sm">{selectedApp.admin_note}</p>
                </div>
              )}

              {/* Tương tác phê duyệt */}
              {selectedApp.status === "PENDING" && (
                <div className="pt-4 border-t">
                  {isRejecting ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-destructive">Nhập lý do từ chối (bắt buộc):</p>
                      <textarea
                        className="w-full h-24 p-3 rounded-md border bg-background text-sm"
                        placeholder="Vd: Nội dung kênh của bạn chưa phù hợp, hoặc bằng cấp chưa đủ..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsRejecting(false)}>Hủy</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={processing || rejectionReason.trim().length < 5}>
                          {processing ? "Đang xử lý..." : "Xác nhận Từ chối"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-3">
                      <Button variant="destructive" className="bg-rose-500 hover:bg-rose-600" onClick={() => setIsRejecting(true)}>
                        <XCircle className="w-4 h-4 mr-1.5" /> Từ chối
                      </Button>
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApprove} disabled={processing}>
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Phê duyệt
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
