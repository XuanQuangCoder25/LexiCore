import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  Crown,
  Zap,
  Star,
  FileText,
  Sparkles,
  Gift,
  Loader2,
} from "lucide-react";
import {
  CreditPackage,
  GroupedPackages,
  MOCK_DATA,
  formatVND,
  getFinalPrice,
  getDurationLabel,
  SubscriptionFlipCard,
} from "./subscription-cards";

// ============================================================
// Types
// ============================================================
export interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  initialPackageId?: string;
  initialTab?: "subscription" | "info";
  onBuyPackage?: (pkg: CreditPackage) => void;
  onSuccess?: () => void;
}
export type PremiumModalProps = SubscriptionModalProps;

// ============================================================
// Tab Thông tin và chính sách content
// ============================================================
function InfoTabContent() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-160px)] text-foreground">
      {/* 1. Bảng giá niêm yết chuẩn */}
      <Section title="Bảng giá niêm yết các gói Hội viên">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse text-left">
            <thead>
              <tr className="bg-muted/70 text-foreground border-b">
                <th className="p-2.5 font-bold rounded-tl-lg">Hạng gói (Tier)</th>
                <th className="p-2.5 font-bold text-center">Gói Tuần (7 ngày)</th>
                <th className="p-2.5 font-bold text-center">Gói Tháng (30 ngày)</th>
                <th className="p-2.5 font-bold text-center rounded-tr-lg">Gói Năm (365 ngày)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="p-2.5 font-bold text-emerald-600 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" /> Gói Starter
                </td>
                <td className="p-2.5 text-center font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.03]">
                  9.000 ₫
                </td>
                <td className="p-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.08]">
                  19.000 ₫
                </td>
                <td className="p-2.5 text-center font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/[0.15]">
                  159.000 ₫
                </td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="p-2.5 font-bold text-blue-600 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Gói Pro
                </td>
                <td className="p-2.5 text-center font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/[0.03]">
                  15.000 ₫
                </td>
                <td className="p-2.5 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-500/[0.08]">
                  35.000 ₫
                </td>
                <td className="p-2.5 text-center font-bold text-blue-700 dark:text-blue-300 bg-blue-500/[0.15]">
                  269.000 ₫
                </td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="p-2.5 font-bold text-amber-600 flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5" /> Gói Elite
                </td>
                <td className="p-2.5 text-center font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/[0.03]">
                  25.000 ₫
                </td>
                <td className="p-2.5 text-center font-bold text-amber-600 dark:text-amber-400 bg-amber-500/[0.08]">
                  49.000 ₫
                </td>
                <td className="p-2.5 text-center font-bold text-amber-700 dark:text-amber-300 bg-amber-500/[0.15]">
                  349.000 ₫
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* 2. Quy tắc nâng cấp và gia hạn */}
      <Section title="Quy tắc Gia hạn và Nâng cấp gói">
        <ul className="space-y-2.5 text-xs text-muted-foreground">
          <li className="flex gap-2 items-start">
            <span className="text-emerald-500 font-bold text-sm leading-none mt-0.5">+</span>
            <span>
              <strong className="text-foreground">Mua cùng hạng gói (Gia hạn):</strong> Toàn bộ số ngày của gói mới được cộng dồn trực tiếp vào hạn sử dụng hiện tại của bạn mà không bị mất đi ngày nào.
            </span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="text-blue-500 font-bold text-sm leading-none mt-0.5">+</span>
            <span>
              <strong className="text-foreground">Nâng cấp lên hạng cao hơn (Upgrade):</strong> Áp dụng công thức trừ bù giá trị ngày chưa sử dụng. Hệ thống tính toán số tiền chênh lệch còn lại của gói cũ và kích hoạt ngay chu kỳ mới cho bạn.
            </span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="text-rose-500 font-bold text-sm leading-none mt-0.5">-</span>
            <span>
              <strong className="text-foreground">Mua gói thấp hơn:</strong> Hệ thống không hỗ trợ đăng ký gói có thứ hạng thấp hơn gói bạn đang sử dụng nhằm đảm bảo quyền lợi cao nhất của tài khoản.
            </span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="text-amber-500 font-bold text-sm leading-none mt-0.5">!</span>
            <span>
              <strong className="text-foreground">Chu kỳ nâng cấp:</strong> Khuyến nghị nâng cấp tối thiểu cùng chu kỳ thời gian để tối ưu hóa chi phí học tập dài hạn.
            </span>
          </li>
        </ul>
      </Section>

      {/* 3. Cách tính thời gian */}
      <Section title="Quy chuẩn tính thời gian hội viên">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/25 text-center flex flex-col items-center justify-center">
            <div className="font-bold text-emerald-700 dark:text-emerald-400">Gói Tuần</div>
            <div className="text-muted-foreground mt-1 text-[11px]">Cố định 7 ngày (168 giờ)</div>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-500/[0.04] border border-blue-500/25 text-center flex flex-col items-center justify-center">
            <div className="font-bold text-blue-700 dark:text-blue-400">Gói Tháng</div>
            <div className="text-muted-foreground mt-1 text-[11px]">Cố định 30 ngày (720 giờ)</div>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/25 text-center flex flex-col items-center justify-center">
            <div className="font-bold text-amber-700 dark:text-amber-400">Gói Năm</div>
            <div className="text-muted-foreground mt-1 text-[11px]">Cố định 365 ngày (8.760 giờ)</div>
          </div>
        </div>
      </Section>

      {/* 4. Hình thức thanh toán */}
      <Section title="Hình thức thanh toán hỗ trợ">
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li><strong>1. Chuyển khoản ngân hàng VietQR (SePay):</strong> Quét mã QR bằng ứng dụng của bất kỳ ngân hàng nào tại Việt Nam. Nội dung và số tiền được tự động điền sẵn, hệ thống xác nhận tự động chỉ sau 1 đến 5 phút.</li>
          <li><strong>2. Ví LexiCore:</strong> Thanh toán tức thì bằng số dư ví VNĐ đã nạp trước trên tài khoản LexiCore.</li>
        </ul>
      </Section>

      <p className="text-[11px] text-center text-muted-foreground pt-2">
        Mọi thắc mắc và hỗ trợ vui lòng liên hệ: <strong>support@lexicore.site</strong>
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="bg-muted/30 rounded-xl p-4 border">{children}</div>
    </div>
  );
}

// ============================================================
// Main Modal
// ============================================================
export function SubscriptionModal({
  open,
  onClose,
  initialPackageId,
  initialTab = "subscription",
  onBuyPackage,
  onSuccess,
}: SubscriptionModalProps) {
  const [activeTab, setActiveTab] = useState<"subscription" | "info">(initialTab);
  const [packages, setPackages] = useState<GroupedPackages>(MOCK_DATA);
  const [selectedSubId, setSelectedSubId] = useState<string>("sub-elite");
  const [subLoadingId, setSubLoadingId] = useState<string | null>(null);

  const subScrollRef = useRef<HTMLDivElement>(null);

  const selectedSub =
    packages.subscription.find((p) => p.id === selectedSubId) ||
    packages.subscription[packages.subscription.length - 1];

  // Fetch packages từ backend
  useEffect(() => {
    if (!open) return;
    fetch("/api/payment/packages")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setPackages(json.data);
          const sub = json.data.subscription;
          if (sub?.length) {
            if (initialPackageId && sub.some((p: CreditPackage) => p.id === initialPackageId)) {
              setSelectedSubId(initialPackageId);
            } else {
              setSelectedSubId(sub[0].id);
            }
          }
        }
      })
      .catch(() => { });
  }, [open, initialPackageId]);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      if (initialPackageId) {
        setSelectedSubId(initialPackageId);
      }
    }
  }, [open, initialTab, initialPackageId]);

  // Xu ly khi bam mua goi trong modal
  const handleBuyClick = async (pkg: CreditPackage) => {
    // 1. Gói Campaign
    if (pkg.campaign_id) {
      setSubLoadingId(pkg.id);
      try {
        const res = await fetch("/api/payment/campaign/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ campaignId: pkg.campaign_id }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        toast.success(`Nhận quà sự kiện "${pkg.name}" thành công!`);
        onSuccess?.();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Không thể nhận quà");
      } finally {
        setSubLoadingId(null);
      }
      return;
    }

    // 2. Gói Trial
    if (pkg.is_trial) {
      setSubLoadingId(pkg.id);
      try {
        const res = await fetch("/api/payment/trial/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ packageId: pkg.id }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        toast.success("Kích hoạt gói dùng thử thành công!");
        onSuccess?.();
        onClose();
      } catch (err: any) {
        toast.error("Kích hoạt thất bại", { description: err.message });
      } finally {
        setSubLoadingId(null);
      }
      return;
    }

    // 3. Gói trả phí: Bàn giao cho QRModal xử lý
    if (onBuyPackage) {
      onBuyPackage(pkg);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (subScrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      subScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl sm:max-w-4xl w-[92vw] p-0 flex flex-col gap-0 overflow-hidden bg-background/95 backdrop-blur-md border shadow-2xl rounded-2xl"
        aria-describedby={undefined}
      >
        {/* Header */}
        <div className="shrink-0 p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black">
              <Crown className="h-6 w-6 text-amber-500" />
              Nâng cấp LexiCore
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Khám phá toàn bộ 9 gói theo chu kỳ tuần, tháng và năm kèm chính sách nâng cấp minh bạch.
          </p>

          {/* Tab chuyển đổi: 2 tab duy nhất */}
          <div className="flex mt-4 bg-muted rounded-xl p-1">
            <TabBtn
              active={activeTab === "subscription"}
              onClick={() => setActiveTab("subscription")}
            >
              <Crown className="h-3.5 w-3.5 inline mr-1.5 text-amber-500" />
              Tất cả gói Hội viên
            </TabBtn>
            <TabBtn
              active={activeTab === "info"}
              onClick={() => setActiveTab("info")}
            >
              <FileText className="h-3.5 w-3.5 inline mr-1.5 text-sky-500" />
              Thông tin và chính sách
            </TabBtn>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Tab: Tất cả các gói */}
          {activeTab === "subscription" && (
            <div className="flex flex-col">
              <div className="w-full min-w-0 overflow-hidden px-6">
                <div
                  ref={subScrollRef}
                  onWheel={handleWheel}
                  className="w-full overflow-x-auto flex items-stretch gap-5 pt-8 pb-5 px-1.5 select-none scroll-smooth [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-muted/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {packages.subscription.map((pkg) => (
                    <SubscriptionFlipCard
                      key={pkg.id}
                      pkg={pkg}
                      selected={selectedSubId === pkg.id}
                      onSelect={() => setSelectedSubId(pkg.id)}
                      onBuy={handleBuyClick}
                    />
                  ))}
                </div>
              </div>

              {/* Footer thanh toán */}
              <div className="shrink-0 px-6 py-4 bg-muted/40 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Thanh toán qua chuyển khoản VietQR (SePay) hoặc Ví LexiCore
                </p>

                {selectedSub && (
                  <Button
                    className={`h-10 px-6 text-xs font-bold transition-all shadow-md rounded-xl
                      ${selectedSub.campaign_id
                        ? "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-600 hover:via-rose-600 hover:to-purple-700 text-white shadow-amber-500/25"
                        : selectedSub.is_trial
                          ? "bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white shadow-blue-400/25"
                          : selectedSub.tier === "ELITE"
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/25"
                            : selectedSub.tier === "PRO"
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25"
                              : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/25"
                      }`}
                    disabled={subLoadingId === selectedSub.id}
                    onClick={() => handleBuyClick(selectedSub)}
                  >
                    {subLoadingId === selectedSub.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {selectedSub.campaign_id && <Sparkles className="h-4 w-4 mr-1.5" />}
                        {!selectedSub.campaign_id && selectedSub.is_trial && <Gift className="h-4 w-4 mr-1.5" />}
                        {!selectedSub.is_trial && selectedSub.tier === "ELITE" && (
                          <Crown className="h-4 w-4 mr-1.5" />
                        )}
                        {!selectedSub.is_trial && selectedSub.tier === "PRO" && (
                          <Zap className="h-4 w-4 mr-1.5" />
                        )}
                        {!selectedSub.is_trial && selectedSub.tier === "STARTER" && (
                          <Star className="h-4 w-4 mr-1.5" />
                        )}
                        {selectedSub.campaign_id
                          ? `Nhận quà sự kiện miễn phí (${selectedSub.duration_days} ngày)`
                          : selectedSub.is_trial
                            ? `Dùng thử miễn phí ${selectedSub.duration_days ?? 3} ngày`
                            : `Mua gói ${selectedSub.name}: ${formatVND(getFinalPrice(selectedSub))} ${getDurationLabel(selectedSub.duration_days)}`}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Tab: Thông tin và chính sách */}
          {activeTab === "info" && <InfoTabContent />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all
        ${active
          ? "bg-background shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground"
        }`}
    >
      {children}
    </button>
  );
}

// Backward compatibility alias
export { SubscriptionModal as PremiumModal };
