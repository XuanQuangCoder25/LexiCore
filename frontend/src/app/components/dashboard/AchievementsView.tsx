import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Trophy,
  Target,
  Award,
  Image as ImageIcon,
  Coins,
  Zap,
  CalendarDays,
  CalendarRange,
  BookOpen,
  Mic,
  PenTool,
  Swords,
  Flame,
  Users,
  CheckCircle,
  Gem,
  Crown,
  Medal,
  Lock,
  BookImage,
  Loader2,
  MoveLeft,
  Check,
  Sparkles
} from "lucide-react";
import { getRankBadgeUrl, formatRankName, optimizeAvatarUrl } from "../../services/arena-service";

interface Quest {
  user_goal_id: string;
  title: string;
  description: string;
  icon: string;
  target_value: number;
  reward_coin: number;
  reward_exp: number;
  type: 'DAILY' | 'WEEKLY';
  current_progress: number;
  is_completed: number;
  is_claimed: number;
}

interface Achievement {
  achievement_id: string;
  title: string;
  description: string;
  icon: string;
  category: 'LEARNING' | 'STREAK' | 'PVP' | 'COLLECTION';
  target_value: number;
  reward_coin: number;
  reward_diamond: number;
  reward_exp: number;
  current_progress: number;
  is_unlocked: number;
  unlocked_at: string | null;
}

interface LeaderboardUser {
  id: string;
  full_name?: string | null;
  fullName?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  leaderboard_point?: number;
  leaderboardPoint?: number;
  level?: number;
  arena_rank?: string;
  arenaRank?: string;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  unlock_level: number;
  theme_color: string;
  is_unlocked: number;
  image_url?: string;
  current_items: number;
  total_items: number;
}

interface CollectionItem {
  id: string;
  name: string;
  type: 'AVATAR' | 'COVER_PHOTO';
  price: number;
  price_type: 'COIN' | 'DIAMOND';
  description: string;
  image_url: string;
  required_level: number;
  collection_id: string;
  is_owned: number;
  is_equipped: number;
}

export function AchievementsView() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);

  // Collection Detail View State
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [equippingItemId, setEquippingItemId] = useState<string | null>(null);

  const fetchQuests = async () => {
    try {
      const res = await fetch('/api/gamification/daily-goals', {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setQuests(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAchievements = async () => {
    try {
      const res = await fetch('/api/gamification/achievements', {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setAchievements(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAchievements(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/gamification/leaderboard', {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/gamification/collections', {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setCollections(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCollections(false);
    }
  };

  const handleOpenCollection = async (col: Collection) => {
    setSelectedCollection(col);
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/gamification/collections/${col.id}/items`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setCollectionItems(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleEquipItem = async (item: CollectionItem) => {
    if (item.is_equipped === 1) return;
    setEquippingItemId(item.id);
    try {
      const res = await fetch(`/api/store/equip/${item.id}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        // Cập nhật trạng thái trang bị ngay lập tức
        setCollectionItems(prev => prev.map(i => {
          if (i.type === item.type) {
            return { ...i, is_equipped: i.id === item.id ? 1 : 0 };
          }
          return i;
        }));
      } else {
        alert(data.message || 'Lỗi trang bị');
      }
    } catch (e) {
      console.error(e);
      alert('Không thể kết nối máy chủ');
    } finally {
      setEquippingItemId(null);
    }
  };

  useEffect(() => {
    fetchQuests();
    fetchAchievements();
    fetchLeaderboard();
    fetchCollections();
  }, []);

  const handleClaim = async (goalId: string) => {
    try {
      const res = await fetch(`/api/gamification/daily-goals/claim/${goalId}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        fetchQuests(); // Cập nhật lại UI
        alert(`Tuyệt vời! Bạn nhận được ${data.reward_coin} Coin và ${data.reward_exp} EXP!`);
      } else {
        alert(data.message || 'Lỗi khi nhận thưởng');
      }
    } catch (e) {
      console.error(e);
      alert('Đã xảy ra lỗi hệ thống');
    }
  };

  const getIcon = (iconStr: string) => {
    switch (iconStr) {
      case 'Mic': return <Mic className="w-5 h-5" />;
      case 'BookOpen': return <BookOpen className="w-5 h-5" />;
      case 'PenTool': return <PenTool className="w-5 h-5" />;
      case 'Swords': return <Swords className='w-5 h-5' />;
      case 'Trophy': return <Trophy className="w-5 h-5" />;
      case 'Award': return <Award className="w-5 h-5" />;
      case 'Medal': return <Medal className="w-5 h-5" />;
      case 'Crown': return <Crown className="w-5 h-5" />;
      case 'BookImage': return <BookImage className="w-5 h-5" />;
      case 'Flame': return <Flame className="w-5 h-5" />;
      case 'Users': return <Users className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const renderQuestCard = (quest: Quest) => {
    const isCompleted = quest.is_completed === 1 || quest.current_progress >= quest.target_value;
    const isClaimed = quest.is_claimed === 1;
    const progressPercent = Math.min(100, (quest.current_progress / quest.target_value) * 100);

    return (
      <Card key={quest.user_goal_id} className={`flex flex-col transition-all duration-300 ${isClaimed ? 'opacity-60 bg-gray-50 dark:bg-gray-900' : 'hover:shadow-md'}`}>
        <CardContent className="p-4 flex flex-col h-full justify-between gap-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${isCompleted && !isClaimed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'}`}>
              {getIcon(quest.icon)}
            </div>
            <div>
              <h4 className="font-semibold text-sm leading-tight text-foreground">{quest.title}</h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{quest.description}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1.5 mt-2">
            <div className="flex justify-between text-xs font-medium text-foreground">
              <span>Tiến trình</span>
              <span>{quest.current_progress} / {quest.target_value}</span>
            </div>
            <Progress value={progressPercent} className="h-2 bg-secondary" indicatorClassName={isCompleted ? "bg-green-500" : ""} />
          </div>

          {/* Rewards & Action */}
          <div className="flex items-center justify-between mt-2 pt-3 border-t border-border">
            <div className="flex gap-1.5 text-xs font-bold">
              <span className="flex items-center text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 px-4 py-3 rounded">
                <Coins className="w-3.5 h-3.5 mr-1" /> {quest.reward_coin}
              </span>
              <span className="flex items-center text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-3 rounded">
                <Zap className="w-3.5 h-3.5 mr-1" /> {quest.reward_exp}
              </span>
            </div>
            <Button
              size="sm"
              className={`text-s h-10 px-8 rounded-full font-semibold transition-all ${isCompleted && !isClaimed ? 'animate-pulse' : ''}`}
              disabled={!isCompleted || isClaimed}
              variant={isClaimed ? "secondary" : isCompleted ? "default" : "outline"}
              onClick={() => handleClaim(quest.user_goal_id)}
            >
              {isClaimed ? "Claimed" : "Claim"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const dailyQuests = quests.filter(q => q.type === 'DAILY');
  const weeklyQuests = quests.filter(q => q.type === 'WEEKLY');

  const filteredAchievements = activeCategory === 'ALL'
    ? achievements
    : achievements.filter(a => a.category === activeCategory);

  const categories = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'LEARNING', label: 'Học tập' },
    { id: 'STREAK', label: 'Chuỗi ngày' },
    { id: 'PVP', label: 'Thi đấu' },
    { id: 'COLLECTION', label: 'Bộ sưu tập' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gamification Hub</h1>
        <p className="text-muted-foreground">Track your quests, achievements, and collections</p>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="quests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quests">Quests</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        {/* Quests Tab */}
        <TabsContent value="quests" className="space-y-6">

          {loading ? (
            <div className="text-center py-12 text-muted-foreground animate-pulse">Đang tải nhiệm vụ...</div>
          ) : (
            <div className="space-y-6">
              {/* Daily Goals Card */}
              <Card className="border shadow-sm overflow-hidden">
                <div className="bg-primary/5 px-6 py-4 border-b flex items-center gap-2">
                  <CalendarDays className="text-primary w-5 h-5" />
                  <h3 className="font-semibold text-lg text-primary">Daily Goals</h3>
                </div>
                <CardContent className="p-6">
                  {dailyQuests.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dailyQuests.map(renderQuestCard)}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Chưa có nhiệm vụ ngày nào.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Weekly Goals Card */}
              <Card className="border shadow-sm overflow-hidden">
                <div className="bg-primary/5 px-6 py-4 border-b flex items-center gap-2">
                  <CalendarRange className="text-primary w-5 h-5" />
                  <h3 className="font-semibold text-lg text-primary">Weekly Goals</h3>
                </div>
                <CardContent className="p-6">
                  {weeklyQuests.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {weeklyQuests.map(renderQuestCard)}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Chưa có nhiệm vụ tuần nào.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <Badge
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </Badge>
            ))}
          </div>

          {loadingAchievements ? (
            <div className="text-center py-12 text-muted-foreground animate-pulse">Đang tải thành tựu...</div>
          ) : filteredAchievements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAchievements.map(ach => {
                const isUnlocked = ach.is_unlocked === 1;
                const progressPercent = Math.min(100, (ach.current_progress / ach.target_value) * 100);

                return (
                  <Card key={ach.achievement_id} className={`hover:shadow-lg transition-all duration-300 ${isUnlocked ? 'border-green-200 bg-green-50/30 dark:bg-green-950/20' : 'opacity-80 grayscale-[20%]'
                    }`}>
                    <CardContent className="p-5 flex flex-col h-full justify-between">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`inline-flex items-center justify-center p-3 rounded-xl ${isUnlocked ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-secondary text-muted-foreground'
                          }`}>
                          {getIcon(ach.icon)}
                        </div>
                        {isUnlocked && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/60 dark:text-green-300 border-none">
                            Đã mở khóa
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h3 className={`font-semibold mb-1 leading-tight ${isUnlocked ? 'text-green-700 dark:text-green-400' : 'text-foreground'}`}>
                          {ach.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[32px]">
                          {ach.description}
                        </p>
                      </div>

                      {isUnlocked ? (
                        <div className="space-y-3 mt-auto">
                          <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            <span>Đạt được ngày {new Date(ach.unlocked_at || '').toLocaleDateString('vi-VN')}</span>
                          </div>
                          <div className="flex gap-1.5 text-xs font-bold mt-2 border-t pt-3">
                            {ach.reward_coin > 0 && (
                              <span className="flex items-center text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                                <Coins className="w-3.5 h-3.5 mr-1" /> {ach.reward_coin}
                              </span>
                            )}
                            {ach.reward_diamond > 0 && (
                              <span className="flex items-center text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 px-2 py-1 rounded">
                                <Gem className="w-3.5 h-3.5 mr-1" /> {ach.reward_diamond}
                              </span>
                            )}
                            {ach.reward_exp > 0 && (
                              <span className="flex items-center text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                                <Zap className="w-3.5 h-3.5 mr-1" /> {ach.reward_exp}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 mt-auto">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">Tiến trình</span>
                            <span>{ach.current_progress} / {ach.target_value}</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12 bg-secondary/20 rounded-xl border border-dashed">
              Chưa có thành tựu nào trong danh mục này.
            </div>
          )}
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections" className="space-y-6">
          {selectedCollection ? (
            /* ─── MÀN HÌNH CHI TIẾT BỘ SƯU TẬP ─── */
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Nút quay lại */}
              <div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedCollection(null)}
                  className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
                >
                  <MoveLeft className="w-4 h-4" /> Quay lại danh sách Bộ Sưu Tập
                </Button>
              </div>

              {/* Hero Banner của Collection */}
              <div
                className="relative rounded-2xl overflow-hidden border shadow-sm p-6 sm:p-8 text-white"
                style={{
                  backgroundColor: selectedCollection.theme_color || '#1e293b',
                  backgroundImage: selectedCollection.image_url ? `linear-gradient(to right, rgba(0,0,0,0.88) 35%, rgba(0,0,0,0.45)), url(${selectedCollection.image_url})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="max-w-2xl space-y-3 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <Badge className="bg-white/20 text-white backdrop-blur-md border-white/30 text-xs font-semibold px-2.5 py-0.5">
                      Mở khóa: Cấp {selectedCollection.unlock_level}
                    </Badge>
                    {selectedCollection.is_unlocked === 1 ? (
                      <Badge className="bg-emerald-500/90 text-white backdrop-blur-md border-none text-xs">
                        Đã mở khóa
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/90 text-white backdrop-blur-md border-none text-xs flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Chưa mở khóa
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md">
                    {selectedCollection.name}
                  </h2>
                  <p className="text-white/85 text-xs sm:text-sm leading-relaxed">
                    {selectedCollection.description}
                  </p>

                  {/* Tiến độ thu thập vật phẩm */}
                  <div className="pt-2 max-w-md">
                    <div className="flex justify-between text-xs font-semibold text-white/90 mb-1.5">
                      <span>Tiến độ thu thập</span>
                      <span>
                        {collectionItems.filter(i => i.is_owned === 1).length} / {collectionItems.length} vật phẩm (
                        {collectionItems.length > 0
                          ? Math.round((collectionItems.filter(i => i.is_owned === 1).length / collectionItems.length) * 100)
                          : 0}%)
                      </span>
                    </div>
                    <Progress
                      value={collectionItems.length > 0 ? (collectionItems.filter(i => i.is_owned === 1).length / collectionItems.length) * 100 : 0}
                      className="h-2.5 bg-black/40"
                      indicatorClassName="bg-white"
                    />
                  </div>
                </div>
              </div>

              {loadingItems ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm">Đang tải các vật phẩm trong bộ sưu tập...</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {/* ─── PHẦN 1: ẢNH BÌA (COVER PHOTOS) - TỈ LỆ 16:9 ─── */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2.5">
                      <BookImage className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-bold">Ảnh Bìa Bộ Sưu Tập (Cover Photos)</h3>
                      <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">Tỉ lệ 16:9</Badge>
                      <Badge variant="secondary" className="ml-auto text-xs font-semibold">
                        {collectionItems.filter(i => i.type === 'COVER_PHOTO').length} ảnh bìa
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {collectionItems.filter(i => i.type === 'COVER_PHOTO').map(cover => (
                        <Card
                          key={cover.id}
                          className={`overflow-hidden border-2 transition-all duration-300 hover:shadow-md ${
                            cover.is_equipped === 1 ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                          }`}
                        >
                          {/* 16:9 Widescreen Container */}
                          <div className="relative aspect-video w-full overflow-hidden bg-muted group">
                            <img
                              src={cover.image_url}
                              alt={cover.name}
                              referrerPolicy="no-referrer"
                              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                                cover.is_owned === 0 ? 'grayscale contrast-75 opacity-70' : ''
                              }`}
                            />
                            {cover.is_owned === 0 && (
                              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                                <div className="bg-background/90 text-foreground p-3 rounded-full shadow-lg">
                                  <Lock className="w-6 h-6 text-muted-foreground" />
                                </div>
                              </div>
                            )}
                            {cover.is_equipped === 1 && (
                              <div className="absolute top-3 left-3">
                                <Badge className="bg-primary text-primary-foreground shadow-md text-xs font-semibold px-2.5 py-0.5">
                                  Đang sử dụng
                                </Badge>
                              </div>
                            )}
                          </div>

                          <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="font-bold text-base truncate">{cover.name}</h4>
                              <p className="text-xs text-muted-foreground truncate">{cover.description}</p>
                            </div>
                            <div className="shrink-0">
                              {cover.is_equipped === 1 ? (
                                <Button size="sm" disabled variant="outline" className="text-xs font-semibold opacity-70">
                                  Đang dùng
                                </Button>
                              ) : cover.is_owned === 1 ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleEquipItem(cover)}
                                  disabled={equippingItemId === cover.id}
                                  className="text-xs font-semibold shadow-sm"
                                >
                                  {equippingItemId === cover.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                                  Trang bị
                                </Button>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground bg-muted/40">
                                  {cover.price} {cover.price_type}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* ─── PHẦN 2: ẢNH ĐẠI DIỆN (AVATARS) - TỈ LỆ 1:1 ─── */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2.5">
                      <Users className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-bold">Ảnh Đại Diện (Avatars)</h3>
                      <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">Tỉ lệ 1:1</Badge>
                      <Badge variant="secondary" className="ml-auto text-xs font-semibold">
                        {collectionItems.filter(i => i.type === 'AVATAR').length} avatar
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {collectionItems.filter(i => i.type === 'AVATAR').map(avatar => (
                        <Card
                          key={avatar.id}
                          className={`overflow-hidden border-2 transition-all duration-300 hover:shadow-md flex flex-col justify-between ${
                            avatar.is_equipped === 1 ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                          }`}
                        >
                          <div className="p-3 flex flex-col items-center text-center">
                            {/* Square 1:1 Aspect Container */}
                            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted/30 p-2 flex items-center justify-center group">
                              <img
                                src={avatar.image_url}
                                alt={avatar.name}
                                referrerPolicy="no-referrer"
                                className={`w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-105 ${
                                  avatar.is_owned === 0 ? 'grayscale opacity-60' : ''
                                }`}
                              />
                              {avatar.is_owned === 0 && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                                  <Lock className="w-5 h-5 text-white/80" />
                                </div>
                              )}
                              {avatar.is_equipped === 1 && (
                                <div className="absolute top-1.5 right-1.5">
                                  <span className="flex h-2.5 w-2.5 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                                  </span>
                                </div>
                              )}
                            </div>

                            <h5 className="font-bold text-sm mt-2 truncate w-full" title={avatar.name}>
                              {avatar.name}
                            </h5>
                            <p className="text-[11px] text-muted-foreground truncate w-full mt-0.5">
                              {avatar.is_owned === 1 ? 'Đã sở hữu' : `${avatar.price} ${avatar.price_type}`}
                            </p>
                          </div>

                          <div className="p-2 border-t bg-muted/10">
                            {avatar.is_equipped === 1 ? (
                              <Button size="sm" disabled variant="outline" className="w-full text-xs h-7 opacity-70">
                                Đang dùng
                              </Button>
                            ) : avatar.is_owned === 1 ? (
                              <Button
                                size="sm"
                                onClick={() => handleEquipItem(avatar)}
                                disabled={equippingItemId === avatar.id}
                                className="w-full text-xs h-7 font-semibold"
                              >
                                {equippingItemId === avatar.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                Trang bị
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" disabled className="w-full text-xs h-7 text-muted-foreground">
                                Khóa
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ─── DANH SÁCH CÁC BỘ SƯU TẬP ─── */
            <Card className="shadow-sm border">
              <CardContent className="p-6">
                {loadingCollections ? (
                  <div className="text-center py-12 text-muted-foreground animate-pulse">Đang tải bộ sưu tập...</div>
                ) : collections.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map(col => {
                      const isUnlocked = col.is_unlocked === 1;
                      const cssVars = { '--theme-color': col.theme_color || '#3b82f6' } as React.CSSProperties;

                      const currentItems = col.current_items || 0;
                      const totalItems = col.total_items || 1; // Tránh chia cho 0 nếu chưa có items trong db
                      const progressPercent = (currentItems / totalItems) * 100;

                      return (
                        <div
                          key={col.id}
                          style={cssVars}
                          onClick={() => handleOpenCollection(col)}
                          className="group relative overflow-hidden rounded-xl border-2 border-border transition-all duration-300 flex flex-col hover:-translate-y-1 hover:[box-shadow:0_0_20px_var(--theme-color)] hover:border-[color:var(--theme-color)] bg-card cursor-pointer"
                        >
                          {/* Wrapper ảnh tỉ lệ 16:9 */}
                          <div className="relative aspect-video w-full overflow-hidden">
                            {/* Ảnh nền */}
                            <div
                              className={`w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105 ${!isUnlocked ? 'grayscale opacity-80' : ''}`}
                              style={{
                                backgroundColor: col.theme_color || '#e2e8f0',
                                backgroundImage: col.image_url ? `url(${col.image_url})` : 'none'
                              }}
                            >
                              {!col.image_url && (
                                <div className="w-full h-full flex items-center justify-center bg-black/10">
                                  <ImageIcon className="w-16 h-16 text-white/50" />
                                </div>
                              )}
                            </div>

                            {/* Overlay Gradient hiển thị chữ */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-5">
                              <h4 className={`font-bold text-xl text-white leading-tight drop-shadow-md ${!isUnlocked ? 'opacity-80' : ''}`}>{col.name}</h4>

                              {/* Badge Level */}
                              <div className="absolute top-4 right-4 z-20">
                                <Badge variant="secondary" className="bg-black/50 text-white hover:bg-black/70 border-none backdrop-blur-sm shadow-sm">
                                  Lv.{col.unlock_level}
                                </Badge>
                              </div>
                            </div>

                            {/* Lớp phủ mờ + Ổ khoá nếu chưa mở */}
                            {!isUnlocked && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] z-10">
                                <div className="bg-background/95 p-4 rounded-full shadow-2xl">
                                  <Lock className="w-8 h-8 text-muted-foreground" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Progress Bar nằm gọn gàng cạnh dưới của Card */}
                          <div className={`p-4 border-t ${!isUnlocked ? 'grayscale opacity-70' : ''}`}>
                            <div className="flex items-center text-xs font-medium text-muted-foreground mb-2">
                              <span className="line-clamp-1">{col.description}</span>
                            </div>
                            <Progress
                              value={progressPercent}
                              className="h-2"
                              indicatorClassName={isUnlocked ? "bg-[color:var(--theme-color)]" : "bg-muted-foreground"}
                            />
                            <div className="flex justify-between items-center text-xs font-medium text-muted-foreground mt-2">
                              <span>Đã thu thập: {currentItems}/{totalItems}</span>
                              <span className="text-primary font-semibold group-hover:underline">Xem chi tiết →</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12 bg-secondary/20 rounded-xl border border-dashed">
                    Chưa có bộ sưu tập nào. Vui lòng thêm dữ liệu vào DB.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <Card className="shadow-sm border gap-0 overflow-hidden">
            {/* Header */}
            <div className="p-5 sm:px-6 sm:py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-card">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span>Bảng xếp hạng Vinh Danh</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Top 50 học viên có thành tích học tập và điểm mùa giải (LP) cao nhất
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>Cập nhật liên tục theo tiến độ học tập</span>
              </div>
            </div>

            <CardContent className="p-0">
              {loadingLeaderboard ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Đang tải bảng xếp hạng...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground space-y-2">
                  <Trophy className="h-10 w-10 mx-auto opacity-30" />
                  <p className="font-medium">Chưa có ai trên bảng xếp hạng</p>
                  <p className="text-xs">Hãy tích cực học tập để ghi tên mình lên bảng vàng!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5 hover:bg-primary/5">
                      <TableHead className="w-16 sm:w-20 text-center font-bold">Hạng</TableHead>
                      <TableHead className="font-bold">Học viên</TableHead>
                      <TableHead className="font-bold hidden sm:table-cell">Bậc Rank</TableHead>
                      <TableHead className="text-center font-bold hidden sm:table-cell">Level</TableHead>
                      <TableHead className="text-right pr-6 sm:pr-8 font-bold">Điểm mùa giải</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((user, index) => {
                      const rank = index + 1;
                      let rankBadge = null;

                      if (rank === 1) {
                        rankBadge = <Crown className="w-6 h-6 text-yellow-500 mx-auto drop-shadow-sm" />;
                      } else if (rank === 2) {
                        rankBadge = <Medal className="w-5 h-5 text-slate-400 mx-auto" />;
                      } else if (rank === 3) {
                        rankBadge = <Medal className="w-5 h-5 text-amber-600 mx-auto" />;
                      } else {
                        rankBadge = <span className="font-semibold text-muted-foreground">{rank}</span>;
                      }

                      const fullName = user.full_name ?? user.fullName ?? 'Người dùng';
                      const avatarUrl = user.avatar_url ?? user.avatarUrl ?? null;
                      const arenaRank = user.arena_rank ?? user.arenaRank ?? 'BRONZE';
                      const level = user.level ?? 1;
                      const points = user.leaderboard_point ?? user.leaderboardPoint ?? 0;

                      return (
                        <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                          {/* Cột 1: Thứ hạng */}
                          <TableCell className="text-center align-middle font-bold">
                            {rankBadge}
                          </TableCell>

                          {/* Cột 2: Avatar thật + Tên học viên */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-border shadow-xs">
                                {avatarUrl && (
                                  <AvatarImage src={optimizeAvatarUrl(avatarUrl, 100)} alt={fullName} className="object-cover" />
                                )}
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                  {fullName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-foreground truncate max-w-[150px] sm:max-w-[220px]">
                                  {fullName}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Cột 3: Bậc Rank (Badge + Tên) */}
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                                <img
                                  src={getRankBadgeUrl(arenaRank)}
                                  alt={formatRankName(arenaRank)}
                                  className="w-full h-full object-contain drop-shadow-xs"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              </div>
                              <span className="font-semibold text-xs text-foreground">
                                {formatRankName(arenaRank)}
                              </span>
                            </div>
                          </TableCell>

                          {/* Cột 4: Cấp độ (Level) */}
                          <TableCell className="text-center hidden sm:table-cell">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                              Lv {level}
                            </span>
                          </TableCell>

                          {/* Cột 5: Điểm mùa giải (LP) */}
                          <TableCell className="text-right pr-6 sm:pr-8">
                            <span className="font-extrabold text-sm sm:text-base text-primary">
                              {points.toLocaleString()}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground ml-1">LP</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}