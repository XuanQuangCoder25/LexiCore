import React, { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Send, Loader2, Sparkles, X, MessageSquarePlus, BarChart2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  communityService,
  COMMUNITY_TOPICS_LIST,
  getCommunityErrorMessage,
  PostItem,
} from '../../services/community-service';
import { getInitials } from '../social/utils';

interface PostComposerProps {
  onPostCreated: (post: PostItem) => void;
  currentUser?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export const PostComposer: React.FC<PostComposerProps> = ({ onPostCreated, currentUser }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('general');
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Poll state
  const [isPollMode, setIsPollMode] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const handleAddPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const handlePollOptionChange = (idx: number, val: string) => {
    const updated = [...pollOptions];
    updated[idx] = val;
    setPollOptions(updated);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài viết (tối thiểu 3 ký tự).');
      return;
    }
    if (!content.trim()) {
      toast.error('Vui lòng nhập nội dung bài viết (tối thiểu 5 ký tự).');
      return;
    }

    let cleanPollOptions: string[] | undefined;
    if (isPollMode) {
      cleanPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (cleanPollOptions.length < 2) {
        toast.error('Bình chọn cần ít nhất 2 phương án lựa chọn.');
        return;
      }
    }

    const tags = tagInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    try {
      setSubmitting(true);
      const newPost = await communityService.createPost({
        title: title.trim(),
        content: content.trim(),
        topic,
        tags,
        type: isPollMode ? 'poll' : 'discussion',
        pollOptions: cleanPollOptions,
      });

      toast.success(isPollMode ? 'Đã tạo bài bình chọn thành công!' : 'Đã đăng bài viết lên Cộng đồng!');
      setTitle('');
      setContent('');
      setTagInput('');
      setTopic('general');
      setIsPollMode(false);
      setPollOptions(['', '']);
      setIsExpanded(false);
      onPostCreated(newPost);
    } catch (error) {
      toast.error(getCommunityErrorMessage(error, 'Không thể đăng bài viết.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-border/80 bg-card shadow-sm hover:border-primary/40 transition-colors">
      <CardContent className="p-4">
        {!isExpanded ? (
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setIsExpanded(true)}
          >
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={currentUser?.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {currentUser?.full_name ? getInitials(currentUser.full_name) : 'ME'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 bg-muted/60 hover:bg-muted text-muted-foreground text-sm rounded-full px-4 py-2 transition-colors flex items-center justify-between">
              <span>Bạn muốn hỏi bài, chia sẻ mẹo hay thảo luận gì hôm nay?</span>
              <MessageSquarePlus className="w-4 h-4 text-muted-foreground/60 shrink-0" />
            </div>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Tạo bài thảo luận mới
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(false)}
                disabled={submitting}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <Input
              placeholder="Tiêu đề câu hỏi hoặc chủ đề thảo luận (ngắn gọn, rõ ý)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-medium text-sm"
              disabled={submitting}
            />

            <Textarea
              placeholder="Mô tả chi tiết câu hỏi, bài tập cần giải hoặc kinh nghiệm bạn muốn chia sẻ..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="text-sm resize-none"
              disabled={submitting}
            />

            {/* Poll Options Section */}
            {isPollMode && (
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-primary" /> Lựa chọn bình chọn (2 - 5 lựa chọn)
                  </span>
                  {pollOptions.length < 5 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] text-primary hover:text-primary gap-1"
                      onClick={handleAddPollOption}
                      disabled={submitting}
                    >
                      <Plus className="w-3 h-3" /> Thêm lựa chọn
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-muted-foreground w-4 text-center">
                        {idx + 1}.
                      </span>
                      <Input
                        placeholder={`Lựa chọn ${idx + 1}...`}
                        value={opt}
                        onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                        className="h-7 text-xs bg-card"
                        disabled={submitting}
                      />
                      {pollOptions.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemovePollOption(idx)}
                          disabled={submitting}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={topic} onValueChange={setTopic} disabled={submitting}>
                  <SelectTrigger className="w-[160px] h-8 text-xs font-medium">
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

                <Input
                  placeholder="Tags (cách nhau bởi dấu phẩy)..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="h-8 text-xs flex-1 min-w-[140px] max-w-[200px]"
                  disabled={submitting}
                />

                <Button
                  type="button"
                  variant={isPollMode ? 'secondary' : 'outline'}
                  size="sm"
                  className={`h-8 text-xs gap-1.5 ${
                    isPollMode
                      ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                      : 'text-muted-foreground'
                  }`}
                  onClick={() => setIsPollMode(!isPollMode)}
                  disabled={submitting}
                >
                  <BarChart2 className="w-3.5 h-3.5 text-primary" />
                  <span>{isPollMode ? 'Hủy bình chọn' : 'Thêm bình chọn'}</span>
                </Button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setIsExpanded(false)}
                  disabled={submitting}
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang đăng...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{isPollMode ? 'Tạo bình chọn' : 'Đăng bài'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
