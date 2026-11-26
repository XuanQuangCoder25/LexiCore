import React, { useState, useEffect, useCallback } from "react";
import {
  Gift,
  Crown,
  Percent,
  ShieldAlert,
  Plus,
  Trash2,
  Power,
  Mail,
  Send,
  Calendar,
  Sparkles,
  RefreshCw,
  Coins,
  Gem,
  AlertTriangle,
  History,
  CheckCircle,
  XCircle,
  Clock,
  Megaphone,
  Tag,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";

// ============================================================
// Types
// ============================================================

interface RewardCampaign {
  id: string;
  name: string;
  description: string | null;
  coin_amount: number;
  diamond_amount: number;
  item_id: string | null;
  item_name?: string | null;
  fallback_coin: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  total_claims: number;
  status: "UPCOMING" | "ACTIVE" | "EXPIRED";
}

interface SubscriptionCampaign {
  id: string;
  name: string;
  tier: "STARTER" | "PRO" | "ELITE";
  duration_days: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  total_claims?: number;
}

interface PackageSaleItem {
  id: string;
  name: string;
  slug: string;
  package_type: string;
  tier: string | null;
  price_vnd: number;
  sale_percent: number;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  final_price_vnd: number;
  sale_status: "NONE" | "INCOMING" | "ACTIVE" | "EXPIRED";
  coin_amount: number;
  diamond_amount: number;
  duration_days: number | null;
}

interface SystemAnnouncement {
  id: string;
  type: "MAINTENANCE" | "ANNOUNCEMENT";
  title: string;
  message: string;
  is_maintenance_active: boolean;
  starts_at: string | null;
  estimated_end: string | null;
  created_at: string;
}

function toLocalDateTimeInput(date: Date): string {
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

interface EmailBlastLog {
  id: string;
  subject: string;
  target_audience: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  status: "PENDING" | "SENDING" | "DONE" | "FAILED";
  heading: string;
  created_at: string;
}

type PaymentAnnouncementType = "INFO" | "SALE" | "NEW_FEATURE" | "POLICY";

interface PaymentAnnouncement {
  id: string;
  title: string;
  content: string;
  type: PaymentAnnouncementType;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

const PAYMENT_ANN_TYPE_META: Record<PaymentAnnouncementType, { label: string; badgeClass: string }> = {
  NEW_FEATURE: { label: "Tính năng mới", badgeClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30" },
  SALE: { label: "Ưu đãi / Sale", badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30" },
  INFO: { label: "Sự kiện / Tin tức", badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30" },
  POLICY: { label: "Chính sách", badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
};

export function AdminMarketingView() {
  const [activeTab, setActiveTab] = useState<"rewards" | "subscriptions" | "sales" | "maintenance" | "announcements">("rewards");

  // Tab 1: Reward Campaigns
  const [rewards, setRewards] = useState<RewardCampaign[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [openRewardDialog, setOpenRewardDialog] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    name: "",
    description: "",
    coin_amount: 100,
    diamond_amount: 5,
    item_id: "",
    fallback_coin: 50,
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  });

  // Tab 2: Subscription Campaigns
  const [subCampaigns, setSubCampaigns] = useState<SubscriptionCampaign[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [openSubDialog, setOpenSubDialog] = useState(false);
  const [subForm, setSubForm] = useState({
    name: "",
    tier: "PRO" as "STARTER" | "PRO" | "ELITE",
    duration_days: 7,
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  });

  // Tab 3: Sales
  const [packages, setPackages] = useState<PackageSaleItem[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<PackageSaleItem | null>(null);
  const [openSaleDialog, setOpenSaleDialog] = useState(false);
  const [salePercentInput, setSalePercentInput] = useState(20);
  const [saleStartsAtInput, setSaleStartsAtInput] = useState("");
  const [saleEndsAtInput, setSaleEndsAtInput] = useState("");

  // Tab 4: Maintenance & Email Blast
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailBlastLog[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [openMaintenanceDialog, setOpenMaintenanceDialog] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: "Hệ thống đang tạm bảo trì nâng cấp",
    message: "Chúng tôi đang tiến hành bảo trì máy chủ để nâng cao trải nghiệm học tập. Dự kiến sẽ hoàn tất trong thời gian sớm nhất.",
    estimated_end: toLocalDateTimeInput(new Date(Date.now() + 2 * 3600000)),
    delay_minutes: 3,
    send_email: false,
  });
  const [emailBlastForm, setEmailBlastForm] = useState({
    target_audience: "ALL",
    subject: "",
    heading: "",
    message: "",
    badge_text: "Thông báo",
    badge_type: "info" as "info" | "warning" | "danger" | "success",
    action_text: "Truy cập LexiCore",
    action_url: "https://lexicore.site",
  });
  const [sendingBlast, setSendingBlast] = useState(false);

  // Tab 5: Thông báo Tab Thông tin Hội viên (payment_announcements)
  const [paymentAnnouncements, setPaymentAnnouncements] = useState<PaymentAnnouncement[]>([]);
  const [loadingPayAnnouncements, setLoadingPayAnnouncements] = useState(false);
  const [openPayAnnDialog, setOpenPayAnnDialog] = useState(false);
  const [payAnnForm, setPayAnnForm] = useState({
    type: "INFO" as PaymentAnnouncementType,
    title: "",
    content: "",
    starts_at: "",
    ends_at: "",
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const executeConfirmDialog = async () => {
    if (!confirmDialog || confirmBusy) return;
    setConfirmBusy(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  // ============================================================
  // Fetch Handlers
  // ============================================================

  const fetchRewards = useCallback(async () => {
    setLoadingRewards(true);
    try {
      const res = await fetch("/api/admin/campaigns/reward", { credentials: "include" });
      const json = await res.json();
      if (json.success) setRewards(json.data || []);
    } catch {
      toast.error("Không thể tải danh sách sự kiện quà tặng");
    } finally {
      setLoadingRewards(false);
    }
  }, []);

  const fetchSubs = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch("/api/admin/campaigns", { credentials: "include" });
      const json = await res.json();
      if (json.success) setSubCampaigns(json.data || []);
    } catch {
      toast.error("Không thể tải danh sách gói cước sự kiện");
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    setLoadingPackages(true);
    try {
      const res = await fetch("/api/admin/packages/with-sale", { credentials: "include" });
      const json = await res.json();
      if (json.success) setPackages(json.data || []);
    } catch {
      toast.error("Không thể tải bảng giá và giảm giá");
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  const fetchMaintenanceAndLogs = useCallback(async () => {
    setLoadingAnnouncements(true);
    try {
      const [annRes, logRes] = await Promise.all([
        fetch("/api/admin/system-announcements", { credentials: "include" }),
        fetch("/api/admin/email-blast/logs", { credentials: "include" }),
      ]);
      const annJson = await annRes.json();
      const logJson = await logRes.json();
      if (annJson.success) setAnnouncements(annJson.data || []);
      if (logJson.success) setEmailLogs(logJson.data || []);
    } catch {
      toast.error("Không thể tải trạng thái hệ thống và nhật ký email");
    } finally {
      setLoadingAnnouncements(false);
    }
  }, []);

  const fetchPaymentAnnouncements = useCallback(async () => {
    setLoadingPayAnnouncements(true);
    try {
      const res = await fetch("/api/admin/payment-announcements", { credentials: "include" });
      const json = await res.json();
      if (json.success) setPaymentAnnouncements(json.data || []);
    } catch {
      toast.error("Không thể tải danh sách thông báo hội viên");
    } finally {
      setLoadingPayAnnouncements(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "rewards") fetchRewards();
    if (activeTab === "subscriptions") fetchSubs();
    if (activeTab === "sales") fetchPackages();
    if (activeTab === "maintenance") fetchMaintenanceAndLogs();
    if (activeTab === "announcements") fetchPaymentAnnouncements();
  }, [activeTab, fetchRewards, fetchSubs, fetchPackages, fetchMaintenanceAndLogs, fetchPaymentAnnouncements]);

  // ============================================================
  // Action Handlers: Reward Campaigns
  // ============================================================

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/campaigns/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(rewardForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success(json.message || "Tạo chiến dịch quà tặng thành công!");
      setOpenRewardDialog(false);
      fetchRewards();
    } catch (err: any) {
      toast.error(err.message || "Có lỗi xảy ra khi tạo chiến dịch");
    }
  };

  const handleToggleReward = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/campaigns/reward/${id}/toggle`, {
        method: "PATCH",
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchRewards();
      }
    } catch {
      toast.error("Không thể thay đổi trạng thái chiến dịch");
    }
  };

  const handleDeleteReward = (id: string) => {
    setConfirmDialog({
      title: "Xóa chiến dịch quà tặng?",
      description: "Chiến dịch quà tặng này sẽ bị xóa vĩnh viễn và không thể khôi phục.",
      confirmLabel: "Xóa chiến dịch",
      destructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/campaigns/reward/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
          const json = await res.json();
          if (json.success) {
            toast.success(json.message);
            fetchRewards();
          }
        } catch {
          toast.error("Không thể xóa chiến dịch quà tặng");
        }
      },
    });
  };

  // ============================================================
  // Action Handlers: Subscription Campaigns
  // ============================================================

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(subForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Tạo gói cước sự kiện thành công!");
      setOpenSubDialog(false);
      fetchSubs();
    } catch (err: any) {
      toast.error(err.message || "Có lỗi xảy ra");
    }
  };

  const handleToggleSub = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/toggle`, {
        method: "PATCH",
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchSubs();
      }
    } catch {
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  const handleDeleteSub = (id: string) => {
    setConfirmDialog({
      title: "Xóa gói hội viên sự kiện?",
      description: "Gói sự kiện này sẽ bị xóa khỏi hệ thống và ngừng hiển thị với học viên.",
      confirmLabel: "Xóa gói sự kiện",
      destructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/campaigns/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
          const json = await res.json();
          if (json.success) {
            toast.success(json.message);
            fetchSubs();
          }
        } catch {
          toast.error("Không thể xóa gói sự kiện");
        }
      },
    });
  };

  // ============================================================
  // Action Handlers: Sale %
  // ============================================================

  const openSaleModal = (pkg: PackageSaleItem) => {
    setSelectedPkg(pkg);
    setSalePercentInput(pkg.sale_percent > 0 ? pkg.sale_percent : 20);
    setSaleStartsAtInput(pkg.sale_starts_at ? pkg.sale_starts_at.slice(0, 16) : "");
    setSaleEndsAtInput(
      pkg.sale_ends_at
        ? pkg.sale_ends_at.slice(0, 16)
        : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16)
    );
    setOpenSaleDialog(true);
  };

  const handleSaveSale = async (clearSale = false) => {
    if (!selectedPkg) return;
    const payload = {
      sale_percent: clearSale ? 0 : salePercentInput,
      sale_starts_at: clearSale ? null : saleStartsAtInput || null,
      sale_ends_at: clearSale ? null : saleEndsAtInput || null,
    };

    try {
      const res = await fetch(`/api/admin/packages/${selectedPkg.id}/sale`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success(json.message || "Cập nhật giảm giá thành công!");
      setOpenSaleDialog(false);
      fetchPackages();
    } catch (err: any) {
      toast.error(err.message || "Có lỗi xảy ra");
    }
  };

  // ============================================================
  // Action Handlers: Maintenance & Email Blast
  // ============================================================

  const activeMaintenance = announcements.find((a) => a.is_maintenance_active);
  const isMaintenanceCountdown = Boolean(
    activeMaintenance?.starts_at && new Date(activeMaintenance.starts_at).getTime() > Date.now()
  );

  const handleStartMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/maintenance/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(maintenanceForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success(json.message || "Đã kích hoạt chế độ bảo trì!");
      setOpenMaintenanceDialog(false);
      fetchMaintenanceAndLogs();
    } catch (err: any) {
      toast.error(err.message || "Không thể kích hoạt bảo trì");
    }
  };

  const handleEndMaintenance = () => {
    setConfirmDialog({
      title: isMaintenanceCountdown ? "Hủy lịch bảo trì sắp tới?" : "Tắt chế độ bảo trì hệ thống?",
      description: isMaintenanceCountdown
        ? "Lịch đếm ngược bảo trì sẽ được hủy và hệ thống tiếp tục hoạt động bình thường (bao gồm ghép trận Arena)."
        : "Hệ thống sẽ kết thúc bảo trì và mở lại quyền truy cập cho toàn bộ học viên ngay lập tức.",
      confirmLabel: isMaintenanceCountdown ? "Xác nhận hủy lịch" : "Tắt bảo trì ngay",
      destructive: !isMaintenanceCountdown,
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin/maintenance/end", {
            method: "PATCH",
            credentials: "include",
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          toast.success(json.message || "Đã tắt chế độ bảo trì!");
          fetchMaintenanceAndLogs();
        } catch (err: any) {
          toast.error(err.message || "Không thể tắt bảo trì");
        }
      },
    });
  };

  const handleSendEmailBlast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailBlastForm.subject || !emailBlastForm.heading || !emailBlastForm.message) {
      toast.error("Vui lòng điền đầy đủ chủ đề, tiêu đề và nội dung email!");
      return;
    }

    setConfirmDialog({
      title: "Xác nhận gửi email diện rộng?",
      description: `Hệ thống sẽ gửi email "${emailBlastForm.subject}" đến nhóm đối tượng [${emailBlastForm.target_audience}].`,
      confirmLabel: "Gửi email ngay",
      destructive: false,
      onConfirm: async () => {
        setSendingBlast(true);
        try {
          const res = await fetch("/api/admin/email-blast", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(emailBlastForm),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          toast.success(json.message || "Đã bắt đầu gửi email diện rộng!");
          setEmailBlastForm({
            target_audience: "ALL",
            subject: "",
            heading: "",
            message: "",
            badge_text: "Thông báo",
            badge_type: "info",
            action_text: "Truy cập LexiCore",
            action_url: "https://lexicore.site",
          });
          fetchMaintenanceAndLogs();
        } catch (err: any) {
          toast.error(err.message || "Không thể gửi email");
        } finally {
          setSendingBlast(false);
        }
      },
    });
  };

  // ============================================================
  // Action Handlers: Payment Announcements (Tab Thông tin Hội viên)
  // ============================================================

  const handleCreatePayAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/payment-announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: payAnnForm.type,
          title: payAnnForm.title,
          content: payAnnForm.content,
          starts_at: payAnnForm.starts_at || null,
          ends_at: payAnnForm.ends_at || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success(json.message || "Đã đăng thông báo mới!");
      setOpenPayAnnDialog(false);
      setPayAnnForm({ type: "INFO", title: "", content: "", starts_at: "", ends_at: "" });
      fetchPaymentAnnouncements();
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo thông báo");
    }
  };

  const handleTogglePayAnnouncement = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/payment-announcements/${id}/toggle`, {
        method: "PATCH",
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchPaymentAnnouncements();
      }
    } catch {
      toast.error("Không thể cập nhật trạng thái thông báo");
    }
  };

  const handleDeletePayAnnouncement = (id: string) => {
    setConfirmDialog({
      title: "Xóa thông báo này?",
      description: "Thông báo sẽ bị xóa vĩnh viễn khỏi Tab Thông tin của người dùng.",
      confirmLabel: "Xóa thông báo",
      destructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/payment-announcements/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
          const json = await res.json();
          if (json.success) {
            toast.success(json.message);
            fetchPaymentAnnouncements();
          }
        } catch {
          toast.error("Không thể xóa thông báo");
        }
      },
    });
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl border bg-card shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Marketing & Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý các đợt giảm giá, sự kiện tặng quà Coin/Diamond, gói cước sự kiện, bảo trì máy chủ và gửi email diện rộng.
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-muted/60 p-1.5 rounded-xl gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("rewards")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === "rewards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Gift className="h-4 w-4 text-emerald-500" />
          <span>Quà tặng sự kiện</span>
        </button>

        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === "subscriptions" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Crown className="h-4 w-4 text-amber-500" />
          <span>Gói Hội viên sự kiện</span>
        </button>

        <button
          onClick={() => setActiveTab("sales")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === "sales" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Percent className="h-4 w-4 text-rose-500" />
          <span>Giảm giá các gói (21 gói)</span>
        </button>

        <button
          onClick={() => setActiveTab("maintenance")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === "maintenance" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldAlert className="h-4 w-4 text-sky-500" />
          <span>Bảo trì & Gửi Email</span>
        </button>

        <button
          onClick={() => setActiveTab("announcements")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === "announcements" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Megaphone className="h-4 w-4 text-indigo-500" />
          <span>Thông báo Gói</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: REWARD CAMPAIGNS                                       */}
      {/* ============================================================ */}
      {activeTab === "rewards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Chiến dịch tặng quà (Coin, Diamond, Item)</h2>
              <p className="text-xs text-muted-foreground">
                Tự động bắn thông báo chuông cho học viên. Học viên bấm vào chuông để nhận quà ngay tại chỗ.
              </p>
            </div>
            <Button onClick={() => setOpenRewardDialog(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4" /> Tạo chiến dịch mới
            </Button>
          </div>

          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3 sm:p-4">Tên chiến dịch</th>
                    <th className="p-3 sm:p-4">Phần thưởng</th>
                    <th className="p-3 sm:p-4">Thời gian</th>
                    <th className="p-3 sm:p-4 text-center">Trạng thái</th>
                    <th className="p-3 sm:p-4 text-center">Lượt nhận</th>
                    <th className="p-3 sm:p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loadingRewards ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">Đang tải dữ liệu...</td>
                    </tr>
                  ) : rewards.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">Chưa có chiến dịch quà tặng nào</td>
                    </tr>
                  ) : (
                    rewards.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="p-3 sm:p-4">
                          <p className="font-bold text-foreground">{r.name}</p>
                          {r.description && <p className="text-xs text-muted-foreground line-clamp-1">{r.description}</p>}
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {r.coin_amount > 0 && (
                              <Badge variant="outline" className="text-[11px] gap-1 text-emerald-600 border-emerald-500/30">
                                <Coins className="h-3 w-3" /> +{r.coin_amount.toLocaleString("vi-VN")}
                              </Badge>
                            )}
                            {r.diamond_amount > 0 && (
                              <Badge variant="outline" className="text-[11px] gap-1 text-fuchsia-600 border-fuchsia-500/30">
                                <Gem className="h-3 w-3" /> +{r.diamond_amount.toLocaleString("vi-VN")}
                              </Badge>
                            )}
                            {r.item_name && (
                              <Badge variant="outline" className="text-[11px] gap-1 text-sky-600 border-sky-500/30">
                                <Sparkles className="h-3 w-3" /> {r.item_name}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 text-xs font-mono">
                          <p>{new Date(r.starts_at).toLocaleDateString("vi-VN")}</p>
                          <p className="text-muted-foreground">đến {new Date(r.ends_at).toLocaleDateString("vi-VN")}</p>
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                          {r.status === "ACTIVE" && r.is_active && (
                            <Badge className="bg-emerald-500 text-white text-[10px]">Đang chạy</Badge>
                          )}
                          {r.status === "UPCOMING" && r.is_active && (
                            <Badge variant="secondary" className="text-[10px] text-blue-600">Sắp diễn ra</Badge>
                          )}
                          {r.status === "EXPIRED" && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">Đã kết thúc</Badge>
                          )}
                          {!r.is_active && (
                            <Badge variant="destructive" className="text-[10px]">Đã tạm dừng</Badge>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 text-center font-bold">{r.total_claims}</td>
                        <td className="p-3 sm:p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleToggleReward(r.id)}
                              title={r.is_active ? "Tạm dừng" : "Kích hoạt"}
                            >
                              <Power className={`h-4 w-4 ${r.is_active ? "text-emerald-600" : "text-muted-foreground"}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteReward(r.id)}
                              title="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: SUBSCRIPTION CAMPAIGNS                                 */}
      {/* ============================================================ */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Gói Hội viên sự kiện (Credit Packages)</h2>
              <p className="text-xs text-muted-foreground">
                Tạo gói trải nghiệm miễn phí hiển thị trực tiếp trên trang Subscription cùng với các gói tháng đại diện.
              </p>
            </div>
            <Button onClick={() => setOpenSubDialog(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="h-4 w-4" /> Tạo gói sự kiện mới
            </Button>
          </div>

          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3 sm:p-4">Tên sự kiện</th>
                    <th className="p-3 sm:p-4">Hạng gói (Tier)</th>
                    <th className="p-3 sm:p-4">Thời hạn quà tặng</th>
                    <th className="p-3 sm:p-4">Thời gian áp dụng</th>
                    <th className="p-3 sm:p-4 text-center">Trạng thái</th>
                    <th className="p-3 sm:p-4 text-center">Lượt nhận</th>
                    <th className="p-3 sm:p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loadingSubs ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">Đang tải dữ liệu...</td>
                    </tr>
                  ) : subCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">Chưa có gói hội viên sự kiện nào</td>
                    </tr>
                  ) : (
                    subCampaigns.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/20">
                        <td className="p-3 sm:p-4 font-bold text-foreground">{s.name}</td>
                        <td className="p-3 sm:p-4">
                          <Badge
                            className={`text-[11px] ${
                              s.tier === "ELITE" ? "bg-amber-500 text-white" : s.tier === "PRO" ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
                            }`}
                          >
                            {s.tier}
                          </Badge>
                        </td>
                        <td className="p-3 sm:p-4 font-semibold">{s.duration_days} ngày</td>
                        <td className="p-3 sm:p-4 text-xs font-mono">
                          <p>{new Date(s.starts_at).toLocaleDateString("vi-VN")}</p>
                          <p className="text-muted-foreground">đến {new Date(s.ends_at).toLocaleDateString("vi-VN")}</p>
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                          {s.is_active ? (
                            <Badge className="bg-emerald-500 text-white text-[10px]">Đang chạy</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">Tạm dừng</Badge>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 text-center font-bold">{s.total_claims ?? 0}</td>
                        <td className="p-3 sm:p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleToggleSub(s.id)}
                            >
                              <Power className={`h-4 w-4 ${s.is_active ? "text-emerald-600" : "text-muted-foreground"}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteSub(s.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: SALE % MANAGEMENT (21 PACKAGES)                        */}
      {/* ============================================================ */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Ban hành giảm giá (% Sale)</h2>
              <p className="text-xs text-muted-foreground">
                Quản lý mức giảm giá cho 21 gói: 9 gói hội viên, 6 gói Coin, và 6 gói Diamond. Hệ thống tự động tính runtime không cần cronjob.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPackages} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Làm mới
            </Button>
          </div>

          {/* Nhóm 1: Gói Hội viên (9 gói) */}
          <PackageSaleSection
            title="Gói Hội viên Subscription (9 gói)"
            icon={<Crown className="h-4 w-4 text-amber-500" />}
            items={packages.filter((p) => p.package_type === "SUBSCRIPTION" && !p.slug.includes("trial"))}
            onOpenModal={openSaleModal}
          />

          {/* Nhóm 2: Gói Coin (6 gói) */}
          <PackageSaleSection
            title="Gói nạp Coin (6 gói)"
            icon={<Coins className="h-4 w-4 text-emerald-500" />}
            items={packages.filter((p) => p.package_type === "COIN_PACK")}
            onOpenModal={openSaleModal}
          />

          {/* Nhóm 3: Gói Diamond (6 gói) */}
          <PackageSaleSection
            title="Gói nạp Diamond (6 gói)"
            icon={<Gem className="h-4 w-4 text-fuchsia-500" />}
            items={packages.filter((p) => p.package_type === "DIAMOND_PACK")}
            onOpenModal={openSaleModal}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: MAINTENANCE & EMAIL BLAST                              */}
      {/* ============================================================ */}
      {activeTab === "maintenance" && (
        <div className="space-y-6">
          {/* Card 1: Chế độ bảo trì */}
          <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                  Chế độ bảo trì máy chủ khẩn cấp
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Khi bật chế độ này, toàn bộ học viên truy cập vào LexiCore sẽ nhìn thấy màn hình bảo trì trang nhã trên tấm nền đặc biệt. Admin vẫn có thể truy cập để kiểm tra hệ thống.
                </p>
              </div>

              {activeMaintenance ? (
                <Button variant="destructive" onClick={handleEndMaintenance} className="gap-2 shrink-0">
                  <Power className="h-4 w-4" /> {isMaintenanceCountdown ? "Hủy lịch bảo trì" : "Tắt bảo trì ngay"}
                </Button>
              ) : (
                <Button
                  onClick={() => setOpenMaintenanceDialog(true)}
                  className="gap-2 bg-rose-600 hover:bg-rose-700 text-white shrink-0"
                >
                  <AlertTriangle className="h-4 w-4" /> Kích hoạt bảo trì hệ thống
                </Button>
              )}
            </div>

            {activeMaintenance && (
              <div
                className={`p-4 rounded-xl border space-y-1 text-xs ${
                  isMaintenanceCountdown
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                }`}
              >
                <p className="font-bold text-sm">
                  {isMaintenanceCountdown
                    ? `Đang đếm ngược chuẩn bị bảo trì (bắt đầu lúc ${new Date(activeMaintenance.starts_at!).toLocaleTimeString("vi-VN")})`
                    : "Hệ thống đang trong chế độ bảo trì chính thức!"}
                </p>
                <p>Tiêu đề: {activeMaintenance.title}</p>
                <p>Nội dung: {activeMaintenance.message}</p>
                {activeMaintenance.estimated_end && (
                  <p>Dự kiến hoàn tất: {new Date(activeMaintenance.estimated_end).toLocaleString("vi-VN")}</p>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Gửi Email diện rộng */}
          <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Mail className="h-5 w-5 text-sky-500" />
                Gửi Email diện rộng cho Học viên (Email Blast)
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Gửi thông báo kỹ thuật, cập nhật điều khoản hoặc khuyến mãi lớn đến toàn bộ hoặc từng nhóm học viên mục tiêu.
              </p>
            </div>

            <form onSubmit={handleSendEmailBlast} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Đối tượng nhận thư</label>
                  <select
                    className="w-full h-10 px-3 rounded-lg border bg-background text-foreground text-xs"
                    value={emailBlastForm.target_audience}
                    onChange={(e) => setEmailBlastForm({ ...emailBlastForm, target_audience: e.target.value })}
                  >
                    <option value="ALL">Tất cả học viên (Đang hoạt động)</option>
                    <option value="CREATORS">Chỉ Content Creators</option>
                    <option value="STARTER">Học viên gói Starter</option>
                    <option value="PRO">Học viên gói Pro</option>
                    <option value="ELITE">Học viên gói Elite</option>
                    <option value="FREE">Học viên chưa đăng ký gói (Free)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Chủ đề thư (Subject hiển thị trên hòm thư)</label>
                  <Input
                    placeholder="Ví dụ: [LexiCore] Thông báo quan trọng về chính sách học tập"
                    value={emailBlastForm.subject}
                    onChange={(e) => setEmailBlastForm({ ...emailBlastForm, subject: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="font-semibold block mb-1">Tiêu đề lớn trong nội dung thư (Heading)</label>
                  <Input
                    placeholder="Ví dụ: Cập nhật điều khoản dịch vụ và ưu đãi đặc quyền"
                    value={emailBlastForm.heading}
                    onChange={(e) => setEmailBlastForm({ ...emailBlastForm, heading: e.target.value })}
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Huy hiệu góc trên (Badge)</label>
                  <Input
                    placeholder="Ví dụ: Quan trọng / Ưu đãi"
                    value={emailBlastForm.badge_text}
                    onChange={(e) => setEmailBlastForm({ ...emailBlastForm, badge_text: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Nội dung thư chi tiết</label>
                <Textarea
                  rows={4}
                  placeholder="Nhập nội dung thư gửi đến người dùng..."
                  value={emailBlastForm.message}
                  onChange={(e) => setEmailBlastForm({ ...emailBlastForm, message: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Tên nút hành động (Tùy chọn)</label>
                  <Input
                    placeholder="Ví dụ: Vào học ngay"
                    value={emailBlastForm.action_text}
                    onChange={(e) => setEmailBlastForm({ ...emailBlastForm, action_text: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Đường dẫn khi bấm nút (Tùy chọn)</label>
                  <Input
                    placeholder="Ví dụ: https://lexicore.site"
                    value={emailBlastForm.action_url}
                    onChange={(e) => setEmailBlastForm({ ...emailBlastForm, action_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={sendingBlast} className="gap-2 bg-sky-600 hover:bg-sky-700 text-white">
                  <Send className="h-4 w-4" /> {sendingBlast ? "Đang tiến hành gửi..." : "Tiến hành gửi thư"}
                </Button>
              </div>
            </form>
          </div>

          {/* Card 3: Nhật ký gửi email */}
          <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Nhật ký gửi email diện rộng gần đây
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Chủ đề</th>
                    <th className="p-3">Đối tượng</th>
                    <th className="p-3 text-center">Tổng nhận</th>
                    <th className="p-3 text-center">Thành công</th>
                    <th className="p-3 text-center">Thất bại</th>
                    <th className="p-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {emailLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-muted-foreground">Chưa có lịch sử gửi email diện rộng</td>
                    </tr>
                  ) : (
                    emailLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="p-3 font-mono">{new Date(log.created_at).toLocaleString("vi-VN")}</td>
                        <td className="p-3 font-semibold text-foreground">{log.subject}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">{log.target_audience}</Badge>
                        </td>
                        <td className="p-3 text-center font-bold">{log.total_recipients}</td>
                        <td className="p-3 text-center text-emerald-600 font-semibold">{log.sent_count}</td>
                        <td className="p-3 text-center text-rose-500 font-semibold">{log.failed_count}</td>
                        <td className="p-3 text-center">
                          {log.status === "DONE" && <Badge className="bg-emerald-600 text-white text-[10px]">Hoàn tất</Badge>}
                          {log.status === "SENDING" && <Badge variant="secondary" className="text-[10px] animate-pulse">Đang gửi</Badge>}
                          {log.status === "FAILED" && <Badge variant="destructive" className="text-[10px]">Thất bại</Badge>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: PAYMENT ANNOUNCEMENTS (Tab Thông tin SubscriptionModal)*/}
      {/* ============================================================ */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Thông báo hiển thị trên Tab &quot;Thông tin và chính sách&quot;</h2>
              <p className="text-xs text-muted-foreground">
                Đăng tin sự kiện, ưu đãi Sale, tính năng mới hoặc chính sách gói hội viên. Chỉ các thông báo đang bật mới hiện phía trên Bảng giá.
              </p>
            </div>
            <Button onClick={() => setOpenPayAnnDialog(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
              <Plus className="h-4 w-4" /> Tạo thông báo mới
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingPayAnnouncements ? (
              <div className="col-span-full py-12 text-center text-sm text-muted-foreground">Đang tải dữ liệu...</div>
            ) : paymentAnnouncements.length === 0 ? (
              <div className="col-span-full py-12 text-center text-sm text-muted-foreground border rounded-2xl border-dashed">
                Chưa có thông báo nào. Bấm &quot;Tạo thông báo mới&quot; để đăng tin cho học viên.
              </div>
            ) : (
              paymentAnnouncements.map((ann) => {
                const meta = PAYMENT_ANN_TYPE_META[ann.type] || PAYMENT_ANN_TYPE_META.INFO;
                return (
                  <div key={ann.id} className={`p-5 rounded-2xl border bg-card shadow-sm flex flex-col justify-between gap-3 ${!ann.is_active ? "opacity-60" : ""}`}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={`text-[11px] font-semibold ${meta.badgeClass}`}>
                          {meta.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(ann.created_at).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-foreground">{ann.title}</h3>
                      <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{ann.content}</p>
                      {(ann.starts_at || ann.ends_at) && (
                        <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {ann.starts_at ? `Từ ${new Date(ann.starts_at).toLocaleString("vi-VN")}` : "Hiển thị ngay"}
                            {ann.ends_at ? ` - Đến ${new Date(ann.ends_at).toLocaleString("vi-VN")}` : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t text-xs">
                      <span className={`font-semibold ${ann.is_active ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {ann.is_active ? "Đang hiển thị" : "Đang ẩn"}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleTogglePayAnnouncement(ann.id)}>
                          <Power className="h-3.5 w-3.5 mr-1" /> {ann.is_active ? "Ẩn" : "Bật"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-500/10" onClick={() => handleDeletePayAnnouncement(ann.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DIALOGS                                                       */}
      {/* ============================================================ */}

      {/* Dialog tạo Reward Campaign */}
      <Dialog open={openRewardDialog} onOpenChange={setOpenRewardDialog}>
        <DialogContent className="max-w-md w-[92vw]">
          <DialogHeader>
            <DialogTitle>Tạo chiến dịch quà tặng mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateReward} className="space-y-3 text-xs sm:text-sm">
            <div>
              <label className="font-semibold block mb-1">Tên sự kiện</label>
              <Input
                placeholder="Ví dụ: Halloween 2026 - Tặng quà học tập"
                value={rewardForm.name}
                onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Mô tả hiển thị trong hộp quà</label>
              <Textarea
                rows={2}
                placeholder="Ví dụ: Món quà tri ân nhân dịp Halloween dành cho các học viên chăm chỉ."
                value={rewardForm.description}
                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Số Coin tặng</label>
                <Input
                  type="number"
                  min={0}
                  value={rewardForm.coin_amount}
                  onChange={(e) => setRewardForm({ ...rewardForm, coin_amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Số Diamond tặng</label>
                <Input
                  type="number"
                  min={0}
                  value={rewardForm.diamond_amount}
                  onChange={(e) => setRewardForm({ ...rewardForm, diamond_amount: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Coin đền bù nếu học viên đã có Avatar/Ảnh bìa</label>
              <Input
                type="number"
                min={0}
                value={rewardForm.fallback_coin}
                onChange={(e) => setRewardForm({ ...rewardForm, fallback_coin: Number(e.target.value) })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Bắt đầu lúc</label>
                <Input
                  type="datetime-local"
                  value={rewardForm.starts_at}
                  onChange={(e) => setRewardForm({ ...rewardForm, starts_at: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Kết thúc lúc</label>
                <Input
                  type="datetime-local"
                  value={rewardForm.ends_at}
                  onChange={(e) => setRewardForm({ ...rewardForm, ends_at: e.target.value })}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenRewardDialog(false)}>Hủy</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Tạo sự kiện</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog tạo Subscription Campaign */}
      <Dialog open={openSubDialog} onOpenChange={setOpenSubDialog}>
        <DialogContent className="max-w-md w-[92vw]">
          <DialogHeader>
            <DialogTitle>Tạo gói Hội viên sự kiện</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSub} className="space-y-3 text-xs sm:text-sm">
            <div>
              <label className="font-semibold block mb-1">Tên sự kiện</label>
              <Input
                placeholder="Ví dụ: Mừng tựu trường - Tặng gói Elite"
                value={subForm.name}
                onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Hạng gói (Tier)</label>
                <select
                  className="w-full h-10 px-3 rounded-lg border bg-background text-foreground text-xs"
                  value={subForm.tier}
                  onChange={(e) => setSubForm({ ...subForm, tier: e.target.value as any })}
                >
                  <option value="STARTER">STARTER</option>
                  <option value="PRO">PRO</option>
                  <option value="ELITE">ELITE</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Thời hạn tặng (Số ngày)</label>
                <Input
                  type="number"
                  min={1}
                  value={subForm.duration_days}
                  onChange={(e) => setSubForm({ ...subForm, duration_days: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Bắt đầu lúc</label>
                <Input
                  type="datetime-local"
                  value={subForm.starts_at}
                  onChange={(e) => setSubForm({ ...subForm, starts_at: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Kết thúc lúc</label>
                <Input
                  type="datetime-local"
                  value={subForm.ends_at}
                  onChange={(e) => setSubForm({ ...subForm, ends_at: e.target.value })}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenSubDialog(false)}>Hủy</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">Tạo gói sự kiện</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog thiết lập Sale % */}
      <Dialog open={openSaleDialog} onOpenChange={setOpenSaleDialog}>
        <DialogContent className="max-w-md w-[92vw]">
          <DialogHeader>
            <DialogTitle>Thiết lập giảm giá: {selectedPkg?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-3 bg-muted/50 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giá gốc:</span>
                <span className="font-bold">{selectedPkg?.price_vnd.toLocaleString("vi-VN")} đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giá sau giảm ({salePercentInput}%):</span>
                <span className="font-bold text-rose-600">
                  {Math.round((selectedPkg?.price_vnd || 0) * (1 - salePercentInput / 100)).toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Mức giảm giá (% Sale)</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={salePercentInput}
                  onChange={(e) => setSalePercentInput(Number(e.target.value))}
                />
                <span className="font-bold text-base">%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Bắt đầu từ (Tùy chọn)</label>
                <Input
                  type="datetime-local"
                  value={saleStartsAtInput}
                  onChange={(e) => setSaleStartsAtInput(e.target.value)}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Kết thúc vào (Bắt buộc)</label>
                <Input
                  type="datetime-local"
                  value={saleEndsAtInput}
                  onChange={(e) => setSaleEndsAtInput(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2 flex justify-between sm:justify-between">
              {selectedPkg && selectedPkg.sale_percent > 0 && (
                <Button type="button" variant="destructive" onClick={() => handleSaveSale(true)}>
                  Hủy giảm giá
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => setOpenSaleDialog(false)}>Đóng</Button>
                <Button type="button" onClick={() => handleSaveSale(false)} className="bg-rose-600 hover:bg-rose-700 text-white">
                  Áp dụng
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog kích hoạt bảo trì */}
      <Dialog open={openMaintenanceDialog} onOpenChange={setOpenMaintenanceDialog}>
        <DialogContent className="max-w-md w-[92vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" /> Kích hoạt chế độ bảo trì máy chủ
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStartMaintenance} className="space-y-3 text-xs sm:text-sm">
            <div>
              <label className="font-semibold block mb-1">Tiêu đề thông báo bảo trì</label>
              <Input
                value={maintenanceForm.title}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Nội dung giải thích cho học viên</label>
              <Textarea
                rows={3}
                value={maintenanceForm.message}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, message: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="font-semibold block mb-1.5">Chế độ kích hoạt</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() =>
                    setMaintenanceForm((prev) => ({
                      ...prev,
                      delay_minutes: prev.delay_minutes === 0 ? 3 : prev.delay_minutes,
                    }))
                  }
                  className={`px-3 py-2 rounded-lg border text-left transition ${
                    maintenanceForm.delay_minutes > 0
                      ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="text-xs font-bold">Có báo trước (Khuyến nghị)</div>
                  <div className="text-[11px] opacity-80">Đếm ngược &amp; khóa tìm trận mới</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMaintenanceForm((prev) => ({ ...prev, delay_minutes: 0 }))}
                  className={`px-3 py-2 rounded-lg border text-left transition ${
                    maintenanceForm.delay_minutes === 0
                      ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="text-xs font-bold">Khẩn cấp ngay lập tức</div>
                  <div className="text-[11px] opacity-80">Khóa app ngay &amp; hủy trận dở an toàn</div>
                </button>
              </div>

              {maintenanceForm.delay_minutes > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground shrink-0">Thời gian đếm ngược:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {[1, 3, 5, 10].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMaintenanceForm((prev) => ({ ...prev, delay_minutes: m }))}
                        className={`px-2.5 py-1 rounded-md text-xs border transition ${
                          maintenanceForm.delay_minutes === m
                            ? "bg-amber-500 text-white border-amber-500 font-semibold"
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        {m} phút
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {maintenanceForm.delay_minutes > 0
                  ? `Học viên nhận thanh đếm ngược ${maintenanceForm.delay_minutes} phút để hoàn tất bài học / trận Arena đang dở. Khi hết giờ mới khóa màn hình.`
                  : "Chuyển toàn bộ học viên sang màn hình bảo trì ngay; các trận Arena đang diễn ra sẽ được hủy an toàn (không tính thua/hòa, giữ nguyên Rank & Streak)."}
              </p>
            </div>

            <div>
              <label className="font-semibold block mb-1">Thời gian dự kiến hoàn tất</label>
              <Input
                type="datetime-local"
                value={maintenanceForm.estimated_end}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, estimated_end: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="send_email_checkbox"
                className="rounded border-zinc-700"
                checked={maintenanceForm.send_email}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, send_email: e.target.checked })}
              />
              <label htmlFor="send_email_checkbox" className="text-xs cursor-pointer select-none">
                Gửi email thông báo bảo trì cho toàn bộ học viên ngay
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenMaintenanceDialog(false)}>Hủy</Button>
              <Button type="submit" variant="destructive">Xác nhận kích hoạt bảo trì</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog tạo Thông báo Tab Thông tin Hội viên */}
      <Dialog open={openPayAnnDialog} onOpenChange={setOpenPayAnnDialog}>
        <DialogContent className="max-w-lg w-[92vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-indigo-500" /> Tạo thông báo Tab Thông tin Gói
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePayAnnouncement} className="space-y-3 text-xs sm:text-sm">
            <div>
              <label className="font-semibold block mb-1">Loại thông báo</label>
              <select
                className="w-full h-10 px-3 rounded-lg border bg-background text-foreground text-xs"
                value={payAnnForm.type}
                onChange={(e) => setPayAnnForm({ ...payAnnForm, type: e.target.value as PaymentAnnouncementType })}
              >
                <option value="INFO">Sự kiện / Tin tức (INFO)</option>
                <option value="NEW_FEATURE">Tính năng mới (NEW_FEATURE)</option>
                <option value="SALE">Ưu đãi / Giảm giá (SALE)</option>
                <option value="POLICY">Cập nhật chính sách (POLICY)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Tiêu đề</label>
              <Input
                placeholder="Ví dụ: Mừng Ngày Nhà giáo Việt Nam 20/11"
                value={payAnnForm.title}
                onChange={(e) => setPayAnnForm({ ...payAnnForm, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Nội dung chi tiết</label>
              <Textarea
                rows={4}
                placeholder="Ví dụ: Nhân ngày Nhà giáo Việt Nam, LexiCore hân hạnh tặng học viên gói Starter dùng thử miễn phí..."
                value={payAnnForm.content}
                onChange={(e) => setPayAnnForm({ ...payAnnForm, content: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Bắt đầu (Bỏ trống = Ngay)</label>
                <Input
                  type="datetime-local"
                  value={payAnnForm.starts_at}
                  onChange={(e) => setPayAnnForm({ ...payAnnForm, starts_at: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Kết thúc (Bỏ trống = Vô hạn)</label>
                <Input
                  type="datetime-local"
                  value={payAnnForm.ends_at}
                  onChange={(e) => setPayAnnForm({ ...payAnnForm, ends_at: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenPayAnnDialog(false)}>Hủy</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Đăng thông báo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận thao tác dùng chung (thay thế window.confirm) */}
      <Dialog open={Boolean(confirmDialog)} onOpenChange={(open) => { if (!open && !confirmBusy) setConfirmDialog(null); }}>
        <DialogContent className="max-w-md w-[92vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 shrink-0 ${confirmDialog?.destructive ? "text-rose-500" : "text-amber-500"}`} />
              <span>{confirmDialog?.title}</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {confirmDialog?.description}
          </p>
          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={confirmBusy}
              onClick={() => setConfirmDialog(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant={confirmDialog?.destructive ? "destructive" : "default"}
              disabled={confirmBusy}
              onClick={executeConfirmDialog}
            >
              {confirmBusy ? "Đang xử lý..." : (confirmDialog?.confirmLabel || "Xác nhận")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Sub-component: Khối hiển thị bảng gói cước Sale %
// ============================================================

function PackageSaleSection({
  title,
  icon,
  items,
  onOpenModal,
}: {
  title: string;
  icon: React.ReactNode;
  items: PackageSaleItem[];
  onOpenModal: (pkg: PackageSaleItem) => void;
}) {
  return (
    <div className="p-5 rounded-2xl border bg-card shadow-sm space-y-3">
      <h3 className="text-sm font-bold flex items-center gap-2">
        {icon} {title}
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-muted/40 border-b text-muted-foreground font-semibold">
            <tr>
              <th className="p-3">Tên gói</th>
              <th className="p-3">Giá gốc</th>
              <th className="p-3 text-center">Giảm giá (% Sale)</th>
              <th className="p-3 text-center">Giá sau giảm</th>
              <th className="p-3 text-center">Trạng thái</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {items.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-muted/20">
                <td className="p-3 font-semibold text-foreground">{pkg.name}</td>
                <td className="p-3 text-muted-foreground">{pkg.price_vnd.toLocaleString("vi-VN")} đ</td>
                <td className="p-3 text-center">
                  {pkg.sale_percent > 0 ? (
                    <Badge variant="destructive" className="text-xs font-bold">
                      -{pkg.sale_percent}%
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-3 text-center font-bold text-rose-600">
                  {pkg.sale_percent > 0 ? `${pkg.final_price_vnd.toLocaleString("vi-VN")} đ` : "-"}
                </td>
                <td className="p-3 text-center">
                  {pkg.sale_status === "ACTIVE" && (
                    <Badge className="bg-emerald-500 text-white text-[10px]">Đang giảm</Badge>
                  )}
                  {pkg.sale_status === "INCOMING" && (
                    <Badge variant="secondary" className="text-[10px] text-blue-600">Sắp diễn ra</Badge>
                  )}
                  {pkg.sale_status === "EXPIRED" && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Đã hết hạn</Badge>
                  )}
                  {pkg.sale_status === "NONE" && (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenModal(pkg)}>
                    Thiết lập Sale
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
