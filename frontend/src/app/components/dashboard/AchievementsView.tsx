import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
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
  Swords
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

export function AchievementsView() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchQuests();
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
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <Award className="h-12 w-12 mb-4 opacity-50" />
              <p>Achievements Grid will be built here in Step 5.3</p>
            </CardContent>
          </Card>
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
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <Trophy className="h-12 w-12 mb-4 opacity-50" />
              <p>Leaderboard Table will be built here in Step 5.4</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}