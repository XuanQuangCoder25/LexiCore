import mongoose, { Types } from 'mongoose';
import { pool } from '../../config/mysql';
import CommunityPost, { ICommunityPost, CommunityTopic } from '../../database/models/CommunityPost';
import CommunityComment, { ICommunityComment } from '../../database/models/CommunityComment';
import CommunityReaction, { ReactionTargetType, ReactionType } from '../../database/models/CommunityReaction';
import { CommunityAuthor, CursorPayload } from './community.types';

export const communityRepository = {
  // =========================================================================
  // MYSQL USER & SOCIAL QUERIES (HYDRATION)
  // =========================================================================
  async getUsersByIds(userIds: string[]): Promise<Map<string, CommunityAuthor>> {
    const map = new Map<string, CommunityAuthor>();
    if (!userIds || userIds.length === 0) return map;

    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) return map;

    // mysql2 hỗ trợ truyền mảng cho toán tử IN (?)
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.avatar_url, u.role,
              COALESCE(w.level, 1) AS level
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.id IN (?)`,
      [uniqueIds]
    );

    for (const r of rows as any[]) {
      map.set(r.id, {
        id: r.id,
        full_name: r.full_name || 'Học viên ẩn danh',
        avatar_url: r.avatar_url || null,
        level: Number(r.level) || 1,
        role: r.role || 'USER',
      });
    }

    return map;
  },

  async getFriendIds(userId: string): Promise<string[]> {
    const [rows] = await pool.execute(
      `SELECT IF(requester_id = ?, receiver_id, requester_id) AS friend_id
       FROM friendships
       WHERE status = 'accepted' AND (requester_id = ? OR receiver_id = ?)`,
      [userId, userId, userId]
    );
    return (rows as any[]).map((r) => r.friend_id);
  },

  // =========================================================================
  // COMMUNITY POST QUERIES
  // =========================================================================
  async createPost(data: Partial<ICommunityPost>): Promise<ICommunityPost> {
    const post = new CommunityPost(data);
    return await post.save();
  },

  async getPostById(postId: string): Promise<ICommunityPost | null> {
    if (!Types.ObjectId.isValid(postId)) return null;
    return await CommunityPost.findOne({ _id: postId, isDeleted: false });
  },

  async listPinnedPosts(topic?: CommunityTopic): Promise<ICommunityPost[]> {
    const query: any = { isDeleted: false, isPinned: true };
    if (topic) query.topic = topic;
    return await CommunityPost.find(query).sort({ createdAt: -1 }).lean();
  },

  async listPosts(params: {
    tab?: 'all' | 'friends' | 'unanswered';
    topic?: CommunityTopic;
    friendIds?: string[];
    cursor?: CursorPayload | null;
    limit: number;
  }): Promise<{ posts: ICommunityPost[]; hasMore: boolean }> {
    const { tab, topic, friendIds, cursor, limit } = params;
    const query: any = { isDeleted: false, isPinned: false };

    if (topic) {
      query.topic = topic;
    }

    if (tab === 'unanswered') {
      query.isSolved = false;
      query.type = { $in: ['discussion', 'homework'] };
    } else if (tab === 'friends') {
      if (!friendIds || friendIds.length === 0) {
        return { posts: [], hasMore: false };
      }
      query.authorId = { $in: friendIds };
    }

    if (cursor) {
      query.$or = [
        { createdAt: { $lt: cursor.createdAt } },
        {
          createdAt: cursor.createdAt,
          _id: { $lt: new Types.ObjectId(cursor.id) },
        },
      ];
    }

    const posts = await CommunityPost.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = posts.length > limit;
    if (hasMore) {
      posts.pop();
    }

    return { posts: posts as unknown as ICommunityPost[], hasMore };
  },

  async softDeletePost(postId: string, authorId: string, isAdmin: boolean): Promise<boolean> {
    if (!Types.ObjectId.isValid(postId)) return false;
    const filter: any = { _id: postId, isDeleted: false };
    if (!isAdmin) {
      filter.authorId = authorId;
    }
    const res = await CommunityPost.updateOne(filter, { $set: { isDeleted: true } });
    return res.modifiedCount > 0;
  },

  async incrementPostComments(postId: Types.ObjectId, delta: number): Promise<void> {
    await CommunityPost.updateOne(
      { _id: postId },
      { $inc: { 'stats.commentsCount': delta } }
    );
  },

  async incrementPostViews(postId: Types.ObjectId): Promise<void> {
    await CommunityPost.updateOne(
      { _id: postId },
      { $inc: { 'stats.viewsCount': 1 } }
    );
  },

  async markPostSolved(postId: string, isSolved: boolean): Promise<boolean> {
    if (!Types.ObjectId.isValid(postId)) return false;
    const res = await CommunityPost.updateOne(
      { _id: postId, isDeleted: false },
      { $set: { isSolved } }
    );
    return res.modifiedCount > 0;
  },

  // =========================================================================
  // COMMUNITY COMMENT QUERIES (2-TIER)
  // =========================================================================
  async createComment(data: Partial<ICommunityComment>): Promise<ICommunityComment> {
    const comment = new CommunityComment(data);
    const saved = await comment.save();

    // Cập nhật thống kê bài viết
    await this.incrementPostComments(saved.postId, 1);

    // Nếu là reply, tăng repliesCount của root comment
    if (saved.parentId) {
      await CommunityComment.updateOne(
        { _id: saved.parentId },
        { $inc: { repliesCount: 1 } }
      );
    }

    return saved;
  },

  async getCommentById(commentId: string): Promise<ICommunityComment | null> {
    if (!Types.ObjectId.isValid(commentId)) return null;
    return await CommunityComment.findOne({ _id: commentId, isDeleted: false });
  },

  async listRootComments(params: {
    postId: string;
    cursor?: CursorPayload | null;
    limit: number;
  }): Promise<{ comments: ICommunityComment[]; hasMore: boolean }> {
    const { postId, cursor, limit } = params;
    if (!Types.ObjectId.isValid(postId)) return { comments: [], hasMore: false };

    const query: any = {
      postId: new Types.ObjectId(postId),
      parentId: null,
      isDeleted: false,
    };

    if (cursor) {
      query.$or = [
        { createdAt: { $lt: cursor.createdAt } },
        {
          createdAt: cursor.createdAt,
          _id: { $lt: new Types.ObjectId(cursor.id) },
        },
      ];
    }

    // Root comments sắp xếp mới nhất lên đầu (createdAt: -1, _id: -1)
    const comments = await CommunityComment.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = comments.length > limit;
    if (hasMore) {
      comments.pop();
    }

    return { comments: comments as unknown as ICommunityComment[], hasMore };
  },

  async listReplies(params: {
    parentId: string;
    cursor?: CursorPayload | null;
    limit: number;
  }): Promise<{ replies: ICommunityComment[]; hasMore: boolean }> {
    const { parentId, cursor, limit } = params;
    if (!Types.ObjectId.isValid(parentId)) return { replies: [], hasMore: false };

    const query: any = {
      parentId: new Types.ObjectId(parentId),
      isDeleted: false,
    };

    if (cursor) {
      query.$or = [
        { createdAt: { $gt: cursor.createdAt } },
        {
          createdAt: cursor.createdAt,
          _id: { $gt: new Types.ObjectId(cursor.id) },
        },
      ];
    }

    // Replies sắp xếp theo thứ tự thời gian tự nhiên (cũ trước, mới sau)
    const replies = await CommunityComment.find(query)
      .sort({ createdAt: 1, _id: 1 })
      .limit(limit + 1)
      .lean();

    const hasMore = replies.length > limit;
    if (hasMore) {
      replies.pop();
    }

    return { replies: replies as unknown as ICommunityComment[], hasMore };
  },

  async softDeleteComment(commentId: string, authorId: string, isAdmin: boolean): Promise<boolean> {
    if (!Types.ObjectId.isValid(commentId)) return false;
    const filter: any = { _id: commentId, isDeleted: false };
    if (!isAdmin) {
      filter.authorId = authorId;
    }

    const comment = await CommunityComment.findOne(filter);
    if (!comment) return false;

    await CommunityComment.updateOne({ _id: comment._id }, { $set: { isDeleted: true } });

    // Giảm bộ đếm comment bài viết
    await this.incrementPostComments(comment.postId, -1);

    if (comment.parentId) {
      await CommunityComment.updateOne(
        { _id: comment.parentId },
        { $inc: { repliesCount: -1 } }
      );
    }

    return true;
  },

  // =========================================================================
  // REACTIONS (LIKE / UNLIKE)
  // =========================================================================
  async toggleReaction(
    targetType: ReactionTargetType,
    targetId: string,
    userId: string,
    reactionType: ReactionType = 'like'
  ): Promise<{ added: boolean; targetLikes: number }> {
    if (!Types.ObjectId.isValid(targetId)) {
      throw new Error('ID đối tượng không hợp lệ');
    }

    const objTargetId = new Types.ObjectId(targetId);
    const existing = await CommunityReaction.findOne({
      targetType,
      targetId: objTargetId,
      userId,
    });

    if (existing) {
      // Đã like -> Huỷ like (Unlike)
      await CommunityReaction.deleteOne({ _id: existing._id });

      if (targetType === 'post') {
        const updated = await CommunityPost.findOneAndUpdate(
          { _id: objTargetId },
          { $inc: { 'stats.likesCount': -1 } },
          { new: true }
        );
        return { added: false, targetLikes: Math.max(0, updated?.stats.likesCount ?? 0) };
      } else {
        const updated = await CommunityComment.findOneAndUpdate(
          { _id: objTargetId },
          { $inc: { likesCount: -1 } },
          { new: true }
        );
        return { added: false, targetLikes: Math.max(0, updated?.likesCount ?? 0) };
      }
    } else {
      // Chưa like -> Thêm like
      try {
        await CommunityReaction.create({
          targetType,
          targetId: objTargetId,
          userId,
          type: reactionType,
        });
      } catch (err: any) {
        // Tránh race-condition duplicate key E11000
        if (err.code !== 11000) throw err;
      }

      if (targetType === 'post') {
        const updated = await CommunityPost.findOneAndUpdate(
          { _id: objTargetId },
          { $inc: { 'stats.likesCount': 1 } },
          { new: true }
        );
        return { added: true, targetLikes: updated?.stats.likesCount ?? 1 };
      } else {
        const updated = await CommunityComment.findOneAndUpdate(
          { _id: objTargetId },
          { $inc: { likesCount: 1 } },
          { new: true }
        );
        return { added: true, targetLikes: updated?.likesCount ?? 1 };
      }
    }
  },

  async getUserLikedTargetIds(
    userId: string,
    targetType: ReactionTargetType,
    targetIds: string[]
  ): Promise<Set<string>> {
    if (!userId || !targetIds || targetIds.length === 0) return new Set();

    const validObjIds = targetIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (validObjIds.length === 0) return new Set();

    const reactions = await CommunityReaction.find({
      userId,
      targetType,
      targetId: { $in: validObjIds },
    })
      .select('targetId')
      .lean();

    return new Set(reactions.map((r) => r.targetId.toString()));
  },
};
