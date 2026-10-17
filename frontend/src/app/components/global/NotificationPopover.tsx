import { useState, useEffect, useCallback, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import {
  Bell,
  Swords,
  Brain,
  CheckCircle2,
  X,
  Flame,
  Clock,
  Info,
  RefreshCw,
} from "lucide-react";
import { notificationService, InAppNotification } from "../../services/notification-service";
import { toast } from "sonner";

// Hàm tính thời gian hiển thị tương đối
function formatRelativeTime(dateString: string): string {
  if (!dateString) return "Vừa xong";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Vừa xong";
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Nếu vừa tạo trong vòng 2 phút hoặc sai số đồng hồ máy tính
  if (diffSec < 120) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function NotificationPopover() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  // Fetch danh sách thông báo từ API
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getNotifications(25);
      const list = data.notifications || [];
      const newUnreadCount = data.unreadCount || 0;

      // Kiểm tra có thông báo mới tinh chưa đọc không
      if (!isInitialLoadRef.current) {
        const brandNewUnread = list.filter(
          (n) => !n.is_read && !knownIdsRef.current.has(n.id)
        );

        brandNewUnread.forEach((n) => {
          toast(n.title, {
            description: n.body,
            icon: <Flame className="w-5 h-5 text-amber-500" />,
            duration: 8000,
          });
        });
      }

      // Cập nhật tập ID đã biết
      list.forEach((n) => knownIdsRef.current.add(n.id));
      isInitialLoadRef.current = false;

      setNotifications(list);
      setUnreadCount(newUnreadCount);
    } catch (error) {
      // Bỏ qua lỗi nếu chưa đăng nhập hoặc mạng chập chờn
    }
  }, []);

  // Lần đầu mount & Polling định kỳ mỗi 10 giây để cập nhật tức thì
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Khi mở Popover thì refresh lại dữ liệu
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchNotifications();
    }
  };

  // Đánh dấu 1 thông báo là đã đọc
  const handleMarkRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Không thể đánh dấu đã đọc:", error);
    }
  };

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc");
    } catch (error) {
      toast.error("Có lỗi xảy ra khi cập nhật thông báo.");
    }
  };

  // Xóa thông báo
  const handleDismiss = async (e: React.MouseEvent, id: string, wasRead: boolean) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (!wasRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      toast.error("Không thể xóa thông báo này.");
    }
  };

  // Icon theo phân loại thông báo
  const renderIcon = (type: string, isRead: boolean) => {
    const iconClass = "h-4 w-4";
    let Icon = Bell;
    let bgClass = "bg-primary/10 text-primary";

    if (type === "reminder") {
      Icon = Flame;
      bgClass = "bg-amber-500/15 text-amber-500";
    } else if (type === "srs") {
      Icon = Brain;
      bgClass = "bg-pink-500/15 text-pink-500";
    } else if (type === "challenge") {
      Icon = Swords;
      bgClass = "bg-rose-500/15 text-rose-500";
    } else if (type === "achievement") {
      Icon = CheckCircle2;
      bgClass = "bg-emerald-500/15 text-emerald-500";
    } else {
      Icon = Info;
      bgClass = "bg-blue-500/15 text-blue-500";
    }

    return (
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          !isRead ? bgClass : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className={iconClass} />
      </div>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0 rounded-lg">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-84 sm:w-96 p-0 shadow-2xl border-border" align="end">
        {/* Header Popover */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Thông báo</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-primary text-primary-foreground font-bold">
                {unreadCount} mới
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground font-medium"
                onClick={handleMarkAllRead}
              >
                Đã đọc tất cả
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={fetchNotifications}
              title="Làm mới"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Danh sách thông báo */}
        <ScrollArea className="max-h-[380px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground space-y-2">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Bell className="h-6 w-6 opacity-40" />
              </div>
              <p className="font-medium">Chưa có thông báo nào</p>
              <p className="text-xs text-muted-foreground/80 max-w-[200px] mx-auto">
                Các nhắc nhở học tập và cập nhật quan trọng sẽ hiển thị ở đây.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {notifications.map((n) => {
                const isRead = n.is_read;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer group ${
                      !isRead
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-muted/40 opacity-80 hover:opacity-100"
                    }`}
                    onClick={() => handleMarkRead(n.id, isRead)}
                  >
                    {renderIcon(n.type, isRead)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p
                          className={`text-xs leading-snug truncate ${
                            !isRead
                              ? "font-bold text-foreground"
                              : "font-semibold text-foreground/80"
                          }`}
                        >
                          {n.title}
                        </p>
                        <button
                          type="button"
                          className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                          onClick={(e) => handleDismiss(e, n.id, isRead)}
                          title="Xóa thông báo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {n.body}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground font-mono">
                        <Clock className="w-3 h-3 opacity-60" />
                        <span>{formatRelativeTime(n.created_at)}</span>
                      </div>
                    </div>

                    {!isRead && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer Popover */}
        <div className="border-t px-4 py-2 bg-muted/20 text-center">
          <p className="text-[11px] text-muted-foreground">
            Thông báo được tự động đồng bộ theo thời gian thực
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
