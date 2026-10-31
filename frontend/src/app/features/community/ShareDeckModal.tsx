import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Brain, Layers, Share2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  communityService,
  COMMUNITY_TOPICS_LIST,
  getCommunityErrorMessage,
  PostItem,
} from '../../services/community-service';

interface ShareDeckModalProps {
  open: boolean;
  onClose: () => void;
  deck: {
    id: string;
    title: string;
    cardCount: number;
    thumbnail?: string;
    level?: string;
  } | null;
  onShared?: (post: PostItem) => void;
}

export const ShareDeckModal: React.FC<ShareDeckModalProps> = ({
  open,
  onClose,
  deck,
  onShared,
}) => {
  const [topic, setTopic] = useState<string>('vocabulary');
  const [caption, setCaption] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!deck) return null;

  const handleShare = async () => {
    try {
      setLoading(true);
      const post = await communityService.shareFlashcardDeck({
        deckId: deck.id,
        topic,
        caption: caption.trim() || undefined,
      });

      toast.success('Đã chia sẻ bộ Flashcard lên Cộng đồng thành công!');
      onShared?.(post);
      onClose();
      setCaption('');
    } catch (error) {
      toast.error(getCommunityErrorMessage(error, 'Không thể chia sẻ bộ thẻ.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Share2 className="w-5 h-5 text-pink-500" />
            <span>Chia sẻ bộ thẻ lên Cộng đồng</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Bộ Flashcard của bạn sẽ xuất hiện trên bảng tin để các học viên khác có thể lật xem thử và clone về Private Space của họ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tóm tắt bộ thẻ */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
            <div className="w-12 h-12 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm truncate">{deck.title}</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-pink-500" /> {deck.cardCount} thẻ từ
                </span>
                {deck.level && (
                  <>
                    <span>·</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      {deck.level}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Chọn Topic */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Chủ đề hiển thị</label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger className="w-full text-xs h-9">
                <SelectValue placeholder="Chọn chủ đề" />
              </SelectTrigger>
              <SelectContent>
                {COMMUNITY_TOPICS_LIST.filter((t) => t.id !== 'all').map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lời nhắn / Caption */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Lời nhắn / Kinh nghiệm học (tùy chọn)</label>
            <Textarea
              placeholder="Chia sẻ cách bạn ôn tập bộ thẻ này, đối tượng phù hợp hoặc mẹo nhớ nhanh..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={handleShare}
            disabled={loading}
            className="bg-pink-600 hover:bg-pink-700 text-white gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang đăng...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Chia sẻ ngay</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
