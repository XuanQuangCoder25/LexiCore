import { Card, CardContent } from "../ui/card";
import { BookOpen, Clock, Target, TrendingUp } from "lucide-react";
import { DashboardStats } from "./hooks/useDashboardData";

interface QuickStatsProps {
  stats: DashboardStats;
}

export function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Lessons Completed</p>
              <p className="text-3xl font-bold">{stats.lessonsCompleted}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Study Time</p>
              <p className="text-3xl font-bold">{stats.durationHours}h</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <Clock className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Words Learned</p>
              <p className="text-3xl font-bold">{stats.wordsLearned.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <Target className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Level</p>
              <p className="text-xl font-bold leading-tight mt-1">{stats.level}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full shrink-0 ml-2">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
