import { Badge } from "../ui/badge";

interface DashboardHeaderProps {
  userName: string;
  streak: number;
}

export function DashboardHeader({ userName, streak }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {userName}! 👋</h1>
        <p className="text-muted-foreground mt-1">Let's continue your learning journey</p>
      </div>
      <Badge variant="secondary" className="px-3 py-1.5 text-sm shadow-sm border border-border/50">
        <span className="mr-1">🔥</span> {streak} day streak
      </Badge>
    </div>
  );
}
