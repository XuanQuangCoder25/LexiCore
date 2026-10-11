import { useState } from "react";
import {
  CreditCard,
  Crown,
  Coins,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  Download,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { toast } from "sonner";
import { PremiumModal } from "../../global/PremiumModal";
import { SettingsState } from "./settingsMock";

interface BillingWalletSectionProps {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  onNavigateTab?: (tab: string) => void;
}

export function BillingWalletSection({
  settings,
  onNavigateTab,
}: BillingWalletSectionProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isPro = settings.currentPlan === "pro";

  const handleDownloadInvoice = (invoiceId: string) => {
    toast.success(`Đang tải hóa đơn VAT cho đơn hàng ${invoiceId}...`, {
      description: "Tệp PDF sẽ được tải xuống trong giây lát.",
    });
  };

  const handleTopupCoin = (amount: number, price: string) => {
    toast.info(`Khởi tạo thanh toán gói ${amount.toLocaleString()} Coins (${price})`, {
      description: "Hệ thống đang liên kết cổng thanh toán VNPay / MoMo...",
    });
    if (onNavigateTab) {
      setTimeout(() => {
        onNavigateTab("store");
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Plan & Subscription Card */}
      <Card className="relative overflow-hidden border-2 border-primary/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-primary/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isPro
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">
                    {isPro ? "Gói LexiCore Pro" : "Gói LexiCore Cơ Bản (Free)"}
                  </CardTitle>
                  <Badge
                    variant={isPro ? "default" : "secondary"}
                    className={
                      isPro
                        ? "bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                        : "text-muted-foreground"
                    }
                  >
                    {isPro ? "Active Pro Member" : "Gói Hiện Tại"}
                  </Badge>
                </div>
                <CardDescription className="mt-0.5">
                  {isPro
                    ? `Hạn dịch vụ đến ${settings.planExpiryDate} • Tự động gia hạn`
                    : "Bạn đang sử dụng các tính năng cơ bản miễn phí trọn đời"}
                </CardDescription>
              </div>
            </div>

            <div>
              {isPro ? (
                <Button
                  variant="outline"
                  onClick={() => setShowUpgradeModal(true)}
                  className="font-medium"
                >
                  Quản lý gói Pro
                </Button>
              ) : (
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-md shadow-amber-500/20"
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Nâng cấp lên Pro
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 border">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Đặc quyền thành viên Pro
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Trải nghiệm hoàn toàn không quảng cáo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>AI Voice Recognition phân tích phát âm ngữ điệu</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Không giới hạn phân tích ngữ pháp câu với AI Tutor</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Quyền lợi bổ sung
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Kho đề thi thử IELTS / TOEIC độc quyền & chi tiết</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Khung Avatar & Danh hiệu Pro nổi bật trong Đấu trường PvP</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Báo cáo tiến độ phân tích biểu đồ học tập chuyên sâu</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LexiCoins Wallet Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Ví LexiCoins</CardTitle>
                <CardDescription>
                  Đồng tiền dùng để mua khóa học, thẻ flashcard cao cấp và vật phẩm ảo
                </CardDescription>
              </div>
            </div>

            {onNavigateTab && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab("store")}
                className="text-xs font-medium"
              >
                Đến Cửa hàng <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Balance Spotlight */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/30 gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                <Coins className="h-7 w-7" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Số dư khả dụng
                </span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-extrabold tracking-tight text-foreground">
                    {settings.coinsBalance.toLocaleString()}
                  </h3>
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    Coins
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleTopupCoin(1200, "49,000₫")}
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-sm"
              >
                <Zap className="h-4 w-4 mr-1.5" /> Nạp thêm Coin
              </Button>
            </div>
          </div>

          {/* Quick Topup Packages */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Gói nạp ưu đãi thịnh hành
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() => handleTopupCoin(500, "25,000₫")}
                className="cursor-pointer p-3.5 rounded-xl border hover:border-amber-500/60 hover:bg-amber-500/5 transition-all text-center flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-center gap-1 font-bold text-base text-foreground">
                    <Coins className="h-4 w-4 text-amber-500" /> 500 Coins
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Gói Cơ Bản</p>
                </div>
                <div className="mt-3 font-semibold text-sm text-primary">25,000₫</div>
              </div>

              <div
                onClick={() => handleTopupCoin(1200, "49,000₫")}
                className="relative cursor-pointer p-3.5 rounded-xl border-2 border-amber-500 bg-amber-500/5 transition-all text-center flex flex-col justify-between shadow-xs"
              >
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] bg-amber-500 hover:bg-amber-600 text-white">
                  +20% Tặng Thêm
                </Badge>
                <div>
                  <div className="flex items-center justify-center gap-1 font-bold text-base text-foreground">
                    <Coins className="h-4 w-4 text-amber-500" /> 1,200 Coins
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Gói Phổ Biến</p>
                </div>
                <div className="mt-3 font-semibold text-sm text-primary">49,000₫</div>
              </div>

              <div
                onClick={() => handleTopupCoin(3000, "99,000₫")}
                className="cursor-pointer p-3.5 rounded-xl border hover:border-amber-500/60 hover:bg-amber-500/5 transition-all text-center flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-center gap-1 font-bold text-base text-foreground">
                    <Coins className="h-4 w-4 text-amber-500" /> 3,000 Coins
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Gói Tiết Kiệm Nhất</p>
                </div>
                <div className="mt-3 font-semibold text-sm text-primary">99,000₫</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction & Billing History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Lịch sử giao dịch & Hóa đơn</CardTitle>
                <CardDescription>
                  Theo dõi mọi khoản thanh toán và biến động số dư LexiCoins
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Thanh toán an toàn SSL 256-bit
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-xs">Mã đơn</TableHead>
                  <TableHead className="font-semibold text-xs">Thời gian</TableHead>
                  <TableHead className="font-semibold text-xs">Nội dung giao dịch</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Số lượng / Giá</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Trạng thái</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.billingHistory.map((item) => {
                  const isPositive = item.amount.startsWith("+");
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                        #{item.id}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.date}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {item.description}
                      </TableCell>
                      <TableCell
                        className={`text-xs font-bold text-right ${
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {item.amount}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className={`text-[11px] font-medium ${
                            item.status === "Completed"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : item.status === "Pending"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          }`}
                        >
                          {item.status === "Completed"
                            ? "Thành công"
                            : item.status === "Pending"
                            ? "Đang chờ"
                            : "Thất bại"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(item.id)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Download className="h-3.5 w-3.5 mr-1" /> Hóa đơn
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      <PremiumModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
