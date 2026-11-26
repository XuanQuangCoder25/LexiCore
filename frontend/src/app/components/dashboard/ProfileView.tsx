import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Loader2, Mail, Calendar, User, XCircle, Clock, Upload, GraduationCap, Flame,
  CircleDollarSign, Gem, Trophy, Info, Crown, Medal, Copy, Check, ShieldCheck,
  BarChart2, ArrowRight, Lock, Swords, Star, Zap, Award
} from "lucide-react";
import { getNameGradientClass, getVipAvatarFrameClass } from "../../utils/vipStyling";
import { arenaService, type UserArenaProfile, type RankTierDetail } from "../../services/arena-service";
import {
  AnimatedProgressBar,
  ArenaRankBadge3D,
  CountUpNumber,
  formatEnglishRankName,
  getRankAccentColor,
  renderAchievementIcon,
} from "./profile/ProfileMotionWidgets";

interface CopyButtonProps {
  textToCopy: string;
}

interface AchievementItem {
  achievement_id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  target_value: number;
  reward_coin: number;
  reward_diamond: number;
  reward_exp: number;
  current_progress: number;
  is_unlocked: number;
  unlocked_at: string | null;
}

type ProfileTab = "overview" | "achievements" | "creator";

const TIER_BADGE_CONFIG: Record<string, { label: string; className: string; Icon: typeof Crown }> = {
  ELITE: {
    label: "ELITE",
    className: "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/35",
    Icon: Crown,
  },
  PRO: {
    label: "PRO",
    className: "bg-sky-500/12 text-sky-600 dark:text-sky-400 border-sky-500/35",
    Icon: Zap,
  },
  STARTER: {
    label: "STARTER",
    className: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/35",
    Icon: Star,
  },
};

export const CopyButton = ({ textToCopy }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Không thể copy:", err);
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
  const [arenaProfile, setArenaProfile] = useState<UserArenaProfile | null>(null);
  const [rankTiers, setRankTiers] = useState<RankTierDetail[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  // Form state
  const [reason, setReason] = useState("");
  const [qualifications, setQualifications] = useState("");

  const navigateAppTab = (tab: string, arenaTab?: string) => {
    window.dispatchEvent(
      new CustomEvent("navigate-tab", {
        detail: arenaTab ? { tab, arenaTab } : { tab },
      })
    );
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      let currentUser: any = null;

      const userRes = await fetch("/api/auth/me", { credentials: "include" });
      if (userRes.ok) {
        currentUser = await userRes.json();
        setUserData(currentUser);
      }

      const [appRes, lbRes, arenaRes, tiersRes, achRes] = await Promise.all([
        fetch("/api/creator/my-application", { credentials: "include" }).catch(() => null),
        currentUser ? fetch("/api/gamification/leaderboard", { credentials: "include" }).catch(() => null) : Promise.resolve(null),
        currentUser ? arenaService.getMyProfile().catch(() => null) : Promise.resolve(null),
        arenaService.getRankTiers().catch(() => []),
        currentUser ? fetch("/api/gamification/achievements", { credentials: "include" }).catch(() => null) : Promise.resolve(null),
      ]);

      if (appRes && appRes.ok) {
        const app = await appRes.json();
        setAppData(app.data);
      }

      if (lbRes && lbRes.ok && currentUser) {
        const lbData = await lbRes.json();
        if (lbData.success && Array.isArray(lbData.data)) {
          const rankIndex = lbData.data.findIndex((item: any) => item.id === currentUser.id);
          if (rankIndex !== -1) {
            setUserRank(rankIndex + 1);
          }
        }
      }

      if (arenaRes) {
        setArenaProfile(arenaRes);
      }

      if (Array.isArray(tiersRes) && tiersRes.length > 0) {
        setRankTiers(tiersRes);
      }

      if (achRes && achRes.ok) {
        const achJson = await achRes.json();
        if (achJson.success && Array.isArray(achJson.data)) {
          setAchievements(achJson.data);
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
        credentials: "include",
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

  const isDark = document.documentElement.classList.contains("dark");
  const vipFrameClass = getVipAvatarFrameClass(userData?.tier);
  const tierKey = String(userData?.tier || "").toUpperCase();
  const tierBadge = TIER_BADGE_CONFIG[tierKey] || null;

  const level = Number(userData?.level || 1);
  const currentExp = Number(userData?.exp || 0);
  const requiredExp = 100 + (level - 1) * 20;
  const expPercent = Math.min(100, (currentExp / requiredExp) * 100);

  const arenaRank = arenaProfile?.arena?.rank || "BRONZE";
  const highestRank = arenaProfile?.arena?.highestRank || arenaRank;
  const matchedTierDetail = rankTiers.find((t) => t.rank === arenaRank);
  const rankAccentColor = getRankAccentColor(arenaRank, matchedTierDetail?.color);

  const unlockedAchievements = achievements.filter((a) => a.is_unlocked === 1);
  const lockedAchievements = achievements.filter((a) => a.is_unlocked !== 1);
  const sortedAchievements = [...unlockedAchievements, ...lockedAchievements];
  const achievementCompletionPct = achievements.length > 0
    ? Math.round((unlockedAchievements.length / achievements.length) * 100)
    : 0;

  const hasProAnalytics = userData?.tier === "PRO" || userData?.tier === "ELITE";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* ── Cover Photo (giữ nguyên nền gradient mặc định) ── */}
      <div className="w-full h-56 md:h-72 lg:h-80 rounded-2xl bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-900 shadow-sm relative overflow-hidden flex items-center justify-center">
        {userData?.cover_url && (
          <img
            src={userData.cover_url}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover object-center animate-in fade-in duration-500"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
      </div>

      {/* ── Avatar & Header Info ── */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-5 px-4 sm:px-6 -mt-12 md:-mt-16 relative z-10 text-center md:text-left">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden flex items-center justify-center text-4xl md:text-5xl font-bold shrink-0 relative border-4 border-background ${vipFrameClass || "shadow-lg"}`}
          style={{
            boxShadow: vipFrameClass ? undefined : "0 4px 14px rgba(0,0,0,0.08)",
            backgroundColor: isDark ? "#1f2937" : "#e5e7eb",
            color: isDark ? "#f3f4f6" : "#374151",
          }}
        >
          {userData?.avatar_url ? (
            <img src={userData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            userData?.full_name?.charAt(0).toUpperCase() || "U"
          )}
        </motion.div>

        <div className="pb-1">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <h1 className={`text-2xl sm:text-3xl font-bold drop-shadow-sm ${getNameGradientClass(userData?.tier)}`}>
              {userData?.full_name || "Guest"}
            </h1>
            {tierBadge && (() => {
              const TierIcon = tierBadge.Icon;
              return (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${tierBadge.className}`}>
                  <TierIcon className="h-3.5 w-3.5" />
                  {tierBadge.label}
                </span>
              );
            })()}
          </div>
          <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground text-sm sm:text-base font-medium mt-1">
            <span>{`ID: ${userData?.id || "Chưa rõ ID"}`}</span>
            {userData?.id && <CopyButton textToCopy={userData.id} />}
          </div>
        </div>
      </div>

      {/* ── Navigation Sub-tabs ── */}
      <div className="border-b bg-card/50 rounded-xl border px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
        {([
          { id: "overview", label: "Tổng quan", Icon: User },
          {
            id: "achievements",
            label: "Năng lực & Thành tựu",
            Icon: Trophy,
            badge: achievements.length > 0 ? `${unlockedAchievements.length}/${achievements.length}` : undefined,
          },
          {
            id: "creator",
            label: "Content Creator",
            Icon: GraduationCap,
            badge: userData?.role?.toLowerCase() === "content_creator"
              ? "Active"
              : appData?.status === "PENDING"
                ? "Chờ duyệt"
                : undefined,
          },
        ] as Array<{ id: ProfileTab; label: string; Icon: typeof User; badge?: string }>).map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComp = tab.Icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 min-w-[150px] py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="profile-active-tab-pill"
                  className="absolute inset-0 rounded-lg bg-background shadow-sm border border-border/70"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <IconComp className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Animated Tab Content (Slide + Fade 0.25s) ── */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="profile-tab-overview"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* Card 1: Thông tin cá nhân */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <Info className="h-5 w-5 text-violet-500" />
                  <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-violet-500">
                    Giới thiệu
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-sm">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{userData?.email || "Chưa có email"}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="capitalize">Role: {userData?.role || "USER"}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>
                      Tham gia: {userData?.created_at ? new Date(userData.created_at).toLocaleDateString("vi-VN") : "N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Chỉ số & Tài sản */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/10 via-blue-600/5 to-transparent rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />

              <CardContent className="pt-6 relative space-y-6">
                <div className="flex items-center gap-2 border-b pb-3">
                  <Trophy className="h-5 w-5 text-violet-500" />
                  <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-violet-500">
                    Chỉ số & Tài sản
                  </h2>
                </div>

                {/* Level & EXP Section */}
                <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border">
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-violet-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-500/20 ring-2 ring-white dark:ring-slate-950 tabular-nums">
                        {level}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Cấp độ hiện tại
                        </p>
                        <p className="font-bold text-lg leading-tight text-foreground">Học giả Triển vọng</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                        <CountUpNumber value={currentExp} />
                      </span>
                      <span className="text-sm text-muted-foreground font-medium"> / {requiredExp} EXP</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <AnimatedProgressBar percent={expPercent} />
                  </div>
                </div>

                {/* Grid 4 Stats with 1s CountUp */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col p-4 rounded-2xl border bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                        {userRank === 1 ? <Crown className="w-5 h-5" /> : <Medal className="w-5 h-5" />}
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">Xếp hạng</span>
                    </div>
                    <div className="mt-auto">
                      <div className="text-2xl font-bold">
                        {userRank ? (
                          <>
                            #<CountUpNumber value={userRank} />
                          </>
                        ) : (
                          "Chưa xếp hạng"
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <CountUpNumber value={Number(userData?.rank_point || 0)} /> Point
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col p-4 rounded-2xl border bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                        <Flame className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">Chuỗi học</span>
                    </div>
                    <div className="mt-auto">
                      <div className="text-2xl font-bold">
                        <CountUpNumber value={Number(userData?.current_streak || 0)} />{" "}
                        <span className="text-base font-medium text-muted-foreground">ngày</span>
                      </div>
                      {userData?.tier === "ELITE" ? (
                        <div className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Bảo vệ tự động (ELITE)</span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Giữ lửa đều đặn nhé!</div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col p-4 rounded-2xl border bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                        <CircleDollarSign className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">LexiCoin</span>
                    </div>
                    <div className="mt-auto">
                      <div className="text-2xl font-bold">
                        <CountUpNumber value={Number(userData?.coin_balance || 0)} />
                      </div>
                      <div className="text-xs text-muted-foreground">Dùng mua vật phẩm</div>
                    </div>
                  </div>

                  <div className="flex flex-col p-4 rounded-2xl border bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
                        <Gem className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">Kim cương</span>
                    </div>
                    <div className="mt-auto">
                      <div className="text-2xl font-bold">
                        <CountUpNumber value={Number(userData?.diamond_balance || 0)} />
                      </div>
                      <div className="text-xs text-muted-foreground">Tài sản cao cấp</div>
                    </div>
                  </div>
                </div>

                {/* Arena 3D Rank Showcase Card */}
                <div className="p-4 sm:p-5 rounded-2xl border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <ArenaRankBadge3D rank={arenaRank} accentColor={rankAccentColor} size="lg" />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Đấu trường PvP Arena
                        </span>
                        {matchedTierDetail?.mascot && (
                          <Badge variant="outline" className="text-[11px] font-medium">
                            {matchedTierDetail.mascot}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-xl font-bold" style={{ color: rankAccentColor }}>
                        {formatEnglishRankName(arenaRank)}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          Cao nhất: <strong className="text-foreground">{formatEnglishRankName(highestRank)}</strong>
                        </span>
                        <span>
                          Tổng trận:{" "}
                          <strong className="text-foreground">
                            <CountUpNumber value={Number(arenaProfile?.arena?.totalMatches || 0)} />
                          </strong>
                        </span>
                        <span>
                          Tỷ lệ thắng:{" "}
                          <strong className="text-foreground">
                            <CountUpNumber value={Math.round(Number(arenaProfile?.arena?.winRate || 0))} />%
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigateAppTab("arena")}
                    className="gap-2 rounded-xl shrink-0"
                  >
                    <Swords className="h-4 w-4 text-rose-500" />
                    Vào Đấu trường
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "achievements" && (
          <motion.div
            key="profile-tab-achievements"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* Card 2b: Hồ sơ Năng lực (Pro Analytics) */}
            <Card className={`relative overflow-hidden ${hasProAnalytics ? "border-blue-500/30" : "border-amber-500/30"}`}>
              <div
                className={`absolute top-0 right-0 w-64 h-64 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none ${
                  hasProAnalytics
                    ? "bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent"
                    : "bg-gradient-to-bl from-amber-500/10 via-orange-500/5 to-transparent"
                }`}
              />
              <CardContent className="pt-6 relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart2 className={`h-6 w-6 ${hasProAnalytics ? "text-blue-500" : "text-amber-500"}`} />
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-violet-500">
                      Hồ sơ năng lực (Pro Analytics)
                    </h2>
                  </div>
                  {hasProAnalytics ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
                      <Crown className="h-3.5 w-3.5" />
                      Đã mở khóa ({userData?.tier})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 w-fit">
                      <Lock className="h-3.5 w-3.5" />
                      Đặc quyền PRO & ELITE
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Theo dõi chuyên sâu năng lực từ vựng thực chiến tại Đấu trường Arena với biểu đồ mạng nhện 6 kỹ năng, tỷ lệ thắng theo chủ đề, độ thuần thục CEFR (A1 - C2) và biểu đồ phong độ 10 trận gần nhất.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5 text-xs">
                  {[
                    "Độ chính xác & Tốc độ phản xạ",
                    "Từ vựng cốt lõi (A1 - B1) & nâng cao (B2 - C2)",
                    "Thành ngữ & Tâm lý 5 câu cuối trận",
                  ].map((label) => (
                    <div key={label} className="flex items-center gap-2 p-2.5 rounded-xl border bg-muted/30">
                      <Check className={`h-3.5 w-3.5 shrink-0 ${hasProAnalytics ? "text-emerald-500" : "text-muted-foreground"}`} />
                      <span className="text-muted-foreground font-medium">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => navigateAppTab("arena", "analytics")}
                    className={
                      hasProAnalytics
                        ? "gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                        : "gap-2 rounded-xl"
                    }
                    variant={hasProAnalytics ? "default" : "outline"}
                  >
                    <BarChart2 className="h-4 w-4" />
                    {hasProAnalytics ? "Mở Biểu đồ Năng lực 6D" : "Xem trước Radar Năng lực"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  {!hasProAnalytics && (
                    <Button
                      type="button"
                      onClick={() => navigateAppTab("subscription")}
                      className="gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-none"
                    >
                      <Crown className="h-4 w-4" />
                      Nâng cấp PRO / ELITE
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card: Huy hiệu & Thành tựu đạt được (dữ liệu thật từ /api/gamification/achievements) */}
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-amber-500" />
                      <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500">
                        Huy hiệu & Thành tựu
                      </h2>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Đã mở khóa <CountUpNumber value={unlockedAchievements.length} /> / {achievements.length} huy hiệu ({achievementCompletionPct}%)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigateAppTab("achievements")}
                    className="gap-1.5 rounded-xl w-fit"
                  >
                    Xem toàn bộ thành tựu
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {achievements.length > 0 && (
                  <AnimatedProgressBar
                    percent={achievementCompletionPct}
                    trackClassName="h-2.5 w-full bg-secondary rounded-full overflow-hidden"
                    barClassName="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 rounded-full"
                    showGloss={false}
                  />
                )}

                {sortedAchievements.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Chưa có dữ liệu thành tựu. Hãy bắt đầu luyện tập để mở khóa huy hiệu đầu tiên!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedAchievements.slice(0, 6).map((ach) => {
                      const isUnlocked = ach.is_unlocked === 1;
                      const target = Math.max(1, Number(ach.target_value || 1));
                      const progressPct = Math.min(100, (Number(ach.current_progress || 0) / target) * 100);
                      return (
                        <div
                          key={ach.achievement_id}
                          className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-shadow hover:shadow-md ${
                            isUnlocked
                              ? "border-emerald-500/35 bg-emerald-500/5"
                              : "bg-card opacity-90"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <motion.div
                              whileHover={{
                                scale: 1.1,
                                boxShadow: isUnlocked
                                  ? "0 0 18px rgba(16, 185, 129, 0.45)"
                                  : "0 0 12px rgba(99, 102, 241, 0.25)",
                              }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className={`p-2.5 rounded-xl shrink-0 cursor-default ${
                                isUnlocked
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              {renderAchievementIcon(ach.icon)}
                            </motion.div>
                            <Badge
                              variant={isUnlocked ? "default" : "secondary"}
                              className={
                                isUnlocked
                                  ? "bg-emerald-600 hover:bg-emerald-600 text-white text-[11px]"
                                  : "text-[11px]"
                              }
                            >
                              {isUnlocked ? "Đã mở khóa" : ach.category}
                            </Badge>
                          </div>

                          <div>
                            <h4 className="font-semibold text-sm leading-tight">{ach.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ach.description}</p>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between text-[11px] font-medium text-muted-foreground tabular-nums">
                              <span>Tiến trình</span>
                              <span>
                                {Math.min(Number(ach.current_progress || 0), target)} / {target}
                              </span>
                            </div>
                            <AnimatedProgressBar
                              percent={progressPct}
                              trackClassName="h-2 w-full bg-secondary rounded-full overflow-hidden"
                              barClassName={`h-full rounded-full ${
                                isUnlocked
                                  ? "bg-emerald-500"
                                  : "bg-gradient-to-r from-blue-500 to-indigo-500"
                              }`}
                              showGloss={false}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "creator" && (
          <motion.div
            key="profile-tab-creator"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Card 3: Creator Application */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-6 w-6 text-emerald-500" />
                  <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-400">
                    Chương trình Content Creator
                  </h2>
                </div>
                <p className="text-muted-foreground text-sm border-b pb-4 mb-6">
                  Trở thành nhà sáng tạo nội dung trên hệ thống LexiCore để tạo ra các bộ Flashcard, Courses và Exams chất lượng cho cộng đồng.
                </p>

                {userData?.role?.toLowerCase() === "content_creator" ? (
                  <div className="space-y-6">
                    <div className="space-y-3 mt-4 text-sm">
                      <div className="flex items-center gap-3">
                        <span>
                          Tham gia từ: {appData?.updated_at ? new Date(appData.updated_at).toLocaleDateString("vi-VN") : "Chưa rõ"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span>Trạng thái:</span>
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                              userData?.creator_status === "SUSPENDED"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            }`}
                          >
                            {userData?.creator_status === "SUSPENDED" ? "Đình chỉ" : "Hoạt động"}
                          </span>
                        </div>
                      </div>
                    </div>

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
                  <div className="space-y-6">
                    {appData.status === "PENDING" && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 flex items-start gap-4">
                        <Clock className="h-6 w-6 text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-yellow-700 dark:text-yellow-500">Đơn của bạn đang chờ duyệt</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Chúng tôi đang xem xét hồ sơ của bạn. Quá trình này có thể mất từ 1-3 ngày làm việc. Cảm ơn bạn đã kiên nhẫn.
                          </p>
                          <p className="text-xs text-muted-foreground mt-3">
                            Ngày nộp: {new Date(appData.created_at).toLocaleString("vi-VN")}
                          </p>
                        </div>
                      </div>
                    )}

                    {appData.status === "REJECTED" && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-5 flex items-start gap-4 mb-6">
                        <XCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                        <div className="w-full">
                          <h4 className="font-semibold text-destructive">Đơn xin đã bị từ chối</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Rất tiếc, đơn xin của bạn chưa đáp ứng đủ yêu cầu của chúng tôi vào lúc này.
                          </p>

                          {appData.admin_note && (
                            <div className="mt-3 p-3 bg-background rounded-lg border border-destructive/10 text-sm">
                              <span className="font-medium text-destructive">Lý do từ Admin: </span>
                              {appData.admin_note}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-3">
                            Ngày nộp: {new Date(appData.created_at).toLocaleString("vi-VN")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Bạn có thể nộp lại đơn mới sau 24 giờ kể từ khi bị từ chối.
                          </p>
                        </div>
                      </div>
                    )}

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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
