import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Loader2, MessageSquare, ExternalLink, AlertCircle } from 'lucide-react';
import { PostItem, communityService } from '../../services/community-service';
import { PostCard } from './PostCard';

interface PostDetailDialogProps {
  postId: string | null;
  open: boolean;
  onClose: () => void;
  onNavigateToCommunity?: (postId?: string) => void;
  currentUser?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role?: string;
  } | null;
}

export const PostDetailDialog: React.FC<PostDetailDialogProps> = ({
  postId,
  open,
  onClose,
  onNavigateToCommunity,
  currentUser: initialUser,
}) => {
  const [post, setPost] = useState<PostItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(initialUser || null);

  // Lấy currentUser nếu chưa có
  useEffect(() => {
    if (initialUser) {
      setCurrentUser(initialUser);
      return;
    }
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setCurrentUser({
            id: data.id,
            full_name: data.full_name || 'Học viên',
            avatar_url: data.avatar_url || null,
            role: data.role || 'USER',
          });
        }
      })
      .catch(() => {});
  }, [initialUser]);

  // Nạp bài viết chi tiết
  useEffect(() => {
    if (!open || !postId) {
      setPost(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    communityService
      .getPost(postId)
      .then((data) => {
        setPost(data);
      })
      .catch((err) => {
        console.error('Lỗi nạp bài viết:', err);
        setError('Bài viết này không tồn tại hoặc đã bị xóa bởi tác giả.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, postId]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-0 border-border/80 shadow-2xl">
        {/* Header Dialog */}
        <div className="p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
          <DialogHeader className="p-0">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>Bài viết được chia sẻ</span>
            </DialogTitle>
          </DialogHeader>

          {onNavigateToCommunity && post && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 h-7 text-primary hover:text-primary hover:bg-primary/10 border-primary/30 mr-6"
              onClick={() => {
                onClose();
                onNavigateToCommunity(post.id);
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở trong Community Hub</span>
            </Button>
          )}
        </div>

        {/* Nội dung bài viết */}
        <div className="p-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <span className="text-xs">Đang tải bài viết thảo luận...</span>
            </div>
          ) : error || !post ? (
            <div className="py-16 text-center text-muted-foreground space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-destructive/70" />
              <p className="text-sm font-medium text-foreground">
                {error || 'Không tìm thấy bài viết.'}
              </p>
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                Đóng
              </Button>
            </div>
          ) : (
            <PostCard
              post={post}
              currentUser={currentUser}
              defaultShowComments={true}
              onPostDeleted={() => {
                onClose();
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
