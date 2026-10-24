import { AppError } from '../../errors/AppError';
import { socialRepository } from './social.repository';
import { notificationRepository } from '../notification/notification-repository';
import { MESSAGE_MAX_LENGTH } from '../../database/models/Message';
import {
    socialEvents,
    SOCIAL_EVENTS,
    SocialUserSummary,
    FriendRequestEventPayload,
    FriendRemovedEventPayload,
    MessageCreatedEventPayload,
    MessagesReadEventPayload,
    NotificationCreatedEventPayload,
} from './social-events';

export type Relationship = 'none' | 'friends' | 'request_sent' | 'request_received' | 'blocked';

const MIN_SEARCH_LENGTH = 2;
const SEARCH_LIMIT = 20;
const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

const isDuplicateError = (error: any): boolean => error?.code === 'ER_DUP_ENTRY';

const assertId = (value: unknown, label: string): string => {
    if (typeof value !== 'string' || value.trim().length === 0 || value.length > 36) {
        throw new AppError(`${label} không hợp lệ.`, 400);
    }
    return value;
};

const toSummary = (u: { id: string; full_name: string; avatar_url: string | null }): SocialUserSummary => ({
    id: u.id,
    full_name: u.full_name,
    avatar_url: u.avatar_url ?? null,
});

// Tạo thông báo in-app + phát event để lớp realtime đẩy tới client. Lỗi thông báo không làm hỏng nghiệp vụ chính.
async function notifyUser(userId: string, type: 'friend_request' | 'friend_accepted', title: string, body: string): Promise<void> {
    try {
        const id = await notificationRepository.createNotification({ userId, type, title, body });
        const payload: NotificationCreatedEventPayload = {
            userId,
            notification: { id, type, title, body, is_read: false, created_at: new Date() },
        };
        socialEvents.emit(SOCIAL_EVENTS.NOTIFICATION_CREATED, payload);
    } catch (error) {
        console.error('[social] Không thể tạo thông báo:', error);
    }
}

// Lấy conversation và xác nhận user là thành viên. Không phải thành viên => 404 (không lộ sự tồn tại).
async function requireParticipant(conversationId: string, userId: string) {
    const conversation = await socialRepository.findConversationById(assertId(conversationId, 'ID hội thoại'));
    if (!conversation || (conversation.user1_id !== userId && conversation.user2_id !== userId)) {
        throw new AppError('Không tìm thấy cuộc trò chuyện.', 404);
    }
    const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
    return { conversation, otherUserId };
}

async function requireAcceptedFriendship(userId: string, otherUserId: string) {
    const friendship = await socialRepository.findFriendshipByPair(userId, otherUserId);
    if (!friendship || friendship.status !== 'accepted') {
        throw new AppError('Bạn chỉ có thể nhắn tin với người đã là bạn bè.', 403);
    }
    return friendship;
}

export const socialService = {
    // =====================================================================
    // TÌM KIẾM USER
    // =====================================================================
    async searchUsers(me: string, rawKeyword: unknown) {
        const keyword = typeof rawKeyword === 'string' ? rawKeyword.trim() : '';
        if (keyword.length < MIN_SEARCH_LENGTH) {
            throw new AppError(`Từ khoá tìm kiếm phải có ít nhất ${MIN_SEARCH_LENGTH} ký tự.`, 400);
        }

        const rows = await socialRepository.searchUsers(me, keyword, SEARCH_LIMIT);
        return rows.map((row) => {
            let relationship: Relationship = 'none';
            if (row.friendship_status === 'accepted') relationship = 'friends';
            else if (row.friendship_status === 'pending') {
                relationship = row.friendship_requester_id === me ? 'request_sent' : 'request_received';
            } else if (row.friendship_status === 'blocked') relationship = 'blocked'; // chỉ còn trường hợp tôi chặn họ

            return {
                id: row.id,
                full_name: row.full_name,
                avatar_url: row.avatar_url ?? null,
                level: Number(row.level),
                relationship,
                request_id: row.friendship_status === 'pending' ? row.friendship_id : null,
            };
        });
    },

    // =====================================================================
    // KẾT BẠN
    // =====================================================================
    async sendFriendRequest(me: string, rawReceiverId: unknown) {
        const receiverId = assertId(rawReceiverId, 'ID người nhận');
        if (receiverId === me) throw new AppError('Bạn không thể kết bạn với chính mình.', 400);

        const [receiver, sender] = await Promise.all([
            socialRepository.getUserBasic(receiverId),
            socialRepository.getUserBasic(me),
        ]);
        if (!receiver || receiver.status !== 'ACTIVE' || !sender) {
            throw new AppError('Không tìm thấy người dùng.', 404);
        }

        const existing = await socialRepository.findFriendshipByPair(me, receiverId);

        if (existing) {
            switch (existing.status) {
                case 'accepted':
                    throw new AppError('Hai bạn đã là bạn bè.', 409);

                case 'pending': {
                    if (existing.requester_id === me) {
                        throw new AppError('Bạn đã gửi lời mời kết bạn cho người này rồi.', 409);
                    }
                    // Người kia đã mời mình từ trước -> chấp nhận luôn
                    const accepted = await socialRepository.updateFriendship(existing.id, 'pending', { status: 'accepted' });
                    if (!accepted) throw new AppError('Trạng thái lời mời đã thay đổi, vui lòng thử lại.', 409);
                    await socialService._afterAccepted(existing.id, sender, receiverId);
                    return { request_id: existing.id, status: 'accepted' as const };
                }

                case 'rejected': {
                    // Cho phép gửi lại: đảo chiều theo người gửi hiện tại
                    const reopened = await socialRepository.updateFriendship(existing.id, 'rejected', {
                        status: 'pending',
                        requester_id: me,
                        receiver_id: receiverId,
                    });
                    if (!reopened) throw new AppError('Trạng thái lời mời đã thay đổi, vui lòng thử lại.', 409);
                    await socialService._afterRequestCreated(existing.id, sender, receiverId);
                    return { request_id: existing.id, status: 'pending' as const };
                }

                case 'blocked':
                    if (existing.requester_id === me) {
                        throw new AppError('Bạn đã chặn người này. Hãy bỏ chặn trước khi gửi lời mời.', 403);
                    }
                    // Không tiết lộ việc bị chặn
                    throw new AppError('Không thể gửi lời mời kết bạn cho người dùng này.', 403);
            }
        }

        let requestId: string;
        try {
            requestId = await socialRepository.createFriendship(me, receiverId, 'pending');
        } catch (error) {
            if (isDuplicateError(error)) throw new AppError('Quan hệ giữa hai bạn đã tồn tại.', 409);
            throw error;
        }
        await socialService._afterRequestCreated(requestId, sender, receiverId);
        return { request_id: requestId, status: 'pending' as const };
    },

    async respondToRequest(me: string, rawRequestId: unknown, action: 'accept' | 'reject') {
        const requestId = assertId(rawRequestId, 'ID lời mời');
        const request = await socialRepository.findFriendshipById(requestId);
        if (!request || request.receiver_id !== me) throw new AppError('Không tìm thấy lời mời kết bạn.', 404);
        if (request.status !== 'pending') throw new AppError('Lời mời này đã được xử lý.', 409);

        const me_ = await socialRepository.getUserBasic(me);
        if (!me_) throw new AppError('Không tìm thấy người dùng.', 404);

        if (action === 'accept') {
            const ok = await socialRepository.updateFriendship(requestId, 'pending', { status: 'accepted' });
            if (!ok) throw new AppError('Lời mời này đã được xử lý.', 409);
            await socialService._afterAccepted(requestId, me_, request.requester_id);
            return { request_id: requestId, status: 'accepted' as const };
        }

        const ok = await socialRepository.updateFriendship(requestId, 'pending', { status: 'rejected' });
        if (!ok) throw new AppError('Lời mời này đã được xử lý.', 409);
        const payload: FriendRequestEventPayload = { requestId, from: toSummary(me_), toUserId: request.requester_id };
        socialEvents.emit(SOCIAL_EVENTS.FRIEND_REQUEST_REJECTED, payload);
        return { request_id: requestId, status: 'rejected' as const };
    },

    // Người gửi huỷ lời mời đang chờ
    async cancelRequest(me: string, rawRequestId: unknown) {
        const requestId = assertId(rawRequestId, 'ID lời mời');
        const request = await socialRepository.findFriendshipById(requestId);
        if (!request || request.requester_id !== me || request.status !== 'pending') {
            throw new AppError('Không tìm thấy lời mời đang chờ.', 404);
        }
        const deleted = await socialRepository.deleteFriendship(requestId, 'pending');
        if (!deleted) throw new AppError('Lời mời này đã được xử lý.', 409);

        const sender = await socialRepository.getUserBasic(me);
        if (sender) {
            const payload: FriendRequestEventPayload = { requestId, from: toSummary(sender), toUserId: request.receiver_id };
            socialEvents.emit(SOCIAL_EVENTS.FRIEND_REQUEST_CANCELED, payload);
        }
        return { request_id: requestId };
    },

    async removeFriend(me: string, rawOtherUserId: unknown) {
        const otherUserId = assertId(rawOtherUserId, 'ID người dùng');
        const friendship = await socialRepository.findFriendshipByPair(me, otherUserId);
        if (!friendship || friendship.status !== 'accepted') throw new AppError('Hai bạn chưa phải là bạn bè.', 404);

        const deleted = await socialRepository.deleteFriendship(friendship.id, 'accepted');
        if (!deleted) throw new AppError('Trạng thái đã thay đổi, vui lòng thử lại.', 409);

        const payload: FriendRemovedEventPayload = { userId: me, otherUserId };
        socialEvents.emit(SOCIAL_EVENTS.FRIEND_REMOVED, payload);
    },

    async blockUser(me: string, rawTargetId: unknown) {
        const targetId = assertId(rawTargetId, 'ID người dùng');
        if (targetId === me) throw new AppError('Bạn không thể chặn chính mình.', 400);
        const target = await socialRepository.getUserBasic(targetId);
        if (!target) throw new AppError('Không tìm thấy người dùng.', 404);

        const existing = await socialRepository.findFriendshipByPair(me, targetId);
        if (!existing) {
            try {
                await socialRepository.createFriendship(me, targetId, 'blocked');
            } catch (error) {
                if (!isDuplicateError(error)) throw error;
            }
            return;
        }
        if (existing.status === 'blocked') return; // đã chặn (hoặc đã bị họ chặn): không đổi gì

        const updated = await socialRepository.updateFriendship(existing.id, existing.status, {
            status: 'blocked',
            requester_id: me, // requester = người chặn
            receiver_id: targetId,
        });
        if (!updated) throw new AppError('Trạng thái đã thay đổi, vui lòng thử lại.', 409);

        if (existing.status === 'accepted') {
            const payload: FriendRemovedEventPayload = { userId: me, otherUserId: targetId };
            socialEvents.emit(SOCIAL_EVENTS.FRIEND_REMOVED, payload);
        }
    },

    async unblockUser(me: string, rawTargetId: unknown) {
        const targetId = assertId(rawTargetId, 'ID người dùng');
        const existing = await socialRepository.findFriendshipByPair(me, targetId);
        if (!existing || existing.status !== 'blocked' || existing.requester_id !== me) {
            throw new AppError('Bạn chưa chặn người dùng này.', 404);
        }
        await socialRepository.deleteFriendship(existing.id, 'blocked');
    },

    async listFriends(me: string, rawKeyword?: unknown) {
        const keyword = typeof rawKeyword === 'string' && rawKeyword.trim() ? rawKeyword.trim() : undefined;
        const rows = await socialRepository.listFriends(me, keyword);
        return rows.map((row) => ({
            id: row.id,
            full_name: row.full_name,
            avatar_url: row.avatar_url ?? null,
            level: Number(row.level),
            current_streak: Number(row.current_streak),
            arena_rank: row.arena_rank,
            friendship_id: row.friendship_id,
            friends_since: row.friends_since,
        }));
    },

    async listRequests(me: string, rawDirection: unknown) {
        const direction = rawDirection === 'sent' ? 'sent' : 'received';
        const rows = await socialRepository.listPendingRequests(me, direction);
        return rows.map((row) => ({
            request_id: row.request_id,
            created_at: row.created_at,
            user: {
                id: row.id,
                full_name: row.full_name,
                avatar_url: row.avatar_url ?? null,
                level: Number(row.level),
            },
        }));
    },

    // Số liệu cho badge UI (lời mời chờ + tin nhắn chưa đọc)
    async getSummary(me: string) {
        const [pendingRequests, unreadMessages] = await Promise.all([
            socialRepository.countPendingReceived(me),
            socialRepository.countUnreadMessages(me),
        ]);
        return { pending_requests: pendingRequests, unread_messages: unreadMessages };
    },

    // =====================================================================
    // CHAT
    // =====================================================================
    async getOrCreateConversation(me: string, rawFriendId: unknown) {
        const friendId = assertId(rawFriendId, 'ID người bạn');
        if (friendId === me) throw new AppError('Không thể tạo hội thoại với chính mình.', 400);
        await requireAcceptedFriendship(me, friendId);

        let conversation = await socialRepository.findConversationByPair(me, friendId);
        if (!conversation) {
            try {
                await socialRepository.createConversation(me, friendId);
            } catch (error) {
                if (!isDuplicateError(error)) throw error; // tạo song song: lấy bản ghi đã có
            }
            conversation = await socialRepository.findConversationByPair(me, friendId);
        }
        if (!conversation) throw new AppError('Không thể tạo cuộc trò chuyện.', 500);

        const friend = await socialRepository.getUserBasic(friendId);
        return {
            id: conversation.id,
            last_message_at: conversation.last_message_at ?? null,
            friend: friend ? toSummary(friend) : null,
        };
    },

    async listConversations(me: string) {
        const rows = await socialRepository.listConversations(me);
        return rows.map((row) => ({
            id: row.id,
            last_message_at: row.last_message_at ?? null,
            unread_count: Number(row.unread_count || 0),
            friend: { id: row.friend_id, full_name: row.friend_name, avatar_url: row.friend_avatar ?? null },
            last_message: row.last_id
                ? {
                      id: Number(row.last_id),
                      content: row.last_content,
                      sender_id: row.last_sender_id,
                      created_at: row.last_created_at,
                      is_read: Boolean(row.last_is_read),
                  }
                : null,
        }));
    },

    // Lịch sử tin nhắn theo cursor. Trả về tin theo thứ tự cũ -> mới để render trực tiếp.
    async getMessages(me: string, conversationId: string, rawCursor: unknown, rawLimit: unknown) {
        await requireParticipant(conversationId, me);

        let cursor: number | null = null;
        if (rawCursor !== undefined && rawCursor !== '') {
            const parsed = Number(rawCursor);
            if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError('Cursor không hợp lệ.', 400);
            cursor = parsed;
        }

        let limit = DEFAULT_PAGE_SIZE;
        if (rawLimit !== undefined && rawLimit !== '') {
            const parsed = Number(rawLimit);
            if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError('Limit không hợp lệ.', 400);
            limit = Math.min(parsed, MAX_PAGE_SIZE);
        }

        const { messages, hasMore } = await socialRepository.getMessagesPage(conversationId, cursor, limit);
        const nextCursor = hasMore && messages.length > 0 ? messages[messages.length - 1].id : null; // id tin cũ nhất của trang
        return { messages: [...messages].reverse(), next_cursor: nextCursor, has_more: hasMore };
    },

    // Xác nhận user là thành viên hội thoại và hai bên vẫn là bạn; trả về ID người còn lại (dùng cho socket)
    async resolveChatPeer(me: string, conversationId: string): Promise<string> {
        const { otherUserId } = await requireParticipant(conversationId, me);
        await requireAcceptedFriendship(me, otherUserId);
        return otherUserId;
    },

    // Dùng chung cho REST và WebSocket (Phase 3)
    async sendMessage(me: string, conversationId: string, rawContent: unknown, clientId?: string) {
        if (typeof rawContent !== 'string') throw new AppError('Nội dung tin nhắn không hợp lệ.', 400);
        const content = rawContent.trim();
        if (content.length === 0) throw new AppError('Tin nhắn không được để trống.', 400);
        if (content.length > MESSAGE_MAX_LENGTH) {
            throw new AppError(`Tin nhắn tối đa ${MESSAGE_MAX_LENGTH} ký tự.`, 400);
        }

        const { otherUserId } = await requireParticipant(conversationId, me);
        await requireAcceptedFriendship(me, otherUserId);

        const message = await socialRepository.insertMessage(conversationId, me, content);

        const payload: MessageCreatedEventPayload = {
            message: {
                id: Number(message.id),
                conversation_id: message.conversation_id,
                sender_id: message.sender_id,
                content: message.content,
                is_read: message.is_read,
                created_at: message.created_at as Date,
                clientId: clientId || undefined,
            },
            recipientId: otherUserId,
        };
        socialEvents.emit(SOCIAL_EVENTS.MESSAGE_CREATED, payload);
        return {
            ...message,
            clientId: clientId || undefined,
        };
    },

    async markConversationRead(me: string, conversationId: string) {
        const { otherUserId } = await requireParticipant(conversationId, me);
        const count = await socialRepository.markConversationRead(conversationId, me);
        if (count > 0) {
            const payload: MessagesReadEventPayload = {
                conversationId,
                readerId: me,
                otherUserId,
                readAt: new Date(),
                count,
            };
            socialEvents.emit(SOCIAL_EVENTS.MESSAGES_READ, payload);
        }
        return { count };
    },

    // =====================================================================
    // Helpers nội bộ
    // =====================================================================
    async _afterRequestCreated(requestId: string, sender: SocialUserSummary, receiverId: string) {
        const payload: FriendRequestEventPayload = { requestId, from: toSummary(sender), toUserId: receiverId };
        socialEvents.emit(SOCIAL_EVENTS.FRIEND_REQUEST_CREATED, payload);
        await notifyUser(
            receiverId,
            'friend_request',
            'Lời mời kết bạn mới',
            `${sender.full_name} đã gửi cho bạn lời mời kết bạn.`
        );
    },

    // `accepter` là người vừa chấp nhận; `requesterId` là người đã gửi lời mời ban đầu (người nhận thông báo)
    async _afterAccepted(requestId: string, accepter: SocialUserSummary, requesterId: string) {
        const payload: FriendRequestEventPayload = { requestId, from: toSummary(accepter), toUserId: requesterId };
        socialEvents.emit(SOCIAL_EVENTS.FRIEND_REQUEST_ACCEPTED, payload);
        await notifyUser(
            requesterId,
            'friend_accepted',
            'Lời mời kết bạn được chấp nhận',
            `${accepter.full_name} đã chấp nhận lời mời kết bạn của bạn.`
        );
    },
};
