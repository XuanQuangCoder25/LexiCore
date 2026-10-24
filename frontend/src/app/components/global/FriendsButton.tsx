import { Users } from "lucide-react";
import { Button } from "../ui/button";
import { useSocial } from "../../features/social/SocialContext";

interface FriendsButtonProps {
  onClick: () => void;
}

export function FriendsButton({ onClick }: FriendsButtonProps) {
  const { summary } = useSocial();
  const totalBadge = (summary?.pending_requests || 0) + (summary?.unread_messages || 0);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="relative h-9 w-9 p-0 rounded-lg hover:bg-muted"
      aria-label="Bạn bè"
      title="Bạn bè"
    >
      <Users className="h-5 w-5" />
      {totalBadge > 0 && (
        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-sm">
          {totalBadge > 99 ? "99+" : totalBadge}
        </span>
      )}
    </Button>
  );
}
