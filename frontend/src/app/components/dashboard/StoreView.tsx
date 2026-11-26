import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Separator } from "../ui/separator";
import {
  CircleDollarSign,
  Gem,
  ShoppingBag,
  Shield,
  Flame,
  Star,
  CheckCircle2,
  Lock,
  Store,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { optimizeImageUrl } from "../../services/arena-service";
import { StoreShimmerGrid } from "./store/StoreEffects";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  price_type?: "COIN" | "DIAMOND" | string;
  type: string;
  required_level?: number;
  is_owned?: boolean | number;
  image_url?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: string;
  quantity: number;
  image_url?: string;
}

interface CategoryItem {
  value: string;
  label: string;
}

const CATEGORIES: CategoryItem[] = [
  { value: "all", label: "All Items" },
  { value: "avatar", label: "Avatar" },
  { value: "cover", label: "Cover" },
  { value: "protection", label: "Protection" },
];

// Map type từ DB sang icon, category lọc và nhãn hiển thị bên dưới ảnh
const typeConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    category: string;
    label: string;
    badgeClass: string;
  }
> = {
  AVATAR: {
    icon: Shield,
    category: "avatar",
    label: "Avatar",
    badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
  },
  COVER_PHOTO: {
    icon: ImageIcon,
    category: "cover",
    label: "Ảnh bìa",
    badgeClass: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25",
  },
  STREAK_FREEZE: {
    icon: Shield,
    category: "protection",
    label: "Bảo vệ",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  },
  STREAK_RESTORE: {
    icon: Flame,
    category: "protection",
    label: "Bảo vệ",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  },
};

const API_BASE = "";

function getTypeMeta(type: string) {
  return (
    typeConfig[type] ?? {
      icon: Star,
      category: "other",
      label: "Vật phẩm",
      badgeClass: "bg-secondary text-secondary-foreground border-border",
    }
  );
}

function CategoryUnderlineTabs({
  value,
  onChange,
  layoutId,
}: {
  value: string;
  onChange: (next: string) => void;
  layoutId: string;
}) {
  return (
    <div className="flex items-center gap-1 border-b overflow-x-auto">
      {CATEGORIES.map((cat) => {
        const isSelected = value === cat.value;
        return (
          <button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value)}
            className={`relative px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
              isSelected
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.label}
            {isSelected && (
              <motion.span
                layoutId={layoutId}
                className="absolute bottom-0 inset-x-2 h-0.5 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function StoreView() {
  const [balance, setBalance] = useState<number>(0);
  const [diamondBalance, setDiamondBalance] = useState<number>(0);
  const [userLevel, setUserLevel] = useState<number>(1);
  const [equippedAvatar, setEquippedAvatar] = useState<string | null>(null);
  const [equippedCover, setEquippedCover] = useState<string | null>(null);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [confirmItem, setConfirmItem] = useState<StoreItem | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<"store" | "inventory">("store");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeInventoryCategory, setActiveInventoryCategory] = useState("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lấy danh sách cửa hàng + số dư ví + túi đồ
  const fetchAll = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [itemsRes, meRes, inventoryRes] = await Promise.all([
        fetch(`${API_BASE}/api/store/items`, { credentials: "include" }),
        fetch(`${API_BASE}/api/auth/me`, { credentials: "include" }),
        fetch(`${API_BASE}/api/store/inventory`, { credentials: "include" }),
      ]);
      const items = await itemsRes.json();
      const me = await meRes.json();
      const inv = await inventoryRes.json();
      const nextCoin = Number(me?.coin_balance ?? 0);
      const nextDiamond = Number(me?.diamond_balance ?? 0);

      setStoreItems(Array.isArray(items) ? items : []);
      setBalance(nextCoin);
      setDiamondBalance(nextDiamond);
      setUserLevel(Number(me?.level ?? 1));
      setEquippedAvatar(me?.avatar_url ?? null);
      setEquippedCover(me?.cover_url ?? null);
      setInventory(Array.isArray(inv) ? inv : []);

      return { coinBalance: nextCoin, diamondBalance: nextDiamond };
    } catch {
      setErrorMsg("Không thể tải dữ liệu. Vui lòng thử lại.");
      return null;
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const firePurchaseConfetti = (isDiamond: boolean) => {
    try {
      confetti({
        particleCount: 72,
        spread: 68,
        origin: { y: 0.62 },
        colors: isDiamond
          ? ["#d946ef", "#f472b6", "#fbbf24", "#e879f9"]
          : ["#fbbf24", "#f59e0b", "#fcd34d", "#10b981"],
        disableForReducedMotion: true,
      });
    } catch {
      // Bỏ qua nếu môi trường không hỗ trợ canvas
    }
  };

  const handleBuy = async (item: StoreItem) => {
    const isDiamond = String(item.price_type || "COIN").toUpperCase() === "DIAMOND";
    setBuying(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/store/buy/${item.id}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || "Mua hàng thất bại.");
      } else {
        setPurchaseSuccess(item.name);
        setConfirmItem(null);
        firePurchaseConfetti(isDiamond);

        const refreshed = await fetchAll(false);
        if (refreshed) {
          window.dispatchEvent(
            new CustomEvent("wallet-balance-change", {
              detail: isDiamond
                ? { diamondBalance: refreshed.diamondBalance }
                : { coinBalance: refreshed.coinBalance },
            })
          );
        }
        setTimeout(() => setPurchaseSuccess(null), 4000);
      }
    } catch {
      setErrorMsg("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setBuying(false);
    }
  };

  const handleEquip = async (item: InventoryItem) => {
    try {
      const res = await fetch(`${API_BASE}/api/store/equip/${item.id}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        await fetchAll(false);
      } else {
        const data = await res.json();
        setErrorMsg(data.message || "Không thể trang bị.");
      }
    } catch {
      setErrorMsg("Lỗi kết nối khi trang bị.");
    }
  };

  const ownedItemIds = new Set(inventory.map((i) => i.id));
  const filteredStore = storeItems.filter((item) => {
    const cat = getTypeMeta(item.type).category;
    return activeCategory === "all" || cat === activeCategory;
  });

  const filteredInventory = inventory.filter((item) => {
    const cat = getTypeMeta(item.type).category;
    return activeInventoryCategory === "all" || cat === activeInventoryCategory;
  });

  if (loading) {
    return <StoreShimmerGrid count={8} />;
  }

  return (
    <div className="space-y-6">
      {/* Header gọn gàng (số dư Coin & Kim cương đã hiển thị trên Header chính toàn cục) */}
      <div>
        <h1 className="text-3xl font-bold">Reward Store</h1>
        <p className="text-muted-foreground">Spend your earned coins and diamonds on exclusive items</p>
      </div>

      <AnimatePresence>
        {purchaseSuccess && (
          <motion.div
            key="purchase-success-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-sm font-medium">
                Mua thành công vật phẩm <span className="font-bold">"{purchaseSuccess}"</span>! Đã thêm vào túi đồ của bạn.
              </p>
            </div>
            {activeMainTab === "store" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setActiveMainTab("inventory")}
                className="h-7 rounded-lg text-xs border-emerald-500/40 bg-background/80 hover:bg-background"
              >
                Xem túi đồ
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive bg-destructive/10">
          <p className="text-sm font-medium text-destructive">{errorMsg}</p>
        </div>
      )}

      <Tabs
        value={activeMainTab}
        onValueChange={(val) => setActiveMainTab(val as "store" | "inventory")}
      >
        <TabsList>
          <TabsTrigger value="store">
            <Store className="h-4 w-4 mr-2" />
            Store
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <ShoppingBag className="h-4 w-4 mr-2" />
            My Items ({inventory.length})
          </TabsTrigger>
        </TabsList>

        {/* STORE TAB */}
        <TabsContent value="store" className="space-y-5 mt-4">
          <CategoryUnderlineTabs
            value={activeCategory}
            onChange={setActiveCategory}
            layoutId="store-category-underline"
          />

          {filteredStore.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Chưa có vật phẩm nào trong danh mục này.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredStore.map((item, idx) => {
                const meta = getTypeMeta(item.type);
                const Icon = meta.icon;
                const owned = item.is_owned || item.is_owned === 1 || ownedItemIds.has(item.id);
                const isDiamond = String(item.price_type || "COIN").toUpperCase() === "DIAMOND";
                const currentCurrencyBalance = isDiamond ? diamondBalance : balance;
                const canAfford = currentCurrencyBalance >= item.price;
                const reqLevel = Number(item.required_level || 1);
                const meetsLevel = userLevel >= reqLevel;

                return (
                  <motion.div
                    key={`${activeCategory}-${item.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.24,
                      delay: Math.min(idx * 0.05, 0.4),
                      ease: "easeOut",
                    }}
                    whileHover={{ y: -4 }}
                    className="h-full"
                  >
                    <Card className="relative h-full hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-4 flex flex-col h-full">
                        {/* Image container hoàn toàn thoáng, không đè chữ/badge lên ảnh */}
                        <div
                          className={`rounded-2xl bg-secondary/30 border flex items-center justify-center overflow-hidden shrink-0 mb-3 group mx-auto ${
                            item.type === "AVATAR" ? "aspect-square w-40 max-w-[85%]" : "w-full aspect-video"
                          }`}
                        >
                          {item.image_url ? (
                            <img
                              src={optimizeImageUrl(item.image_url, {
                                width: item.type === "COVER_PHOTO" ? 440 : 220,
                                aspectRatio: item.type === "COVER_PHOTO" ? "16:9" : "1:1",
                              })}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <Icon className="h-10 w-10 text-muted-foreground/30" />
                          )}
                        </div>

                        {/* Text details + Pill phân loại đặt dưới ảnh */}
                        <div className="text-center flex-1 flex flex-col items-center">
                          <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border mb-1.5 ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                          <p className="font-semibold leading-tight">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                          {reqLevel > 1 && (
                            <p
                              className={`text-[11px] font-semibold mt-1.5 ${
                                meetsLevel ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              Yêu cầu cấp {reqLevel}
                            </p>
                          )}
                        </div>

                        {/* Footer: Chỉ hiển thị 1 loại tiền tệ (Coin hoặc Kim cương) */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t">
                          <div className="flex items-center gap-1.5 pl-1">
                            {isDiamond ? (
                              <Gem className="h-4 w-4 text-fuchsia-500 shrink-0" />
                            ) : (
                              <CircleDollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
                            )}
                            <span
                              className={`text-sm font-bold tabular-nums ${
                                isDiamond ? "text-fuchsia-600 dark:text-fuchsia-400" : "text-foreground"
                              }`}
                            >
                              {item.price.toLocaleString("vi-VN")}
                            </span>
                          </div>

                          {owned ? (
                            <Button variant="secondary" size="sm" disabled className="h-8 rounded-full px-4 text-xs">
                              Đã sở hữu
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className={`h-8 rounded-full px-4 text-xs text-white font-semibold shadow-sm ${
                                isDiamond
                                  ? "bg-fuchsia-600 hover:bg-fuchsia-700"
                                  : "bg-emerald-500 hover:bg-emerald-600"
                              }`}
                              disabled={!canAfford || !meetsLevel}
                              onClick={() => {
                                setErrorMsg(null);
                                setConfirmItem(item);
                              }}
                            >
                              {(!meetsLevel || !canAfford) && <Lock className="h-3 w-3 mr-1" />}
                              {!meetsLevel
                                ? `Cấp ${reqLevel}`
                                : canAfford
                                  ? "Buy Now"
                                  : isDiamond
                                    ? "Thiếu kim cương"
                                    : "Thiếu xu"}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* INVENTORY TAB (Bổ sung 4 tab lọc như tab Store) */}
        <TabsContent value="inventory" className="space-y-5 mt-4">
          <CategoryUnderlineTabs
            value={activeInventoryCategory}
            onChange={setActiveInventoryCategory}
            layoutId="inventory-category-underline"
          />

          {inventory.length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium">No items yet</p>
              <p className="text-sm text-muted-foreground">Purchase items from the store to see them here</p>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Bạn chưa sở hữu vật phẩm nào trong danh mục này.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map((item, idx) => {
                const meta = getTypeMeta(item.type);
                const Icon = meta.icon;
                const isEquipped =
                  (item.type === "AVATAR" && item.image_url === equippedAvatar) ||
                  (item.type === "COVER_PHOTO" && item.image_url === equippedCover);

                return (
                  <motion.div
                    key={`${activeInventoryCategory}-${item.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(idx * 0.04, 0.35) }}
                    whileHover={{ y: -3 }}
                  >
                    <Card
                      className={`transition-shadow duration-200 hover:shadow-md ${
                        isEquipped ? "border-emerald-500/45 bg-emerald-500/5" : ""
                      }`}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div
                          className={`rounded-lg bg-secondary/30 border flex items-center justify-center shrink-0 overflow-hidden ${
                            item.type === "AVATAR" ? "aspect-square h-14" : "aspect-video h-14"
                          }`}
                        >
                          {item.image_url ? (
                            <img
                              src={optimizeImageUrl(item.image_url, {
                                width: item.type === "COVER_PHOTO" ? 220 : 120,
                                aspectRatio: item.type === "COVER_PHOTO" ? "16:9" : "1:1",
                              })}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Icon className="h-6 w-6 text-muted-foreground/50" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border mb-1 ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                          <p className="font-medium truncate leading-tight">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Số lượng: {item.quantity}</p>
                        </div>
                        <div className="shrink-0 ml-auto pl-2">
                          {(item.type === "AVATAR" || item.type === "COVER_PHOTO") &&
                            (isEquipped ? (
                              <Button variant="secondary" size="sm" disabled className="h-8 rounded-full px-4 text-xs font-semibold">
                                Đang dùng
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-8 rounded-full px-5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-sm"
                                onClick={() => handleEquip(item)}
                              >
                                Trang bị
                              </Button>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Purchase Confirmation Dialog: Phóng to showcase ảnh sắc nét, không che hình */}
      <Dialog
        open={confirmItem !== null}
        onOpenChange={() => {
          setConfirmItem(null);
          setErrorMsg(null);
        }}
      >
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
          </DialogHeader>
          {confirmItem && (() => {
            const isDiamond = String(confirmItem.price_type || "COIN").toUpperCase() === "DIAMOND";
            const currentBal = isDiamond ? diamondBalance : balance;
            const meta = getTypeMeta(confirmItem.type);
            const Icon = meta.icon;

            return (
              <div className="space-y-4">
                {/* Large unobstructed asset showcase */}
                <div className="rounded-2xl border bg-muted/40 p-4 flex flex-col items-center gap-3">
                  <div
                    className={`rounded-xl bg-background border flex items-center justify-center overflow-hidden shadow-sm ${
                      confirmItem.type === "COVER_PHOTO"
                        ? "w-full aspect-video"
                        : confirmItem.type === "AVATAR"
                          ? "w-44 h-44 aspect-square"
                          : "w-24 h-24 rounded-2xl"
                    }`}
                  >
                    {confirmItem.image_url ? (
                      <img
                        src={optimizeImageUrl(confirmItem.image_url, {
                          width: confirmItem.type === "COVER_PHOTO" ? 640 : 400,
                          aspectRatio: confirmItem.type === "COVER_PHOTO" ? "16:9" : "1:1",
                        })}
                        alt={confirmItem.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>

                  <div className="text-center space-y-1">
                    <span className={`inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                    <p className="font-bold text-lg leading-snug">{confirmItem.name}</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">{confirmItem.description}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Số dư hiện tại</span>
                    <div className="flex items-center gap-1.5">
                      {isDiamond ? (
                        <Gem className="h-4 w-4 text-fuchsia-500" />
                      ) : (
                        <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                      )}
                      <span className="font-medium tabular-nums">{currentBal.toLocaleString("vi-VN")}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Giá vật phẩm</span>
                    <div className="flex items-center gap-1.5">
                      {isDiamond ? (
                        <Gem className="h-4 w-4 text-fuchsia-500" />
                      ) : (
                        <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                      )}
                      <span className="font-medium text-destructive tabular-nums">
                        -{confirmItem.price.toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between font-bold pt-1">
                    <span>Sau khi mua</span>
                    <div className="flex items-center gap-1.5">
                      {isDiamond ? (
                        <Gem className="h-4 w-4 text-fuchsia-500" />
                      ) : (
                        <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                      )}
                      <span className="tabular-nums">{(currentBal - confirmItem.price).toLocaleString("vi-VN")}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmItem(null)} disabled={buying}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmItem && handleBuy(confirmItem)}
              disabled={buying}
              className={
                confirmItem && String(confirmItem.price_type || "COIN").toUpperCase() === "DIAMOND"
                  ? "bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              {buying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
