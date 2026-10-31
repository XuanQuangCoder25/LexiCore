import { Router } from 'express';
import { socialController } from './social.controller';
import { requireAuth } from '../../middlewares/requireAuth';

const router = Router();

// Tất cả endpoints Friends & Chat đều yêu cầu đăng nhập
router.use(requireAuth);

// Tổng quan cho badge UI (lời mời chờ + tin nhắn chưa đọc)
router.get('/summary', socialController.getSummary);

// Tìm kiếm user
router.get('/users/search', socialController.searchUsers);

// Lời mời kết bạn (đặt trước '/friends/:userId' để không bị nuốt route)
router.get('/friends/requests', socialController.listRequests);
router.post('/friends/requests', socialController.sendRequest);
router.post('/friends/requests/:requestId/accept', socialController.acceptRequest);
router.post('/friends/requests/:requestId/reject', socialController.rejectRequest);
router.delete('/friends/requests/:requestId', socialController.cancelRequest);

// Danh sách bạn bè / hủy kết bạn
router.get('/friends', socialController.listFriends);
router.delete('/friends/:userId', socialController.removeFriend);

// Chặn / bỏ chặn
router.post('/blocks/:userId', socialController.blockUser);
router.delete('/blocks/:userId', socialController.unblockUser);

// Hội thoại & tin nhắn
router.get('/conversations', socialController.listConversations);
router.post('/conversations', socialController.openConversation);
router.get('/conversations/:conversationId/messages', socialController.getMessages);
router.post('/conversations/:conversationId/messages', socialController.sendMessage);
router.post('/conversations/:conversationId/read', socialController.markRead);

export default router;
