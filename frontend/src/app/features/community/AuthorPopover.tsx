import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  MessageCircle,
  UserPlus,
  Check,
  Clock,
  Sparkles,
  GraduationCap,
  Shield,
  Loader2,
} from 'lucide-react';
import { useSocial } from '../social/SocialContext';
import { CommunityAuthor } from '../../services/community-service';
import { getInitials } from '../social/utils';

interface AuthorPopoverProps {
  author: CommunityAuthor;
  authorRole?: string;
  children: React.ReactNode;
}

export const AuthorPopover: React.FC<AuthorPopoverProps> = ({
  author,
  authorRole,
  children,
}) => {
  const social = useSocial();
  const [addingFriend, setAddingFriend] = useState(false);

  const currentUserId = social?.currentUserId;
  const isSelf = currentUserId === author.id;
  const isOnline = social?.onlineUserIds?.has(author.id);

  // Quan hệ bạn bè
  const isFriend = social?.friends?.some((f) => f.id === author.id);
  const isSent = social?.sentRequests?.some((r) => r.user.id === author.id);
  const receivedReq = social?.receivedRequests?.find((r) => r.user.id === author.id);

  const handleOpenChat = () => {
    if (social?.openChatWithFriend) {
      social.openChatWithFriend({
        id: author.id,
        full_name: author.full_name,
        avatar_url: author.avatar_url,
      });
    }
  };

  const handleAddFriend = async () => {
    if (!social?.sendFriendRequest) return;
    try {
      setAddingFriend(true);
      await social.sendFriendRequest(author.id);
    } finally {
      setAddingFriend(false);
    }
  };

  const handleAcceptFriend = async () => {
    if (!social?.acceptRequest || !receivedReq) return;
    try {
      setAddingFriend(true);
      await social.acceptRequest(receivedReq.request_id);
    } finally {
      setAddingFriend(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-4 text-xs space-y-3" align="start">
        {/* Profile Header */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-border">
              <AvatarImage src={author.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {getInitials(author.full_name)}
              </AvatarFallback>
            </Avatar>
            {/* Online Indicator */}
            <span
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background ${
                isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
              }`}
              title={isOnline ? 'Đang online' : 'Ngoại tuyến'}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-foreground truncate">{author.full_name}</h4>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                Cấp độ {author.level}
              </Badge>
              {isOnline && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  • Đang hoạt động
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Roles & Info */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {authorRole === 'CONTENT_CREATOR' && (
            <Badge className="text-[10px] py-0 h-4 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 gap-1 font-medium">
              <GraduationCap className="w-3 h-3" /> Giảng viên / Creator
            </Badge>
          )}
          {authorRole === 'ADMIN' && (
            <Badge className="text-[10px] py-0 h-4 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 gap-1 font-medium">
              <Shield className="w-3 h-3" /> Quản trị viên
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        {!isSelf && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
            {/* Nút Nhắn tin 1-1 */}
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs gap-1.5 font-medium"
              onClick={handleOpenChat}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Nhắn tin</span>
            </Button>

            {/* Nút Kết bạn */}
            {isFriend ? (
              <Button variant="secondary" size="sm" className="h-7 text-xs gap-1 font-medium text-emerald-600" disabled>
                <Check className="w-3.5 h-3.5" />
                <span>Bạn bè</span>
              </Button>
            ) : isSent ? (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 font-medium text-muted-foreground" disabled>
                <Clock className="w-3.5 h-3.5" />
                <span>Đã gửi</span>
              </Button>
            ) : receivedReq ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 font-medium text-primary border-primary"
                onClick={handleAcceptFriend}
                disabled={addingFriend}
              >
                {addingFriend ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Đồng ý</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 font-medium"
                onClick={handleAddFriend}
                disabled={addingFriend}
              >
                {addingFriend ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>Kết bạn</span>
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
