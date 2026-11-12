import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Star,
  Copy,
  Wallet,
  Info,
  ArrowLeft,
  Loader2,
  CheckCircle2,
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
// Types
// ============================================================
export interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}
export type PremiumModalProps = SubscriptionModalProps;

interface SepayInitResult {
  orderId: string;
  orderCode: string;
  amountVnd: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  qrUrl: string;
}

// ============================================================
// WalletConfirmModal (modal nhỏ đè lên)
// ============================================================
interface WalletConfirmProps {
  open: boolean;
  pkg: CreditPackage;
  walletBalance: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function WalletConfirmModal({
  open,
  pkg,
  walletBalance,
  onConfirm,
  onCancel,
  loading,
}: WalletConfirmProps) {
  if (!open) return null;
  const price = getFinalPrice(pkg);
  const remaining = walletBalance - price;
  const canAfford = remaining >= 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 bg-background border rounded-2xl shadow-2xl w-[90vw] max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-base font-bold">
          <Wallet className="h-5 w-5 text-emerald-500" />
          Xac nhan thanh toan bang Vi LexiCore
        </div>

        <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Goi dang ky</span>
            <span className="font-medium">{pkg.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">So du vi hien tai</span>
            <span className="font-medium">{formatVND(walletBalance)}</span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>So tien thanh toan</span>
            <span className="font-bold">-{formatVND(price)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>So du con lai</span>
            <span className={canAfford ? "text-emerald-600" : "text-red-500"}>
              {formatVND(Math.max(remaining, 0))}
            </span>
          </div>
        </div>

        {!canAfford && (
          <p className="text-xs text-red-500 text-center">
            So du vi khong du. Vui long nap them hoac chon phuong thuc chuyen khoan.
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Huy
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onConfirm}
            disabled={!canAfford || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Xac nhan thanh toan"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// QR Checkout Section (hien thi ben duoi sau khi an mua goi)
// ============================================================
interface QRCheckoutProps {
  result: SepayInitResult;
  pkg: CreditPackage;
  walletBalance: number;
  onWalletPay: () => void;
  onBack: () => void;
  paymentDone: boolean;
}

function QRCheckoutSection({
  result,
  pkg,
  walletBalance,
  onWalletPay,
  onBack,
  paymentDone,
}: QRCheckoutProps) {
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (paymentDone) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-6">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <p className="text-lg font-bold text-center">Thanh toan thanh cong!</p>
        <p className="text-sm text-muted-foreground text-center">
          Goi {pkg.name} da duoc kich hoat. Chuc ban hoc tot!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Chon goi khac
      </button>

      <div className="text-center">
        <p className="text-sm font-semibold text-muted-foreground mb-1">
          Quet ma QR de thanh toan
        </p>
        <p className="text-xs text-muted-foreground">
          Ung dung ngan hang tu dong dien san so tai khoan, so tien va noi dung
        </p>
      </div>

      {/* QR Image */}
      <div className="flex justify-center">
        <div className="rounded-2xl border-2 border-dashed border-muted p-3 bg-white">
          <img
            src={result.qrUrl}
            alt="Ma QR chuyen khoan"
            className="w-52 h-52 object-contain"
          />
        </div>
      </div>

      {/* Thong tin chuyen khoan */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2.5 text-sm">
        <InfoRow label="Ngan hang" value={result.bankCode} />
        <InfoRow label="So tai khoan" value={result.accountNumber} />
        <InfoRow label="Ten tai khoan" value={result.accountName} />
        <InfoRow
          label="So tien"
          value={formatVND(result.amountVnd)}
          highlight
        />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Noi dung CK</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-wider text-primary">
              {result.orderCode}
            </span>
            <button
              onClick={() => copy(result.orderCode)}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Sao chep noi dung"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Huong dan */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
        <p className="font-semibold">Luu y quan trong:</p>
        <p>Noi dung chuyen khoan phai chinh xac la <strong>{result.orderCode}</strong></p>
        <p>He thong tu dong xac nhan trong 1 - 5 phut sau khi nhan duoc tien.</p>
      </div>

      {/* Nut thanh toan bang vi */}
      <div className="flex flex-col gap-2">
        <div className="relative flex items-center gap-2">
          <div className="flex-1 border-t border-muted" />
          <span className="text-xs text-muted-foreground">hoac</span>
          <div className="flex-1 border-t border-muted" />
        </div>
        <Button
          variant="outline"
          className="w-full gap-2 border-emerald-500/50 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
          onClick={onWalletPay}
        >
          <Wallet className="h-4 w-4" />
          Thanh toan bang Vi LexiCore
          <span className="ml-auto text-xs text-muted-foreground">
            {formatVND(walletBalance)}
          </span>
        </Button>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight ? "text-primary font-bold" : ""}`}>
        {value}
      </span>
    </div>
  );
}

// ============================================================
// Tab Thong tin content
// ============================================================
function InfoTabContent() {
  return (
    <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-220px)]">
      <Section title="Bang gia dang ky">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/60">
              <th className="text-left p-2 rounded-tl-lg">Goi</th>
              <th className="text-right p-2">7 ngay</th>
              <th className="text-right p-2">30 ngay</th>
              <th className="text-right p-2 rounded-tr-lg">365 ngay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="p-2 font-medium text-emerald-600">Starter</td>
              <td className="p-2 text-right">9.000d</td>
              <td className="p-2 text-right">19.000d</td>
              <td className="p-2 text-right">159.000d</td>
            </tr>
            <tr>
              <td className="p-2 font-medium text-blue-600">Pro</td>
              <td className="p-2 text-right">15.000d</td>
              <td className="p-2 text-right">35.000d</td>
              <td className="p-2 text-right">269.000d</td>
            </tr>
            <tr>
              <td className="p-2 font-medium text-amber-600">Elite</td>
              <td className="p-2 text-right">25.000d</td>
              <td className="p-2 text-right">49.000d</td>
              <td className="p-2 text-right">349.000d</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Quy tac nang cap goi">
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-emerald-500 mt-0.5">+</span>
            <span>
              <strong>Gia han:</strong> Mua cung tier va chu ky thi he thong cong them ngay vao
              ngay het han hien tai (khong mat ngay nao).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500 mt-0.5">+</span>
            <span>
              <strong>Nang cap:</strong> So tien can tra = Gia goi moi - (Gia goi cu / 30 x So ngay
              con lai). He thong tinh toan va hoan tien chenh lech vao Vi LexiCore hoac tru thang.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-500 mt-0.5">-</span>
            <span>
              <strong>Khong duoc:</strong> Dang ky goi thap hon goi hien tai dang su dung.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange-500 mt-0.5">!</span>
            <span>
              <strong>Chu ky:</strong> Khong the nang cap len goi co chu ky ngan hon chu ky dang
              dung (vi du: dang dung 30 ngay thi khong duoc mua goi 7 ngay o tier cao hon).
            </span>
          </li>
        </ul>
      </Section>

      <Section title="Cach tinh thoi gian">
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li>1 nam = 365 ngay (khong tinh theo nam duong lich)</li>
          <li>1 thang = 30 ngay</li>
          <li>1 tuan = 7 ngay</li>
          <li>Ngay het han duoc tinh bat dau tu thoi diem thanh toan thanh cong.</li>
        </ul>
      </Section>

      <Section title="Huong dan thanh toan">
        <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
          <li>Chon goi muon dang ky va nhan nut Mua goi.</li>
          <li>Quet ma QR bang app ngan hang bat ky hoac sao chep thong tin chuyen khoan.</li>
          <li>
            Noi dung chuyen khoan PHAI dung chinh xac ma don hang (vi du: LC105). App ngan hang
            se tu dong dien san.
          </li>
          <li>He thong tu xac nhan trong 1 - 5 phut sau khi nhan duoc tien.</li>
          <li>Hoac su dung Vi LexiCore (da nap tien truoc) de thanh toan ngay lap tuc.</li>
        </ol>
      </Section>

      <Section title="Goi dung thu va khuyen mai">
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li>Moi tai khoan moi tu dong nhan goi Pro dung thu 3 ngay mien phi.</li>
          <li>
            Admin co the ban hanh cac dot khuyen mai giam gia hoac goi dung thu dac biet nhan cac
            dip le - se hien thi tren trang chu neu co chuong trinh dang chay.
          </li>
          <li>Moi nguoi dung chi duoc kich hoat 1 goi dung thu trong toan bo vong doi tai khoan.</li>
        </ul>
      </Section>

      <p className="text-xs text-center text-muted-foreground pb-2">
        Moi thac mac lien he: support@lexicore.site
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
      <p className="text-sm font-semibold mb-2">{title}</p>
      <div className="bg-muted/40 rounded-xl p-4">{children}</div>
    </div>
  );
}

// ============================================================
// Main Modal
// ============================================================
export function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
  const [activeTab, setActiveTab] = useState<"subscription" | "topup" | "info">(
    "subscription"
  );
  const [packages, setPackages] = useState<GroupedPackages>(MOCK_DATA);
  const [selectedSubId, setSelectedSubId] = useState<string>("sub-elite");
  const [packLoading, setPackLoading] = useState<string | null>(null);
  const [subLoadingId, setSubLoadingId] = useState<string | null>(null);

  // QR checkout state
  const [checkoutResult, setCheckoutResult] = useState<SepayInitResult | null>(null);
  const [checkoutPkg, setCheckoutPkg] = useState<CreditPackage | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);

  // Vi LexiCore state
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletConfirmOpen, setWalletConfirmOpen] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);

  const subScrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedSub =
    packages.subscription.find((p) => p.id === selectedSubId) ||
    packages.subscription[packages.subscription.length - 1];

  // Fetch packages tu backend
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

  // Fetch so du vi
  useEffect(() => {
    if (!open) return;
    fetch("/api/payment/my-subscription", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setWalletBalance(json.data.walletBalanceVnd ?? 0);
        }
      })
      .catch(() => {});
  }, [open]);

  // Reset khi dong modal
  useEffect(() => {
    if (!open) {
      setCheckoutResult(null);
      setCheckoutPkg(null);
      setPaymentDone(false);
      setActiveTab("subscription");
      stopPolling();
    }
  }, [open]);

  // Polling kiem tra trang thai don hang
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (orderId: string, pkg: CreditPackage) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/payment/order-status/${orderId}`, {
            credentials: "include",
          });
          const json = await res.json();
          if (json.success && json.data?.status === "SUCCESS") {
            stopPolling();
            setPaymentDone(true);
            toast.success(`Dang ky ${pkg.name} thanh cong!`, {
              description: "Goi da duoc kich hoat. Chuc ban hoc tot!",
            });
            setTimeout(() => onClose(), 3000);
          }
        } catch {
          // bo qua loi mang tam thoi
        }
      }, 5000);
    },
    [stopPolling, onClose]
  );

  // Mua goi bang SePay QR
  const handleBuySub = async (pkg: CreditPackage) => {
    // Neu la goi trial thi dung API trial rieng
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
        toast.success("Kich hoat goi dung thu thanh cong!", {
          description: "Chuc ban hoc tot!",
        });
        onClose();
      } catch (err: any) {
        toast.error("Kich hoat that bai", { description: err.message });
      } finally {
        setSubLoadingId(null);
      }
      return;
    }

    // Goi tra phi: goi SePay init
    setSubLoadingId(pkg.id);
    try {
      const res = await fetch("/api/payment/sepay/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setCheckoutResult(json.data as SepayInitResult);
      setCheckoutPkg(pkg);
      startPolling(json.data.orderId, pkg);
    } catch (err: any) {
      toast.error("Khoi tao thanh toan that bai", { description: err.message });
    } finally {
      setSubLoadingId(null);
    }
  };

  // Mua pack coin/diamond (van dung SePay)
  const handleBuyPack = async (pkg: CreditPackage) => {
    setPackLoading(pkg.id);
    try {
      const res = await fetch("/api/payment/sepay/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setCheckoutResult(json.data as SepayInitResult);
      setCheckoutPkg(pkg);
      setActiveTab("subscription"); // chuyen ve tab chinh de hien thi QR
      startPolling(json.data.orderId, pkg);
    } catch (err: any) {
      toast.error("Khoi tao thanh toan that bai", { description: err.message });
    } finally {
      setPackLoading(null);
    }
  };

  // Thanh toan bang Vi LexiCore
  const handleWalletConfirm = async () => {
    if (!checkoutPkg) return;
    setWalletLoading(true);
    try {
      const res = await fetch("/api/payment/wallet/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId: checkoutPkg.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      stopPolling();
      setWalletConfirmOpen(false);
      setPaymentDone(true);
      toast.success(`Dang ky ${checkoutPkg.name} thanh cong qua Vi LexiCore!`);
      setTimeout(() => onClose(), 3000);
    } catch (err: any) {
      toast.error("Thanh toan vi that bai", { description: err.message });
    } finally {
      setWalletLoading(false);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (subScrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      subScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleBack = () => {
    stopPolling();
    setCheckoutResult(null);
    setCheckoutPkg(null);
    setPaymentDone(false);
  };

  return (
    <>
      {/* Modal Vi xac nhan (de len modal chinh) */}
      {checkoutPkg && (
        <WalletConfirmModal
          open={walletConfirmOpen}
          pkg={checkoutPkg}
          walletBalance={walletBalance}
          onConfirm={handleWalletConfirm}
          onCancel={() => setWalletConfirmOpen(false)}
          loading={walletLoading}
        />
      )}

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
                Nang cap LexiCore
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Chon goi phu hop hoac nap them Coin va Diamond de mo khoa toan bo trai nghiem hoc tap!
            </p>

            {/* Tab switcher */}
            <div className="flex mt-4 bg-muted rounded-xl p-1">
              <TabBtn
                active={activeTab === "subscription"}
                onClick={() => setActiveTab("subscription")}
              >
                <Crown className="h-3.5 w-3.5 inline mr-1.5 text-amber-500" />
                Goi Hoi vien
              </TabBtn>
              <TabBtn
                active={activeTab === "topup"}
                onClick={() => setActiveTab("topup")}
              >
                <Gift className="h-3.5 w-3.5 inline mr-1.5 text-fuchsia-500" />
                Nap Coin va Diamond
              </TabBtn>
              <TabBtn
                active={activeTab === "info"}
                onClick={() => setActiveTab("info")}
              >
                <Info className="h-3.5 w-3.5 inline mr-1.5 text-sky-500" />
                Thong tin
              </TabBtn>
            </div>
          </div>

          {/* ===== BODY ===== */}
          <div className="flex-1 overflow-y-auto">

            {/* ---- TAB: SUBSCRIPTION ---- */}
            {activeTab === "subscription" && (
              <div className="flex flex-col">
                {/* Neu da chon goi va co ket qua QR thi hien checkout */}
                {checkoutResult && checkoutPkg ? (
                  <QRCheckoutSection
                    result={checkoutResult}
                    pkg={checkoutPkg}
                    walletBalance={walletBalance}
                    onWalletPay={() => setWalletConfirmOpen(true)}
                    onBack={handleBack}
                    paymentDone={paymentDone}
                  />
                ) : (
                  <>
                    {/* Danh sach goi scroll ngang */}
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

                    {/* Footer CTA */}
                    <div className="shrink-0 px-6 py-4 bg-muted/40 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        Thanh toan qua chuyen khoan VietQR (SePay) hoac Vi LexiCore
                      </p>

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
                          {subLoadingId === selectedSub.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              {selectedSub.is_trial && <Zap className="h-4 w-4 mr-1.5" />}
                              {!selectedSub.is_trial && selectedSub.tier === "ELITE" && (
                                <Crown className="h-4 w-4 mr-1.5" />
                              )}
                              {!selectedSub.is_trial && selectedSub.tier === "PRO" && (
                                <Zap className="h-4 w-4 mr-1.5" />
                              )}
                              {!selectedSub.is_trial && selectedSub.tier === "STARTER" && (
                                <Star className="h-4 w-4 mr-1.5" />
                              )}
                              {selectedSub.is_trial
                                ? "Dung thu mien phi 3 ngay"
                                : `Mua goi ${selectedSub.name}: ${formatVND(getFinalPrice(selectedSub))}`}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ---- TAB: TOPUP ---- */}
            {activeTab === "topup" && (
              <div className="p-6 space-y-5">
                {/* Coin row */}
                {packages.coin_packs.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                      <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                      Nap Coin
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
                      <Gem className="h-4 w-4 text-fuchsia-500" />
                      Nap Diamond
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
                  Coin va Diamond duoc cong ngay vao vi sau khi he thong xac nhan thanh toan.
                </p>
              </div>
            )}

            {/* ---- TAB: THONG TIN ---- */}
            {activeTab === "info" && <InfoTabContent />}
          </div>
        </DialogContent>
      </Dialog>
    </>
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
