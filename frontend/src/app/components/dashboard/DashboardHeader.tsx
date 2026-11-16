import { Badge } from "../ui/badge";
import { Flame } from "lucide-react";

interface DashboardHeaderProps {
  userName: string;
  streak: number;
}

export function DashboardHeader({ userName, streak }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {userName}!</h1>
        <p className="text-muted-foreground mt-1">Let's continue your learning journey</p>
      </div>
      <Badge variant="secondary" className="px-3 py-1.5 text-sm shadow-xs border border-border/50 inline-flex items-center gap-1.5 font-medium">
        <Flame className="w-4 h-4 shrink-0 text-zinc-900 dark:text-zinc-100" strokeWidth={1.75} />
        <span>{streak} day streak</span>
      </Badge>
    </div>
  );
}
