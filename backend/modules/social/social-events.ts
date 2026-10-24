import { EventEmitter } from 'events';

/**
 * Event bus nội bộ của module Social (Friends & Chat).
 *
 * Service chỉ việc `emit` sau khi ghi DB thành công; lớp WebSocket (Phase 3)
 * sẽ `on(...)` để đẩy realtime tới các client. Nhờ vậy REST và Socket dùng chung
 * một luồng nghiệp vụ mà không phụ thuộc lẫn nhau.
 */
export const SOCIAL_EVENTS = {
    FRIEND_REQUEST_CREATED: 'friend_request_created',
    FRIEND_REQUEST_ACCEPTED: 'friend_request_accepted',
    FRIEND_REQUEST_REJECTED: 'friend_request_rejected',
    FRIEND_REQUEST_CANCELED: 'friend_request_canceled',
    FRIEND_REMOVED: 'friend_removed',
    MESSAGE_CREATED: 'message_created',
    MESSAGES_READ: 'messages_read',
    NOTIFICATION_CREATED: 'notification_created',
} as const;

export interface SocialUserSummary {
    id: string;
    full_name: string;
    avatar_url: string | null;
}

export interface FriendRequestEventPayload {
    requestId: string;
    from: SocialUserSummary; // người gửi / người chấp nhận (tuỳ event)
    toUserId: string; // người nhận event
}

export interface FriendRemovedEventPayload {
    userId: string; // người thực hiện
    otherUserId: string; // người còn lại
}

export interface MessageCreatedEventPayload {
    message: {
        id: number;
        conversation_id: string;
        sender_id: string;
        content: string;
        is_read: boolean;
        created_at: Date;
    };
    recipientId: string;
}

export interface MessagesReadEventPayload {
    conversationId: string;
    readerId: string;
    otherUserId: string; // người cần được báo "đã xem"
    readAt: Date;
    count: number;
}

export interface NotificationCreatedEventPayload {
    userId: string;
    notification: {
        id: string;
        type: string;
        title: string;
        body: string;
        is_read: boolean;
        created_at: Date;
    };
}

export const socialEvents = new EventEmitter();
socialEvents.setMaxListeners(50);
