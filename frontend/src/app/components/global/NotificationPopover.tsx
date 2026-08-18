import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import {
  Bell,
  Swords,
  TrendingDown,
  Brain,
  CheckCircle2,
  X,
} from "lucide-react";

interface Notification {
  id: number;
  type: "challenge" | "leaderboard" | "srs" | "achievement";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  { id: 1, type: "challenge", title: "Challenge Received!", body: "Alex Kim challenged you to a PvP battle. Accept now!", time: "2 min ago", read: false },
  { id: 2, type: "leaderboard", title: "Leaderboard Drop", body: "You dropped to #4 on the Weekly Leaderboard. Study more to reclaim your spot!", time: "1 hour ago", read: false },
  { id: 3, type: "srs", title: "Review Reminder", body: "Time to review: 50 words are about to be forgotten (SRS Algorithm). Don't break your streak!", time: "3 hours ago", read: false },
  { id: 4, type: "achievement", title: "Achievement Unlocked", body: "You earned the 'Grammar Master' badge. Visit your achievements page!", time: "1 day ago", read: true },
  { id: 5, type: "srs", title: "Review Reminder", body: "23 cards are due for review today. Keep your retention high!", time: "2 days ago", read: true },
];

const notificationIcons = {
  challenge: Swords,
  leaderboard: TrendingDown,
  srs: Brain,
  achievement: CheckCircle2,
};

export function NotificationPopover() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismiss = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const Icon = notificationIcons[n.type];
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer ${!n.read ? "bg-muted/30" : ""}`}
                    onClick={() => markRead(n.id)}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${!n.read ? "bg-foreground text-background" : "bg-muted"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                        <button
                          className="shrink-0 text-muted-foreground hover:text-foreground mt-0.5"
                          onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                    </div>
                    {!n.read && (
                      <div className="h-2 w-2 rounded-full bg-foreground shrink-0 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-2">
          <Button variant="ghost" size="sm" className="w-full text-xs">View all notifications</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
