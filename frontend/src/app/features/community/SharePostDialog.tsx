import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import {
  Share2,
  Send,
  Check,
  Copy,
  Search,
  MessageSquare,
  Users,
  Loader2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { socialService, FriendItem } from '../../services/social-service';
import { useSocial } from '../social/SocialContext';
import { getInitials } from '../social/utils';
import { PostItem, COMMUNITY_TOPICS_LIST } from '../../services/community-service';

interface SharePostDialogProps {
  open: boolean;
  onClose: () => void;
  post: PostItem;
}

export const SharePostDialog: React.FC<SharePostDialogProps> = ({ open, onClose, post }) => {
  const { onlineUserIds } = useSocial();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sentFriendIds, setSentFriendIds] = useState<Set<string>>(new Set());
  const [sendingFriendId, setSendingFriendId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Nạp danh sách bạn bè khi mở dialog
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSearchQuery('');
    setSentFriendIds(new Set());
    setIsCopied(false);

    socialService
      .getFriends()
      .then((data) => {
        setFriends(data || []);
      })
      .catch((err) => {
        console.error('Lỗi nạp danh sách bạn bè:', err);
        toast.error('Không thể tải danh sách bạn bè.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open]);

  // Lọc theo từ khóa tìm kiếm
  const filteredFriends = friends.filter((f) =>
    f.full_name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Xử lý gửi bài viết cho 1 người bạn
  const handleSendToFriend = async (friend: FriendItem) => {
    if (sentFriendIds.has(friend.id) || sendingFriendId === friend.id) return;

    try {
      setSendingFriendId(friend.id);

      // 1. Tạo hoặc lấy cuộc trò chuyện với bạn bè
      const conv = await socialService.getOrCreateConversation(friend.id);

      // 2. Định dạng tin nhắn gửi qua Chat
      const messageContent = `Mình muốn chia sẻ bài viết này với bạn: "${post.title}"\n[COMMUNITY_POST:${post.id}]`;

      // 3. Gửi tin nhắn
      await socialService.sendMessage(conv.id, messageContent);

      // 4. Cập nhật trạng thái đã gửi
      setSentFriendIds((prev) => new Set(prev).add(friend.id));
      toast.success(`Đã chia sẻ bài viết tới ${friend.full_name}!`);
    } catch (error) {
      console.error('Lỗi khi chia sẻ bài viết:', error);
      toast.error(`Không thể gửi bài viết tới ${friend.full_name}.`);
    } finally {
      setSendingFriendId(null);
    }
  };

  // Sao chép liên kết trực tiếp
  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/?tab=community&post=${post.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toast.success('Đã sao chép liên kết bài viết vào bộ nhớ tạm!');
      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      toast.error('Không thể sao chép liên kết.');
    }
  };

  const topicInfo = COMMUNITY_TOPICS_LIST.find((t) => t.id === post.topic);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border/80 shadow-2xl">
        {/* Header */}
        <div className="p-5 pb-3 border-b border-border/60 bg-muted/20">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Share2 className="w-4 h-4 text-primary" />
              <span>Chia sẻ bài viết</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Gửi thảo luận này trực tiếp tới bạn bè qua tin nhắn riêng hoặc sao chép liên kết.
            </DialogDescription>
          </DialogHeader>

          {/* Mini Post Preview Card */}
          <div className="mt-3.5 p-3 rounded-lg border border-border/70 bg-card/80 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={post.author.avatar_url || ''} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(post.author.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-foreground truncate">
                {post.author.full_name}
              </span>
              {topicInfo && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 font-normal ml-auto">
                  #{topicInfo.label}
                </Badge>
              )}
            </div>
            <p className="text-xs font-semibold text-foreground line-clamp-1">{post.title}</p>
            <p className="text-[11px] text-muted-foreground line-clamp-1">{post.content}</p>
          </div>
        </div>

        {/* Thân Modal: Danh sách bạn bè */}
        <div className="p-5 space-y-3.5">
          {/* Ô tìm kiếm bạn bè */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bạn bè theo tên..."
              className="pl-8.5 h-9 text-xs"
            />
          </div>

          {/* Danh sách người bạn */}
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs">Đang tải danh sách bạn bè...</span>
              </div>
            ) : friends.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground space-y-2">
                <Users className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p className="text-xs">Bạn chưa có bạn bè nào để chia sẻ.</p>
                <p className="text-[11px] text-muted-foreground/80">
                  Hãy kết nối bạn bè tại mục Bạn bè để cùng thảo luận học tập!
                </p>
              </div>
            ) : filteredFriends.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Không tìm thấy bạn bè phù hợp với "{searchQuery}".
              </p>
            ) : (
              filteredFriends.map((friend) => {
                const isOnline = onlineUserIds.has(friend.id);
                const isSent = sentFriendIds.has(friend.id);
                const isSending = sendingFriendId === friend.id;

                return (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={friend.avatar_url || ''} />
                          <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                            {getInitials(friend.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-background" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {friend.full_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {isOnline ? (
                            <span className="text-emerald-500">Đang trực tuyến</span>
                          ) : (
                            `Lv.${friend.level} · Streak ${friend.current_streak}d`
                          )}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isSent ? 'outline' : 'default'}
                      disabled={isSent || isSending}
                      className={`h-7 px-3 text-xs gap-1 transition-all ${
                        isSent
                          ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/10'
                          : ''
                      }`}
                      onClick={() => handleSendToFriend(friend)}
                    >
                      {isSending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isSent ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Đã gửi</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Gửi</span>
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer actions: Sao chép liên kết */}
        <div className="p-3.5 bg-muted/30 border-t border-border/60 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 text-muted-foreground hover:text-foreground"
            onClick={handleCopyLink}
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Đã sao chép liên kết!' : 'Sao chép liên kết'}</span>
          </Button>

          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
