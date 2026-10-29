import { Router } from 'express';
import { communityController } from './community.controller';
import { requireAuth, optionalAuth } from '../../middlewares/requireAuth';

const router = Router();

// ===========================================================================
// POSTS
// ===========================================================================
// Lấy danh sách feed (hỗ trợ đọc khi chưa đăng nhập, nếu có token thì nạp isLiked)
router.get('/posts', optionalAuth, communityController.getFeed);

// Lấy danh sách chủ đề thịnh hành (Trending topics/tags thực tế)
router.get('/trending', communityController.getTrending);

// Lấy chi tiết 1 bài viết
router.get('/posts/:id', optionalAuth, communityController.getPost);

// Tạo bài viết mới
router.post('/posts', requireAuth, communityController.createPost);

// Xóa bài viết (soft delete)
router.delete('/posts/:id', requireAuth, communityController.deletePost);

// Thả tim / Bỏ tim bài viết
router.post('/posts/:id/like', requireAuth, communityController.togglePostLike);

// ===========================================================================
// COMMENTS
// ===========================================================================
// Lấy danh sách bình luận gốc của bài viết
router.get('/posts/:postId/comments', optionalAuth, communityController.listComments);

// Gửi bình luận vào bài viết (hoặc reply bình luận khác)
router.post('/posts/:postId/comments', requireAuth, communityController.createComment);

// Lấy danh sách replies của 1 bình luận gốc
router.get('/comments/:commentId/replies', optionalAuth, communityController.listReplies);

// Xóa bình luận
router.delete('/comments/:commentId', requireAuth, communityController.deleteComment);

// Thả tim / Bỏ tim bình luận
router.post('/comments/:commentId/like', requireAuth, communityController.toggleCommentLike);

// ===========================================================================
// ECOSYSTEM SYNERGY
// ===========================================================================
// Chia sẻ bộ Flashcard từ Private Space
router.post('/share-deck', requireAuth, communityController.shareFlashcardDeck);

// Clone bộ Flashcard từ Community về Private Space
router.post('/posts/:id/clone-deck', requireAuth, communityController.cloneDeck);

// Khoe thành tích hoàn thành khóa học
router.post('/milestone', requireAuth, communityController.shareCourseMilestone);

// ===========================================================================
// CREATOR TOOLS & GAMIFICATION
// ===========================================================================
// Ghim / Bỏ ghim bài viết (Creator / Admin)
router.patch('/posts/:id/pin', requireAuth, communityController.togglePinPost);

// Bình chọn Poll
router.post('/posts/:id/vote', requireAuth, communityController.votePoll);

// Chọn câu trả lời hay nhất (Best Answer thưởng Exp & Xu)
router.post('/posts/:postId/comments/:commentId/best-answer', requireAuth, communityController.markBestAnswer);

export default router;

