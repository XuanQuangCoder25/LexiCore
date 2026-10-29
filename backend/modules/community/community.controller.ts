import { Request, Response, NextFunction } from 'express';
import { communityService } from './community.service';

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const communityController: Record<string, Handler> = {
  // GET /api/community/posts
  async getFeed(req, res, next) {
    try {
      const data = await communityService.getFeed(req.user?.id, {
        tab: req.query.tab as string,
        topic: req.query.topic as string,
        cursor: req.query.cursor as string,
        limit: req.query.limit as string,
      });
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/community/posts/:id
  async getPost(req, res, next) {
    try {
      const data = await communityService.getPostById(String(req.params.id), req.user?.id);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/community/posts
  async createPost(req, res, next) {
    try {
      const data = await communityService.createPost(
        req.user!.id,
        req.user!.role,
        req.body || {}
      );
      res.status(201).json({
        status: 'success',
        message: 'Đăng bài viết thành công.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/community/posts/:id
  async deletePost(req, res, next) {
    try {
      await communityService.deletePost(
        String(req.params.id),
        req.user!.id,
        req.user!.role
      );
      res.status(200).json({
        status: 'success',
        message: 'Đã xóa bài viết thành công.',
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/community/posts/:id/like
  async togglePostLike(req, res, next) {
    try {
      const result = await communityService.toggleLikePost(
        String(req.params.id),
        req.user!.id
      );
      res.status(200).json({
        status: 'success',
        message: result.added ? 'Đã thích bài viết.' : 'Đã bỏ thích bài viết.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/community/posts/:postId/comments
  async listComments(req, res, next) {
    try {
      const data = await communityService.listComments(
        String(req.params.postId),
        req.user?.id,
        req.query.cursor as string,
        req.query.limit as string
      );
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/community/posts/:postId/comments
  async createComment(req, res, next) {
    try {
      const data = await communityService.createComment(
        req.user!.id,
        req.user!.role,
        String(req.params.postId),
        req.body || {}
      );
      res.status(201).json({
        status: 'success',
        message: 'Đã gửi bình luận.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/community/comments/:commentId/replies
  async listReplies(req, res, next) {
    try {
      const data = await communityService.listReplies(
        String(req.params.commentId),
        req.user?.id,
        req.query.cursor as string,
        req.query.limit as string
      );
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/community/comments/:commentId
  async deleteComment(req, res, next) {
    try {
      await communityService.deleteComment(
        String(req.params.commentId),
        req.user!.id,
        req.user!.role
      );
      res.status(200).json({
        status: 'success',
        message: 'Đã xóa bình luận.',
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/community/comments/:commentId/like
  async toggleCommentLike(req, res, next) {
    try {
      const result = await communityService.toggleLikeComment(
        String(req.params.commentId),
        req.user!.id
      );
      res.status(200).json({
        status: 'success',
        message: result.added ? 'Đã thích bình luận.' : 'Đã bỏ thích bình luận.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // =========================================================================
  // ECOSYSTEM SYNERGY
  // =========================================================================
  // POST /api/community/share-deck
  async shareFlashcardDeck(req, res, next) {
    try {
      const data = await communityService.shareFlashcardDeck(
        req.user!.id,
        req.user!.role,
        req.body || {}
      );
      res.status(201).json({
        status: 'success',
        message: 'Đã chia sẻ bộ Flashcard lên Cộng đồng thành công.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/community/posts/:id/clone-deck
  async cloneDeck(req, res, next) {
    try {
      const data = await communityService.cloneDeck(
        String(req.params.id),
        req.user!.id
      );
      res.status(200).json({
        status: 'success',
        message: 'Đã thêm bộ Flashcard vào Private Space của bạn!',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/community/milestone
  async shareCourseMilestone(req, res, next) {
    try {
      const data = await communityService.shareCourseMilestone(
        req.user!.id,
        req.user!.role,
        req.body || {}
      );
      res.status(201).json({
        status: 'success',
        message: 'Đã chia sẻ thành tích khóa học lên Cộng đồng!',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  // =========================================================================
  // PHASE 3: CREATOR TOOLS & GAMIFICATION
  // =========================================================================
  // PATCH /api/community/posts/:id/pin
  async togglePinPost(req, res, next) {
    try {
      const result = await communityService.togglePinPost(
        String(req.params.id),
        req.user!.id,
        req.user!.role
      );
      res.status(200).json({
        status: 'success',
        message: result.isPinned ? 'Đã ghim bài viết.' : 'Đã bỏ ghim bài viết.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/community/posts/:id/vote
  async votePoll(req, res, next) {
    try {
      const optionIndex = Number(req.body?.optionIndex);
      const data = await communityService.votePoll(
        String(req.params.id),
        req.user!.id,
        optionIndex
      );
      res.status(200).json({
        status: 'success',
        message: 'Đã ghi nhận bình chọn của bạn.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/community/posts/:postId/comments/:commentId/best-answer
  async markBestAnswer(req, res, next) {
    try {
      const data = await communityService.markBestAnswer(
        String(req.params.postId),
        String(req.params.commentId),
        req.user!.id,
        req.user!.role
      );
      res.status(200).json({
        status: 'success',
        message: 'Đã chọn câu trả lời hay nhất! Người giải bài đã nhận được +10 Xu và +20 Exp.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/community/trending
  async getTrending(_req, res, next) {
    try {
      const data = await communityService.getTrending();
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};

