import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Separator } from "../ui/separator";
import { Coins, ShoppingBag, Shield, Flame, Star, Frame, CheckCircle2, Lock, Gift, Loader2 } from "lucide-react";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: "STREAK_FREEZE" | "AVATAR_FRAME";
}

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: string;
  quantity: number;
}

// Map type từ DB sang icon và category để render UI
const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; category: string }> = {
  STREAK_FREEZE: { icon: Shield, category: "protection" },
  AVATAR_FRAME: { icon: Frame, category: "frames" },
};

const API_BASE = "http://localhost:5000";

// ============================================================
// COMPONENT
// ============================================================
export function StoreView() {
  const [balance, setBalance] = useState<number>(0);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [confirmItem, setConfirmItem] = useState<StoreItem | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categories = [
    { value: "all", label: "All Items" },
    { value: "frames", label: "Profile Frames" },
    { value: "protection", label: "Protection" },
  ];

  // Lấy danh sách cửa hàng + số dư ví + túi đồ
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, meRes, inventoryRes] = await Promise.all([
        fetch(`${API_BASE}/api/store/items`, { credentials: "include" }),
        fetch(`${API_BASE}/api/auth/me`, { credentials: "include" }),
        fetch(`${API_BASE}/api/store/inventory`, { credentials: "include" }),
      ]);
      const items = await itemsRes.json();
      const me = await meRes.json();
      const inv = await inventoryRes.json();
      setStoreItems(Array.isArray(items) ? items : []);
      setBalance(me?.coin_balance ?? 0);
      setInventory(Array.isArray(inv) ? inv : []);
    } catch {
      setErrorMsg("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleBuy = async (item: StoreItem) => {
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
        setPurchaseSuccess(true);
        setConfirmItem(null);
        await fetchAll();
        setTimeout(() => setPurchaseSuccess(false), 3000);
      }
    } catch {
      setErrorMsg("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setBuying(false);
    }
  };

  const ownedItemIds = new Set(inventory.map((i) => i.id));
  const filtered = storeItems.filter((item) => {
    const cat = typeConfig[item.type]?.category ?? "other";
    return activeCategory === "all" || cat === activeCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reward Store</h1>
          <p className="text-muted-foreground">Spend your earned coins on exclusive items</p>
        </div>
        <div className="flex items-center gap-3 bg-muted rounded-lg px-4 py-2">
          <Coins className="h-5 w-5 text-amber-500" />
          <span className="text-xl font-bold">{balance.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">coins</span>
        </div>
      </div>

      {purchaseSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm font-medium">Purchase successful! Item added to your inventory.</p>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive bg-destructive/10">
          <p className="text-sm font-medium text-destructive">{errorMsg}</p>
        </div>
      )}

      <Tabs defaultValue="store">
        <TabsList>
          <TabsTrigger value="store"><ShoppingBag className="h-4 w-4 mr-2" />Store</TabsTrigger>
          <TabsTrigger value="inventory"><Gift className="h-4 w-4 mr-2" />My Items</TabsTrigger>
        </TabsList>

        {/* STORE TAB */}
        <TabsContent value="store" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat.value}
                variant={activeCategory === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat.value)}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Chưa có vật phẩm nào trong danh mục này.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((item) => {
                const cfg = typeConfig[item.type] ?? { icon: Star, category: "other" };
                const Icon = cfg.icon;
                const owned = ownedItemIds.has(item.id);
                const canAfford = balance >= item.price;

                return (
                  <Card key={item.id} className="relative">
                    <CardContent className="p-4 space-y-3">
                      <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center mx-auto">
                        <Icon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{item.type.replace("_", " ")}</Badge>
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-bold">{item.price}</span>
                        </div>
                      </div>
                      {owned ? (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Đã sở hữu
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={!canAfford}
                          onClick={() => { setErrorMsg(null); setConfirmItem(item); }}
                        >
                          {!canAfford && <Lock className="h-3 w-3 mr-1" />}
                          {canAfford ? "Buy Now" : "Not enough coins"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* INVENTORY TAB */}
        <TabsContent value="inventory" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map((item) => {
              const cfg = typeConfig[item.type] ?? { icon: Star, category: "other" };
              const Icon = cfg.icon;
              return (
                <Card key={item.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Số lượng: {item.quantity}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {inventory.length === 0 && (
              <div className="col-span-full text-center py-12">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium">No items yet</p>
                <p className="text-sm text-muted-foreground">Purchase items from the store to see them here</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={confirmItem !== null} onOpenChange={() => { setConfirmItem(null); setErrorMsg(null); }}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
          </DialogHeader>
          {confirmItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                <div className="h-12 w-12 rounded-lg bg-background flex items-center justify-center">
                  {(() => { const Icon = typeConfig[confirmItem.type]?.icon ?? Star; return <Icon className="h-6 w-6" />; })()}
                </div>
                <div>
                  <p className="font-semibold">{confirmItem.name}</p>
                  <p className="text-sm text-muted-foreground">{confirmItem.description}</p>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your balance</span>
                <div className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{balance}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item price</span>
                <div className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-destructive">-{confirmItem.price}</span>
                </div>
              </div>
              <div className="flex justify-between font-bold">
                <span>After purchase</span>
                <div className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span>{balance - confirmItem.price}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmItem(null)} disabled={buying}>Cancel</Button>
            <Button onClick={() => confirmItem && handleBuy(confirmItem)} disabled={buying}>
              {buying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}