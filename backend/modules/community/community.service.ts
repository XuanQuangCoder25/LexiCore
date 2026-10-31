import { AppError } from '../../errors/AppError';
import CommunityPost, {
  COMMUNITY_TOPICS,
  CommunityTopic,
  PostType,
  ICommunityPost,
} from '../../database/models/CommunityPost';
import CommunityComment, { ICommunityComment } from '../../database/models/CommunityComment';
import Course from '../../database/models/Course';
import Flashcard from '../../database/models/Flashcard';
import { communityRepository } from './community.repository';
import { notificationRepository } from '../notification/notification-repository';
import {
  socialEvents,
  SOCIAL_EVENTS,
  NotificationCreatedEventPayload,
} from '../social/social-events';
import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';
import {
  PostResponse,
  CommentResponse,
  CommunityAuthor,
  decodeCursor,
  encodeCursor,
} from './community.types';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 30;

// Gửi thông báo in-app (MySQL) và đẩy sự kiện realtime tới Socket namespace /chat
async function notifyCommunityUser(
  userId: string,
  type: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const id = await notificationRepository.createNotification({ userId, type, title, body });
    const payload: NotificationCreatedEventPayload = {
      userId,
      notification: {
        id,
        user_id: userId,
        type,
        title,
        body,
        content: body,
        is_read: false,
        created_at: new Date(),
      } as any,
    };
    socialEvents.emit(SOCIAL_EVENTS.NOTIFICATION_CREATED, payload);
  } catch (error) {
    console.error('[community] Không thể tạo thông báo:', error);
  }
}

const defaultAuthor = (id: string): CommunityAuthor => ({
  id,
  full_name: 'Học viên ẩn danh',
  avatar_url: null,
  level: 1,
  role: 'USER',
});

function formatPost(
  post: ICommunityPost,
  authorMap: Map<string, CommunityAuthor>,
  likedSet: Set<string>,
  currentUserId?: string
): PostResponse {
  const author = authorMap.get(post.authorId) || defaultAuthor(post.authorId);
  const isLiked = likedSet.has(post._id.toString());

  const pollOptions = post.pollOptions?.map((opt) => ({
    text: opt.text,
    votesCount: opt.votes?.length || 0,
    hasVoted: currentUserId ? (opt.votes || []).includes(currentUserId) : false,
  }));

  return {
    id: post._id.toString(),
    author,
    authorRole: post.authorRole,
    type: post.type,
    topic: post.topic,
    title: post.title,
    content: post.content,
    tags: post.tags || [],
    referenceId: post.referenceId ? post.referenceId.toString() : undefined,
    referenceMeta: post.referenceMeta,
    pollOptions,
    isPinned: Boolean(post.isPinned),
    isSolved: Boolean(post.isSolved),
    isLiked,
    stats: {
      likesCount: post.stats?.likesCount || 0,
      commentsCount: post.stats?.commentsCount || 0,
      clonesCount: post.stats?.clonesCount || 0,
      viewsCount: post.stats?.viewsCount || 0,
    },
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

function formatComment(
  comment: ICommunityComment,
  authorMap: Map<string, CommunityAuthor>,
  likedSet: Set<string>
): CommentResponse {
  const author = authorMap.get(comment.authorId) || defaultAuthor(comment.authorId);
  const replyToUser = comment.replyToUserId
    ? authorMap.get(comment.replyToUserId) || defaultAuthor(comment.replyToUserId)
    : null;
  const isLiked = likedSet.has(comment._id.toString());

  return {
    id: comment._id.toString(),
    postId: comment.postId.toString(),
    parentId: comment.parentId ? comment.parentId.toString() : null,
    author,
    replyToUser,
    content: comment.content,
    likesCount: comment.likesCount || 0,
    repliesCount: comment.repliesCount || 0,
    isCreatorVerified: Boolean(comment.isCreatorVerified),
    isBestAnswer: Boolean(comment.isBestAnswer),
    isLiked,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export const communityService = {
  // =========================================================================
  // FEED & POSTS
  // =========================================================================
  async getFeed(
    currentUserId?: string,
    query?: { tab?: string; topic?: string; cursor?: string; limit?: string | number }
  ) {
    const rawTopic = query?.topic?.trim().toLowerCase();
    const topic: CommunityTopic | undefined = COMMUNITY_TOPICS.includes(rawTopic as any)
      ? (rawTopic as CommunityTopic)
      : undefined;

    const rawTab = query?.tab?.trim().toLowerCase();
    const tab: 'all' | 'friends' | 'unanswered' =
      rawTab === 'friends' || rawTab === 'unanswered' ? rawTab : 'all';

    const limit = Math.min(
      Math.max(Number(query?.limit) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );

    const cursor = decodeCursor(query?.cursor);

    let friendIds: string[] | undefined;
    if (tab === 'friends') {
      if (!currentUserId) {
        throw new AppError('Vui lòng đăng nhập để xem bài viết của bạn bè.', 401);
      }
      friendIds = await communityRepository.getFriendIds(currentUserId);
    }

    // Lấy bài ghim (chỉ lấy ở trang đầu tiên khi cursor === null)
    let pinnedPosts: ICommunityPost[] = [];
    if (!cursor && tab === 'all') {
      pinnedPosts = await communityRepository.listPinnedPosts(topic);
    }

    // Lấy danh sách feed phân trang
    const { posts, hasMore } = await communityRepository.listPosts({
      tab,
      topic,
      friendIds,
      cursor,
      limit,
    });

    // Thu thập tất cả authorIds để hydrate thông tin từ MySQL (tránh N+1)
    const allPosts = [...pinnedPosts, ...posts];
    const authorIds = allPosts.map((p) => p.authorId);
    const authorMap = await communityRepository.getUsersByIds(authorIds);

    // Kiểm tra trạng thái đã Like của user hiện tại
    const postIds = allPosts.map((p) => p._id.toString());
    const likedSet = currentUserId
      ? await communityRepository.getUserLikedTargetIds(currentUserId, 'post', postIds)
      : new Set<string>();

    const formattedPinned = pinnedPosts.map((p) =>
      formatPost(p, authorMap, likedSet, currentUserId)
    );
    const formattedPosts = posts.map((p) =>
      formatPost(p, authorMap, likedSet, currentUserId)
    );

    let nextCursor: string | null = null;
    if (hasMore && posts.length > 0) {
      const lastPost = posts[posts.length - 1];
      nextCursor = encodeCursor(lastPost.createdAt, lastPost._id.toString());
    }

    return {
      pinnedPosts: formattedPinned,
      posts: formattedPosts,
      nextCursor,
      hasMore,
    };
  },

  async createPost(
    authorId: string,
    authorRole: string,
    data: {
      title?: string;
      content?: string;
      topic?: string;
      type?: string;
      tags?: string[];
      referenceId?: string;
      referenceMeta?: any;
    }
  ): Promise<PostResponse> {
    const title = (data.title || '').trim();
    const content = (data.content || '').trim();
    const rawTopic = (data.topic || 'general').trim().toLowerCase();

    if (title.length < 3 || title.length > 200) {
      throw new AppError('Tiêu đề bài viết phải có độ dài từ 3 đến 200 ký tự.', 400);
    }
    if (content.length < 5 || content.length > 5000) {
      throw new AppError('Nội dung bài viết phải có độ dài từ 5 đến 5000 ký tự.', 400);
    }
    if (!COMMUNITY_TOPICS.includes(rawTopic as any)) {
      throw new AppError(
        `Chủ đề không hợp lệ. Các chủ đề cho phép: ${COMMUNITY_TOPICS.join(', ')}`,
        400
      );
    }

    const type: PostType = (data.type as PostType) || 'discussion';
    const tags = Array.isArray(data.tags)
      ? data.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 5)
      : [];

    let pollOptions: Array<{ text: string; votes: string[] }> | undefined;
    let postType = type;
    if (Array.isArray((data as any).pollOptions) && (data as any).pollOptions.length >= 2) {
      pollOptions = (data as any).pollOptions
        .slice(0, 5)
        .map((opt: any) => ({ text: String(opt).trim(), votes: [] }))
        .filter((o: any) => o.text.length > 0);
      if (pollOptions && pollOptions.length >= 2) {
        postType = 'poll';
      }
    }

    const post = await communityRepository.createPost({
      authorId,
      authorRole: (['USER', 'CONTENT_CREATOR', 'ADMIN'].includes(authorRole)
        ? authorRole
        : 'USER') as any,
      type: postType,
      topic: rawTopic as CommunityTopic,
      title,
      content,
      tags,
      referenceId: data.referenceId as any,
      referenceMeta: data.referenceMeta,
      pollOptions,
    });

    const authorMap = await communityRepository.getUsersByIds([authorId]);
    return formatPost(post, authorMap, new Set(), authorId);
  },

  async getPostById(postId: string, currentUserId?: string): Promise<PostResponse> {
    const post = await communityRepository.getPostById(postId);
    if (!post) {
      throw new AppError('Bài viết không tồn tại hoặc đã bị xóa.', 404);
    }

    // Tăng view ngầm
    communityRepository.incrementPostViews(post._id).catch(() => {});

    const authorMap = await communityRepository.getUsersByIds([post.authorId]);
    const likedSet = currentUserId
      ? await communityRepository.getUserLikedTargetIds(currentUserId, 'post', [
          post._id.toString(),
        ])
      : new Set<string>();

    return formatPost(post, authorMap, likedSet, currentUserId);
  },

  async deletePost(postId: string, userId: string, role: string): Promise<void> {
    const isAdmin = role === 'ADMIN';
    const ok = await communityRepository.softDeletePost(postId, userId, isAdmin);
    if (!ok) {
      throw new AppError(
        'Không tìm thấy bài viết hoặc bạn không có quyền xóa bài viết này.',
        403
      );
    }
  },

  // =========================================================================
  // COMMENTS
  // =========================================================================
  async listComments(
    postId: string,
    currentUserId?: string,
    cursorStr?: string,
    limitParam?: string | number
  ) {
    const limit = Math.min(
      Math.max(Number(limitParam) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );
    const cursor = decodeCursor(cursorStr);

    const { comments, hasMore } = await communityRepository.listRootComments({
      postId,
      cursor,
      limit,
    });

    const authorIds = comments.map((c) => c.authorId);
    const authorMap = await communityRepository.getUsersByIds(authorIds);

    const commentIds = comments.map((c) => c._id.toString());
    const likedSet = currentUserId
      ? await communityRepository.getUserLikedTargetIds(currentUserId, 'comment', commentIds)
      : new Set<string>();

    const formatted = comments.map((c) => formatComment(c, authorMap, likedSet));

    let nextCursor: string | null = null;
    if (hasMore && comments.length > 0) {
      const last = comments[comments.length - 1];
      nextCursor = encodeCursor(last.createdAt, last._id.toString());
    }

    return {
      comments: formatted,
      nextCursor,
      hasMore,
    };
  },

  async listReplies(
    rootCommentId: string,
    currentUserId?: string,
    cursorStr?: string,
    limitParam?: string | number
  ) {
    const limit = Math.min(
      Math.max(Number(limitParam) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );
    const cursor = decodeCursor(cursorStr);

    const { replies, hasMore } = await communityRepository.listReplies({
      parentId: rootCommentId,
      cursor,
      limit,
    });

    const userIds = [
      ...replies.map((r) => r.authorId),
      ...replies.map((r) => r.replyToUserId).filter(Boolean),
    ] as string[];
    const authorMap = await communityRepository.getUsersByIds(userIds);

    const replyIds = replies.map((r) => r._id.toString());
    const likedSet = currentUserId
      ? await communityRepository.getUserLikedTargetIds(currentUserId, 'comment', replyIds)
      : new Set<string>();

    const formatted = replies.map((r) => formatComment(r, authorMap, likedSet));

    let nextCursor: string | null = null;
    if (hasMore && replies.length > 0) {
      const last = replies[replies.length - 1];
      nextCursor = encodeCursor(last.createdAt, last._id.toString());
    }

    return {
      replies: formatted,
      nextCursor,
      hasMore,
    };
  },

  async createComment(
    authorId: string,
    authorRole: string,
    postId: string,
    data: { content?: string; parentId?: string; replyToUserId?: string }
  ): Promise<CommentResponse> {
    const content = (data.content || '').trim();
    if (content.length < 1 || content.length > 2000) {
      throw new AppError('Nội dung bình luận phải từ 1 đến 2000 ký tự.', 400);
    }

    const post = await communityRepository.getPostById(postId);
    if (!post) {
      throw new AppError('Bài viết không tồn tại hoặc đã bị xóa.', 404);
    }

    let parentId: any = null;
    let replyToUserId: string | null = null;

    if (data.parentId) {
      const parent = await communityRepository.getCommentById(data.parentId);
      if (!parent) {
        throw new AppError('Bình luận gốc không tồn tại hoặc đã bị xóa.', 404);
      }
      // Đảm bảo cấu trúc chỉ 2 cấp: nếu reply một reply, parentId luôn là rootCommentId
      parentId = parent.parentId ? parent.parentId : parent._id;
      replyToUserId = data.replyToUserId || parent.authorId;
    }

    const comment = await communityRepository.createComment({
      postId: post._id,
      parentId,
      replyToUserId,
      authorId,
      authorRole: (['USER', 'CONTENT_CREATOR', 'ADMIN'].includes(authorRole)
        ? authorRole
        : 'USER') as any,
      content,
    });

    const userIds = [authorId];
    if (replyToUserId) userIds.push(replyToUserId);
    const authorMap = await communityRepository.getUsersByIds(userIds);

    // Gửi thông báo real-time tới tác giả bài viết nếu người comment khác tác giả
    const authorUser = authorMap.get(authorId);
    if (post.authorId !== authorId) {
      notifyCommunityUser(
        post.authorId,
        'community_comment',
        'Bình luận mới',
        `${authorUser?.full_name || 'Học viên'} vừa bình luận vào bài viết "${post.title.slice(0, 40)}..." của bạn.`
      ).catch(() => {});
    }

    // Gửi thông báo real-time tới người được reply
    if (replyToUserId && replyToUserId !== authorId && replyToUserId !== post.authorId) {
      notifyCommunityUser(
        replyToUserId,
        'community_reply',
        'Phản hồi mới',
        `${authorUser?.full_name || 'Học viên'} vừa trả lời bình luận của bạn.`
      ).catch(() => {});
    }

    return formatComment(comment, authorMap, new Set());
  },

  async deleteComment(commentId: string, userId: string, role: string): Promise<void> {
    const isAdmin = role === 'ADMIN';
    const ok = await communityRepository.softDeleteComment(commentId, userId, isAdmin);
    if (!ok) {
      throw new AppError(
        'Không tìm thấy bình luận hoặc bạn không có quyền xóa.',
        403
      );
    }
  },

  // =========================================================================
  // REACTIONS
  // =========================================================================
  async toggleLikePost(postId: string, userId: string) {
    const post = await communityRepository.getPostById(postId);
    if (!post) {
      throw new AppError('Bài viết không tồn tại.', 404);
    }
    const result = await communityRepository.toggleReaction('post', postId, userId, 'like');

    // Nếu vừa Like và người Like không phải chủ bài viết -> Gửi thông báo
    if (result.added && post.authorId !== userId) {
      const likerMap = await communityRepository.getUsersByIds([userId]);
      const liker = likerMap.get(userId);
      notifyCommunityUser(
        post.authorId,
        'community_like',
        'Lượt thích mới',
        `${liker?.full_name || 'Học viên'} đã thích bài viết của bạn.`
      ).catch(() => {});
    }

    return result;
  },

  async toggleLikeComment(commentId: string, userId: string) {
    const comment = await communityRepository.getCommentById(commentId);
    if (!comment) {
      throw new AppError('Bình luận không tồn tại.', 404);
    }
    return await communityRepository.toggleReaction('comment', commentId, userId, 'like');
  },

  // =========================================================================
  // CREATOR TOOLS: PIN / UNPIN POST & POLL VOTING
  // =========================================================================
  async togglePinPost(postId: string, userId: string, userRole: string): Promise<{ isPinned: boolean }> {
    const isAdmin = userRole === 'ADMIN';
    const isCreator = userRole === 'CONTENT_CREATOR';
    if (!isAdmin && !isCreator) {
      throw new AppError('Chỉ Giảng viên hoặc Quản trị viên mới có quyền ghim bài viết.', 403);
    }

    const post = await communityRepository.getPostById(postId);
    if (!post) {
      throw new AppError('Bài viết không tồn tại.', 404);
    }

    if (!isAdmin && post.authorId !== userId) {
      throw new AppError('Giảng viên chỉ có thể ghim bài viết của chính mình.', 403);
    }

    const nextPinned = !post.isPinned;
    await CommunityPost.updateOne({ _id: post._id }, { $set: { isPinned: nextPinned } });
    return { isPinned: nextPinned };
  },

  async votePoll(postId: string, userId: string, optionIndex: number): Promise<PostResponse> {
    const post = await CommunityPost.findOne({ _id: postId, isDeleted: false });
    if (!post || post.type !== 'poll' || !post.pollOptions || post.pollOptions.length === 0) {
      throw new AppError('Bài viết này không có bình chọn.', 400);
    }

    if (optionIndex < 0 || optionIndex >= post.pollOptions.length) {
      throw new AppError('Lựa chọn bình chọn không hợp lệ.', 400);
    }

    // Xóa vote cũ của user ở tất cả các options để tránh vote nhiều lần
    for (const opt of post.pollOptions) {
      opt.votes = opt.votes.filter((v) => v !== userId);
    }

    // Ghi nhận vote vào option được chọn
    post.pollOptions[optionIndex].votes.push(userId);
    await post.save();

    const authorMap = await communityRepository.getUsersByIds([post.authorId]);
    const likedSet = await communityRepository.getUserLikedTargetIds(userId, 'post', [
      post._id.toString(),
    ]);

    return formatPost(post, authorMap, likedSet, userId);
  },

  // =========================================================================
  // GAMIFICATION: BEST ANSWER WITH COINS & EXP REWARD
  // =========================================================================
  async markBestAnswer(
    postId: string,
    commentId: string,
    userId: string,
    userRole: string
  ): Promise<{ success: boolean; isSolved: boolean; isBestAnswer: boolean }> {
    const post = await communityRepository.getPostById(postId);
    if (!post) {
      throw new AppError('Bài viết không tồn tại.', 404);
    }

    const isAdmin = userRole === 'ADMIN';
    if (!isAdmin && post.authorId !== userId) {
      throw new AppError('Chỉ người đăng bài mới có quyền chọn câu trả lời hay nhất.', 403);
    }

    const comment = await communityRepository.getCommentById(commentId);
    if (!comment || comment.postId.toString() !== post._id.toString()) {
      throw new AppError('Bình luận không thuộc bài viết này.', 404);
    }

    if (comment.isBestAnswer) {
      throw new AppError('Bình luận này đã được chọn là câu trả lời hay nhất.', 400);
    }

    // Cập nhật Comment và Post
    await CommunityComment.updateOne({ _id: comment._id }, { $set: { isBestAnswer: true } });
    await CommunityPost.updateOne({ _id: post._id }, { $set: { isSolved: true } });

    // Thưởng Xu (+10) và Exp (+20) vào ví MySQL của người giải bài
    try {
      await pool.execute(
        `UPDATE wallets SET coin_balance = coin_balance + 10, exp = exp + 20 WHERE user_id = ?`,
        [comment.authorId]
      );
      const txId = uuidv4();
      await pool.execute(
        `INSERT INTO billing_transactions (id, user_id, amount, transaction_type, metadata)
         VALUES (?, ?, ?, 'EARN_ACHIEVEMENT', ?)`,
        [
          txId,
          comment.authorId,
          10,
          JSON.stringify({ reason: 'BEST_ANSWER_REWARD', postId: post._id.toString() }),
        ]
      );
    } catch (err) {
      console.error('[community] Lỗi cập nhật ví thưởng Best Answer:', err);
    }

    // Gửi thông báo in-app và realtime Socket tới người giải bài
    const currentUserAuthor = (await communityRepository.getUsersByIds([userId])).get(userId);
    notifyCommunityUser(
      comment.authorId,
      'community_best_answer',
      '🎉 Lời giải hay nhất!',
      `${currentUserAuthor?.full_name || 'Học viên'} đã chọn lời giải của bạn là Câu trả lời hay nhất! Bạn nhận được +10 Xu và +20 Exp thưởng.`
    ).catch(() => {});

    return { success: true, isSolved: true, isBestAnswer: true };
  },

  // =========================================================================
  // ECOSYSTEM SYNERGY: FLASHCARD SHARING & CLONING
  // =========================================================================
  async shareFlashcardDeck(
    authorId: string,
    authorRole: string,
    data: { deckId: string; topic?: string; caption?: string }
  ): Promise<PostResponse> {
    const { deckId, topic, caption } = data;
    if (!deckId) {
      throw new AppError('ID bộ thẻ không được để trống.', 400);
    }

    const deck = await Course.findOne({ _id: deckId, type: 'flashcard' });
    if (!deck) {
      throw new AppError('Không tìm thấy bộ thẻ Flashcard.', 404);
    }

    if (deck.creatorId !== authorId && authorRole !== 'ADMIN') {
      throw new AppError('Bạn chỉ có thể chia sẻ bộ thẻ Flashcard thuộc quyền sở hữu của mình.', 403);
    }

    const cardCount = await Flashcard.countDocuments({ courseId: deck._id });
    const sampleCards = await Flashcard.find({ courseId: deck._id })
      .sort({ order: 1 })
      .limit(5)
      .select('front back')
      .lean();

    const rawTopic = (topic || 'vocabulary').trim().toLowerCase();
    const finalTopic: CommunityTopic = COMMUNITY_TOPICS.includes(rawTopic as any)
      ? (rawTopic as CommunityTopic)
      : 'vocabulary';

    const title = `🃏 Chia sẻ bộ Flashcard: ${deck.title}`;
    const content =
      caption?.trim() ||
      `Mình vừa chia sẻ bộ thẻ "${deck.title}" gồm ${cardCount} thẻ từ vựng với cấp độ ${
        deck.level || 'All Levels'
      }. Các bạn có thể lật xem thử trực tiếp và bấm lưu (clone) về Private Space để cùng học nhé!`;

    const post = await communityRepository.createPost({
      authorId,
      authorRole: (['USER', 'CONTENT_CREATOR', 'ADMIN'].includes(authorRole)
        ? authorRole
        : 'USER') as any,
      type: 'shared_flashcard',
      topic: finalTopic,
      title,
      content,
      tags: ['flashcard', 'vocabulary', ...(deck.tags || [])],
      referenceId: deck._id,
      referenceMeta: {
        title: deck.title,
        thumbnail: deck.thumbnail,
        cardCount,
        level: deck.level,
        sampleCards: sampleCards.map((c) => ({ front: c.front, back: c.back })),
      },
    });

    const authorMap = await communityRepository.getUsersByIds([authorId]);
    return formatPost(post, authorMap, new Set(), authorId);
  },

  async cloneDeck(postId: string, userId: string) {
    const post = await communityRepository.getPostById(postId);
    if (!post || post.type !== 'shared_flashcard' || !post.referenceId) {
      throw new AppError('Bài viết không phải là bộ thẻ Flashcard được chia sẻ.', 400);
    }

    const sourceDeck = await Course.findById(post.referenceId);
    if (!sourceDeck) {
      throw new AppError('Bộ thẻ gốc không còn tồn tại trên hệ thống.', 404);
    }

    // Nhân bản bộ thẻ vào Private Space của người clone
    const clonedDeck = new Course({
      title: `${sourceDeck.title} (Bản sao)`,
      description: sourceDeck.description || '',
      thumbnail: sourceDeck.thumbnail || '',
      creatorId: userId,
      isPublished: false,
      level: sourceDeck.level || 'All Levels',
      tags: sourceDeck.tags || [],
      price: 0,
      type: 'flashcard',
    });
    const savedDeck = await clonedDeck.save();

    // Sao chép toàn bộ các thẻ từ vựng sang bộ thẻ mới
    const sourceCards = await Flashcard.find({ courseId: sourceDeck._id }).sort({ order: 1 }).lean();
    if (sourceCards.length > 0) {
      const newCards = sourceCards.map((card) => ({
        courseId: savedDeck._id,
        front: card.front,
        back: card.back,
        order: card.order,
      }));
      await Flashcard.insertMany(newCards);
    }

    // Tăng số lượt clone trên bài viết
    await CommunityPost.updateOne(
      { _id: post._id },
      { $inc: { 'stats.clonesCount': 1 } }
    );

    return {
      newDeckId: savedDeck._id.toString(),
      title: savedDeck.title,
      cardCount: sourceCards.length,
      clonesCount: (post.stats?.clonesCount || 0) + 1,
    };
  },

  // =========================================================================
  // ECOSYSTEM SYNERGY: COURSE MILESTONE CELEBRATION
  // =========================================================================
  async shareCourseMilestone(
    userId: string,
    userRole: string,
    data: { courseId: string; caption?: string }
  ): Promise<PostResponse> {
    const { courseId, caption } = data;
    if (!courseId) {
      throw new AppError('ID khóa học không được để trống.', 400);
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new AppError('Khóa học không tồn tại.', 404);
    }

    const title = `🎓 Vinh danh hoàn thành khóa học: ${course.title}!`;
    const content =
      caption?.trim() ||
      `🎉 Mình vừa hoàn thành 100% khóa học "${course.title}". Quá trình học tập và làm bài tập thật sự đem lại nhiều giá trị! Chúc các bạn trong cộng đồng LexiCore cũng sớm chinh phục mục tiêu của mình nhé! 🔥`;

    const post = await communityRepository.createPost({
      authorId: userId,
      authorRole: (['USER', 'CONTENT_CREATOR', 'ADMIN'].includes(userRole)
        ? userRole
        : 'USER') as any,
      type: 'course_milestone',
      topic: 'general',
      title,
      content,
      tags: ['milestone', 'graduation', 'achievement'],
      referenceId: course._id,
      referenceMeta: {
        title: course.title,
        thumbnail: course.thumbnail,
        level: course.level,
      },
    });

    const authorMap = await communityRepository.getUsersByIds([userId]);
    return formatPost(post, authorMap, new Set(), userId);
  },

  async getTrending() {
    return await communityRepository.getTrendingTags();
  },
};
