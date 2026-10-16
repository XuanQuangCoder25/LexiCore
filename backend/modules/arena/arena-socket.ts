import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import redis from '../../config/redis';
import { pool } from '../../config/mysql';
import {
    getLowerRank,
    fetchMatchQuestions,
    toPublicQuestions,
    TOTAL_MATCH_QUESTIONS,
    MATCH_TIME_LIMIT_SEC,
} from './arena-rank.utils';

export interface SocketUserPayload {
    id: string;
    role: string;
    creator_status?: string | null;
}

export interface AuthenticatedSocket extends Socket {
    data: {
        user?: SocketUserPayload;
    };
}

export interface PlayerProfile {
    id: string;
    full_name: string;
    avatar_url: string | null;
    arena_rank: string;
    rank_point: number;
    arena_current_win_streak: number;
}

// Trích xuất token từ handshake theo thứ tự ưu tiên:
// 1. socket.handshake.auth.token (Client truyền qua auth option)
// 2. Cookie trong header (accessToken hoặc token từ httpOnly cookie)
// 3. Header Authorization (Bearer token)
// 4. Handshake query (fallback)
function extractTokenFromHandshake(socket: Socket): string | null {
    // 1. Kiểm tra handshake.auth
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
        return authToken.startsWith('Bearer ') ? authToken.slice(7).trim() : authToken.trim();
    }

    // 2. Kiểm tra Cookie (hỗ trợ httpOnly cookie khi client bật withCredentials)
    const rawCookie = socket.handshake.headers.cookie;
    if (rawCookie) {
        const cookies: Record<string, string> = {};
        rawCookie.split(';').forEach((item) => {
            const parts = item.trim().split('=');
            const key = parts[0];
            const val = parts.slice(1).join('=');
            if (key) {
                cookies[key] = decodeURIComponent(val);
            }
        });

        const accessToken = cookies['accessToken'];
        if (accessToken) return accessToken;

        const token = cookies['token'];
        if (token) return token;
    }

    // 3. Kiểm tra Header Authorization
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        if (token.length > 0) return token;
    }

    // 4. Kiểm tra Handshake query
    const queryToken = socket.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim().length > 0) {
        return queryToken.trim();
    }

    return null;
}

// Lấy thông tin profile & rank của danh sách người chơi từ MySQL
async function getPlayerProfiles(userIds: string[]): Promise<Map<string, PlayerProfile>> {
    const map = new Map<string, PlayerProfile>();
    if (userIds.length === 0) return map;

    const placeholders = userIds.map(() => '?').join(', ');
    const [rows] = await pool.execute(
        `SELECT u.id, u.full_name, u.avatar_url, 
                COALESCE(w.arena_rank, 'BRONZE') as arena_rank, 
                COALESCE(w.rank_point, 0) as rank_point, 
                COALESCE(w.arena_current_win_streak, 0) as arena_current_win_streak
         FROM users u
         LEFT JOIN wallets w ON u.id = w.user_id
         WHERE u.id IN (${placeholders})`,
        userIds
    );

    for (const row of rows as any[]) {
        map.set(row.id, {
            id: row.id,
            full_name: row.full_name || 'Người chơi',
            avatar_url: row.avatar_url || null,
            arena_rank: row.arena_rank || 'BRONZE',
            rank_point: Number(row.rank_point) || 0,
            arena_current_win_streak: Number(row.arena_current_win_streak) || 0,
        });
    }

    return map;
}

// Tạo phòng đấu trong Redis và gửi event arena:matched cho cả 2 người chơi
async function createArenaRoom(io: SocketIOServer, p1Id: string, p2Id: string): Promise<void> {
    const roomId = uuidv4();
    const profiles = await getPlayerProfiles([p1Id, p2Id]);

    const p1 = profiles.get(p1Id) || {
        id: p1Id,
        full_name: 'Người chơi 1',
        avatar_url: null,
        arena_rank: 'BRONZE',
        rank_point: 0,
        arena_current_win_streak: 0,
    };

    const p2 = profiles.get(p2Id) || {
        id: p2Id,
        full_name: 'Người chơi 2',
        avatar_url: null,
        arena_rank: 'BRONZE',
        rank_point: 0,
        arena_current_win_streak: 0,
    };

    // Xác định rank thấp hơn giữa 2 người chơi để cân bằng tỉ lệ độ khó
    const rankSnapshot = getLowerRank(p1.arena_rank, p2.arena_rank);

    // Lấy 25 câu hỏi theo tỉ lệ rank tương ứng
    const matchQuestions = await fetchMatchQuestions(rankSnapshot, TOTAL_MATCH_QUESTIONS);
    const publicQuestions = toPublicQuestions(matchQuestions);

    // Lưu thông tin phòng vào Redis (TTL 10 phút = 600 giây)
    const roomKey = `arena:room:${roomId}`;
    await redis.hset(roomKey, {
        roomId,
        player1Id: p1Id,
        player2Id: p2Id,
        rankSnapshot,
        status: 'MATCHED',
        createdAt: Date.now().toString(),
        totalQuestions: matchQuestions.length.toString(),
        timeLimitSec: MATCH_TIME_LIMIT_SEC.toString(),
        questions: JSON.stringify(matchQuestions), // Server giữ đáp án đầy đủ để chấm điểm
        p1_correct: '0',
        p1_current: '0',
        p1_finished: '0',
        p1_time_used_ms: '0',
        p2_correct: '0',
        p2_current: '0',
        p2_finished: '0',
        p2_time_used_ms: '0',
    });
    await redis.expire(roomKey, 600);

    // Gắn mapping người chơi -> roomId để kiểm tra trạng thái đang trong trận
    await redis.set(`arena:player:${p1Id}`, roomId, 'EX', 600);
    await redis.set(`arena:player:${p2Id}`, roomId, 'EX', 600);

    // Cho cả 2 socket vào socket room chung của ván đấu
    io.in(`user:${p1Id}`).socketsJoin(`arena:room:${roomId}`);
    io.in(`user:${p2Id}`).socketsJoin(`arena:room:${roomId}`);

    // Gửi thông báo tìm thấy trận đấu kèm thông tin đối thủ và bộ câu hỏi (đã che đáp án)
    io.to(`user:${p1Id}`).emit('arena:matched', {
        roomId,
        me: p1,
        opponent: p2,
        questions: publicQuestions,
        totalQuestions: publicQuestions.length,
        timeLimitSec: MATCH_TIME_LIMIT_SEC,
    });

    io.to(`user:${p2Id}`).emit('arena:matched', {
        roomId,
        me: p2,
        opponent: p1,
        questions: publicQuestions,
        totalQuestions: publicQuestions.length,
        timeLimitSec: MATCH_TIME_LIMIT_SEC,
    });

    console.log(`[Arena Matchmaking] Ghép trận thành công: ${p1.full_name} vs ${p2.full_name} (Phòng: ${roomId})`);
}

// Xử lý hàng đợi ghép trận từ Redis list
async function tryMatchmaking(io: SocketIOServer): Promise<void> {
    try {
        while (true) {
            const queueLen = await redis.llen('arena:queue');
            if (queueLen < 2) break;

            const p1Id = await redis.lpop('arena:queue');
            if (!p1Id) break;

            const p2Id = await redis.lpop('arena:queue');
            if (!p2Id) {
                // Không đủ 2 người, đưa p1 trở lại đầu hàng đợi
                await redis.lpush('arena:queue', p1Id);
                break;
            }

            // Phòng ngừa trường hợp cùng 1 user lọt vào 2 lần
            if (p1Id === p2Id) {
                await redis.del(`arena:in_queue:${p1Id}`);
                continue;
            }

            // Kiểm tra trạng thái hàng đợi (loại bỏ trường hợp đã huỷ hoặc ngắt kết nối)
            const p1InQueue = await redis.get(`arena:in_queue:${p1Id}`);
            const p2InQueue = await redis.get(`arena:in_queue:${p2Id}`);

            if (!p1InQueue) {
                if (p2InQueue) await redis.lpush('arena:queue', p2Id);
                continue;
            }

            if (!p2InQueue) {
                await redis.lpush('arena:queue', p1Id);
                continue;
            }

            // Cả 2 người chơi hợp lệ -> Xoá trạng thái đang đợi
            await redis.del(`arena:in_queue:${p1Id}`);
            await redis.del(`arena:in_queue:${p2Id}`);

            // Khởi tạo phòng đấu
            await createArenaRoom(io, p1Id, p2Id);
        }
    } catch (error) {
        console.error('[Arena Matchmaking] Lỗi khi xử lý hàng đợi tìm trận:', error);
    }
}

// Khởi tạo Socket.IO cho Arena và gắn Middleware xác thực
export function initArenaSocket(io: SocketIOServer): void {
    // ─── Middleware xác thực Socket.IO (Handshake Auth) ────────
    io.use((socket, next) => {
        try {
            const token = extractTokenFromHandshake(socket);

            if (!token) {
                return next(new Error('Authentication error: Không tìm thấy token xác thực'));
            }

            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                return next(new Error('Internal server error: JWT_SECRET chưa được cấu hình'));
            }

            const decoded = jwt.verify(token, jwtSecret) as SocketUserPayload;
            socket.data.user = decoded;
            next();
        } catch (error) {
            return next(new Error('Authentication error: Token không hợp lệ hoặc đã hết hạn'));
        }
    });

    // ─── Connection handler ────────────────────────────────────
    io.on('connection', (socket) => {
        const user = socket.data.user as SocketUserPayload | undefined;
        if (!user?.id) {
            socket.disconnect(true);
            return;
        }

        console.log(`[Arena Socket] Người chơi kết nối: ${user.id} (socket_id: ${socket.id})`);

        // Tham gia room cá nhân để dễ dàng gửi tin nhắn định danh theo userId
        socket.join(`user:${user.id}`);

        // 1. Event: Tìm trận đấu
        socket.on('arena:find_match', async () => {
            try {
                const userId = user.id;

                // Kiểm tra xem người chơi có đang trong phòng đấu nào chưa
                const existingRoomId = await redis.get(`arena:player:${userId}`);
                if (existingRoomId) {
                    socket.emit('arena:match_error', {
                        message: 'Bạn đang trong một trận đấu chưa hoàn thành.',
                        roomId: existingRoomId,
                    });
                    return;
                }

                // Kiểm tra xem đã trong hàng đợi chưa
                const alreadyInQueue = await redis.get(`arena:in_queue:${userId}`);
                if (alreadyInQueue) {
                    socket.emit('arena:match_error', {
                        message: 'Bạn đã ở trong hàng đợi tìm trận rồi.',
                    });
                    return;
                }

                // Đánh dấu người chơi đang tìm trận (TTL 5 phút)
                await redis.set(`arena:in_queue:${userId}`, socket.id, 'EX', 300);
                await redis.rpush('arena:queue', userId);

                socket.emit('arena:searching', {
                    message: 'Đang tìm kiếm đối thủ...',
                });
                console.log(`[Arena Matchmaking] Người chơi vào hàng đợi: ${userId}`);

                // Kích hoạt ghép trận
                await tryMatchmaking(io);
            } catch (error) {
                console.error('[Arena Matchmaking] Lỗi khi nhận yêu cầu tìm trận:', error);
                socket.emit('arena:match_error', { message: 'Có lỗi xảy ra khi tìm trận đấu.' });
            }
        });

        // 2. Event: Huỷ tìm trận đấu
        socket.on('arena:cancel_match', async () => {
            try {
                const userId = user.id;
                await redis.lrem('arena:queue', 0, userId);
                await redis.del(`arena:in_queue:${userId}`);

                socket.emit('arena:match_cancelled', {
                    message: 'Đã huỷ tìm kiếm trận đấu.',
                });
                console.log(`[Arena Matchmaking] Người chơi huỷ tìm trận: ${userId}`);
            } catch (error) {
                console.error('[Arena Matchmaking] Lỗi khi huỷ tìm trận:', error);
            }
        });

        // 3. Event: Ngắt kết nối
        socket.on('disconnect', async (reason) => {
            console.log(`[Arena Socket] Người chơi ngắt kết nối: ${user.id} (socket_id: ${socket.id}, reason: ${reason})`);

            try {
                // Tự động xoá khỏi hàng đợi nếu ngắt kết nối khi đang tìm trận
                const inQueueSocketId = await redis.get(`arena:in_queue:${user.id}`);
                if (inQueueSocketId === socket.id) {
                    await redis.lrem('arena:queue', 0, user.id);
                    await redis.del(`arena:in_queue:${user.id}`);
                    console.log(`[Arena Matchmaking] Tự động huỷ tìm trận cho user ${user.id} do ngắt kết nối.`);
                }
            } catch (err) {
                console.error('[Arena Socket] Lỗi khi dọn dẹp disconnect:', err);
            }
        });
    });
}
