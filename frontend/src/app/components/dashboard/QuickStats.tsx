import { Card, CardContent } from "../ui/card";
import { BookOpen, Clock, Target, TrendingUp } from "lucide-react";
import { DashboardStats } from "./hooks/useDashboardData";

interface QuickStatsProps {
  stats: DashboardStats;
}

export function QuickStats({ stats }: QuickStatsProps) {
  const displayStudyTime =
    stats.formattedDuration ||
    (stats.durationMinutes && stats.durationMinutes > 0 && stats.durationHours === 0
      ? `${stats.durationMinutes}m`
      : `${stats.durationHours}h`);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-zinc-900 hover:-translate-y-0.5 transition-all duration-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Lessons Completed</p>
              <p className="text-3xl font-extrabold text-zinc-900 font-mono">{stats.lessonsCompleted}</p>
            </div>
            <div className="p-3 bg-zinc-100 rounded-xl border border-zinc-200/60">
              <BookOpen className="h-5 w-5 text-zinc-900" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-zinc-900 hover:-translate-y-0.5 transition-all duration-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Study Time</p>
              <p className="text-3xl font-extrabold text-zinc-900 font-mono">{displayStudyTime}</p>
            </div>
            <div className="p-3 bg-zinc-100 rounded-xl border border-zinc-200/60">
              <Clock className="h-5 w-5 text-zinc-900" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-zinc-900 hover:-translate-y-0.5 transition-all duration-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Words Learned</p>
              <p className="text-3xl font-extrabold text-zinc-900 font-mono">{stats.wordsLearned.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-zinc-100 rounded-xl border border-zinc-200/60">
              <Target className="h-5 w-5 text-zinc-900" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-zinc-900 hover:-translate-y-0.5 transition-all duration-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Current Level</p>
              <p className="text-lg font-extrabold text-zinc-900 leading-tight mt-1">{stats.level}</p>
            </div>
            <div className="p-3 bg-zinc-100 rounded-xl border border-zinc-200/60 shrink-0 ml-2">
              <TrendingUp className="h-5 w-5 text-zinc-900" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
