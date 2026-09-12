import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { TrendingUp, Award, ArrowRight } from "lucide-react";
import { DashboardActivities } from "./hooks/useDashboardData";

interface ActivitySidebarProps {
  streak: number;
  activities: DashboardActivities;
}

export function ActivitySidebar({ streak, activities }: ActivitySidebarProps) {
  const streakGoal = 10;
  const streakPercent = Math.min((streak / streakGoal) * 100, 100);
  const daysLeft = Math.max(streakGoal - streak, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Learning Streak
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-5xl font-bold mb-2 text-primary">{streak}</div>
          <div className="text-muted-foreground mb-4">Days in a row</div>
          <div className="w-full bg-secondary rounded-full h-2.5 mb-4 overflow-hidden">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${streakPercent}%` }}
            ></div>
          </div>
          {daysLeft > 0 ? (
            <p className="text-sm text-muted-foreground">{daysLeft} more days to reach your goal!</p>
          ) : (
            <p className="text-sm font-medium text-green-600">You hit your {streakGoal}-day goal! 🎉</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Achievements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activities.achievements.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
              No recent achievements yet.
            </div>
          ) : (
            activities.achievements.map((achievement) => (
              <div key={achievement.id} className="flex items-center gap-4 bg-muted/30 p-3 rounded-xl">
                <div className="bg-primary/10 p-2.5 rounded-full shrink-0">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm leading-tight">{achievement.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
        <CardContent className="p-6 text-center relative z-10">
          <h3 className="font-bold text-lg mb-2 text-foreground">Keep it up! 🚀</h3>
          <p className="text-sm text-muted-foreground mb-5">
            You're <strong className="text-foreground">{activities.weeklyActivityScore}%</strong> more active than average learners this week
          </p>
          <Button variant="default" size="sm" className="w-full rounded-full">
            View Full Report
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
