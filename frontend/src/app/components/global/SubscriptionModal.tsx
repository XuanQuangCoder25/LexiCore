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
  Check,
  Zap,
  CircleDollarSign,
  Gem,
  Gift,
  CreditCard,
  Star,
} from "lucide-react";
import {
  CreditPackage,
  GroupedPackages,
  MOCK_DATA,
  formatVND,
  getFinalPrice,
  SubscriptionFlipCard,
  TopupCard,
  HScrollRow,
} from "./subscription-cards";

// ============================================================
// Modal Props
// ============================================================
export interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}
export type PremiumModalProps = SubscriptionModalProps;

// ============================================================
// Main Modal
// ============================================================
export function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
  const [activeTab, setActiveTab] = useState<"subscription" | "topup">("subscription");
  const [packages, setPackages] = useState<GroupedPackages>(MOCK_DATA);
  const [selectedSubId, setSelectedSubId] = useState<string>("sub-elite");
  const [gateway, setGateway] = useState<"MOCK" | "VNPAY">("MOCK");
  const [packLoading, setPackLoading] = useState<string | null>(null);
  const [subLoadingId, setSubLoadingId] = useState<string | null>(null);

  const selectedSub =
    packages.subscription.find((p) => p.id === selectedSubId) ||
    packages.subscription[packages.subscription.length - 1];

  const subScrollRef = useRef<HTMLDivElement>(null);

  // Fetch packages từ backend
  useEffect(() => {
    if (!open) return;
    fetch("/api/payment/packages")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setPackages(json.data);
          const sub = json.data.subscription;
          if (sub?.length) setSelectedSubId(sub[sub.length - 1].id);
        }
      })
      .catch(() => {});
  }, [open]);

  // Mua pack (coin/diamond)
  const handleBuyPack = async (pkg: CreditPackage) => {
    setPackLoading(pkg.id);
    try {
      if (gateway === "MOCK") {
        const initRes = await fetch("/api/payment/mock/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ packageId: pkg.id }),
        });
        const initJson = await initRes.json();
        if (!initJson.success) throw new Error(initJson.message);

        const confirmRes = await fetch(
          `/api/payment/mock/confirm?orderId=${initJson.data.orderId}`,
          { method: "POST", credentials: "include" }
        );
        const confirmJson = await confirmRes.json();
        if (!confirmJson.success) throw new Error(confirmJson.message);

        toast.success(
          `Mua thành công! +${confirmJson.data.coinEarned} Coin, +${confirmJson.data.diamondEarned} Diamond`,
          { description: `Mã GD: ${confirmJson.data.txnId}` }
        );
      } else {
        const initRes = await fetch("/api/payment/vnpay/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ packageId: pkg.id }),
        });
        const initJson = await initRes.json();
        if (!initJson.success) throw new Error(initJson.message);
        window.location.href = initJson.data.payUrl;
      }
    } catch (err: any) {
      toast.error("Thanh toán thất bại", { description: err.message });
    } finally {
      setPackLoading(null);
    }
  };

  // Mua subscription
  const handleBuySub = async (pkg: CreditPackage) => {
    setSubLoadingId(pkg.id);
    try {
      if (gateway === "MOCK") {
        const initRes = await fetch("/api/payment/mock/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ packageId: pkg.id }),
        });
        const initJson = await initRes.json();
        if (!initJson.success) throw new Error(initJson.message);

        const confirmRes = await fetch(
          `/api/payment/mock/confirm?orderId=${initJson.data.orderId}`,
          { method: "POST", credentials: "include" }
        );
        const confirmJson = await confirmRes.json();
        if (!confirmJson.success) throw new Error(confirmJson.message);

        toast.success(`Đăng ký ${pkg.name} thành công!`, {
          description: `+${confirmJson.data.coinEarned} Coin, +${confirmJson.data.diamondEarned} Diamond đã vào ví.`,
        });
        onClose();
      } else {
        const initRes = await fetch("/api/payment/vnpay/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ packageId: pkg.id }),
        });
        const initJson = await initRes.json();
        if (!initJson.success) throw new Error(initJson.message);
        window.location.href = initJson.data.payUrl;
      }
    } catch (err: any) {
      toast.error("Thanh toán thất bại", { description: err.message });
    } finally {
      setSubLoadingId(null);
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
        className="max-w-4xl sm:max-w-4xl w-[92vw] p-0 flex flex-col gap-0 overflow-hidden bg-background/95 backdrop-blur-md border shadow-2xl"
        aria-describedby={undefined}
      >
        {/* ===== HEADER ===== */}
        <div className="shrink-0 p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black">
              <Crown className="h-6 w-6 text-amber-500" />
              Nâng cấp LexiCore
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Chọn gói phù hợp hoặc nạp thêm Coin & Diamond để mở khóa toàn bộ trải nghiệm học tập!
          </p>

          {/* Tab switcher */}
          <div className="flex mt-4 bg-muted rounded-xl p-1">
            <button
              onClick={() => setActiveTab("subscription")}
              className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all
                ${activeTab === "subscription"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Crown className="h-3.5 w-3.5 inline mr-1.5 text-amber-500" />
              Gói Hội viên
            </button>
            <button
              onClick={() => setActiveTab("topup")}
              className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all
                ${activeTab === "topup"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Gift className="h-3.5 w-3.5 inline mr-1.5 text-fuchsia-500" />
              Nạp Coin & Diamond
            </button>
          </div>
        </div>

        {/* ===== BODY ===== */}
        <div className="flex-1 overflow-hidden">

          {/* ---- TAB: SUBSCRIPTION ---- */}
          {activeTab === "subscription" && (
            <div className="h-full flex flex-col">
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
                      onBuy={handleBuySub}
                    />
                  ))}
                </div>
              </div>

              {/* Footer: gateway + CTA */}
              <div className="shrink-0 px-6 py-4 bg-muted/40 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Gateway selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Thanh toán qua:</span>
                  <button
                    onClick={() => setGateway("MOCK")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                      ${gateway === "MOCK" ? "border-foreground bg-background" : "border-border hover:border-muted-foreground"}`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Test
                    {gateway === "MOCK" && <Check className="h-3 w-3 ml-0.5" />}
                  </button>
                  <button
                    onClick={() => setGateway("VNPAY")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                      ${gateway === "VNPAY" ? "border-blue-500 bg-blue-500/5" : "border-border hover:border-muted-foreground"}`}
                  >
                    <span className="text-blue-600 font-bold">VN</span>
                    VNPay
                    {gateway === "VNPAY" && <Check className="h-3 w-3 ml-0.5 text-blue-500" />}
                  </button>
                </div>

                {/* CTA button */}
                {selectedSub && (
                  <Button
                    className={`h-10 px-6 text-xs font-bold transition-all shadow-md rounded-xl
                      ${selectedSub.is_trial
                        ? "bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white shadow-blue-400/25"
                        : selectedSub.tier === "ELITE"
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/25"
                          : selectedSub.tier === "PRO"
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25"
                            : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/25"
                      }`}
                    disabled={subLoadingId === selectedSub.id}
                    onClick={() => handleBuySub(selectedSub)}
                  >
                    {subLoadingId === selectedSub.id ? "Đang xử lý..." : (
                      <>
                        {selectedSub.is_trial && <Zap className="h-4 w-4 mr-1.5" />}
                        {!selectedSub.is_trial && selectedSub.tier === "ELITE" && <Crown className="h-4 w-4 mr-1.5" />}
                        {!selectedSub.is_trial && selectedSub.tier === "PRO" && <Zap className="h-4 w-4 mr-1.5" />}
                        {!selectedSub.is_trial && selectedSub.tier === "STARTER" && <Star className="h-4 w-4 mr-1.5" />}
                        {selectedSub.is_trial
                          ? "Dùng thử miễn phí 3 ngày"
                          : `Đăng ký ${selectedSub.name}: ${formatVND(getFinalPrice(selectedSub))}/tháng`}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ---- TAB: TOPUP ---- */}
          {activeTab === "topup" && (
            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-220px)]">
              {/* Gateway */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Thanh toán qua:</span>
                <button
                  onClick={() => setGateway("MOCK")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                    ${gateway === "MOCK" ? "border-foreground bg-muted" : "border-border hover:border-muted-foreground"}`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Test
                  {gateway === "MOCK" && <Check className="h-3 w-3 ml-0.5" />}
                </button>
                <button
                  onClick={() => setGateway("VNPAY")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                    ${gateway === "VNPAY" ? "border-blue-500 bg-blue-500/5" : "border-border hover:border-muted-foreground"}`}
                >
                  <span className="text-blue-600 font-bold text-xs">VN</span>
                  VNPay
                  {gateway === "VNPAY" && <Check className="h-3 w-3 ml-0.5 text-blue-500" />}
                </button>
              </div>

              {/* Coin row */}
              {packages.coin_packs.length > 0 && (
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <CircleDollarSign className="h-4 w-4 text-emerald-600" /> Nạp Coin
                  </p>
                  <HScrollRow>
                    {packages.coin_packs.map((pkg) => (
                      <TopupCard
                        key={pkg.id}
                        pkg={pkg}
                        icon={CircleDollarSign}
                        colorClass="text-emerald-600"
                        unit="Coin"
                        onBuy={handleBuyPack}
                        loading={packLoading}
                      />
                    ))}
                  </HScrollRow>
                </div>
              )}

              {/* Diamond row */}
              {packages.diamond_packs.length > 0 && (
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <Gem className="h-4 w-4 text-fuchsia-500" /> Nạp Diamond
                  </p>
                  <HScrollRow>
                    {packages.diamond_packs.map((pkg) => (
                      <TopupCard
                        key={pkg.id}
                        pkg={pkg}
                        icon={Gem}
                        colorClass="text-fuchsia-500"
                        unit="Diamond"
                        onBuy={handleBuyPack}
                        loading={packLoading}
                      />
                    ))}
                  </HScrollRow>
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground pb-2">
                Coin & Diamond được cộng ngay vào ví sau khi thanh toán thành công.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Backward compatibility alias
export { SubscriptionModal as PremiumModal };
