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
  Medal
} from "lucide-react";

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
  full_name: string;
  rank_point: number;
  level: number;
}

export function AchievementsView() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

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

  useEffect(() => {
    fetchQuests();
    fetchAchievements();
    fetchLeaderboard();
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
      case 'Swords': return <Swords className='w-5 h-5' />
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
                  <Card key={ach.achievement_id} className={`hover:shadow-lg transition-all duration-300 ${
                    isUnlocked ? 'border-green-200 bg-green-50/30 dark:bg-green-950/20' : 'opacity-80 grayscale-[20%]'
                  }`}>
                    <CardContent className="p-5 flex flex-col h-full justify-between">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`inline-flex items-center justify-center p-3 rounded-xl ${
                          isUnlocked ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-secondary text-muted-foreground'
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
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
              <p>Collections Gallery will be built here in Step 5.5</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <Card className="shadow-sm border">
            <CardContent className="p-0">
              {loadingLeaderboard ? (
                <div className="text-center py-12 text-muted-foreground animate-pulse">Đang tải bảng xếp hạng...</div>
              ) : leaderboard.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5 hover:bg-primary/5">
                      <TableHead className="w-20 text-center font-bold">Hạng</TableHead>
                      <TableHead className="font-bold">Học viên</TableHead>
                      <TableHead className="text-center font-bold">Cấp độ</TableHead>
                      <TableHead className="text-right pr-8 font-bold">Điểm Rank</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((user, index) => {
                      const rank = index + 1;
                      let rankBadge = null;
                      if (rank === 1) rankBadge = <Crown className="w-6 h-6 text-yellow-500 mx-auto drop-shadow-sm" />;
                      else if (rank === 2) rankBadge = <Medal className="w-5 h-5 text-slate-400 mx-auto" />;
                      else if (rank === 3) rankBadge = <Medal className="w-5 h-5 text-amber-600 mx-auto" />;
                      else rankBadge = <span className="font-semibold text-muted-foreground">{rank}</span>;

                      return (
                        <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="text-center align-middle">{rankBadge}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-primary/10 shadow-sm">
                                <AvatarFallback className="bg-primary/5 text-primary font-bold">
                                  {user.full_name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-foreground">{user.full_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono">{user.level}</Badge>
                          </TableCell>
                          <TableCell className="text-right pr-8 font-bold text-primary">
                            {user.rank_point.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">Chưa có ai trên bảng xếp hạng. Hãy là người đầu tiên!</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}