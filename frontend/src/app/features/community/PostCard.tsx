import React, { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Pin,
  Trash2,
  Copy,
  GraduationCap,
  Sparkles,
  Brain,
  Download,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Check,
  Loader2,
  Layers,
  Award,
  BarChart2,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  PostItem,
  communityService,
  COMMUNITY_TOPICS_LIST,
  getCommunityErrorMessage,
} from '../../services/community-service';
import { getInitials, formatRelativeTime } from '../social/utils';
import { CommentSection } from './CommentSection';
import { AuthorPopover } from './AuthorPopover';
import { SharePostDialog } from './SharePostDialog';

interface PostCardProps {
  post: PostItem;
  currentUser?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role?: string;
  } | null;
  onPostDeleted?: (postId: string) => void;
  defaultShowComments?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onPostDeleted,
  defaultShowComments = false,
}) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.stats.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.stats.commentsCount);
  const [clonesCount, setClonesCount] = useState(post.stats.clonesCount || 0);
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [shareOpen, setShareOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // States cho Phase 3: Pin, Poll, Solved
  const [isPinned, setIsPinned] = useState(post.isPinned);
  const [isSolved, setIsSolved] = useState(post.isSolved);
  const [pollOptions, setPollOptions] = useState(post.pollOptions);
  const [isVoting, setIsVoting] = useState(false);

  // States cho Flashcard Interactive Card
  const [sampleCardIdx, setSampleCardIdx] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [isCloned, setIsCloned] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  // States cho Milestone
  const [hasCelebrated, setHasCelebrated] = useState(false);

  const isOwner = currentUser?.id === post.author.id;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'ADMIN';
  const isCreator = currentUser?.role === 'CONTENT_CREATOR' || currentUser?.role === 'content_creator';
  const canPin = isAdmin || (isCreator && isOwner);
  const canDelete = isOwner || isAdmin;

  const topicInfo = COMMUNITY_TOPICS_LIST.find((t) => t.id === post.topic);
  const sampleCards = post.referenceMeta?.sampleCards || [];

  const handleTogglePin = async () => {
    try {
      const res = await communityService.togglePinPost(post.id);
      setIsPinned(res.isPinned);
      toast.success(res.isPinned ? 'Đã ghim bài viết lên đầu trang.' : 'Đã bỏ ghim bài viết.');
    } catch (error) {
      toast.error(getCommunityErrorMessage(error, 'Không thể thay đổi trạng thái ghim bài viết.'));
    }
  };

  const handleVotePoll = async (optionIndex: number) => {
    if (!currentUser) {
      toast.error('Vui lòng đăng nhập để tham gia bình chọn.');
      return;
    }
    if (isVoting) return;

    try {
      setIsVoting(true);
      const updatedPost = await communityService.votePoll(post.id, optionIndex);
      if (updatedPost.pollOptions) {
        setPollOptions(updatedPost.pollOptions);
      }
      toast.success('Đã ghi nhận bình chọn của bạn!');
    } catch (error) {
      toast.error(getCommunityErrorMessage(error, 'Không thể gửi bình chọn.'));
    } finally {
      setIsVoting(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentUser) {
      toast.error('Vui lòng đăng nhập để thích bài viết.');
      return;
    }

    if (isLiking) return;
    try {
      setIsLiking(true);
      const nextLiked = !isLiked;
      setIsLiked(nextLiked);
      setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

      const res = await communityService.toggleLikePost(post.id);
      setIsLiked(res.added);
      setLikesCount(res.targetLikes);
    } catch (error) {
      setIsLiked(isLiked);
      setLikesCount(likesCount);
      toast.error('Không thể tương tác với bài viết.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleCelebrate = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
    setHasCelebrated(true);
    if (!isLiked) {
      handleToggleLike();
    }
    toast.success(`Bạn đã gửi lời chúc mừng tới ${post.author.full_name}! 🎉`);
  };

  const handleCloneDeck = async () => {
    if (!currentUser) {
      toast.error('Vui lòng đăng nhập để lưu bộ thẻ vào Private Space.');
      return;
    }

    try {
      setIsCloning(true);
      const res = await communityService.cloneDeck(post.id);
      setIsCloned(true);
      setClonesCount(res.clonesCount);
      toast.success(`Đã thêm bộ thẻ "${res.title}" (${res.cardCount} thẻ) vào Private Space của bạn!`);
    } catch (error) {
      toast.error(getCommunityErrorMessage(error, 'Không thể clone bộ thẻ lúc này.'));
    } finally {
      setIsCloning(false);
    }
  };

  const handleDeletePost = async () => {
    try {
      await communityService.deletePost(post.id);
      toast.success('Đã xóa bài viết.');
      onPostDeleted?.(post.id);
    } catch (error) {
      toast.error(getCommunityErrorMessage(error, 'Không thể xóa bài viết.'));
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#post-${post.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Đã sao chép liên kết bài viết vào clipboard!');
  };

  // Xác định viền card đặc biệt cho từng loại bài viết
  const isMilestone = post.type === 'course_milestone';
  const isFlashcard = post.type === 'shared_flashcard';

  return (
    <Card
      className={`border transition-all duration-200 shadow-sm hover:shadow-md ${
        isMilestone
          ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/5 via-card to-card shadow-amber-500/5'
          : isFlashcard
          ? 'border-pink-500/30 hover:border-pink-500/50 bg-card'
          : 'border-border/80 bg-card'
      }`}
    >
      <CardContent className="p-4 sm:p-5 space-y-3.5">
        {/* Header bài viết */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Author Popover: Mini Profile + Chat 1-1 + Kết bạn */}
            <AuthorPopover author={post.author} authorRole={post.authorRole}>
              <div className="cursor-pointer group flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0 border border-border group-hover:border-primary transition-colors">
                  <AvatarImage src={post.author.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                    {getInitials(post.author.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                      {post.author.full_name}
                    </span>

                    {post.authorRole === 'CONTENT_CREATOR' && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] py-0 h-4 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 gap-1 font-medium"
                      >
                        <GraduationCap className="w-3 h-3" /> Giảng viên
                      </Badge>
                    )}

                    {post.authorRole === 'ADMIN' && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] py-0 h-4 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 gap-1 font-medium"
                      >
                        <Sparkles className="w-3 h-3" /> Quản trị viên
                      </Badge>
                    )}

                    <span className="text-[11px] text-muted-foreground">
                      · Lv.{post.author.level}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{formatRelativeTime(post.createdAt)}</span>
                    {topicInfo && (
                      <>
                        <span>·</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground"
                        >
                          #{topicInfo.label}
                        </Badge>
                      </>
                    )}
                    {isPinned && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1 font-semibold"
                      >
                        <Pin className="w-3 h-3" /> Đã ghim
                      </Badge>
                    )}
                    {isSolved && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1 font-semibold"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Đã có lời giải
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </AuthorPopover>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
                <Copy className="w-3.5 h-3.5" /> Sao chép liên kết
              </DropdownMenuItem>
              {canPin && (
                <DropdownMenuItem onClick={handleTogglePin} className="gap-2 cursor-pointer">
                  <Pin className="w-3.5 h-3.5" /> {isPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onClick={handleDeletePost}
                  className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa bài viết
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tiêu đề & Nội dung */}
        <div className="space-y-2">
          <h3 className="font-bold text-foreground text-base leading-snug">{post.title}</h3>
          <p className="text-foreground/90 text-sm whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-primary font-medium hover:underline cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ---------------- 1. INTERACTIVE FLASHCARD WIDGET ---------------- */}
        {isFlashcard && post.referenceMeta && (
          <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4 space-y-3.5 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {post.referenceMeta.title || 'Bộ thẻ Flashcard'}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-pink-500" /> {post.referenceMeta.cardCount || 0} thẻ
                    </span>
                    {post.referenceMeta.level && (
                      <>
                        <span>·</span>
                        <span>{post.referenceMeta.level}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Nút Clone Deck về Private Space */}
              <Button
                size="sm"
                variant={isCloned ? 'outline' : 'default'}
                className={`h-8 text-xs gap-1.5 font-medium ${
                  isCloned
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                    : 'bg-pink-600 hover:bg-pink-700 text-white'
                }`}
                onClick={handleCloneDeck}
                disabled={isCloned || isCloning}
              >
                {isCloning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isCloned ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>
                  {isCloned ? 'Đã lưu vào Private Space' : `Lưu bộ thẻ (${clonesCount})`}
                </span>
              </Button>
            </div>

            {/* Flipped Flashcard Interactive Preview */}
            {sampleCards.length > 0 && (
              <div className="space-y-2">
                <div
                  onClick={() => setIsCardFlipped((prev) => !prev)}
                  className="relative h-28 w-full rounded-xl border border-border/80 bg-card p-4 flex flex-col items-center justify-center text-center cursor-pointer select-none hover:border-pink-500/50 hover:shadow-sm transition-all"
                >
                  <span className="absolute top-2 left-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <RotateCw className="w-3 h-3 text-pink-500" />
                    {isCardFlipped ? 'Mặt sau (Ý nghĩa)' : 'Mặt trước (Từ vựng)'}
                  </span>
                  <span className="absolute top-2 right-3 text-[10px] text-muted-foreground">
                    Thẻ {sampleCardIdx + 1}/{sampleCards.length}
                  </span>

                  <p className="text-base sm:text-lg font-bold text-foreground transition-all">
                    {isCardFlipped
                      ? sampleCards[sampleCardIdx]?.back
                      : sampleCards[sampleCardIdx]?.front}
                  </p>
                  <span className="text-[11px] text-muted-foreground/80 mt-1">
                    (Nhấn để lật thẻ)
                  </span>
                </div>

                {/* Chuyển thẻ mẫu */}
                {sampleCards.length > 1 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] gap-1"
                      onClick={() => {
                        setSampleCardIdx((prev) =>
                          prev === 0 ? sampleCards.length - 1 : prev - 1
                        );
                        setIsCardFlipped(false);
                      }}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Thẻ trước
                    </Button>

                    <span>Lật xem thử các thẻ mẫu</span>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] gap-1"
                      onClick={() => {
                        setSampleCardIdx((prev) =>
                          prev === sampleCards.length - 1 ? 0 : prev + 1
                        );
                        setIsCardFlipped(false);
                      }}
                    >
                      Thẻ kế <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------------- 2. COURSE MILESTONE WIDGET ---------------- */}
        {isMilestone && (
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-sm border border-amber-500/30">
                <Trophy className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 text-white text-[10px] py-0 h-4 gap-1">
                    <Award className="w-3 h-3" /> Chứng nhận 100% Hoàn thành
                  </Badge>
                </div>
                <h4 className="font-bold text-base text-foreground mt-0.5">
                  {post.referenceMeta?.title || 'Khóa học LexiCore'}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Học viên xuất sắc chinh phục trọn vẹn toàn bộ giáo trình!
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant={hasCelebrated ? 'outline' : 'default'}
              className={`h-8 text-xs font-semibold gap-1.5 shrink-0 shadow-sm ${
                hasCelebrated
                  ? 'border-amber-500 text-amber-600 bg-amber-500/10'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
              }`}
              onClick={handleCelebrate}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{hasCelebrated ? 'Đã chúc mừng 🎉' : 'Chúc mừng 🎉'}</span>
            </Button>
          </div>
        )}

        {/* ---------------- 3. INTERACTIVE POLL WIDGET ---------------- */}
        {post.type === 'poll' && pollOptions && pollOptions.length > 0 && (() => {
          const totalVotes = pollOptions.reduce((acc, opt) => acc + opt.votesCount, 0);
          return (
            <div className="rounded-xl border border-primary/20 bg-muted/20 p-4 space-y-3 mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-primary" /> Bình chọn cộng đồng
                </span>
                <span>Tổng cộng: {totalVotes} lượt bình chọn</span>
              </div>

              <div className="space-y-2 pt-1">
                {pollOptions.map((opt, idx) => {
                  const percent = totalVotes > 0 ? Math.round((opt.votesCount / totalVotes) * 100) : 0;
                  return (
                    <div
                      key={idx}
                      onClick={() => !isVoting && handleVotePoll(idx)}
                      className={`relative overflow-hidden rounded-lg border p-3 cursor-pointer transition-all ${
                        opt.hasVoted
                          ? 'border-primary/60 bg-primary/10 shadow-xs'
                          : 'border-border/70 hover:border-primary/40 bg-card hover:bg-muted/40'
                      }`}
                    >
                      {/* Thanh phần trăm động */}
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-500 rounded-lg"
                        style={{ width: `${percent}%` }}
                      />

                      <div className="relative flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[10px] ${
                              opt.hasVoted
                                ? 'border-primary bg-primary text-primary-foreground font-bold'
                                : 'border-muted-foreground/40'
                            }`}
                          >
                            {opt.hasVoted && <Check className="w-3 h-3" />}
                          </div>
                          <span
                            className={`font-medium ${
                              opt.hasVoted ? 'text-primary font-bold' : 'text-foreground'
                            }`}
                          >
                            {opt.text}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                          <span>{opt.votesCount} vote</span>
                          <span className="font-bold text-foreground text-xs min-w-[32px] text-right">
                            {percent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Thanh tương tác dưới bài viết */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2.5 gap-1.5 transition-colors ${
                isLiked ? 'text-rose-500 hover:text-rose-600' : 'hover:text-foreground'
              }`}
              onClick={handleToggleLike}
            >
              <Heart
                className={`w-4 h-4 transition-transform ${
                  isLiked ? 'fill-rose-500 text-rose-500 scale-110' : ''
                }`}
              />
              <span className="font-semibold text-xs">{likesCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2.5 gap-1.5 transition-colors ${
                showComments ? 'text-primary' : 'hover:text-foreground'
              }`}
              onClick={() => setShowComments((prev) => !prev)}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="font-semibold text-xs">{commentsCount} bình luận</span>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 gap-1.5 hover:text-foreground"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Chia sẻ</span>
          </Button>
        </div>

        {/* Khung bình luận (collapsible) */}
        {showComments && (
          <CommentSection
            postId={post.id}
            currentUser={currentUser}
            postAuthorId={post.author.id}
            isPostSolved={isSolved}
            onBestAnswerMarked={() => setIsSolved(true)}
            onCommentsCountChange={(delta) => setCommentsCount((prev) => Math.max(0, prev + delta))}
          />
        )}

        {/* Modal Chia sẻ bài viết cho Bạn bè */}
        <SharePostDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          post={post}
        />
      </CardContent>
    </Card>
  );
};
