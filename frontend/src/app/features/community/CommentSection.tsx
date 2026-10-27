import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Heart,
  MessageCircle,
  Reply,
  Trash2,
  Send,
  Loader2,
  ChevronDown,
  CheckCircle2,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  communityService,
  CommentItem,
  getCommunityErrorMessage,
} from '../../services/community-service';
import { getInitials, formatRelativeTime } from '../social/utils';

interface CommentSectionProps {
  postId: string;
  currentUser?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role?: string;
  } | null;
  postAuthorId?: string;
  isPostSolved?: boolean;
  onBestAnswerMarked?: () => void;
  onCommentsCountChange?: (delta: number) => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  currentUser,
  postAuthorId,
  isPostSolved,
  onBestAnswerMarked,
  onCommentsCountChange,
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Soạn comment gốc
  const [rootContent, setRootContent] = useState('');
  const [submittingRoot, setSubmittingRoot] = useState(false);

  // Quản lý replies cho từng root comment
  const [repliesMap, setRepliesMap] = useState<Record<string, CommentItem[]>>({});
  const [repliesLoadingMap, setRepliesLoadingMap] = useState<Record<string, boolean>>({});
  const [replyInputOpenMap, setReplyInputOpenMap] = useState<Record<string, boolean>>({});
  const [replyContentMap, setReplyContentMap] = useState<Record<string, string>>({});
  const [replySubmittingMap, setReplySubmittingMap] = useState<Record<string, boolean>>({});
  const [replyTargetUserMap, setReplyTargetUserMap] = useState<Record<string, { id: string; name: string }>>({});

  const loadRootComments = async () => {
    try {
      setLoading(true);
      const res = await communityService.getComments(postId, null, 10);
      setComments(res.comments);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (error) {
      console.error('Không thể tải bình luận:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRootComments();
  }, [postId]);

  const handleLoadMoreRoots = async () => {
    if (!nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const res = await communityService.getComments(postId, nextCursor, 10);
      setComments((prev) => [...prev, ...res.comments]);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (error) {
      toast.error('Không thể tải thêm bình luận.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreateRootComment = async () => {
    if (!rootContent.trim()) return;
    try {
      setSubmittingRoot(true);
      const newComment = await communityService.createComment(postId, {
        content: rootContent.trim(),
      });
      setComments((prev) => [newComment, ...prev]);
      setRootContent('');
      onCommentsCountChange?.(1);
      toast.success('Đã gửi bình luận.');
    } catch (error) {
      toast.error(getCommunityErrorMessage(error, 'Không thể gửi bình luận.'));
    } finally {
      setSubmittingRoot(false);
    }
  };

  const handleToggleLikeComment = async (commentId: string, isReply = false, rootId?: string) => {
    try {
      const res = await communityService.toggleLikeComment(commentId);
      if (isReply && rootId) {
        setRepliesMap((prev) => ({
          ...prev,
          [rootId]: (prev[rootId] || []).map((c) =>
            c.id === commentId
              ? { ...c, isLiked: res.added, likesCount: res.targetLikes }
              : c
          ),
        }));
      } else {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, isLiked: res.added, likesCount: res.targetLikes }
              : c
          )
        );
      }
    } catch (error) {
      toast.error('Không thể tương tác với bình luận.');
    }
  };

  const handleDeleteComment = async (commentId: string, isReply = false, rootId?: string) => {
    try {
      await communityService.deleteComment(commentId);
      if (isReply && rootId) {
        setRepliesMap((prev) => ({
          ...prev,
          [rootId]: (prev[rootId] || []).filter((c) => c.id !== commentId),
        }));
        // Giảm repliesCount của root comment trên giao diện
        setComments((prev) =>
          prev.map((c) =>
            c.id === rootId ? { ...c, repliesCount: Math.max(0, c.repliesCount - 1) } : c
          )
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
      onCommentsCountChange?.(-1);
      toast.success('Đã xóa bình luận.');
    } catch (error) {
      toast.error(getCommunityErrorMessage(error, 'Không thể xóa bình luận.'));
    }
  };

  const [markingBestAnswerId, setMarkingBestAnswerId] = useState<string | null>(null);

  const handleMarkBestAnswer = async (commentId: string) => {
    try {
      setMarkingBestAnswerId(commentId);
      await communityService.markBestAnswer(postId, commentId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, isBestAnswer: true } : c))
      );
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      toast.success('🎉 Đã chọn câu trả lời hay nhất! Người giải bài đã nhận được +10 Xu và +20 Exp.');
      onBestAnswerMarked?.();
    } catch (error) {
      toast.error(getCommunityErrorMessage(error, 'Không thể chọn lời giải hay nhất.'));
    } finally {
      setMarkingBestAnswerId(null);
    }
  };

  const handleLoadReplies = async (rootCommentId: string) => {
    try {
      setRepliesLoadingMap((prev) => ({ ...prev, [rootCommentId]: true }));
      const res = await communityService.getReplies(rootCommentId, null, 20);
      setRepliesMap((prev) => ({ ...prev, [rootCommentId]: res.replies }));
    } catch (error) {
      toast.error('Không thể tải các phản hồi.');
    } finally {
      setRepliesLoadingMap((prev) => ({ ...prev, [rootCommentId]: false }));
    }
  };

  const handleOpenReplyInput = (rootCommentId: string, targetUser?: { id: string; name: string }) => {
    setReplyInputOpenMap((prev) => ({ ...prev, [rootCommentId]: true }));
    if (targetUser) {
      setReplyTargetUserMap((prev) => ({ ...prev, [rootCommentId]: targetUser }));
    }
  };

  const handleCreateReply = async (rootCommentId: string) => {
    const content = (replyContentMap[rootCommentId] || '').trim();
    if (!content) return;

    const targetUser = replyTargetUserMap[rootCommentId];
    try {
      setReplySubmittingMap((prev) => ({ ...prev, [rootCommentId]: true }));
      const newReply = await communityService.createComment(postId, {
        content,
        parentId: rootCommentId,
        replyToUserId: targetUser?.id,
      });

      setRepliesMap((prev) => ({
        ...prev,
        [rootCommentId]: [...(prev[rootCommentId] || []), newReply],
      }));

      // Cập nhật repliesCount của root
      setComments((prev) =>
        prev.map((c) =>
          c.id === rootCommentId ? { ...c, repliesCount: c.repliesCount + 1 } : c
        )
      );

      setReplyContentMap((prev) => ({ ...prev, [rootCommentId]: '' }));
      setReplyInputOpenMap((prev) => ({ ...prev, [rootCommentId]: false }));
      onCommentsCountChange?.(1);
      toast.success('Đã gửi phản hồi.');
    } catch (error) {
      toast.error(getCommunityErrorMessage(error, 'Không thể gửi phản hồi.'));
    } finally {
      setReplySubmittingMap((prev) => ({ ...prev, [rootCommentId]: false }));
    }
  };

  return (
    <div className="pt-4 border-t border-border/60 space-y-4">
      {/* Khung nhập bình luận gốc */}
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          <AvatarImage src={currentUser?.avatar_url || ''} />
          <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
            {currentUser?.full_name ? getInitials(currentUser.full_name) : 'ME'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Viết câu trả lời hoặc thảo luận của bạn..."
            value={rootContent}
            onChange={(e) => setRootContent(e.target.value)}
            rows={2}
            className="text-xs resize-none"
            disabled={submittingRoot}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleCreateRootComment();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Nhấn <strong>Ctrl + Enter</strong> để gửi nhanh
            </span>
            <Button
              size="sm"
              className="h-7 px-3 text-xs gap-1.5"
              onClick={handleCreateRootComment}
              disabled={submittingRoot || !rootContent.trim()}
            >
              {submittingRoot ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              <span>Gửi bình luận</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Danh sách bình luận gốc */}
      {loading ? (
        <div className="py-6 flex justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg">
          Chưa có bình luận nào. Hãy là người đầu tiên tham gia thảo luận!
        </div>
      ) : (
        <div className="space-y-3.5 pt-1">
          {comments.map((rootComment) => {
            const isOwner = currentUser?.id === rootComment.author.id;
            const isReplying = replyInputOpenMap[rootComment.id];
            const replies = repliesMap[rootComment.id];
            const hasLoadedReplies = Boolean(replies);
            const repliesLoading = repliesLoadingMap[rootComment.id];
            const canMarkBestAnswer =
              (currentUser?.id === postAuthorId || currentUser?.role === 'ADMIN' || currentUser?.role === 'admin') &&
              !isPostSolved &&
              !rootComment.isBestAnswer;

            return (
              <div key={rootComment.id} className="space-y-2 text-xs">
                {/* Root Comment Row */}
                <div className="flex items-start gap-2.5 group">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={rootComment.author.avatar_url || ''} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(rootComment.author.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-1">
                    <div
                      className={`p-2.5 rounded-xl space-y-1 transition-all ${
                        rootComment.isBestAnswer
                          ? 'border border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-xs'
                          : 'bg-muted/40 hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-foreground text-xs">
                            {rootComment.author.full_name}
                          </span>
                          {rootComment.isCreatorVerified && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary text-primary gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Giảng viên duyệt
                            </Badge>
                          )}
                          {rootComment.isBestAnswer && (
                            <Badge className="text-[10px] py-0 h-4 bg-emerald-600 text-white gap-1 font-semibold">
                              <Award className="w-3 h-3" /> ✓ Lời giải hay nhất (+10 Xu, +20 Exp)
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatRelativeTime(rootComment.createdAt)}
                        </span>
                      </div>

                      <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-xs">
                        {rootComment.content}
                      </p>
                    </div>

                    {/* Action bar for root comment */}
                    <div className="flex items-center gap-3 px-1 text-[11px] text-muted-foreground flex-wrap">
                      <button
                        onClick={() => handleToggleLikeComment(rootComment.id)}
                        className={`flex items-center gap-1 hover:text-primary transition-colors ${
                          rootComment.isLiked ? 'text-primary font-semibold' : ''
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            rootComment.isLiked ? 'fill-primary text-primary' : ''
                          }`}
                        />
                        <span>{rootComment.likesCount > 0 ? rootComment.likesCount : 'Thích'}</span>
                      </button>

                      <button
                        onClick={() =>
                          handleOpenReplyInput(rootComment.id, {
                            id: rootComment.author.id,
                            name: rootComment.author.full_name,
                          })
                        }
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Trả lời</span>
                      </button>

                      {canMarkBestAnswer && (
                        <button
                          onClick={() => handleMarkBestAnswer(rootComment.id)}
                          disabled={markingBestAnswerId === rootComment.id}
                          className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold transition-colors bg-emerald-500/10 px-2 py-0.5 rounded-md"
                          title="Đánh dấu câu trả lời hay nhất để thưởng +10 Xu & +20 Exp"
                        >
                          {markingBestAnswerId === rootComment.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Chọn làm lời giải hay nhất (+10 Xu)</span>
                        </button>
                      )}

                      {isOwner && (
                        <button
                          onClick={() => handleDeleteComment(rootComment.id)}
                          className="hover:text-destructive transition-colors ml-auto opacity-0 group-hover:opacity-100"
                          title="Xóa bình luận"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-tier: Nút xem replies nếu có */}
                {rootComment.repliesCount > 0 && !hasLoadedReplies && (
                  <div className="pl-9">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] text-primary hover:text-primary/90 gap-1"
                      onClick={() => handleLoadReplies(rootComment.id)}
                      disabled={repliesLoading}
                    >
                      {repliesLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      <span>Xem {rootComment.repliesCount} câu trả lời</span>
                    </Button>
                  </div>
                )}

                {/* Sub-tier: Danh sách replies (Tier 2) */}
                {hasLoadedReplies && (
                  <div className="pl-9 space-y-2 border-l-2 border-border/40 ml-3">
                    {replies!.map((reply) => {
                      const isReplyOwner = currentUser?.id === reply.author.id;
                      return (
                        <div key={reply.id} className="flex items-start gap-2 group">
                          <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                            <AvatarImage src={reply.author.avatar_url || ''} />
                            <AvatarFallback className="text-[9px]">
                              {getInitials(reply.author.full_name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 space-y-0.5">
                            <div className="bg-muted/30 hover:bg-muted/50 p-2 rounded-lg space-y-0.5 transition-colors">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-foreground text-[11px]">
                                  {reply.author.full_name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatRelativeTime(reply.createdAt)}
                                </span>
                              </div>

                              <p className="text-foreground/90 leading-relaxed text-xs">
                                {reply.replyToUser && (
                                  <span className="font-medium text-primary mr-1">
                                    @{reply.replyToUser.full_name}
                                  </span>
                                )}
                                {reply.content}
                              </p>
                            </div>

                            <div className="flex items-center gap-2.5 px-1 text-[10px] text-muted-foreground">
                              <button
                                onClick={() =>
                                  handleToggleLikeComment(reply.id, true, rootComment.id)
                                }
                                className={`flex items-center gap-1 hover:text-primary transition-colors ${
                                  reply.isLiked ? 'text-primary font-semibold' : ''
                                }`}
                              >
                                <Heart
                                  className={`w-3 h-3 ${
                                    reply.isLiked ? 'fill-primary text-primary' : ''
                                  }`}
                                />
                                <span>{reply.likesCount > 0 ? reply.likesCount : 'Thích'}</span>
                              </button>

                              <button
                                onClick={() =>
                                  handleOpenReplyInput(rootComment.id, {
                                    id: reply.author.id,
                                    name: reply.author.full_name,
                                  })
                                }
                                className="hover:text-foreground transition-colors"
                              >
                                Trả lời
                              </button>

                              {isReplyOwner && (
                                <button
                                  onClick={() =>
                                    handleDeleteComment(reply.id, true, rootComment.id)
                                  }
                                  className="hover:text-destructive transition-colors ml-auto opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Khung nhập phản hồi (Reply input inline) */}
                {isReplying && (
                  <div className="pl-9 pt-1 animate-in fade-in-50 duration-150">
                    <div className="flex items-start gap-2 bg-muted/20 p-2 rounded-lg border border-border/50">
                      <div className="flex-1 space-y-1.5">
                        {replyTargetUserMap[rootComment.id] && (
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              Đang trả lời{' '}
                              <strong className="text-primary">
                                @{replyTargetUserMap[rootComment.id].name}
                              </strong>
                            </span>
                            <button
                              onClick={() =>
                                setReplyInputOpenMap((prev) => ({
                                  ...prev,
                                  [rootComment.id]: false,
                                }))
                              }
                              className="text-xs hover:text-foreground"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        <Textarea
                          placeholder="Viết phản hồi..."
                          value={replyContentMap[rootComment.id] || ''}
                          onChange={(e) =>
                            setReplyContentMap((prev) => ({
                              ...prev,
                              [rootComment.id]: e.target.value,
                            }))
                          }
                          rows={2}
                          className="text-xs resize-none"
                          disabled={replySubmittingMap[rootComment.id]}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              handleCreateReply(rootComment.id);
                            }
                          }}
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px]"
                            onClick={() =>
                              setReplyInputOpenMap((prev) => ({
                                ...prev,
                                [rootComment.id]: false,
                              }))
                            }
                            disabled={replySubmittingMap[rootComment.id]}
                          >
                            Hủy
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 px-2.5 text-[11px] gap-1"
                            onClick={() => handleCreateReply(rootComment.id)}
                            disabled={
                              replySubmittingMap[rootComment.id] ||
                              !(replyContentMap[rootComment.id] || '').trim()
                            }
                          >
                            {replySubmittingMap[rootComment.id] ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>Gửi</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Nút xem thêm bình luận gốc (Cursor Pagination) */}
          {hasMore && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleLoadMoreRoots}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 mr-1" />
                )}
                Xem thêm bình luận cũ hơn
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
