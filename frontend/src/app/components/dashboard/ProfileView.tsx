import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Card, CardContent } from "../ui/card";
import { Loader2, Mail, Calendar, User, XCircle, Clock, Upload, GraduationCap, Flame, CircleDollarSign, Gem, Trophy, Info, Crown, Medal, Copy, Check } from "lucide-react";

interface CopyButtonProps {
  textToCopy: string;
}

export const CopyButton = ({ textToCopy }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      // Đổi lại icon copy sau 2 giây
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Không thể copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors inline-flex items-center justify-center"
      title="Sao chép"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600 animate-in fade-in" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
};

export function ProfileView() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [appData, setAppData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  // Form state
  const [reason, setReason] = useState("");
  const [qualifications, setQualifications] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      let currentUser = null;
      // Fetch user profile info
      const userRes = await fetch("/api/auth/me", { credentials: "include" });
      if (userRes.ok) {
        currentUser = await userRes.json();
        setUserData(currentUser);
      }

      // Fetch application status
      const appRes = await fetch("/api/creator/my-application", { credentials: "include" });
      if (appRes.ok) {
        const app = await appRes.json();
        setAppData(app.data);
      }

      // Fetch leaderboard to calculate rank
      if (currentUser) {
        const lbRes = await fetch("/api/gamification/leaderboard", { credentials: "include" });
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          if (lbData.success && lbData.data) {
            const rankIndex = lbData.data.findIndex((item: any) => item.id === currentUser.id);
            if (rankIndex !== -1) {
              setUserRank(rankIndex + 1);
            }
          }
        }
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

  const handleSubmitApplication = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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
        await fetchData();
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
      <div className="w-full h-64 md:h-80 lg:h-96 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-sm relative overflow-hidden flex items-center justify-center">
        {userData?.cover_url && (
          <img src={userData.cover_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover object-center" />
        )}
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* ── Avatar & Header Info ── */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 px-6 -mt-12 md:-mt-16 relative z-10">
        <div
          className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden flex items-center justify-center text-4xl md:text-5xl font-bold shrink-0 relative border-4 border-background shadow-lg"
          style={{
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            backgroundColor: isDark ? "#1f2937" : "#e5e7eb",
            color: isDark ? "#f3f4f6" : "#374151"
          }}
        >
          {userData?.avatar_url ? (
            <img src={userData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            userData?.full_name?.charAt(0).toUpperCase() || "U"
          )}
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold drop-shadow-sm">{userData?.full_name || "Guest"}</h1>
          <div className="flex items-center gap-2 text-muted-foreground text-base font-medium mt-1">
            <span>{`ID: ${userData?.id || "Chưa rõ ID"}`}</span>
            {userData?.id && <CopyButton textToCopy={userData.id} />}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Card 1: Thông tin cá nhân */}
        <div className="w-full">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 border-b pb-2 mb-6">
                <Info className="h-6 w-6 text-violet-500" />
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-violet-500">Giới thiệu</h2>
              </div>
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

        {/* Card 2: Stats & Economy (Chỉ số & Tài sản) */}
        <div className="w-full">
          <Card className="relative overflow-hidden">
            {/* Background decorative glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/10 via-blue-600/5 to-transparent rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />

            <CardContent className="pt-6 relative">
              <div className="flex items-center gap-2 border-b pb-2 mb-6">
                <Trophy className="h-6 w-6 text-violet-500" />
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-violet-500">Chỉ số & Tài sản</h2>
              </div>

              {/* Level & EXP Section */}
              <div className="mb-8 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-violet-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-500/20 ring-2 ring-white dark:ring-slate-950">
                      {userData?.level || 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cấp độ hiện tại</p>
                      <p className="font-bold text-lg leading-tight text-foreground">Học giả Triển vọng</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">{userData?.exp || 0}</span>
                    <span className="text-sm text-muted-foreground font-medium"> / {100 + ((userData?.level || 1) - 1) * 20} EXP</span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="h-4 w-full bg-secondary rounded-full overflow-hidden shadow-inner mt-4">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-400 rounded-full transition-all duration-1000 ease-out relative"
                    style={{ width: `${Math.min(100, ((userData?.exp || 0) / (100 + ((userData?.level || 1) - 1) * 20)) * 100)}%` }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Grid 4 Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Hạng */}
                <div className="flex flex-col p-4 rounded-2xl border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      {userRank === 1 ? <Crown className="w-5 h-5" /> : <Medal className="w-5 h-5" />}
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">Xếp hạng</span>
                  </div>
                  <div className="mt-auto">
                    <div className="text-2xl font-bold">{userRank ? `#${userRank}` : "Chưa xếp hạng"}</div>
                    <div className="text-xs text-muted-foreground">{userData?.rank_point?.toLocaleString() || 0} Point</div>
                  </div>
                </div>

                {/* Chuỗi ngày học */}
                <div className="flex flex-col p-4 rounded-2xl border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                      <Flame className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">Chuỗi học</span>
                  </div>
                  <div className="mt-auto">
                    <div className="text-2xl font-bold">{userData?.current_streak || 0} <span className="text-base font-medium text-muted-foreground">ngày</span></div>
                    <div className="text-xs text-muted-foreground">Giữ lửa đều đặn nhé!</div>
                  </div>
                </div>

                {/* Coin */}
                <div className="flex flex-col p-4 rounded-2xl border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                      <CircleDollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">LexiCoin</span>
                  </div>
                  <div className="mt-auto">
                    <div className="text-2xl font-bold">{userData?.coin_balance?.toLocaleString() || 0}</div>
                    <div className="text-xs text-muted-foreground">Dùng mua vật phẩm</div>
                  </div>
                </div>

                {/* Diamond */}
                <div className="flex flex-col p-4 rounded-2xl border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
                      <Gem className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">Kim cương</span>
                  </div>
                  <div className="mt-auto">
                    <div className="text-2xl font-bold">{userData?.diamond_balance?.toLocaleString() || 0}</div>
                    <div className="text-xs text-muted-foreground">Tài sản cao cấp</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card 3: Creator Application */}
        <div className="w-full">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-6 w-6 text-emerald-500" />
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-400">Chương trình Content Creator</h2>
              </div>
              <p className="text-muted-foreground text-sm border-b pb-4 mb-6">
                Trở thành nhà sáng tạo nội dung trên hệ thống LexiCore để tạo ra các bộ Flashcard, Courses và Exams chất lượng cho cộng đồng.
              </p>

              {/* Status Display */}
              {userData?.role?.toLowerCase() === "content_creator" ? (
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
