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
    ArenaMatchQuestion,
    determineMatchResult,
    calculateRankProgression,
    ArenaRank,
    MatchResult,
} from './arena-rank.utils';
import {
    getPlayersWallets,
    saveMatchTransaction,
    MatchWordRecord,
} from './arena-match.repository';

export interface SubmitAnswerPayload {
    roomId: string;
    questionIndex: number;
    answer: string;
    timeMs: number;
}

export interface PlayerAnswerRecord {
    questionIndex: number;
    wordId: string;
    answer: string;
    isCorrect: boolean;
    timeMs: number;
}

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
    leaderboard_point: number;
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
                COALESCE(w.leaderboard_point, 0) as leaderboard_point, 
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
            leaderboard_point: Number(row.leaderboard_point) || 0,
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
        leaderboard_point: 0,
        arena_current_win_streak: 0,
    };

    const p2 = profiles.get(p2Id) || {
        id: p2Id,
        full_name: 'Người chơi 2',
        avatar_url: null,
        arena_rank: 'BRONZE',
        rank_point: 0,
        leaderboard_point: 0,
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
        p1_ready: '0',
        p2_ready: '0',
        p1_answers: '[]',
        p2_answers: '[]',
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

    // Gửi thông báo tìm thấy trận đấu kèm thông tin đối thủ và bộ câu hỏi
    io.to(`user:${p1Id}`).emit('arena:matched', {
        roomId,
        me: p1,
        opponent: p2,
        questions: matchQuestions,
        totalQuestions: matchQuestions.length,
        timeLimitSec: MATCH_TIME_LIMIT_SEC,
    });

    io.to(`user:${p2Id}`).emit('arena:matched', {
        roomId,
        me: p2,
        opponent: p1,
        questions: matchQuestions,
        totalQuestions: matchQuestions.length,
        timeLimitSec: MATCH_TIME_LIMIT_SEC,
    });

    console.log(`[Arena Matchmaking] Ghép trận thành công: ${p1.full_name} vs ${p2.full_name} (Phòng: ${roomId})`);

    // Thiết lập hẹn giờ 15 giây: Nếu sau 15s cả hai chưa sẵn sàng thì tự động hủy phòng
    const rTimer = setTimeout(async () => {
        const currentRoom = await redis.hgetall(roomKey);
        if (currentRoom && (currentRoom['status'] === 'MATCHED' || currentRoom['status'] === 'WAITING_READY')) {
            console.log(`[Arena Matchmaking] Hết thời gian chờ sẵn sàng (15s) cho phòng ${roomId}. Tự động hủy.`);
            await cancelUnreadyMatch(io, roomId);
        }
    }, 15000);
    readyTimers.set(roomId, rTimer);
}

// ─── Gameplay Real-time Handlers ──────────────────────────────────────

// Quản lý bộ đếm thời gian cho các ván đấu đang diễn ra
const matchTimers = new Map<string, NodeJS.Timeout>();
const readyTimers = new Map<string, NodeJS.Timeout>();

// Hủy phòng đấu khi người chơi không sẵn sàng, bấm hủy hoặc ngắt kết nối ở bước MATCHED
async function cancelUnreadyMatch(
    io: SocketIOServer,
    roomId: string,
    cancelledByUserId?: string
): Promise<void> {
    const readyTimer = readyTimers.get(roomId);
    if (readyTimer) {
        clearTimeout(readyTimer);
        readyTimers.delete(roomId);
    }

    const roomKey = `arena:room:${roomId}`;
    const room = await redis.hgetall(roomKey);
    if (!room || !room['roomId']) return;

    // Không hủy nếu ván đấu đã chính thức bắt đầu
    if (room['status'] === 'PLAYING' || room['status'] === 'FINISHED') return;

    await redis.hset(roomKey, 'status', 'CANCELLED');

    const p1Id = room['player1Id'];
    const p2Id = room['player2Id'];
    const p1Ready = room['p1_ready'] === '1';
    const p2Ready = room['p2_ready'] === '1';

    // Giải phóng mapping phòng cũ
    if (p1Id) await redis.del(`arena:player:${p1Id}`);
    if (p2Id) await redis.del(`arena:player:${p2Id}`);
    await redis.expire(roomKey, 60);

    // KỊCH BẢN NÂNG CAO:
    // Nếu có 1 người đã bấm sẵn sàng (ví dụ P1 ready, P2 không ready):
    // P2 bị phạt out về Hub.
    // P1 được giữ lại ở hàng đợi, tiếp tục tìm đối thủ mới!
    if (p1Ready && !p2Ready && p1Id && p2Id) {
        // Thông báo cho P2 bị out
        io.to(`user:${p2Id}`).emit('arena:match_cancelled', {
            roomId,
            message: 'Bạn đã không sẵn sàng kịp thời gian quy định.',
        });

        // Đưa P1 trở lại hàng đợi ưu tiên
        await redis.set(`arena:in_queue:${p1Id}`, '1', 'EX', 300);
        await redis.lpush('arena:queue', p1Id);
        io.to(`user:${p1Id}`).emit('arena:searching', {
            message: 'Đối thủ không sẵn sàng. Đang tự động tìm đối thủ mới cho bạn...',
        });
        console.log(`[Arena Matchmaking] P1 (${p1Id}) đã sẵn sàng được giữ lại hàng đợi. P2 (${p2Id}) bị out.`);
        await tryMatchmaking(io);
        return;
    }

    if (p2Ready && !p1Ready && p1Id && p2Id) {
        // Thông báo cho P1 bị out
        io.to(`user:${p1Id}`).emit('arena:match_cancelled', {
            roomId,
            message: 'Bạn đã không sẵn sàng kịp thời gian quy định.',
        });

        // Đưa P2 trở lại hàng đợi ưu tiên
        await redis.set(`arena:in_queue:${p2Id}`, '1', 'EX', 300);
        await redis.lpush('arena:queue', p2Id);
        io.to(`user:${p2Id}`).emit('arena:searching', {
            message: 'Đối thủ không sẵn sàng. Đang tự động tìm đối thủ mới cho bạn...',
        });
        console.log(`[Arena Matchmaking] P2 (${p2Id}) đã sẵn sàng được giữ lại hàng đợi. P1 (${p1Id}) bị out.`);
        await tryMatchmaking(io);
        return;
    }

    // Trường hợp cả 2 đều không sẵn sàng hoặc 1 người bấm hủy/ngắt kết nối:
    io.to(`arena:room:${roomId}`).emit('arena:match_cancelled', {
        roomId,
        cancelledByUserId,
        message: 'Trận đấu đã bị hủy do có người chơi không sẵn sàng hoặc đã thoát.',
    });

    console.log(`[Arena Matchmaking] Phòng ${roomId} đã bị hủy bởi ${cancelledByUserId || 'hệ thống timeout'}`);
}

// Xử lý khi người chơi bấm Sẵn sàng
async function handlePlayerReady(
    io: SocketIOServer,
    socket: Socket,
    userId: string,
    roomId: string
): Promise<void> {
    const roomKey = `arena:room:${roomId}`;
    const room = await redis.hgetall(roomKey);

    if (!room || !room['roomId']) {
        socket.emit('arena:gameplay_error', { message: 'Phòng thi đấu không tồn tại.' });
        return;
    }

    if (room['status'] !== 'MATCHED' && room['status'] !== 'WAITING_READY') {
        return;
    }

    const isP1 = userId === room['player1Id'];
    const isP2 = userId === room['player2Id'];

    if (!isP1 && !isP2) {
        socket.emit('arena:gameplay_error', { message: 'Bạn không thuộc phòng đấu này.' });
        return;
    }

    const readyField = isP1 ? 'p1_ready' : 'p2_ready';
    await redis.hset(roomKey, readyField, '1');

    // Thông báo cho cả phòng biết người chơi đã sẵn sàng
    io.to(`arena:room:${roomId}`).emit('arena:player_ready', {
        roomId,
        userId,
    });

    // Kiểm tra xem cả 2 người chơi đã sẵn sàng chưa
    const updatedRoom = await redis.hgetall(roomKey);
    if (
        updatedRoom['p1_ready'] === '1' &&
        updatedRoom['p2_ready'] === '1' &&
        (updatedRoom['status'] === 'MATCHED' || updatedRoom['status'] === 'WAITING_READY')
    ) {
        // Hủy ready timer vì cả 2 đã sẵn sàng
        const rTimer = readyTimers.get(roomId);
        if (rTimer) {
            clearTimeout(rTimer);
            readyTimers.delete(roomId);
        }
        await redis.hset(roomKey, 'status', 'COUNTDOWN');
        startMatchCountdown(io, roomId);
    }
}

// Bắt đầu đếm ngược 3-2-1 trước khi vào ván đấu
function startMatchCountdown(io: SocketIOServer, roomId: string): void {
    let count = 3;
    io.to(`arena:room:${roomId}`).emit('arena:countdown', { count: 3 });

    const interval = setInterval(async () => {
        count -= 1;
        if (count > 0) {
            io.to(`arena:room:${roomId}`).emit('arena:countdown', { count });
        } else {
            clearInterval(interval);
            const roomKey = `arena:room:${roomId}`;
            const startedAt = Date.now();
            await redis.hset(roomKey, {
                status: 'PLAYING',
                started_at: startedAt.toString(),
            });

            io.to(`arena:room:${roomId}`).emit('arena:start_match', {
                roomId,
                startedAt,
                timeLimitSec: MATCH_TIME_LIMIT_SEC,
            });

            console.log(`[Arena Gameplay] Ván đấu chính thức bắt đầu: ${roomId}`);

            // Thiết lập hẹn giờ kết thúc ván nếu hết thời gian giới hạn (360s)
            const timer = setTimeout(async () => {
                await handleMatchTimeout(io, roomId);
            }, MATCH_TIME_LIMIT_SEC * 1000);
            matchTimers.set(roomId, timer);
        }
    }, 1000);
}

// Xử lý khi ván đấu hết thời gian quy định
async function handleMatchTimeout(io: SocketIOServer, roomId: string): Promise<void> {
    const roomKey = `arena:room:${roomId}`;
    const room = await redis.hgetall(roomKey);
    if (!room || room['status'] !== 'PLAYING') return;

    console.log(`[Arena Gameplay] Ván đấu hết giờ: ${roomId}`);
    await finishMatch(io, roomId, 'TIMEOUT');
}

// Xử lý nộp đáp án của người chơi
async function handleSubmitAnswer(
    io: SocketIOServer,
    socket: Socket,
    userId: string,
    payload: SubmitAnswerPayload
): Promise<void> {
    const { roomId, questionIndex, answer, timeMs } = payload;
    const roomKey = `arena:room:${roomId}`;
    const room = await redis.hgetall(roomKey);

    if (!room || !room['roomId']) {
        socket.emit('arena:gameplay_error', { message: 'Phòng thi đấu không tồn tại.' });
        return;
    }

    if (room['status'] !== 'PLAYING') {
        socket.emit('arena:gameplay_error', { message: 'Ván đấu chưa bắt đầu hoặc đã kết thúc.' });
        return;
    }

    const isP1 = userId === room['player1Id'];
    const isP2 = userId === room['player2Id'];

    if (!isP1 && !isP2) {
        socket.emit('arena:gameplay_error', { message: 'Bạn không thuộc phòng đấu này.' });
        return;
    }

    const questions: ArenaMatchQuestion[] = JSON.parse(room['questions'] || '[]');
    const totalQuestions = questions.length;

    if (questionIndex < 0 || questionIndex >= totalQuestions) {
        socket.emit('arena:gameplay_error', { message: 'Chỉ số câu hỏi không hợp lệ.' });
        return;
    }

    const targetQuestion = questions[questionIndex];
    if (!targetQuestion) {
        socket.emit('arena:gameplay_error', { message: 'Không tìm thấy câu hỏi.' });
        return;
    }

    const answersField = isP1 ? 'p1_answers' : 'p2_answers';
    const userAnswers: PlayerAnswerRecord[] = JSON.parse(room[answersField] || '[]');

    // Kiểm tra xem câu này đã trả lời chưa (chống gian lận hoặc gửi trùng lặp)
    const alreadyAnswered = userAnswers.some((a) => a.questionIndex === questionIndex);
    if (alreadyAnswered) {
        return;
    }

    // So khớp đáp án (chuẩn hóa không phân biệt hoa thường và khoảng trắng thừa)
    const normalizedUserAnswer = (answer || '').trim().toLowerCase();
    const normalizedCorrectAnswer = targetQuestion.word.trim().toLowerCase();
    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;

    userAnswers.push({
        questionIndex,
        wordId: targetQuestion.id,
        answer: (answer || '').trim(),
        isCorrect,
        timeMs: Number(timeMs) || 0,
    });

    const currentCorrectCount = parseInt(isP1 ? (room['p1_correct'] || '0') : (room['p2_correct'] || '0'), 10);
    const newCorrectCount = currentCorrectCount + (isCorrect ? 1 : 0);
    const nextQuestionIndex = questionIndex + 1;
    const isFinished = nextQuestionIndex >= totalQuestions;

    const prevTimeMs = parseInt(isP1 ? (room['p1_time_used_ms'] || '0') : (room['p2_time_used_ms'] || '0'), 10);
    const newTotalTimeMs = prevTimeMs + (Number(timeMs) || 0);

    const updates: Record<string, string> = {
        [answersField]: JSON.stringify(userAnswers),
        [isP1 ? 'p1_correct' : 'p2_correct']: newCorrectCount.toString(),
        [isP1 ? 'p1_current' : 'p2_current']: nextQuestionIndex.toString(),
        [isP1 ? 'p1_time_used_ms' : 'p2_time_used_ms']: newTotalTimeMs.toString(),
        [isP1 ? 'p1_finished' : 'p2_finished']: isFinished ? '1' : '0',
    };

    await redis.hset(roomKey, updates);

    // 1. Gửi kết quả riêng cho người nộp
    socket.emit('arena:answer_result', {
        questionIndex,
        isCorrect,
        correctAnswer: isCorrect ? targetQuestion.word : undefined,
        currentCorrect: newCorrectCount,
        nextQuestionIndex,
        totalQuestions,
    });

    // 2. Gửi tiến độ cho đối thủ
    const opponentId = isP1 ? room['player2Id'] : room['player1Id'];
    const oppProgressData = {
        opponentId: userId,
        questionIndex: nextQuestionIndex,
        opponentCorrectCount: newCorrectCount,
        opponentScore: newCorrectCount * 10,
        timeUsedMs: Number(timeMs) || 0,
        totalQuestions,
    };

    if (opponentId) {
        io.to(`user:${opponentId}`).emit('arena:opponent_progress', oppProgressData);
    }
    socket.to(`arena:room:${roomId}`).emit('arena:opponent_progress', oppProgressData);

    // Nếu người chơi này vừa hoàn thành hết 25 câu hỏi
    if (isFinished) {
        socket.emit('arena:waiting_opponent', {
            message: 'Bạn đã hoàn thành 25 câu hỏi! Đang chờ đối thủ hoàn thành...',
            myCorrect: newCorrectCount,
            myScore: newCorrectCount * 10,
        });

        if (opponentId) {
            io.to(`user:${opponentId}`).emit('arena:opponent_finished', {
                opponentId: userId,
                opponentCorrect: newCorrectCount,
                opponentScore: newCorrectCount * 10,
            });
        }
    }

    // 3. Kịch bản Thắng Tuyệt Đối hoặc Cả 2 đều đã hoàn thành hết số câu hỏi:
    const otherFinished = isP1 ? room['p2_finished'] === '1' : room['p1_finished'] === '1';
    // Thắng tuyệt đối: Đúng 25/25 câu và đã hoàn thành trước
    const isPerfectWin = isFinished && newCorrectCount === totalQuestions;

    if ((isFinished && otherFinished) || isPerfectWin) {
        await finishMatch(io, roomId, 'ALL_COMPLETED');
    }
}

// Xử lý đầu hàng
async function handleSurrender(
    io: SocketIOServer,
    socket: Socket,
    userId: string,
    roomId: string
): Promise<void> {
    const roomKey = `arena:room:${roomId}`;
    const room = await redis.hgetall(roomKey);

    if (!room || !room['roomId'] || room['status'] === 'FINISHED' || room['status'] === 'CANCELLED') {
        return;
    }

    const isP1 = userId === room['player1Id'];
    const isP2 = userId === room['player2Id'];
    if (!isP1 && !isP2) return;

    console.log(`[Arena Gameplay] Người chơi đầu hàng: ${userId} (Phòng: ${roomId})`);

    const opponentId = isP1 ? room['player2Id'] : room['player1Id'];
    if (opponentId) {
        io.to(`user:${opponentId}`).emit('arena:opponent_surrendered', {
            surrenderedUserId: userId,
            message: 'Đối thủ đã đầu hàng!',
        });
    }

    if (room['status'] === 'MATCHED' || room['status'] === 'WAITING_READY') {
        await cancelUnreadyMatch(io, roomId, userId);
    } else {
        await finishMatch(io, roomId, 'SURRENDER', userId);
    }
}

// Kết thúc ván đấu
export async function finishMatch(
    io: SocketIOServer,
    roomId: string,
    reason: 'ALL_COMPLETED' | 'TIMEOUT' | 'SURRENDER',
    surrenderedUserId?: string
): Promise<void> {
    const timer = matchTimers.get(roomId);
    if (timer) {
        clearTimeout(timer);
        matchTimers.delete(roomId);
    }

    const roomKey = `arena:room:${roomId}`;
    const room = await redis.hgetall(roomKey);
    if (!room || room['status'] === 'FINISHED') return;

    await redis.hset(roomKey, 'status', 'FINISHED');

    const player1Id = room['player1Id'] || '';
    const player2Id = room['player2Id'] || '';
    const rankSnapshot = (room['rankSnapshot'] || 'BRONZE') as ArenaRank;
    const totalQuestions = parseInt(room['totalQuestions'] || '25', 10);
    const timeLimitSec = parseInt(room['timeLimitSec'] || '360', 10);
    const startedAt = room['started_at']
        ? new Date(Number(room['started_at'])).toISOString().slice(0, 19).replace('T', ' ')
        : new Date().toISOString().slice(0, 19).replace('T', ' ');
    const endedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const startedAtTimestamp = Number(room['started_at'] || room['createdAt'] || Date.now());
    const matchElapsedMs = Math.max(0, Date.now() - startedAtTimestamp);

    const p1Correct = parseInt(room['p1_correct'] || '0', 10);
    const p2Correct = parseInt(room['p2_correct'] || '0', 10);
    let p1TimeMs = parseInt(room['p1_time_used_ms'] || '0', 10);
    let p2TimeMs = parseInt(room['p2_time_used_ms'] || '0', 10);

    if (p1TimeMs === 0 && p1Correct > 0) p1TimeMs = matchElapsedMs;
    if (p2TimeMs === 0 && p2Correct > 0) p2TimeMs = matchElapsedMs;
    if (p1TimeMs === 0 && reason === 'TIMEOUT') p1TimeMs = timeLimitSec * 1000;
    if (p2TimeMs === 0 && reason === 'TIMEOUT') p2TimeMs = timeLimitSec * 1000;

    // 1. Xác định kết quả
    const result = determineMatchResult(
        p1Correct,
        p2Correct,
        p1TimeMs,
        p2TimeMs,
        surrenderedUserId,
        player1Id,
        player2Id
    );
    const winnerId = result === 'P1_WIN' ? player1Id : (result === 'P2_WIN' ? player2Id : null);

    // 2. Lấy thông tin ví & rank hiện tại của 2 người chơi
    const walletsMap = await getPlayersWallets(player1Id, player2Id);
    const p1Wallet = walletsMap.get(player1Id) || {
        user_id: player1Id,
        arena_rank: rankSnapshot,
        rank_point: 0,
        leaderboard_point: 0,
        arena_current_win_streak: 0,
        arena_longest_win_streak: 0,
    };
    const p2Wallet = walletsMap.get(player2Id) || {
        user_id: player2Id,
        arena_rank: rankSnapshot,
        rank_point: 0,
        leaderboard_point: 0,
        arena_current_win_streak: 0,
        arena_longest_win_streak: 0,
    };

    // 3. Tính toán rank, điểm số và streak mới
    const p1MatchResult = result === 'P1_WIN' ? 'WIN' : (result === 'P2_WIN' ? 'LOSS' : 'DRAW');
    const p2MatchResult = result === 'P2_WIN' ? 'WIN' : (result === 'P1_WIN' ? 'LOSS' : 'DRAW');

    const p1Progression = calculateRankProgression(
        p1Wallet.arena_rank,
        p1Wallet.rank_point,
        p1Wallet.leaderboard_point,
        p1MatchResult
    );
    const p2Progression = calculateRankProgression(
        p2Wallet.arena_rank,
        p2Wallet.rank_point,
        p2Wallet.leaderboard_point,
        p2MatchResult
    );

    const p1WinStreak = result === 'P1_WIN' ? p1Wallet.arena_current_win_streak + 1 : 0;
    const p2WinStreak = result === 'P2_WIN' ? p2Wallet.arena_current_win_streak + 1 : 0;

    // 4. Chuẩn bị danh sách 25 câu hỏi chi tiết và đáp án 2 bên
    const questions: ArenaMatchQuestion[] = JSON.parse(room['questions'] || '[]');
    const p1Answers: PlayerAnswerRecord[] = JSON.parse(room['p1_answers'] || '[]');
    const p2Answers: PlayerAnswerRecord[] = JSON.parse(room['p2_answers'] || '[]');

    const p1AnswersMap = new Map<number, PlayerAnswerRecord>();
    for (const a of p1Answers) p1AnswersMap.set(a.questionIndex, a);

    const p2AnswersMap = new Map<number, PlayerAnswerRecord>();
    for (const a of p2Answers) p2AnswersMap.set(a.questionIndex, a);

    const matchWordRecords: MatchWordRecord[] = [];
    const clientWords: any[] = [];

    questions.forEach((q, idx) => {
        const a1 = p1AnswersMap.get(idx);
        const a2 = p2AnswersMap.get(idx);

        const p1Ans = a1 ? a1.answer : null;
        const p1Corr = a1 ? a1.isCorrect : false;
        const p1T = a1 ? a1.timeMs : 0;

        const p2Ans = a2 ? a2.answer : null;
        const p2Corr = a2 ? a2.isCorrect : false;
        const p2T = a2 ? a2.timeMs : 0;

        matchWordRecords.push({
            wordId: q.id,
            orderIndex: idx + 1,
            p1Answer: p1Ans,
            p1Correct: p1Corr,
            p1TimeMs: p1T,
            p2Answer: p2Ans,
            p2Correct: p2Corr,
            p2TimeMs: p2T,
        });

        clientWords.push({
            orderIndex: idx + 1,
            wordId: q.id,
            word: q.word,
            meaning: q.meaning,
            topic: q.topic,
            level: q.level,
            wordType: q.word_type,
            example: q.example,
            p1Answer: p1Ans,
            p1Correct: p1Corr,
            p1TimeMs: p1T,
            p2Answer: p2Ans,
            p2Correct: p2Corr,
            p2TimeMs: p2T,
        });
    });

    // 5. Lưu vào MySQL qua DB Transaction
    try {
        await saveMatchTransaction({
            matchId: roomId,
            player1Id,
            player2Id,
            topic: room['topic'] || 'general',
            rankSnapshot,
            totalQuestions,
            timeLimitSec,
            startedAt,
            endedAt,
            result,
            winnerId,
            p1: {
                userId: player1Id,
                correct: p1Correct,
                timeMs: p1TimeMs,
                progression: p1Progression,
                winStreak: p1WinStreak,
            },
            p2: {
                userId: player2Id,
                correct: p2Correct,
                timeMs: p2TimeMs,
                progression: p2Progression,
                winStreak: p2WinStreak,
            },
            words: matchWordRecords,
        });
    } catch (dbErr) {
        console.error('[Arena Gameplay] Lỗi khi lưu MySQL match transaction:', dbErr);
    }

    // 6. Dọn dẹp Redis
    await redis.del(`arena:player:${player1Id}`);
    await redis.del(`arena:player:${player2Id}`);
    await redis.expire(roomKey, 300); // Giữ room 5 phút phục vụ tra cứu sau trận nếu cần

    // 7. Emit kết quả tổng kết (arena:game_over)
    // Emit cho Player 1
    io.to(`user:${player1Id}`).emit('arena:game_over', {
        roomId,
        result,
        winnerId,
        reason,
        myResult: p1MatchResult,
        myStats: {
            id: player1Id,
            correct: p1Correct,
            timeMs: p1TimeMs,
            rankPointDelta: p1Progression.rankPointDelta,
            leaderboardPointDelta: p1Progression.leaderboardPointDelta,
            newRank: p1Progression.newRank,
            newRankPoint: p1Progression.newRankPoint,
            newLeaderboardPoint: p1Progression.newLeaderboardPoint,
            winStreak: p1WinStreak,
            isPromoted: p1Progression.isPromoted,
            isDemoted: p1Progression.isDemoted,
            promotionDetails: p1Progression.promotionDetails,
            demotionDetails: p1Progression.demotionDetails,
        },
        opponentStats: {
            id: player2Id,
            correct: p2Correct,
            timeMs: p2TimeMs,
            rankPointDelta: p2Progression.rankPointDelta,
            leaderboardPointDelta: p2Progression.leaderboardPointDelta,
            newRank: p2Progression.newRank,
            newRankPoint: p2Progression.newRankPoint,
            newLeaderboardPoint: p2Progression.newLeaderboardPoint,
            winStreak: p2WinStreak,
        },
        words: clientWords.map((w) => ({
            orderIndex: w.orderIndex,
            wordId: w.wordId,
            word: w.word,
            meaning: w.meaning,
            topic: w.topic,
            level: w.level,
            wordType: w.wordType,
            example: w.example,
            myAnswer: w.p1Answer,
            myCorrect: w.p1Correct,
            myTimeMs: w.p1TimeMs,
            opponentAnswer: w.p2Answer,
            opponentCorrect: w.p2Correct,
            opponentTimeMs: w.p2TimeMs,
        })),
    });

    // Emit cho Player 2
    io.to(`user:${player2Id}`).emit('arena:game_over', {
        roomId,
        result,
        winnerId,
        reason,
        myResult: p2MatchResult,
        myStats: {
            id: player2Id,
            correct: p2Correct,
            timeMs: p2TimeMs,
            rankPointDelta: p2Progression.rankPointDelta,
            leaderboardPointDelta: p2Progression.leaderboardPointDelta,
            newRank: p2Progression.newRank,
            newRankPoint: p2Progression.newRankPoint,
            newLeaderboardPoint: p2Progression.newLeaderboardPoint,
            winStreak: p2WinStreak,
            isPromoted: p2Progression.isPromoted,
            isDemoted: p2Progression.isDemoted,
            promotionDetails: p2Progression.promotionDetails,
            demotionDetails: p2Progression.demotionDetails,
        },
        opponentStats: {
            id: player1Id,
            correct: p1Correct,
            timeMs: p1TimeMs,
            rankPointDelta: p1Progression.rankPointDelta,
            leaderboardPointDelta: p1Progression.leaderboardPointDelta,
            newRank: p1Progression.newRank,
            newRankPoint: p1Progression.newRankPoint,
            newLeaderboardPoint: p1Progression.newLeaderboardPoint,
            winStreak: p1WinStreak,
        },
        words: clientWords.map((w) => ({
            orderIndex: w.orderIndex,
            wordId: w.wordId,
            word: w.word,
            meaning: w.meaning,
            topic: w.topic,
            level: w.level,
            wordType: w.wordType,
            example: w.example,
            myAnswer: w.p2Answer,
            myCorrect: w.p2Correct,
            myTimeMs: w.p2TimeMs,
            opponentAnswer: w.p1Answer,
            opponentCorrect: w.p1Correct,
            opponentTimeMs: w.p1TimeMs,
        })),
    });

    // Thông báo trạng thái kết thúc chung cho cả socket room
    io.to(`arena:room:${roomId}`).emit('arena:match_ended', {
        roomId,
        reason,
        surrenderedUserId,
        winnerId,
        result,
    });

    console.log(`[Arena Gameplay] Ván đấu ${roomId} đã kết thúc và phát kết quả game_over thành công.`);
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

                // Tự động kiểm tra và giải phóng phòng cũ nếu có
                const existingRoomId = await redis.get(`arena:player:${userId}`);
                if (existingRoomId) {
                    const room = await redis.hgetall(`arena:room:${existingRoomId}`);
                    const isRoomStale = !room || !room['roomId'] || room['status'] === 'FINISHED' || room['status'] === 'CANCELLED';

                    if (isRoomStale) {
                        console.log(`[Arena Matchmaking] Tự động dọn dẹp phòng cũ đã kết thúc cho user ${userId}: ${existingRoomId}`);
                        await redis.del(`arena:player:${userId}`);
                    } else if (room['status'] === 'MATCHED' || room['status'] === 'WAITING_READY') {
                        const createdAt = Number(room['createdAt'] || 0);
                        const isRecentlyCreated = createdAt > 0 && (Date.now() - createdAt) < 18000;
                        if (isRecentlyCreated) {
                            console.log(`[Arena Matchmaking] User ${userId} đã trong phòng vừa tạo ${existingRoomId}. Bỏ qua find_match lặp lại.`);
                            return;
                        }
                        // Phòng cũ chưa chơi nhưng bị kẹt ở bước ready quá 18s -> Hủy phòng cũ
                        console.log(`[Arena Matchmaking] Phòng cũ ${existingRoomId} chưa chơi bị kẹt. Tự động hủy.`);
                        await cancelUnreadyMatch(io, existingRoomId, userId);
                    } else if (room['status'] === 'PLAYING' || room['status'] === 'COUNTDOWN') {
                        // Phòng đang dở dang: kiểm tra quá giờ
                        const startedAt = Number(room['started_at'] || room['createdAt'] || 0);
                        const timeLimitSec = Number(room['timeLimitSec'] || 360);
                        const isTimedOut = startedAt > 0 && (Date.now() - startedAt) > (timeLimitSec + 5) * 1000;

                        if (isTimedOut) {
                            console.log(`[Arena Matchmaking] Phòng ${existingRoomId} đã quá giờ. Tự động kết thúc.`);
                            await finishMatch(io, existingRoomId, 'TIMEOUT');
                        } else {
                            // Người dùng bấm tìm trận mới khi trận cũ còn dở dang -> Xử thua trận cũ (surrender) để giải phóng!
                            console.log(`[Arena Matchmaking] User ${userId} yêu cầu tìm trận mới khi phòng ${existingRoomId} còn mở. Xử lý đầu hàng trận cũ.`);
                            await finishMatch(io, existingRoomId, 'SURRENDER', userId);
                        }
                    }
                }

                // Kiểm tra xem đã trong hàng đợi chưa (cập nhật socket id nếu cần)
                const alreadyInQueue = await redis.get(`arena:in_queue:${userId}`);
                if (alreadyInQueue) {
                    await redis.set(`arena:in_queue:${userId}`, socket.id, 'EX', 300);
                    socket.emit('arena:searching', {
                        message: 'Đang tìm kiếm đối thủ...',
                    });
                    await tryMatchmaking(io);
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

                // Nếu đang có phòng đấu chưa vào trận (MATCHED / WAITING_READY) -> Hủy phòng giải phóng cả 2 người
                const activeRoomId = await redis.get(`arena:player:${userId}`);
                if (activeRoomId) {
                    const room = await redis.hgetall(`arena:room:${activeRoomId}`);
                    if (room && (room['status'] === 'MATCHED' || room['status'] === 'WAITING_READY')) {
                        await cancelUnreadyMatch(io, activeRoomId, userId);
                    }
                }

                socket.emit('arena:match_cancelled', {
                    message: 'Đã huỷ tìm kiếm trận đấu.',
                });
                console.log(`[Arena Matchmaking] Người chơi huỷ tìm trận: ${userId}`);
            } catch (error) {
                console.error('[Arena Matchmaking] Lỗi khi huỷ tìm trận:', error);
            }
        });

        // 3. Event: Tham gia socket room thi đấu
        socket.on('arena:join_room', ({ roomId }: { roomId: string }) => {
            if (roomId) {
                socket.join(`arena:room:${roomId}`);
            }
        });

        // 4. Event: Xác nhận sẵn sàng
        socket.on('arena:ready', async ({ roomId }: { roomId: string }) => {
            try {
                if (roomId) {
                    await handlePlayerReady(io, socket, user.id, roomId);
                }
            } catch (error) {
                console.error('[Arena Gameplay] Lỗi khi xử lý ready:', error);
            }
        });

        // 5. Event: Nộp đáp án cho 1 câu
        socket.on('arena:submit_answer', async (payload: SubmitAnswerPayload) => {
            try {
                if (payload && payload.roomId && typeof payload.questionIndex === 'number') {
                    await handleSubmitAnswer(io, socket, user.id, payload);
                }
            } catch (error) {
                console.error('[Arena Gameplay] Lỗi khi xử lý submit_answer:', error);
            }
        });

        // 6. Event: Đầu hàng
        socket.on('arena:surrender', async ({ roomId }: { roomId: string }) => {
            try {
                if (roomId) {
                    await handleSurrender(io, socket, user.id, roomId);
                }
            } catch (error) {
                console.error('[Arena Gameplay] Lỗi khi xử lý surrender:', error);
            }
        });

        // 7. Event: Rời phòng ván đấu (về Hub hoặc chơi lại)
        socket.on('arena:leave_room', async ({ roomId }: { roomId?: string } = {}) => {
            try {
                const userId = user.id;
                await redis.del(`arena:player:${userId}`);
                if (roomId) {
                    const room = await redis.hgetall(`arena:room:${roomId}`);
                    if (room && room['roomId'] && (room['status'] === 'PLAYING' || room['status'] === 'COUNTDOWN')) {
                        await finishMatch(io, roomId, 'SURRENDER', userId);
                    } else if (room && (room['status'] === 'MATCHED' || room['status'] === 'WAITING_READY')) {
                        await cancelUnreadyMatch(io, roomId, userId);
                    }
                }
            } catch (err) {
                console.error('[Arena Socket] Lỗi khi xử lý leave_room:', err);
            }
        });

        // 8. Event: Ngắt kết nối
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

                // Xử lý ván đấu nếu ngắt kết nối khi đang trong trận
                const activeRoomId = await redis.get(`arena:player:${user.id}`);
                if (activeRoomId) {
                    const room = await redis.hgetall(`arena:room:${activeRoomId}`);
                    if (!room || !room['roomId'] || room['status'] === 'FINISHED' || room['status'] === 'CANCELLED') {
                        await redis.del(`arena:player:${user.id}`);
                    } else if (room['status'] === 'MATCHED' || room['status'] === 'WAITING_READY') {
                        // Tắt tab khi đang ở màn hình chờ Ready -> Hủy phòng, thông báo đối thủ, giải phóng cả 2!
                        await cancelUnreadyMatch(io, activeRoomId, user.id);
                    } else if (room['status'] === 'PLAYING' || room['status'] === 'COUNTDOWN') {
                        const opponentId = user.id === room['player1Id'] ? room['player2Id'] : room['player1Id'];
                        if (opponentId) {
                            io.to(`user:${opponentId}`).emit('arena:opponent_disconnected', {
                                opponentId: user.id,
                                message: 'Đối thủ đã ngắt kết nối.',
                            });
                        }
                        // Xử lý kết thúc ván đấu coi như người ngắt kết nối đầu hàng
                        console.log(`[Arena Gameplay] Người chơi ${user.id} ngắt kết nối giữa ván đấu ${activeRoomId}. Xử thua.`);
                        await finishMatch(io, activeRoomId, 'SURRENDER', user.id);
                    }
                }
            } catch (err) {
                console.error('[Arena Socket] Lỗi khi dọn dẹp disconnect:', err);
            }
        });
    });
}
