import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Card, CardContent } from "../ui/card";
import { Loader2, Mail, Calendar, User, ShieldCheck, XCircle, Clock, Upload, GraduationCap } from "lucide-react";

export function ProfileView() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [appData, setAppData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [reason, setReason] = useState("");
  const [qualifications, setQualifications] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch user profile info
      const userRes = await fetch("/api/auth/me", { credentials: "include" });
      if (userRes.ok) {
        const user = await userRes.json();
        setUserData(user);
      }

      // Fetch application status
      const appRes = await fetch("/api/creator/my-application", { credentials: "include" });
      if (appRes.ok) {
        const app = await appRes.json();
        setAppData(app.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/media", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Gắn URL trả về vào text input
        const newQual = qualifications ? `${qualifications}\n${data.data.url}` : data.data.url;
        setQualifications(newQual);
        setSuccessMsg("Tải file lên thành công!");
      } else {
        setErrorMsg("Lỗi upload file: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      setErrorMsg("Lỗi kết nối khi upload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reason.trim() || !qualifications.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ lý do và chứng chỉ/kinh nghiệm.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch("/api/creator/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason, qualifications }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || "Có lỗi xảy ra, vui lòng thử lại.");
      } else {
        setSuccessMsg("Đã gửi đơn đăng ký thành công!");
        setReason("");
        setQualifications("");
        await fetchData(); // Refresh application status
      }
    } catch (err) {
      setErrorMsg("Lỗi kết nối đến máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Styles dynamically based on theme (for Avatar border overlap)
  const isDark = document.documentElement.classList.contains("dark");
  const avatarBorderColor = isDark ? "#09090b" : "#ffffff";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* ── Cover Photo ── */}
      <div className="w-full h-56 md:h-72 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* ── Avatar & Header Info ── */}
      <div className="flex flex-col md:flex-row items-center md:items-center gap-6 px-4">
        <div
          className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden flex items-center justify-center text-4xl md:text-5xl font-bold shrink-0"
          style={{
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            backgroundColor: isDark ? "#1f2937" : "#e5e7eb",
            color: isDark ? "#f3f4f6" : "#374151"
          }}
        >
          {userData?.full_name?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold drop-shadow-sm">{userData?.full_name || "Guest"}</h1>
          <p className="text-muted-foreground text-base font-medium mt-1">
            {`ID: ${userData?.id || "Chưa rõ ID"}`}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Card 1: Thông tin cá nhân */}
        <div className="w-full">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2 mb-3">Giới thiệu</h3>
              <div className="space-y-3 mt-4 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{userData?.email || "Chưa có email"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">Role: {userData?.role || "USER"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Tham gia: {userData?.created_at ? new Date(userData.created_at).toLocaleDateString("vi-VN") : "N/A"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card 2: Creator Application */}
        <div className="w-full">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-6 w-6 text-emerald-500" />
                <h2 className="text-xl font-bold">Chương trình Content Creator</h2>
              </div>
              <p className="text-muted-foreground text-sm border-b pb-4 mb-6">
                Trở thành nhà sáng tạo nội dung trên hệ thống LexiCore để tạo ra các bộ Flashcard, Courses và Exams chất lượng cho cộng đồng.
              </p>

              {/* Status Display */}
              {userData?.role === "CONTENT_CREATOR" ? (
                <div className="space-y-6">
                  {/* Info rows */}
                  <div className="space-y-3 mt-4 text-sm">
                    <div className="flex items-center gap-3">
                      <span>Tham gia từ: {appData?.updated_at ? new Date(appData.updated_at).toLocaleDateString("vi-VN") : "Chưa rõ"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span>Trạng thái:</span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${userData?.creator_status === 'SUSPENDED'
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          }`}>
                          {userData?.creator_status === 'SUSPENDED' ? 'Đình chỉ' : 'Hoạt động'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="pt-2">
                    <h4 className="font-semibold text-sm mb-3">Thống kê đóng góp</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-background rounded-lg border p-3 text-center">
                        <div className="text-2xl font-bold text-primary">0</div>
                        <div className="text-xs text-muted-foreground mt-1">Courses</div>
                      </div>
                      <div className="bg-background rounded-lg border p-3 text-center">
                        <div className="text-2xl font-bold text-blue-500">0</div>
                        <div className="text-xs text-muted-foreground mt-1">Flashcards</div>
                      </div>
                      <div className="bg-background rounded-lg border p-3 text-center">
                        <div className="text-2xl font-bold text-orange-500">0</div>
                        <div className="text-xs text-muted-foreground mt-1">Exams</div>
                      </div>
                      <div className="bg-background rounded-lg border p-3 text-center">
                        <div className="text-2xl font-bold text-purple-500">0</div>
                        <div className="text-xs text-muted-foreground mt-1">Practice</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : appData ? (
                // Nếu đã từng nộp đơn (PENDING hoặc REJECTED)
                <div className="space-y-6">
                  {appData.status === "PENDING" && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 flex items-start gap-4">
                      <Clock className="h-6 w-6 text-yellow-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-yellow-700 dark:text-yellow-500">Đơn của bạn đang chờ duyệt</h4>
                        <p className="text-sm text-muted-foreground mt-1">Chúng tôi đang xem xét hồ sơ của bạn. Quá trình này có thể mất từ 1-3 ngày làm việc. Cảm ơn bạn đã kiên nhẫn.</p>
                        <p className="text-xs text-muted-foreground mt-3">Ngày nộp: {new Date(appData.created_at).toLocaleString("vi-VN")}</p>
                      </div>
                    </div>
                  )}

                  {appData.status === "REJECTED" && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-5 flex items-start gap-4 mb-6">
                      <XCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                      <div className="w-full">
                        <h4 className="font-semibold text-destructive">Đơn xin đã bị từ chối</h4>
                        <p className="text-sm text-muted-foreground mt-1">Rất tiếc, đơn xin của bạn chưa đáp ứng đủ yêu cầu của chúng tôi vào lúc này.</p>

                        {appData.admin_note && (
                          <div className="mt-3 p-3 bg-background rounded-lg border border-destructive/10 text-sm">
                            <span className="font-medium text-destructive">Lý do từ Admin: </span>
                            {appData.admin_note}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-3">Ngày nộp: {new Date(appData.created_at).toLocaleString("vi-VN")}</p>
                        <p className="text-xs text-muted-foreground mt-1 italic">Bạn có thể nộp lại đơn mới sau 24 giờ kể từ khi bị từ chối.</p>
                      </div>
                    </div>
                  )}

                  {/* Cho phép nộp lại nếu bị REJECTED */}
                  {appData.status === "REJECTED" && (
                    <form onSubmit={handleSubmitApplication} className="space-y-4 pt-4 border-t">
                      <h4 className="font-semibold">Nộp đơn mới</h4>
                      {errorMsg && <p className="text-sm text-destructive font-medium">{errorMsg}</p>}
                      {successMsg && <p className="text-sm text-emerald-500 font-medium">{successMsg}</p>}

                      <div className="space-y-2">
                        <Label htmlFor="reason">Lý do bạn muốn làm Creator</Label>
                        <Textarea
                          id="reason"
                          placeholder="Chia sẻ lý do và mục tiêu của bạn"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="qualifications">Chứng chỉ / Kinh nghiệm (URL hoặc Tải lên)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="qualifications"
                            placeholder="Link portfolio, chứng chỉ..."
                            value={qualifications}
                            onChange={(e) => setQualifications(e.target.value)}
                          />
                          <div className="relative shrink-0">
                            <Button type="button" variant="outline" size="icon" disabled={uploading}>
                              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            </Button>
                            <input
                              type="file"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={handleFileUpload}
                              accept="image/*,video/*,.pdf"
                              title="Tải file lên"
                            />
                          </div>
                        </div>
                      </div>
                      <Button type="submit" disabled={submitting || uploading} className="w-full">
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Gửi lại đơn đăng ký
                      </Button>
                    </form>
                  )}
                </div>
              ) : (
                // Chưa đăng ký bao giờ
                <form onSubmit={handleSubmitApplication} className="space-y-4">
                  {errorMsg && <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">{errorMsg}</p>}
                  {successMsg && <p className="text-sm text-emerald-500 font-medium bg-emerald-500/10 p-2 rounded">{successMsg}</p>}

                  <div className="space-y-2">
                    <Label htmlFor="reason">Lý do bạn muốn làm Creator</Label>
                    <Textarea
                      id="reason"
                      placeholder="Vì sao bạn muốn trở thành nhà sáng tạo nội dung?"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qualifications">Kinh nghiệm / Bằng cấp</Label>
                    <div className="flex gap-2">
                      <Input
                        id="qualifications"
                        placeholder="Link hoặc tải file minh chứng lên..."
                        value={qualifications}
                        onChange={(e) => setQualifications(e.target.value)}
                      />
                      <div className="relative shrink-0">
                        <Button type="button" variant="outline" size="icon" disabled={uploading}>
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        </Button>
                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleFileUpload}
                          accept="image/*,video/*,.pdf"
                          title="Tải file lên"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Bạn có thể dán link chứng chỉ hoặc tải file lên.</p>
                  </div>

                  <Button type="submit" disabled={submitting || uploading} className="w-full mt-4">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Gửi đơn đăng ký
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
