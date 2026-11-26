import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { Gift, Coins, Gem, Sparkles, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import httpClient from "../../services/httpClient";

interface RewardClaimModalProps {
  open: boolean;
  campaignId: string | null;
  campaignName?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ActiveReward {
  id: string;
  name: string;
  description: string | null;
  coin_amount: number;
  diamond_amount: number;
  item_name?: string | null;
  fallback_coin: number;
  ends_at: string;
  claimed?: boolean;
}

export function RewardClaimModal({
  open,
  campaignId,
  campaignName,
  onClose,
  onSuccess,
}: RewardClaimModalProps) {
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [reward, setReward] = useState<ActiveReward | null>(null);
  const [claimedResult, setClaimedResult] = useState<{
    coinEarned: number;
    diamondEarned: number;
    itemName?: string | null;
    usedFallback: boolean;
    fallbackCoin: number;
  } | null>(null);

  // Fetch thông tin chi tiết sự kiện khi mở modal (dùng httpClient để đính Bearer token & kiểm tra đã claim)
  useEffect(() => {
    if (!open) {
      setClaimedResult(null);
      return;
    }

    setLoading(true);
    httpClient
      .get("/api/payment/reward-campaigns/active")
      .then((res) => {
        const json = res.data;
        if (json?.success && Array.isArray(json.data)) {
          const list = json.data as ActiveReward[];
          const normalizedTarget = campaignName?.trim().toLowerCase();
          const found =
            (campaignId ? list.find((c) => c.id === campaignId) : undefined) ||
            (normalizedTarget
              ? list.find((c) => c.name.trim().toLowerCase() === normalizedTarget)
              : undefined) ||
            list.find((c) => !c.claimed) ||
            list[0];
          setReward(found || null);
        }
      })
      .catch(() => {
        toast.error("Không thể tải thông tin phần quà sự kiện");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, campaignId, campaignName]);

  const handleClaim = async () => {
    if (!reward) return;
    setClaiming(true);
    try {
      const res = await httpClient.post("/api/payment/reward-campaign/claim", {
        campaignId: reward.id,
      });
      const json = res.data;
      if (!json.success) throw new Error(json.message);

      // Cập nhật số dư ví trên toàn bộ ứng dụng
      if (json.data?.newCoinBalance !== undefined) {
        window.dispatchEvent(
          new CustomEvent("wallet-balance-change", {
            detail: { coinBalance: json.data.newCoinBalance },
          })
        );
      }

      setClaimedResult({
        coinEarned: json.data?.coinEarned ?? reward.coin_amount,
        diamondEarned: json.data?.diamondEarned ?? reward.diamond_amount,
        itemName: json.data?.itemName ?? reward.item_name,
        usedFallback: Boolean(json.data?.usedFallback),
        fallbackCoin: json.data?.fallbackCoin ?? 50,
      });

      toast.success(json.message || "Nhận quà sự kiện thành công!");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Không thể nhận quà lúc này");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm sm:max-w-md w-[92vw] p-6 rounded-3xl bg-background border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Gift className="h-6 w-6 text-emerald-500" />
            <span>Quà tặng sự kiện LexiCore</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Đang kiểm tra phần quà...</p>
          </div>
        ) : !reward && !claimedResult ? (
          <div className="py-8 text-center text-muted-foreground space-y-2">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
            <p className="text-sm font-semibold">Sự kiện quà tặng không khả dụng hoặc đã kết thúc</p>
            <p className="text-xs">Vui lòng đón chờ các sự kiện tiếp theo từ LexiCore nhé!</p>
          </div>
        ) : claimedResult ? (
          <div className="py-6 flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">Nhận quà thành công!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Phần thưởng đã được cộng ngay vào tài khoản của bạn.
              </p>
            </div>

            <div className="w-full bg-muted/40 rounded-2xl p-4 space-y-2 text-xs">
              {claimedResult.coinEarned > 0 && (
                <div className="flex justify-between items-center font-medium">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <Coins className="h-4 w-4" /> Số Coin nhận được
                  </span>
                  <span className="font-bold">+{claimedResult.coinEarned.toLocaleString("vi-VN")}</span>
                </div>
              )}

              {claimedResult.diamondEarned > 0 && (
                <div className="flex justify-between items-center font-medium">
                  <span className="flex items-center gap-1.5 text-fuchsia-600">
                    <Gem className="h-4 w-4" /> Số Diamond nhận được
                  </span>
                  <span className="font-bold">+{claimedResult.diamondEarned.toLocaleString("vi-VN")}</span>
                </div>
              )}

              {claimedResult.itemName && (
                <div className="flex justify-between items-center font-medium">
                  <span className="flex items-center gap-1.5 text-sky-600">
                    <Sparkles className="h-4 w-4" /> Vật phẩm
                  </span>
                  <span className="font-bold">{claimedResult.itemName}</span>
                </div>
              )}

              {claimedResult.usedFallback && (
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] text-left">
                  Lưu ý: Do bạn đã sở hữu vật phẩm này trong kho, hệ thống đã tự động quy đổi thành +{claimedResult.fallbackCoin} Coin vào ví!
                </div>
              )}
            </div>

            <Button onClick={onClose} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Tiếp tục học tập
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <h3 className="text-base font-bold text-foreground">{reward.name}</h3>
              {reward.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {reward.description}
                </p>
              )}
            </div>

            {/* Chi tiết phần thưởng */}
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Phần quà dành riêng cho bạn:
              </p>

              <div className="flex flex-wrap gap-2">
                {reward.coin_amount > 0 && (
                  <Badge variant="outline" className="px-3 py-1.5 text-xs font-bold gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-600">
                    <Coins className="h-4 w-4" /> +{reward.coin_amount.toLocaleString("vi-VN")} Coin
                  </Badge>
                )}

                {reward.diamond_amount > 0 && (
                  <Badge variant="outline" className="px-3 py-1.5 text-xs font-bold gap-1.5 bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-600">
                    <Gem className="h-4 w-4" /> +{reward.diamond_amount.toLocaleString("vi-VN")} Diamond
                  </Badge>
                )}

                {reward.item_name && (
                  <Badge variant="outline" className="px-3 py-1.5 text-xs font-bold gap-1.5 bg-sky-500/10 border-sky-500/30 text-sky-600">
                    <Sparkles className="h-4 w-4" /> {reward.item_name}
                  </Badge>
                )}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              {reward.claimed
                ? "Bạn đã nhận phần quà từ sự kiện này rồi. Cảm ơn bạn đã đồng hành cùng LexiCore!"
                : "Nhấn nhận quà ngay để cộng tài nguyên vào tài khoản mà không làm gián đoạn bài học của bạn!"}
            </p>

            <DialogFooter className="pt-2 gap-2.5">
              <Button variant="outline" onClick={onClose} disabled={claiming}>
                {reward.claimed ? "Đóng" : "Để sau"}
              </Button>
              {!reward.claimed && (
                <Button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {claiming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang nhận...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4" /> Nhận quà ngay
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
