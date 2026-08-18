import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Separator } from "../ui/separator";
import {
  Coins,
  ShoppingBag,
  Shield,
  Flame,
  Star,
  Crown,
  Sparkles,
  Frame,
  Zap,
  CheckCircle2,
  Lock,
  Gift,
} from "lucide-react";

interface StoreItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: "frames" | "badges" | "boosts" | "protection";
  icon: React.ComponentType<{ className?: string }>;
  rarity: "common" | "rare" | "epic" | "legendary";
  owned?: boolean;
  equipped?: boolean;
}

const storeItems: StoreItem[] = [
  { id: 1, name: "Golden Frame", description: "Show off your dedication with a premium gold border", price: 500, category: "frames", icon: Frame, rarity: "rare" },
  { id: 2, name: "Diamond Frame", description: "The rarest profile frame for top learners", price: 2000, category: "frames", icon: Crown, rarity: "legendary" },
  { id: 3, name: "Streak Freeze", description: "Protect your streak for 1 day if you miss a session", price: 200, category: "protection", icon: Shield, rarity: "common" },
  { id: 4, name: "Double XP Boost", description: "Earn 2x experience points for 24 hours", price: 300, category: "boosts", icon: Zap, rarity: "common" },
  { id: 5, name: "Grammar Master Badge", description: "Display your grammar expertise to the community", price: 750, category: "badges", icon: Star, rarity: "rare" },
  { id: 6, name: "Flame Keeper Badge", description: "For those who maintained a 30-day streak", price: 1000, category: "badges", icon: Flame, rarity: "epic" },
  { id: 7, name: "Weekend Warrior Boost", description: "Bonus XP for studying on weekends", price: 400, category: "boosts", icon: Sparkles, rarity: "common" },
  { id: 8, name: "Silver Frame", description: "A sleek silver border for focused learners", price: 250, category: "frames", icon: Frame, rarity: "common", owned: true, equipped: true },
];

const rarityConfig = {
  common: { label: "Common", className: "text-muted-foreground border-muted" },
  rare: { label: "Rare", className: "text-blue-600 border-blue-200" },
  epic: { label: "Epic", className: "text-purple-600 border-purple-200" },
  legendary: { label: "Legendary", className: "text-amber-600 border-amber-200" },
};

const dailyRewards = [
  { day: 1, points: 50, claimed: true },
  { day: 2, points: 75, claimed: true },
  { day: 3, points: 100, claimed: true },
  { day: 4, points: 150, claimed: false, isToday: true },
  { day: 5, points: 200, claimed: false },
  { day: 6, points: 300, claimed: false },
  { day: 7, points: 500, claimed: false },
];

export function StoreView() {
  const [balance, setBalance] = useState(1250);
  const [ownedItems, setOwnedItems] = useState<number[]>([8]);
  const [equippedItems, setEquippedItems] = useState<number[]>([8]);
  const [confirmItem, setConfirmItem] = useState<StoreItem | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { value: "all", label: "All Items" },
    { value: "frames", label: "Profile Frames" },
    { value: "badges", label: "Badges" },
    { value: "boosts", label: "Boosts" },
    { value: "protection", label: "Protection" },
  ];

  const filtered = storeItems.filter((item) => activeCategory === "all" || item.category === activeCategory);

  const handleBuy = (item: StoreItem) => {
    if (balance < item.price) return;
    setBalance((b) => b - item.price);
    setOwnedItems((prev) => [...prev, item.id]);
    setPurchaseSuccess(true);
    setConfirmItem(null);
    setTimeout(() => setPurchaseSuccess(false), 3000);
  };

  const handleEquip = (id: number) => {
    setEquippedItems((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleClaimReward = () => {
    const today = dailyRewards.find((r) => r.isToday);
    if (today) setBalance((b) => b + today.points);
  };

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

      <Tabs defaultValue="store">
        <TabsList>
          <TabsTrigger value="store"><ShoppingBag className="h-4 w-4 mr-2" />Store</TabsTrigger>
          <TabsTrigger value="inventory"><Gift className="h-4 w-4 mr-2" />My Items</TabsTrigger>
          <TabsTrigger value="daily"><Flame className="h-4 w-4 mr-2" />Daily Rewards</TabsTrigger>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item) => {
              const owned = ownedItems.includes(item.id);
              const equipped = equippedItems.includes(item.id);
              const Icon = item.icon;
              const rarity = rarityConfig[item.rarity];
              const canAfford = balance >= item.price;

              return (
                <Card key={item.id} className={`relative ${equipped ? "ring-2 ring-foreground" : ""}`}>
                  {equipped && (
                    <div className="absolute top-2 right-2">
                      <Badge className="text-xs">Equipped</Badge>
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center mx-auto">
                      <Icon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-xs ${rarity.className}`}>{rarity.label}</Badge>
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-bold">{item.price}</span>
                      </div>
                    </div>
                    {owned ? (
                      <Button
                        variant={equipped ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => handleEquip(item.id)}
                      >
                        {equipped ? "Unequip" : "Equip"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!canAfford}
                        onClick={() => setConfirmItem(item)}
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
        </TabsContent>

        {/* INVENTORY TAB */}
        <TabsContent value="inventory" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {storeItems.filter((item) => ownedItems.includes(item.id)).map((item) => {
              const equipped = equippedItems.includes(item.id);
              const Icon = item.icon;
              return (
                <Card key={item.id} className={equipped ? "ring-2 ring-foreground" : ""}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <Button size="sm" variant={equipped ? "default" : "outline"} onClick={() => handleEquip(item.id)}>
                      {equipped ? "Unequip" : "Equip"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {ownedItems.length === 0 && (
              <div className="col-span-full text-center py-12">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium">No items yet</p>
                <p className="text-sm text-muted-foreground">Purchase items from the store to see them here</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* DAILY REWARDS TAB */}
        <TabsContent value="daily" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5" /> 7-Day Login Reward
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {dailyRewards.map((reward) => (
                  <div
                    key={reward.day}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-center ${
                      reward.claimed
                        ? "bg-muted border-transparent"
                        : reward.isToday
                        ? "border-foreground bg-muted"
                        : "border-dashed"
                    }`}
                  >
                    <span className="text-xs text-muted-foreground">Day {reward.day}</span>
                    <div className="relative">
                      <Coins className={`h-6 w-6 ${reward.claimed ? "text-muted-foreground" : "text-amber-500"}`} />
                      {reward.claimed && <CheckCircle2 className="h-3 w-3 text-green-600 absolute -top-1 -right-1" />}
                    </div>
                    <span className="text-xs font-bold">{reward.points}</span>
                    {reward.isToday && !reward.claimed && (
                      <Button size="sm" className="text-xs h-6 px-2" onClick={handleClaimReward}>Claim</Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={confirmItem !== null} onOpenChange={() => setConfirmItem(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
          </DialogHeader>
          {confirmItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                <div className="h-12 w-12 rounded-lg bg-background flex items-center justify-center">
                  <confirmItem.icon className="h-6 w-6" />
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
            <Button variant="outline" onClick={() => setConfirmItem(null)}>Cancel</Button>
            <Button onClick={() => confirmItem && handleBuy(confirmItem)}>Confirm Purchase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
