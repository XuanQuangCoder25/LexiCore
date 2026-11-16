import { Badge } from "../ui/badge";
import { Flame } from "lucide-react";

interface DashboardHeaderProps {
  userName: string;
  streak: number;
}

export function DashboardHeader({ userName, streak }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
          Welcome back, {userName}!
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Theo dõi tiến trình học tập, chuỗi ngày hoạt động và hiệu suất ghi nhớ của bạn
        </p>
      </div>
      <Badge
        variant="secondary"
        className="w-fit px-3.5 py-1.5 text-sm shadow-2xs border border-zinc-200 bg-white text-zinc-900 rounded-full inline-flex items-center gap-1.5 font-semibold"
      >
        <Flame className="w-4 h-4 shrink-0 text-zinc-900" strokeWidth={1.75} />
        <span>{streak} day streak</span>
      </Badge>
    </div>
  );
}
