import { Server as SocketIOServer, Namespace, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AppError } from '../../errors/AppError';
import { extractTokenFromHandshake } from '../../utils/socket-auth';
import { socialRepository } from './social.repository';
import { socialService } from './social.service';
import {
    socialEvents,
    SOCIAL_EVENTS,
    FriendRequestEventPayload,
    FriendRemovedEventPayload,
    MessageCreatedEventPayload,
    MessagesReadEventPayload,
    NotificationCreatedEventPayload,
} from './social-events';

/**
 * WebSocket cho Friends & Direct Messaging - namespace riêng `/chat`
 * (tách biệt với namespace mặc định đang dùng cho Arena).
 *
 * Mỗi user join room `user:<id>` => nhận realtime trên mọi tab/thiết bị.
 *
 * CLIENT -> SERVER (có ack callback)
 *   send_message   { conversationId, content, clientId? }  => ack { ok, message?, client_id?, error? }
 *   typing         { conversationId, isTyping }
 *   mark_read      { conversationId }                      => ack { ok, count?, error? }
 *
 * SERVER -> CLIENT
 *   receive_message         { message }                    (tới cả người nhận lẫn các tab của người gửi)
 *   typing                  { conversation_id, user_id, is_typing }
 *   messages_read           { conversation_id, reader_id, read_at, count }
 *   presence                { user_id, online }
 *   presence_snapshot       { online_user_ids }            (ngay khi kết nối)
 *   friend_request_received { request_id, from }
 *   friend_request_accepted { request_id, user }
 *   friend_request_rejected { request_id, user }
 *   friend_request_canceled { request_id, user }
 *   friend_removed          { user_id }
 *   friends_changed         { reason }                     (báo FE tải lại danh sách bạn bè)
 *   notification            { notification }               (thông báo in-app mới)
 */
export const CHAT_NAMESPACE = '/chat';

const SEND_LIMIT_MAX = 20; // tối đa 20 tin / 10 giây / socket
const SEND_LIMIT_WINDOW_MS = 10_000;
const TYPING_MIN_INTERVAL_MS = 500;
const PEER_CACHE_TTL_MS = 60_000;
const PEER_CACHE_MAX = 50;
const OFFLINE_GRACE_MS = 3_000; // chờ trước khi báo offline để tránh nhấp nháy khi F5

interface ChatSocketData {
    userId: string;
    role: string;
    tokenExp?: number; // epoch giây
}

type ChatSocket = Socket & { data: ChatSocketData };
type Ack = (response: Record<string, unknown>) => void;

const userRoom = (userId: string) => `user:${userId}`;
const toAck = (cb: unknown): Ack => (typeof cb === 'function' ? (cb as Ack) : () => undefined);

const failure = (error: unknown) => {
    if (error instanceof AppError) return { ok: false, error: error.message, code: error.statusCode };
    console.error('[chat-socket] Lỗi không xác định:', error);
    return { ok: false, error: 'Lỗi máy chủ nội bộ.', code: 500 };
};

// Giới hạn tần suất dạng cửa sổ trượt
class SlidingWindowLimiter {
    private hits: number[] = [];
    constructor(private readonly max: number, private readonly windowMs: number) {}
    allow(): boolean {
        const now = Date.now();
        this.hits = this.hits.filter((t) => now - t < this.windowMs);
        if (this.hits.length >= this.max) return false;
        this.hits.push(now);
        return true;
    }
}

async function countUserSockets(chat: Namespace, userId: string): Promise<number> {
    const sockets = await chat.in(userRoom(userId)).fetchSockets();
    return sockets.length;
}

async function getFriendIds(userId: string): Promise<string[]> {
    const friends = await socialRepository.listFriends(userId);
    return friends.map((f) => f.id as string);
}

// Bọc handler của event bus để lỗi bất đồng bộ không làm sập process
const safe =
    <T>(label: string, fn: (payload: T) => void | Promise<void>) =>
    (payload: T) => {
        Promise.resolve()
            .then(() => fn(payload))
            .catch((error) => console.error(`[chat-socket] Lỗi xử lý event ${label}:`, error));
    };

let busRegistered = false;

// Chuyển các event nghiệp vụ (REST + Socket) thành thông điệp realtime
function registerBusListeners(chat: Namespace): void {
    if (busRegistered) return;
    busRegistered = true;

    socialEvents.on(
        SOCIAL_EVENTS.MESSAGE_CREATED,
        safe<MessageCreatedEventPayload>('message_created', ({ message, recipientId }) => {
            chat.to(userRoom(recipientId)).to(userRoom(message.sender_id)).emit('receive_message', { message });
        })
    );

    socialEvents.on(
        SOCIAL_EVENTS.MESSAGES_READ,
        safe<MessagesReadEventPayload>('messages_read', (p) => {
            chat.to(userRoom(p.otherUserId)).to(userRoom(p.readerId)).emit('messages_read', {
                conversation_id: p.conversationId,
                reader_id: p.readerId,
                read_at: p.readAt,
                count: p.count,
            });
        })
    );

    socialEvents.on(
        SOCIAL_EVENTS.FRIEND_REQUEST_CREATED,
        safe<FriendRequestEventPayload>('friend_request_created', (p) => {
            chat.to(userRoom(p.toUserId)).emit('friend_request_received', { request_id: p.requestId, from: p.from });
        })
    );

    socialEvents.on(
        SOCIAL_EVENTS.FRIEND_REQUEST_ACCEPTED,
        safe<FriendRequestEventPayload>('friend_request_accepted', async (p) => {
            const accepterId = p.from.id;
            chat.to(userRoom(p.toUserId)).emit('friend_request_accepted', { request_id: p.requestId, user: p.from });
            chat.to(userRoom(p.toUserId)).to(userRoom(accepterId)).emit('friends_changed', { reason: 'accepted' });

            // Hai bên vừa thành bạn: trao đổi trạng thái online cho nhau
            const [accepterOnline, requesterOnline] = await Promise.all([
                countUserSockets(chat, accepterId),
                countUserSockets(chat, p.toUserId),
            ]);
            if (accepterOnline > 0) chat.to(userRoom(p.toUserId)).emit('presence', { user_id: accepterId, online: true });
            if (requesterOnline > 0) chat.to(userRoom(accepterId)).emit('presence', { user_id: p.toUserId, online: true });
        })
    );

    socialEvents.on(
        SOCIAL_EVENTS.FRIEND_REQUEST_REJECTED,
        safe<FriendRequestEventPayload>('friend_request_rejected', (p) => {
            chat.to(userRoom(p.toUserId)).emit('friend_request_rejected', { request_id: p.requestId, user: p.from });
        })
    );

    socialEvents.on(
        SOCIAL_EVENTS.FRIEND_REQUEST_CANCELED,
        safe<FriendRequestEventPayload>('friend_request_canceled', (p) => {
            chat.to(userRoom(p.toUserId)).emit('friend_request_canceled', { request_id: p.requestId, user: p.from });
        })
    );

    socialEvents.on(
        SOCIAL_EVENTS.FRIEND_REMOVED,
        safe<FriendRemovedEventPayload>('friend_removed', (p) => {
            chat.to(userRoom(p.otherUserId)).emit('friend_removed', { user_id: p.userId });
            chat.to(userRoom(p.otherUserId)).to(userRoom(p.userId)).emit('friends_changed', { reason: 'removed' });
        })
    );

    socialEvents.on(
        SOCIAL_EVENTS.NOTIFICATION_CREATED,
        safe<NotificationCreatedEventPayload>('notification_created', (p) => {
            chat.to(userRoom(p.userId)).emit('notification', { notification: p.notification });
        })
    );
}

// Gửi trạng thái online của user tới toàn bộ bạn bè
async function broadcastPresence(chat: Namespace, userId: string, online: boolean): Promise<void> {
    const friendIds = await getFriendIds(userId);
    if (friendIds.length === 0) return;
    let emitter = chat.to(userRoom(friendIds[0]));
    for (let i = 1; i < friendIds.length; i++) emitter = emitter.to(userRoom(friendIds[i]));
    emitter.emit('presence', { user_id: userId, online });
}

export function initSocialSocket(io: SocketIOServer): void {
    const chat = io.of(CHAT_NAMESPACE);
    registerBusListeners(chat);

    // ------------------------------------------------------------------ AUTH
    chat.use(async (socket, next) => {
        try {
            const token = extractTokenFromHandshake(socket);
            if (!token) return next(new Error('UNAUTHORIZED'));

            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                console.error('[chat-socket] Thiếu JWT_SECRET');
                return next(new Error('SERVER_MISCONFIGURED'));
            }

            const decoded = jwt.verify(token, jwtSecret) as { id?: string; role?: string; exp?: number };
            if (!decoded?.id || typeof decoded.id !== 'string') return next(new Error('UNAUTHORIZED'));

            // Chặn tài khoản bị khoá / chưa kích hoạt
            const user = await socialRepository.getUserBasic(decoded.id);
            if (!user || user.status !== 'ACTIVE') return next(new Error('FORBIDDEN'));

            socket.data = { userId: decoded.id, role: decoded.role ?? 'USER', tokenExp: decoded.exp } as ChatSocketData;
            next();
        } catch {
            next(new Error('UNAUTHORIZED'));
        }
    });

    // ------------------------------------------------------------ CONNECTION
    chat.on('connection', async (rawSocket) => {
        const socket = rawSocket as ChatSocket;
        const { userId } = socket.data;

        await socket.join(userRoom(userId));

        // Token hết hạn => ngắt kết nối ở event kế tiếp
        socket.use((_packet, next) => {
            const exp = socket.data.tokenExp;
            if (exp && Date.now() / 1000 > exp) {
                next(new Error('TOKEN_EXPIRED'));
                socket.disconnect(true);
                return;
            }
            next();
        });

        // Presence: báo online khi đây là kết nối đầu tiên của user + gửi snapshot cho chính họ
        try {
            const friendIds = await getFriendIds(userId);
            const onlineFlags = await Promise.all(friendIds.map((id) => countUserSockets(chat, id)));
            socket.emit('presence_snapshot', { online_user_ids: friendIds.filter((_, i) => onlineFlags[i] > 0) });

            if ((await countUserSockets(chat, userId)) === 1) {
                await broadcastPresence(chat, userId, true);
            }
        } catch (error) {
            console.error('[chat-socket] Lỗi khởi tạo presence:', error);
        }

        // Trạng thái riêng từng socket
        const sendLimiter = new SlidingWindowLimiter(SEND_LIMIT_MAX, SEND_LIMIT_WINDOW_MS);
        const peerCache = new Map<string, { peerId: string; expires: number }>();
        let lastTypingAt = 0;

        const getPeer = async (conversationId: string): Promise<string> => {
            const cached = peerCache.get(conversationId);
            if (cached && cached.expires > Date.now()) return cached.peerId;
            const peerId = await socialService.resolveChatPeer(userId, conversationId);
            if (peerCache.size >= PEER_CACHE_MAX) peerCache.clear();
            peerCache.set(conversationId, { peerId, expires: Date.now() + PEER_CACHE_TTL_MS });
            return peerId;
        };

        // ---- send_message
        socket.on('send_message', async (payload: any, cb?: unknown) => {
            const ack = toAck(cb);
            try {
                if (!sendLimiter.allow()) {
                    throw new AppError('Bạn gửi tin nhắn quá nhanh, vui lòng thử lại sau giây lát.', 429);
                }
                const conversationId = typeof payload?.conversationId === 'string' ? payload.conversationId : '';
                const clientId = typeof payload?.clientId === 'string' ? payload.clientId : undefined;
                const message = await socialService.sendMessage(userId, conversationId, payload?.content, clientId);
                // receive_message được phát từ event bus tới người nhận và các tab của người gửi
                ack({
                    ok: true,
                    message,
                    client_id: clientId ?? null,
                });
            } catch (error) {
                ack({ ...failure(error), client_id: typeof payload?.clientId === 'string' ? payload.clientId : null });
            }
        });

        // ---- typing
        socket.on('typing', async (payload: any) => {
            try {
                const conversationId = typeof payload?.conversationId === 'string' ? payload.conversationId : '';
                const isTyping = Boolean(payload?.isTyping);
                if (!conversationId) return;

                const now = Date.now();
                if (isTyping && now - lastTypingAt < TYPING_MIN_INTERVAL_MS) return; // chống spam
                if (isTyping) lastTypingAt = now;

                const peerId = await getPeer(conversationId);
                chat.to(userRoom(peerId)).emit('typing', {
                    conversation_id: conversationId,
                    user_id: userId,
                    is_typing: isTyping,
                });
            } catch {
                // Bỏ qua im lặng: không phải thành viên / không còn là bạn
            }
        });

        // ---- mark_read
        socket.on('mark_read', async (payload: any, cb?: unknown) => {
            const ack = toAck(cb);
            try {
                const conversationId = typeof payload?.conversationId === 'string' ? payload.conversationId : '';
                const result = await socialService.markConversationRead(userId, conversationId);
                ack({ ok: true, count: result.count });
            } catch (error) {
                ack(failure(error));
            }
        });

        // ---- disconnect
        socket.on('disconnect', () => {
            setTimeout(() => {
                countUserSockets(chat, userId)
                    .then((count) => (count === 0 ? broadcastPresence(chat, userId, false) : undefined))
                    .catch((error) => console.error('[chat-socket] Lỗi báo offline:', error));
            }, OFFLINE_GRACE_MS);
        });
    });
}
