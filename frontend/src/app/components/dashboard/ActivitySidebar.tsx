import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { TrendingUp, Award, ArrowRight, Sparkles, Rocket } from "lucide-react";
import { DashboardActivities } from "./hooks/useDashboardData";

interface ActivitySidebarProps {
  streak: number;
  activities: DashboardActivities;
  onNavigateTab?: (tab: string) => void;
}

export function ActivitySidebar({ streak, activities, onNavigateTab }: ActivitySidebarProps) {
  const streakGoal = streak < 7 ? 7 : streak < 14 ? 14 : 30;
  const streakPercent = Math.min((streak / streakGoal) * 100, 100);
  const daysLeft = Math.max(streakGoal - streak, 0);

  const handleGoToAchievements = () => {
    if (onNavigateTab) {
      onNavigateTab("achievements");
    } else {
      window.dispatchEvent(new CustomEvent("navigate-tab", { detail: { tab: "achievements" } }));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-zinc-900" />
            Learning Streak
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center pt-2">
          <div className="text-5xl font-extrabold mb-1 text-zinc-900 font-mono">{streak}</div>
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Days in a row</div>
          <div className="w-full bg-zinc-100 rounded-full h-2.5 mb-3 overflow-hidden">
            <div
              className="bg-zinc-900 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${streakPercent}%` }}
            />
          </div>
          {daysLeft > 0 ? (
            <p className="text-xs text-zinc-500">
              Còn <strong className="text-zinc-900">{daysLeft} ngày</strong> nữa để đạt mốc {streakGoal} ngày liên tiếp!
            </p>
          ) : (
            <p className="text-xs font-semibold text-emerald-600 inline-flex items-center justify-center gap-1.5">
              <span>Bạn đã chinh phục mốc {streakGoal} ngày liên tiếp!</span>
              <Sparkles className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-zinc-900">Recent Achievements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!activities?.achievements || activities.achievements.length === 0 ? (
            <div className="text-xs text-zinc-500 text-center py-6 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
              Chưa có thành tựu nào được mở khóa gần đây.
            </div>
          ) : (
            activities.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-3.5 bg-zinc-50/70 border border-zinc-200/70 p-3 rounded-xl"
              >
                <div className="bg-zinc-900 text-white p-2.5 rounded-xl shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-zinc-900 leading-tight truncate">{achievement.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{achievement.description}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border border-zinc-200/80 bg-zinc-50/70 rounded-2xl overflow-hidden relative shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <CardContent className="p-6 text-center relative z-10">
          <h3 className="font-bold text-base mb-1.5 text-zinc-900 inline-flex items-center justify-center gap-1.5">
            <span>Keep it up!</span>
            <Rocket className="w-4 h-4 shrink-0 text-zinc-900" strokeWidth={1.75} />
          </h3>
          <p className="text-xs text-zinc-600 mb-4 leading-relaxed">
            Chỉ số hoạt động tuần này của bạn đạt <strong className="text-zinc-900 font-mono">{activities?.weeklyActivityScore || 0}%</strong> dựa trên tiến độ học tập thực tế.
          </p>
          <Button
            onClick={handleGoToAchievements}
            size="sm"
            className="w-full rounded-xl bg-[#161616] hover:bg-black text-white text-xs font-semibold h-9"
          >
            Xem Thành tựu & Nhiệm vụ
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
