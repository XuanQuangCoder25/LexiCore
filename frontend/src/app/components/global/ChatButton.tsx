import { MessageCircle } from "lucide-react";
import { Button } from "../ui/button";
import { useSocial } from "../../features/social/SocialContext";

interface ChatButtonProps {
  onClick: () => void;
}

export function ChatButton({ onClick }: ChatButtonProps) {
  const { summary } = useSocial();
  const unreadCount = summary?.unread_messages || 0;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="relative h-9 w-9 p-0 rounded-lg hover:bg-muted"
      aria-label="Tin nhắn"
      title="Tin nhắn trực tiếp"
    >
      <MessageCircle className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center animate-pulse shadow-sm">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
