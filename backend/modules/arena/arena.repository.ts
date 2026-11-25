import { pool } from '../../config/mysql';
import redis from '../../config/redis';
import {
    ArenaRank,
    RANK_THRESHOLDS,
    getRankOrder,
} from './arena-rank.utils';
import { ensureMatchRankColumns } from './arena-match.repository';
import { getUserTier, getTierLimit, getVNDateKey, Tier } from '../../utils/tierLimits';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface UserArenaProfileResult {
    user: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
        coverUrl: string | null;
        role?: string;
        tier?: Tier;
        level: number;
        exp: number;
        coinBalance: number;
        diamondBalance: number;
    };
    arena: {
        rank: ArenaRank;
        highestRank: ArenaRank;
        rankPoint: number;
        leaderboardPoint: number;
        nextRankThreshold: number | null;
        progressPercent: number;
        currentWinStreak: number;
        longestWinStreak: number;
        totalWins: number;
        totalLosses: number;
        totalDraws: number;
        totalMatches: number;
        winRate: number;
        rankOrder: number;
    };
    dailyQuota?: {
        tier: 'FREE' | 'STARTER' | 'PRO' | 'ELITE';
        rankMatches: {
            used: number;
            limit: number;
            remaining: number;
        };
        doubleRewards: {
            used: number;
            limit: number;
            remaining: number;
        };
    };
    recentMatches: Array<{
        id: string;
        startedAt: string;
        endedAt: string | null;
        topic: string;
        rankSnapshot: ArenaRank;
        result: 'WIN' | 'LOSS' | 'DRAW';
        myPointsChange: number;
        myCorrect: number;
        totalQuestions: number;
        timeLimitSec: number;
        opponent: {
            id: string;
            fullName: string;
            avatarUrl: string | null;
            rank: ArenaRank;
        };
    }>;
}

export interface MatchHistoryItem {
    id: string;
    startedAt: string;
    endedAt: string | null;
    topic: string;
    rankSnapshot: ArenaRank;
    myRank?: ArenaRank;
    matchType: 'RANK' | 'NORMAL' | 'FRIENDLY';
    totalQuestions: number;
    timeLimitSec: number;
    myResult: 'WIN' | 'LOSS' | 'DRAW';
    myCorrect: number;
    myTimeMs: number;
    myPointsChange: number;
    opponent: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
        rank: ArenaRank;
        correct: number;
        timeMs: number;
        pointsChange: number;
    };
}

export interface MatchDetailResult {
    id: string;
    startedAt: string;
    endedAt: string | null;
    topic: string;
    rankSnapshot: ArenaRank;
    totalQuestions: number;
    timeLimitSec: number;
    result: string;
    winnerId: string | null;
    myResult: 'WIN' | 'LOSS' | 'DRAW';
    myStats: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
        rank: ArenaRank;
        correct: number;
        timeMs: number;
        pointsChange: number;
    };
    opponentStats: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
        rank: ArenaRank;
        correct: number;
        timeMs: number;
        pointsChange: number;
    };
    words: Array<{
        orderIndex: number;
        wordId: string;
        word: string;
        meaning: string;
        topic: string;
        level: string;
        wordType: string;
        example: string | null;
        myAnswer: string | null;
        myCorrect: boolean;
        myTimeMs: number;
        opponentAnswer: string | null;
        opponentCorrect: boolean;
        opponentTimeMs: number;
    }>;
}

export interface LeaderboardItem {
    rankPosition: number;
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    tier?: Tier;
    arenaRank: ArenaRank;
    arenaHighestRank: ArenaRank;
    leaderboardPoint: number;
    rankPoint: number;
    currentWinStreak: number;
    longestWinStreak: number;
    totalWins: number;
    totalLosses: number;
    totalDraws: number;
    totalMatches: number;
    winRate: number;
}

// ─── Helper: Kiểm tra cột arena_highest_rank ─────────────────────────────────
let hasHighestColCache: boolean | null = null;
async function checkHighestCol(): Promise<boolean> {
    if (hasHighestColCache !== null) return hasHighestColCache;
    try {
        const [cols] = await pool.execute(
            `SHOW COLUMNS FROM wallets LIKE 'arena_highest_rank'`
        );
        hasHighestColCache = Array.isArray(cols) && cols.length > 0;
    } catch {
        hasHighestColCache = false;
    }
    return hasHighestColCache;
}

// ─── 1. Lấy thông tin Profile Arena của người chơi ───────────────────────────

export async function getUserArenaProfile(userId: string): Promise<UserArenaProfileResult | null> {
    const hasHighest = await checkHighestCol();

    const walletQuery = hasHighest
        ? `SELECT u.id, u.full_name, u.avatar_url, u.cover_url, u.role,
                  COALESCE(w.arena_rank, 'BRONZE') as arena_rank,
                  COALESCE(w.arena_highest_rank, w.arena_rank, 'BRONZE') as arena_highest_rank,
                  COALESCE(w.rank_point, 0) as rank_point,
                  COALESCE(w.leaderboard_point, 0) as leaderboard_point,
                  COALESCE(w.arena_current_win_streak, 0) as arena_current_win_streak,
                  COALESCE(w.arena_longest_win_streak, 0) as arena_longest_win_streak,
                  COALESCE(w.arena_total_wins, 0) as arena_total_wins,
                  COALESCE(w.arena_total_losses, 0) as arena_total_losses,
                  COALESCE(w.arena_total_draws, 0) as arena_total_draws,
                  COALESCE(w.arena_total_matches, 0) as arena_total_matches,
                  COALESCE(w.coin_balance, 0) as coin_balance,
                  COALESCE(w.diamond_balance, 0) as diamond_balance,
                  COALESCE(w.exp, 0) as exp,
                  COALESCE(w.level, 1) as level
           FROM users u
           LEFT JOIN wallets w ON u.id = w.user_id
           WHERE u.id = ?
           LIMIT 1`
        : `SELECT u.id, u.full_name, u.avatar_url, u.cover_url, u.role,
                  COALESCE(w.arena_rank, 'BRONZE') as arena_rank,
                  COALESCE(w.arena_rank, 'BRONZE') as arena_highest_rank,
                  COALESCE(w.rank_point, 0) as rank_point,
                  COALESCE(w.leaderboard_point, 0) as leaderboard_point,
                  COALESCE(w.arena_current_win_streak, 0) as arena_current_win_streak,
                  COALESCE(w.arena_longest_win_streak, 0) as arena_longest_win_streak,
                  COALESCE(w.arena_total_wins, 0) as arena_total_wins,
                  COALESCE(w.arena_total_losses, 0) as arena_total_losses,
                  COALESCE(w.arena_total_draws, 0) as arena_total_draws,
                  COALESCE(w.arena_total_matches, 0) as arena_total_matches,
                  COALESCE(w.coin_balance, 0) as coin_balance,
                  COALESCE(w.diamond_balance, 0) as diamond_balance,
                  COALESCE(w.exp, 0) as exp,
                  COALESCE(w.level, 1) as level
           FROM users u
           LEFT JOIN wallets w ON u.id = w.user_id
           WHERE u.id = ?
           LIMIT 1`;

    const [rows] = await pool.execute(walletQuery, [userId]);
    const userRow = (rows as any[])[0];

    if (!userRow) return null;

    const rank = (userRow.arena_rank || 'BRONZE') as ArenaRank;
    const highestRank = (userRow.arena_highest_rank || rank) as ArenaRank;
    const rankPoint = Number(userRow.rank_point) || 0;
    const leaderboardPoint = Number(userRow.leaderboard_point) || 0;
    const currentWinStreak = Number(userRow.arena_current_win_streak) || 0;
    const longestWinStreak = Number(userRow.arena_longest_win_streak) || 0;
    const totalWins = Number(userRow.arena_total_wins) || 0;
    const totalLosses = Number(userRow.arena_total_losses) || 0;
    const totalDraws = Number(userRow.arena_total_draws) || 0;
    const totalMatches = Number(userRow.arena_total_matches) || 0;
    const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

    const rawThreshold = RANK_THRESHOLDS[rank];
    const nextRankThreshold = rawThreshold === Infinity ? null : (rawThreshold ?? 200);
    const progressPercent =
        rawThreshold === Infinity
            ? 100
            : Math.min(100, Math.max(0, Math.round((rankPoint / (rawThreshold || 200)) * 100)));

    // 5 ván đấu gần nhất
    const [recentRows] = await pool.execute(
        `SELECT m.id, m.player1_id, m.player2_id, m.topic, m.rank_snapshot,
                m.p1_rank as match_p1_rank, m.p2_rank as match_p2_rank,
                m.total_questions, m.time_limit_sec,
                m.p1_correct, m.p1_time_used_ms,
                m.p2_correct, m.p2_time_used_ms,
                m.winner_id, m.result,
                m.p1_points_change, m.p2_points_change,
                m.started_at, m.ended_at,
                u1.full_name as p1_name, u1.avatar_url as p1_avatar,
                u2.full_name as p2_name, u2.avatar_url as p2_avatar,
                w1.arena_rank as current_p1_rank, w2.arena_rank as current_p2_rank
         FROM arena_matches m
         JOIN users u1 ON m.player1_id = u1.id
         JOIN users u2 ON m.player2_id = u2.id
         LEFT JOIN wallets w1 ON m.player1_id = w1.user_id
         LEFT JOIN wallets w2 ON m.player2_id = w2.user_id
         WHERE m.player1_id = ? OR m.player2_id = ?
         ORDER BY m.started_at DESC
         LIMIT 5`,
        [userId, userId]
    );

    const recentMatches = (recentRows as any[]).map((m) => {
        const isP1 = m.player1_id === userId;
        const myResult: 'WIN' | 'LOSS' | 'DRAW' = isP1
            ? (m.result === 'P1_WIN' ? 'WIN' : m.result === 'DRAW' ? 'DRAW' : 'LOSS')
            : (m.result === 'P2_WIN' ? 'WIN' : m.result === 'DRAW' ? 'DRAW' : 'LOSS');

        const myRank = ((isP1
            ? (m.match_p1_rank || m.current_p1_rank || m.rank_snapshot)
            : (m.match_p2_rank || m.current_p2_rank || m.rank_snapshot)) as ArenaRank) || 'BRONZE';

        const opponentRank = ((isP1
            ? (m.match_p2_rank || m.current_p2_rank || m.rank_snapshot)
            : (m.match_p1_rank || m.current_p1_rank || m.rank_snapshot)) as ArenaRank) || 'BRONZE';

        return {
            id: m.id,
            startedAt: m.started_at,
            endedAt: m.ended_at,
            topic: m.topic,
            rankSnapshot: myRank,
            myRank,
            result: myResult,
            myPointsChange: Number(isP1 ? m.p1_points_change : m.p2_points_change) || 0,
            myCorrect: Number(isP1 ? m.p1_correct : m.p2_correct) || 0,
            totalQuestions: Number(m.total_questions) || 25,
            timeLimitSec: Number(m.time_limit_sec) || 360,
            opponent: {
                id: isP1 ? m.player2_id : m.player1_id,
                fullName: isP1 ? m.p2_name : m.p1_name,
                avatarUrl: isP1 ? m.p2_avatar : m.p1_avatar,
                rank: opponentRank,
            },
        };
    });

    // Lấy thông tin hạn ngạch đấu Rank và đặc quyền x2 hàng ngày từ Redis & tierLimits
    const userTier = await getUserTier(userId);
    const todayKey = getVNDateKey();
    const maxRankMatches = getTierLimit('arenaDailyRankMatches', userTier);
    const maxDoubleMatches = getTierLimit('arenaDailyDoubleRewardMatches', userTier);

    let playedRankMatches = 0;
    let usedDoubleMatches = 0;

    try {
        const [dailyRankCount, dailyDoubleCount] = await Promise.all([
            redis.get(`arena:daily_rank:${userId}:${todayKey}`),
            redis.get(`arena:daily_x2:${userId}:${todayKey}`),
        ]);
        playedRankMatches = Number(dailyRankCount) || 0;
        usedDoubleMatches = Number(dailyDoubleCount) || 0;
    } catch (redisErr) {
        console.warn('[Arena] Không thể lấy quota hàng ngày từ Redis:', redisErr);
    }

    const remainingRankMatches = maxRankMatches === -1 ? -1 : Math.max(0, maxRankMatches - playedRankMatches);
    const remainingDoubleMatches = Math.max(0, maxDoubleMatches - usedDoubleMatches);

    return {
        user: {
            id: userRow.id,
            fullName: userRow.full_name,
            avatarUrl: userRow.avatar_url,
            coverUrl: userRow.cover_url,
            role: userRow.role || 'USER',
            tier: userTier,
            level: Number(userRow.level) || 1,
            exp: Number(userRow.exp) || 0,
            coinBalance: Number(userRow.coin_balance) || 0,
            diamondBalance: Number(userRow.diamond_balance) || 0,
        },
        arena: {
            rank,
            highestRank,
            rankPoint,
            leaderboardPoint,
            nextRankThreshold,
            progressPercent,
            currentWinStreak,
            longestWinStreak,
            totalWins,
            totalLosses,
            totalDraws,
            totalMatches,
            winRate,
            rankOrder: getRankOrder(rank),
        },
        dailyQuota: {
            tier: userTier,
            rankMatches: {
                used: playedRankMatches,
                limit: maxRankMatches,
                remaining: remainingRankMatches,
            },
            doubleRewards: {
                used: usedDoubleMatches,
                limit: maxDoubleMatches,
                remaining: remainingDoubleMatches,
            },
        },
        recentMatches,
    };
}

// ─── 2. Dọn dẹp & Lấy danh sách lịch sử trận đấu (Phân trang + Bộ lọc) ──────────

/**
 * Tối ưu hóa Database: Chỉ lưu tối đa 16 trận đấu gần nhất cho mỗi người chơi (vừa đủ 2 trang lịch sử).
 * Khi người chơi vượt quá 16 trận, hệ thống sẽ tự động xóa các trận đấu cũ hơn cùng với chi tiết 25 câu hỏi (ON DELETE CASCADE).
 */
export async function pruneOldMatchesForUser(userId: string): Promise<number> {
    if (!userId || userId.startsWith('bot-')) return 0;

    try {
        // Lấy danh sách ID các ván đấu vượt quá 16 ván gần nhất của người chơi này
        const [rows] = await pool.execute(
            `SELECT id FROM arena_matches
             WHERE player1_id = ? OR player2_id = ?
             ORDER BY started_at DESC, id DESC
             LIMIT 500 OFFSET 16`,
            [userId, userId]
        );

        const oldMatches = rows as { id: string }[];
        if (!oldMatches || oldMatches.length === 0) {
            return 0;
        }

        const idsToDelete = oldMatches.map((m) => m.id);
        const placeholders = idsToDelete.map(() => '?').join(', ');

        await pool.execute(
            `DELETE FROM arena_matches WHERE id IN (${placeholders})`,
            idsToDelete
        );

        console.log(`[Arena Retention] Đã xóa ${idsToDelete.length} trận đấu cũ vượt quá 16 trận của user ${userId}`);
        return idsToDelete.length;
    } catch (error) {
        console.error(`[Arena Retention] Lỗi khi dọn dẹp trận đấu cũ của user ${userId}:`, error);
        return 0;
    }
}

export async function getUserMatches(
    userId: string,
    options: { page?: number; limit?: number; filter?: string; mode?: string }
): Promise<{
    matches: MatchHistoryItem[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
}> {
    // Tự động dọn dẹp nếu người chơi có nhiều hơn 16 trận đấu trong DB
    await pruneOldMatchesForUser(userId);

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 8));
    const offset = (page - 1) * limit;
    const filter = (options.filter || 'all').toLowerCase();
    const mode = (options.mode || 'all').toUpperCase();

    let whereClause = '(m.player1_id = ? OR m.player2_id = ?)';
    const queryParams: any[] = [userId, userId];

    if (filter === 'win') {
        whereClause = '((m.player1_id = ? AND m.result = "P1_WIN") OR (m.player2_id = ? AND m.result = "P2_WIN"))';
    } else if (filter === 'loss') {
        whereClause = '((m.player1_id = ? AND m.result = "P2_WIN") OR (m.player2_id = ? AND m.result = "P1_WIN"))';
    } else if (filter === 'draw') {
        whereClause = '((m.player1_id = ? OR m.player2_id = ?) AND m.result = "DRAW")';
    }

    const upperMode = mode ? String(mode).toUpperCase().trim() : 'ALL';
    if (upperMode !== 'ALL' && ['RANK', 'NORMAL', 'FRIENDLY'].includes(upperMode)) {
        whereClause += ' AND m.match_type = ?';
        queryParams.push(upperMode);
    }

    // Đếm tổng số ván đấu phù hợp (giới hạn tối đa 16 trận = 2 trang)
    const [countRows] = await pool.execute(
        `SELECT COUNT(*) as total FROM arena_matches m WHERE ${whereClause}`,
        queryParams
    );
    const rawTotal = Number((countRows as any[])[0]?.total) || 0;
    const totalItems = Math.min(rawTotal, 16);
    const totalPages = Math.min(2, Math.ceil(totalItems / limit) || 1);

    // Lấy dữ liệu phân trang (đảm bảo không vượt quá 16 trận)
    await ensureMatchRankColumns(pool);
    const safeOffset = Math.min(offset, 16);
    const [rows] = await pool.execute(
        `SELECT m.id, m.player1_id, m.player2_id, m.topic, m.rank_snapshot, m.match_type,
                m.p1_rank as match_p1_rank, m.p2_rank as match_p2_rank,
                m.total_questions, m.time_limit_sec,
                m.p1_correct, m.p1_time_used_ms,
                m.p2_correct, m.p2_time_used_ms,
                m.winner_id, m.result,
                m.p1_points_change, m.p2_points_change,
                m.started_at, m.ended_at,
                u1.full_name as p1_name, u1.avatar_url as p1_avatar,
                u2.full_name as p2_name, u2.avatar_url as p2_avatar,
                w1.arena_rank as current_p1_rank, w2.arena_rank as current_p2_rank
         FROM arena_matches m
         JOIN users u1 ON m.player1_id = u1.id
         JOIN users u2 ON m.player2_id = u2.id
         LEFT JOIN wallets w1 ON m.player1_id = w1.user_id
         LEFT JOIN wallets w2 ON m.player2_id = w2.user_id
         WHERE ${whereClause}
         ORDER BY m.started_at DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, String(limit), String(safeOffset)]
    );

    const matches: MatchHistoryItem[] = (rows as any[]).map((m) => {
        const isP1 = m.player1_id === userId;
        const myResult: 'WIN' | 'LOSS' | 'DRAW' = isP1
            ? (m.result === 'P1_WIN' ? 'WIN' : m.result === 'DRAW' ? 'DRAW' : 'LOSS')
            : (m.result === 'P2_WIN' ? 'WIN' : m.result === 'DRAW' ? 'DRAW' : 'LOSS');

        // Snapshot rank của bản thân lúc đấu trận này: ưu tiên snapshot match_p1/p2_rank
        const myRank = ((isP1
            ? (m.match_p1_rank || m.current_p1_rank || m.rank_snapshot)
            : (m.match_p2_rank || m.current_p2_rank || m.rank_snapshot)) as ArenaRank) || 'BRONZE';

        // Snapshot rank của đối thủ lúc đấu trận này: ưu tiên snapshot match_p2/p1_rank
        const opponentRank = ((isP1
            ? (m.match_p2_rank || m.current_p2_rank || m.rank_snapshot)
            : (m.match_p1_rank || m.current_p1_rank || m.rank_snapshot)) as ArenaRank) || 'BRONZE';

        return {
            id: m.id,
            startedAt: m.started_at,
            endedAt: m.ended_at,
            topic: m.topic,
            rankSnapshot: myRank,
            myRank,
            matchType: (m.match_type as 'RANK' | 'NORMAL' | 'FRIENDLY') || 'RANK',
            totalQuestions: Number(m.total_questions) || 25,
            timeLimitSec: Number(m.time_limit_sec) || 360,
            myResult,
            myCorrect: Number(isP1 ? m.p1_correct : m.p2_correct) || 0,
            myTimeMs: Number(isP1 ? m.p1_time_used_ms : m.p2_time_used_ms) || 0,
            myPointsChange: Number(isP1 ? m.p1_points_change : m.p2_points_change) || 0,
            opponent: {
                id: isP1 ? m.player2_id : m.player1_id,
                fullName: isP1 ? m.p2_name : m.p1_name,
                avatarUrl: isP1 ? m.p2_avatar : m.p1_avatar,
                rank: opponentRank,
                correct: Number(isP1 ? m.p2_correct : m.p1_correct) || 0,
                timeMs: Number(isP1 ? m.p2_time_used_ms : m.p1_time_used_ms) || 0,
                pointsChange: Number(isP1 ? m.p2_points_change : m.p1_points_change) || 0,
            },
        };
    });

    return {
        matches,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages,
        },
    };
}

// ─── 3. Lấy chi tiết ván đấu kèm 25 câu hỏi (xanh/đỏ) ────────────────────────

export async function getMatchDetail(
    matchId: string,
    currentUserId: string
): Promise<MatchDetailResult | null> {
    const [matchRows] = await pool.execute(
        `SELECT m.id, m.player1_id, m.player2_id, m.topic, m.rank_snapshot,
                m.p1_rank as match_p1_rank, m.p2_rank as match_p2_rank,
                m.total_questions, m.time_limit_sec,
                m.p1_correct, m.p1_time_used_ms,
                m.p2_correct, m.p2_time_used_ms,
                m.winner_id, m.result,
                m.p1_points_change, m.p2_points_change,
                m.started_at, m.ended_at,
                u1.full_name as p1_name, u1.avatar_url as p1_avatar,
                u2.full_name as p2_name, u2.avatar_url as p2_avatar,
                w1.arena_rank as current_p1_rank, w2.arena_rank as current_p2_rank
         FROM arena_matches m
         JOIN users u1 ON m.player1_id = u1.id
         JOIN users u2 ON m.player2_id = u2.id
         LEFT JOIN wallets w1 ON m.player1_id = w1.user_id
         LEFT JOIN wallets w2 ON m.player2_id = w2.user_id
         WHERE m.id = ?
         LIMIT 1`,
        [matchId]
    );

    const m = (matchRows as any[])[0];
    if (!m) return null;

    const isP1 = m.player1_id === currentUserId;
    const myResult: 'WIN' | 'LOSS' | 'DRAW' = isP1
        ? (m.result === 'P1_WIN' ? 'WIN' : m.result === 'DRAW' ? 'DRAW' : 'LOSS')
        : (m.result === 'P2_WIN' ? 'WIN' : m.result === 'DRAW' ? 'DRAW' : 'LOSS');

    const myRank = ((isP1
        ? (m.match_p1_rank || m.current_p1_rank || m.rank_snapshot)
        : (m.match_p2_rank || m.current_p2_rank || m.rank_snapshot)) as ArenaRank) || 'BRONZE';

    const opponentRank = ((isP1
        ? (m.match_p2_rank || m.current_p2_rank || m.rank_snapshot)
        : (m.match_p1_rank || m.current_p1_rank || m.rank_snapshot)) as ArenaRank) || 'BRONZE';

    // Lấy chi tiết 25 câu hỏi
    const [wordRows] = await pool.execute(
        `SELECT mw.id, mw.order_index,
                mw.p1_answer, mw.p1_correct, mw.p1_time_ms,
                mw.p2_answer, mw.p2_correct, mw.p2_time_ms,
                w.id as word_id, w.word, w.meaning, w.topic, w.level, w.word_type, w.example
         FROM arena_match_words mw
         JOIN arena_words w ON mw.word_id = w.id
         WHERE mw.match_id = ?
         ORDER BY mw.order_index ASC`,
        [matchId]
    );

    const words = (wordRows as any[]).map((w) => ({
        orderIndex: Number(w.order_index),
        wordId: w.word_id,
        word: w.word,
        meaning: w.meaning,
        topic: w.topic,
        level: w.level,
        wordType: w.word_type,
        example: w.example,
        myAnswer: isP1 ? w.p1_answer : w.p2_answer,
        myCorrect: Boolean(isP1 ? w.p1_correct : w.p2_correct),
        myTimeMs: Number(isP1 ? w.p1_time_ms : w.p2_time_ms) || 0,
        opponentAnswer: isP1 ? w.p2_answer : w.p1_answer,
        opponentCorrect: Boolean(isP1 ? w.p2_correct : w.p1_correct),
        opponentTimeMs: Number(isP1 ? w.p2_time_ms : w.p1_time_ms) || 0,
    }));

    return {
        id: m.id,
        startedAt: m.started_at,
        endedAt: m.ended_at,
        topic: m.topic,
        rankSnapshot: myRank,
        totalQuestions: Number(m.total_questions) || 25,
        timeLimitSec: Number(m.time_limit_sec) || 360,
        result: m.result,
        winnerId: m.winner_id,
        myResult,
        myStats: {
            id: isP1 ? m.player1_id : m.player2_id,
            fullName: isP1 ? m.p1_name : m.p2_name,
            avatarUrl: isP1 ? m.p1_avatar : m.p2_avatar,
            rank: myRank,
            correct: Number(isP1 ? m.p1_correct : m.p2_correct) || 0,
            timeMs: Number(isP1 ? m.p1_time_used_ms : m.p2_time_used_ms) || 0,
            pointsChange: Number(isP1 ? m.p1_points_change : m.p2_points_change) || 0,
        },
        opponentStats: {
            id: isP1 ? m.player2_id : m.player1_id,
            fullName: isP1 ? m.p2_name : m.p1_name,
            avatarUrl: isP1 ? m.p2_avatar : m.p1_avatar,
            rank: opponentRank,
            correct: Number(isP1 ? m.p2_correct : m.p1_correct) || 0,
            timeMs: Number(isP1 ? m.p2_time_used_ms : m.p1_time_used_ms) || 0,
            pointsChange: Number(isP1 ? m.p2_points_change : m.p1_points_change) || 0,
        },
        words,
    };
}

// ─── 4. Lấy Bảng Xếp Hạng (Leaderboard) ───────────────────────────────────────

export async function getLeaderboard(options: {
    page?: number;
    limit?: number;
    currentUserId?: string | undefined;
}): Promise<{
    players: LeaderboardItem[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
    myRank: {
        rankPosition: number | null;
        leaderboardPoint: number;
        rankPoint: number;
        arenaRank: ArenaRank;
        totalWins: number;
        winRate: number;
    } | null;
}> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
    const offset = (page - 1) * limit;

    const hasHighest = await checkHighestCol();

    // 1. Đếm tổng số người chơi
    const [countRows] = await pool.execute(
        `SELECT COUNT(*) as total
         FROM wallets w
         JOIN users u ON w.user_id = u.id
         WHERE u.status = 'ACTIVE'`
    );
    const totalItems = Number((countRows as any[])[0]?.total) || 0;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    // 2. Lấy top người chơi
    const listQuery = hasHighest
        ? `SELECT u.id as user_id, u.full_name, u.avatar_url,
                  CASE WHEN s.status = 'ACTIVE' AND s.expires_at > NOW() THEN s.tier ELSE 'FREE' END as tier,
                  COALESCE(w.arena_rank, 'BRONZE') as arena_rank,
                  COALESCE(w.arena_highest_rank, w.arena_rank, 'BRONZE') as arena_highest_rank,
                  COALESCE(w.rank_point, 0) as rank_point,
                  COALESCE(w.leaderboard_point, 0) as leaderboard_point,
                  COALESCE(w.arena_current_win_streak, 0) as arena_current_win_streak,
                  COALESCE(w.arena_longest_win_streak, 0) as arena_longest_win_streak,
                  COALESCE(w.arena_total_wins, 0) as arena_total_wins,
                  COALESCE(w.arena_total_losses, 0) as arena_total_losses,
                  COALESCE(w.arena_total_draws, 0) as arena_total_draws,
                  COALESCE(w.arena_total_matches, 0) as arena_total_matches
           FROM wallets w
           JOIN users u ON w.user_id = u.id
           LEFT JOIN user_subscription s ON s.user_id = u.id
           WHERE u.status = 'ACTIVE'
           ORDER BY w.leaderboard_point DESC, w.rank_point DESC, w.arena_total_wins DESC
           LIMIT ? OFFSET ?`
        : `SELECT u.id as user_id, u.full_name, u.avatar_url,
                  CASE WHEN s.status = 'ACTIVE' AND s.expires_at > NOW() THEN s.tier ELSE 'FREE' END as tier,
                  COALESCE(w.arena_rank, 'BRONZE') as arena_rank,
                  COALESCE(w.arena_rank, 'BRONZE') as arena_highest_rank,
                  COALESCE(w.rank_point, 0) as rank_point,
                  COALESCE(w.leaderboard_point, 0) as leaderboard_point,
                  COALESCE(w.arena_current_win_streak, 0) as arena_current_win_streak,
                  COALESCE(w.arena_longest_win_streak, 0) as arena_longest_win_streak,
                  COALESCE(w.arena_total_wins, 0) as arena_total_wins,
                  COALESCE(w.arena_total_losses, 0) as arena_total_losses,
                  COALESCE(w.arena_total_draws, 0) as arena_total_draws,
                  COALESCE(w.arena_total_matches, 0) as arena_total_matches
           FROM wallets w
           JOIN users u ON w.user_id = u.id
           LEFT JOIN user_subscription s ON s.user_id = u.id
           WHERE u.status = 'ACTIVE'
           ORDER BY w.leaderboard_point DESC, w.rank_point DESC, w.arena_total_wins DESC
           LIMIT ? OFFSET ?`;

    const [rows] = await pool.execute(listQuery, [String(limit), String(offset)]);

    const players: LeaderboardItem[] = (rows as any[]).map((r, idx) => {
        const totalMatches = Number(r.arena_total_matches) || 0;
        const totalWins = Number(r.arena_total_wins) || 0;
        const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

        return {
            rankPosition: offset + idx + 1,
            userId: r.user_id,
            fullName: r.full_name,
            avatarUrl: r.avatar_url,
            tier: (r.tier || 'FREE') as Tier,
            arenaRank: (r.arena_rank || 'BRONZE') as ArenaRank,
            arenaHighestRank: (r.arena_highest_rank || r.arena_rank || 'BRONZE') as ArenaRank,
            leaderboardPoint: Number(r.leaderboard_point) || 0,
            rankPoint: Number(r.rank_point) || 0,
            currentWinStreak: Number(r.arena_current_win_streak) || 0,
            longestWinStreak: Number(r.arena_longest_win_streak) || 0,
            totalWins,
            totalLosses: Number(r.arena_total_losses) || 0,
            totalDraws: Number(r.arena_total_draws) || 0,
            totalMatches,
            winRate,
        };
    });

    // 3. Tính thứ hạng của chính người dùng hiện tại (nếu đã đăng nhập)
    let myRank: any = null;
    if (options.currentUserId) {
        const [myWalletRows] = await pool.execute(
            `SELECT arena_rank, rank_point, leaderboard_point, arena_total_wins, arena_total_matches
             FROM wallets
             WHERE user_id = ?
             LIMIT 1`,
            [options.currentUserId]
        );
        const myRow = (myWalletRows as any[])[0];

        if (myRow) {
            const myLp = Number(myRow.leaderboard_point) || 0;
            const myRp = Number(myRow.rank_point) || 0;
            const myWins = Number(myRow.arena_total_wins) || 0;
            const myMatches = Number(myRow.arena_total_matches) || 0;

            const [rankAboveRows] = await pool.execute(
                `SELECT COUNT(*) as rank_above
                 FROM wallets w
                 JOIN users u ON w.user_id = u.id
                 WHERE u.status = 'ACTIVE' AND (
                     w.leaderboard_point > ?
                     OR (w.leaderboard_point = ? AND w.rank_point > ?)
                     OR (w.leaderboard_point = ? AND w.rank_point = ? AND w.arena_total_wins > ?)
                 )`,
                [myLp, myLp, myRp, myLp, myRp, myWins]
            );

            const rankAbove = Number((rankAboveRows as any[])[0]?.rank_above) || 0;

            myRank = {
                rankPosition: rankAbove + 1,
                leaderboardPoint: myLp,
                rankPoint: myRp,
                arenaRank: (myRow.arena_rank || 'BRONZE') as ArenaRank,
                totalWins: myWins,
                winRate: myMatches > 0 ? Math.round((myWins / myMatches) * 100) : 0,
            };
        }
    }

    return {
        players,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages,
        },
        myRank,
    };
}

// ─── 4. Lấy dữ liệu Biểu đồ Radar 6 Kỹ năng & Thống kê Chuyên sâu (Pro Analytics) ───
export interface PlayerRadarStatsResult {
    isLocked: boolean;
    tier: 'FREE' | 'STARTER' | 'PRO' | 'ELITE';
    radar: {
        accuracy: number;
        speed: number;
        coreVocab: number;
        advancedVocab: number | null;
        idioms: number | null;
        composure: number | null;
    };
    overview: {
        totalMatches: number;
        totalWins: number;
        totalLosses: number;
        winRate: number;
        avgTimeMs: number;
        bestStreak: number;
        currentStreak: number;
        totalWordsAnswered: number;
        totalWordsCorrect: number;
        overallAccuracy: number;
    };
    topicPerformance: {
        bestTopics: Array<{ topic: string; totalMatches: number; wins: number; winRate: number }>;
        weakTopics: Array<{ topic: string; totalMatches: number; wins: number; winRate: number }>;
        allTopics: Array<{ topic: string; totalMatches: number; wins: number; winRate: number }>;
    };
    cefrBreakdown: {
        a1_a2: { total: number; correct: number; rate: number };
        b1_b2: { total: number; correct: number; rate: number };
        c1_c2: { total: number; correct: number; rate: number };
    };
    recentForm: Array<{
        matchId: string;
        topic: string;
        result: 'WIN' | 'LOSS' | 'DRAW';
        startedAt: string;
    }>;
}

export async function getPlayerRadarStats(userId: string): Promise<PlayerRadarStatsResult> {
    const tier = await getUserTier(userId);
    const isLocked = tier === 'FREE' || tier === 'STARTER';

    // 1. Lấy thông tin ví và tổng số trận từ wallets
    const [walletRows] = await pool.execute(
        `SELECT arena_total_matches, arena_total_wins, arena_total_losses, arena_total_draws,
                arena_current_win_streak, arena_longest_win_streak
         FROM wallets
         WHERE user_id = ?
         LIMIT 1`,
        [userId]
    );
    const wallet = (walletRows as any[])[0] || {};
    const totalMatches = Number(wallet.arena_total_matches) || 0;
    const totalWins = Number(wallet.arena_total_wins) || 0;
    const totalLosses = Number(wallet.arena_total_losses) || 0;
    const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
    const bestStreak = Number(wallet.arena_longest_win_streak) || 0;
    const currentStreak = Number(wallet.arena_current_win_streak) || 0;

    // 2. Lấy tối đa 50 trận đấu gần nhất của người dùng
    const [matchRows] = await pool.execute(
        `SELECT id, player1_id, player2_id, topic, match_type, result, winner_id,
                started_at, ended_at
         FROM arena_matches
         WHERE (player1_id = ? OR player2_id = ?)
           AND result IN ('P1_WIN', 'P2_WIN', 'DRAW')
         ORDER BY started_at DESC
         LIMIT 50`,
        [userId, userId]
    );
    const matches = matchRows as any[];

    // Chuỗi phong độ 10 trận gần nhất
    const recentForm = matches.slice(0, 10).map((m) => {
        let res: 'WIN' | 'LOSS' | 'DRAW' = 'DRAW';
        if (m.result === 'DRAW') {
            res = 'DRAW';
        } else if (m.winner_id === userId) {
            res = 'WIN';
        } else {
            res = 'LOSS';
        }
        return {
            matchId: m.id,
            topic: m.topic || 'general',
            result: res,
            startedAt: m.started_at ? new Date(m.started_at).toISOString() : '',
        };
    });

    // Thống kê theo chủ đề (Topic Performance)
    const topicMap: Record<string, { total: number; wins: number }> = {};
    for (const m of matches) {
        const top = m.topic || 'general';
        if (!topicMap[top]) topicMap[top] = { total: 0, wins: 0 };
        topicMap[top].total += 1;
        if (m.winner_id === userId) {
            topicMap[top].wins += 1;
        }
    }

    const allTopics = Object.entries(topicMap).map(([topic, data]) => ({
        topic,
        totalMatches: data.total,
        wins: data.wins,
        winRate: data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0,
    })).sort((a, b) => b.winRate - a.winRate);

    const bestTopics = allTopics.filter((t) => t.totalMatches >= 2 && t.winRate >= 60).slice(0, 3);
    const weakTopics = allTopics.filter((t) => t.totalMatches >= 2 && t.winRate < 50).slice(-3);

    // Nếu chưa có trận nào hoặc user bị khóa tính năng:
    if (matches.length === 0) {
        return {
            isLocked,
            tier,
            radar: {
                accuracy: 0,
                speed: 0,
                coreVocab: 0,
                advancedVocab: null,
                idioms: null,
                composure: null,
            },
            overview: {
                totalMatches,
                totalWins,
                totalLosses,
                winRate,
                avgTimeMs: 0,
                bestStreak,
                currentStreak,
                totalWordsAnswered: 0,
                totalWordsCorrect: 0,
                overallAccuracy: 0,
            },
            topicPerformance: {
                bestTopics: [],
                weakTopics: [],
                allTopics: [],
            },
            cefrBreakdown: {
                a1_a2: { total: 0, correct: 0, rate: 0 },
                b1_b2: { total: 0, correct: 0, rate: 0 },
                c1_c2: { total: 0, correct: 0, rate: 0 },
            },
            recentForm: [],
        };
    }

    const matchIds = matches.map((m) => m.id);
    const placeholders = matchIds.map(() => '?').join(', ');

    // 3. Truy vấn toàn bộ câu hỏi và từ vựng trong 50 trận này
    const [wordRows] = await pool.execute(
        `SELECT amw.match_id, amw.order_index, amw.word_id,
                CASE WHEN am.player1_id = ? THEN amw.p1_answer ELSE amw.p2_answer END as my_answer,
                CASE WHEN am.player1_id = ? THEN amw.p1_correct ELSE amw.p2_correct END as my_correct,
                CASE WHEN am.player1_id = ? THEN amw.p1_time_ms ELSE amw.p2_time_ms END as my_time_ms,
                aw.word, aw.level, aw.word_type
         FROM arena_match_words amw
         JOIN arena_matches am ON amw.match_id = am.id
         JOIN arena_words aw ON amw.word_id = aw.id
         WHERE am.id IN (${placeholders})`,
        [userId, userId, userId, ...matchIds]
    );
    const words = wordRows as any[];

    // ─── TÍNH TOÁN CÁC ĐỈNH KỸ NĂNG THEO QUY CHUẨN KHOA HỌC ───

    // Lọc các câu mà user THỰC SỰ đã trả lời (không tính câu rỗng/đầu hàng trước đó)
    const answeredWords = words.filter((w) => w.my_answer !== null && w.my_answer !== '');
    const totalWordsAnswered = answeredWords.length;
    const totalWordsCorrect = answeredWords.filter((w) => Boolean(w.my_correct)).length;

    // Đỉnh 1: Độ chính xác (Accuracy - Thang 0 - 100)
    const accuracyScore = totalWordsAnswered > 0
        ? Math.round((totalWordsCorrect / totalWordsAnswered) * 100)
        : 0;

    // Đỉnh 2: Tốc độ phản xạ (Speed / Reflex - Thang 0 - 100)
    // Chỉ tính các câu user đã trả lời và có thời gian > 0
    const wordsWithTime = answeredWords.filter((w) => Number(w.my_time_ms) > 0);
    let avgTimeMs = 0;
    let speedScore = 0;
    if (wordsWithTime.length > 0) {
        const totalTime = wordsWithTime.reduce((sum, w) => sum + Number(w.my_time_ms), 0);
        avgTimeMs = Math.round(totalTime / wordsWithTime.length);
        // Dưới 1200ms đạt 100 điểm, mỗi 100ms chậm hơn trừ 3 điểm
        speedScore = Math.max(0, Math.min(100, Math.round(100 - ((avgTimeMs - 1200) / 100) * 3)));
    }

    // Đỉnh 3: Từ vựng cốt lõi (Core Vocab - A1, A2, B1, loại trừ idiom/collocation)
    const coreWords = answeredWords.filter(
        (w) => ['A1', 'A2', 'B1'].includes(w.level) && !['idiom', 'collocation'].includes(w.word_type)
    );
    let coreVocabScore = 0;
    if (coreWords.length > 0) {
        const coreCorrect = coreWords.filter((w) => Boolean(w.my_correct)).length;
        coreVocabScore = Math.round((coreCorrect / coreWords.length) * 100);
    }

    // Đỉnh 4: Từ vựng nâng cao (Advanced Vocab - B2, C1, C2, loại trừ idiom/collocation)
    const advWords = answeredWords.filter(
        (w) => ['B2', 'C1', 'C2'].includes(w.level) && !['idiom', 'collocation'].includes(w.word_type)
    );
    let advancedVocabScore: number | null = null;
    if (advWords.length > 0) {
        const advCorrect = advWords.filter((w) => Boolean(w.my_correct)).length;
        advancedVocabScore = Math.round((advCorrect / advWords.length) * 100);
    } // Nếu advWords.length === 0, trả về null (Chưa mở khóa ở rank thấp)

    // Đỉnh 5: Thành ngữ và Cụm từ (Idioms & Collocations)
    const idiomWords = answeredWords.filter(
        (w) => ['idiom', 'collocation'].includes(w.word_type)
    );
    let idiomsScore: number | null = null;
    if (idiomWords.length > 0) {
        const idiomCorrect = idiomWords.filter((w) => Boolean(w.my_correct)).length;
        idiomsScore = Math.round((idiomCorrect / idiomWords.length) * 100);
    } // Nếu idiomWords.length === 0, trả về null (Chưa mở khóa)

    // Đỉnh 6: Tâm lý thi đấu (Match Composure - 5 câu cuối cùng của các trận đủ điều kiện)
    // Điều kiện chặt chẽ: Chỉ xét các trận đấu mà user đã trả lời ít nhất 20/25 câu!
    const matchAnsweredCounts: Record<string, number> = {};
    for (const w of answeredWords) {
        matchAnsweredCounts[w.match_id] = (matchAnsweredCounts[w.match_id] || 0) + 1;
    }

    const eligibleMatchIds = Object.keys(matchAnsweredCounts).filter(
        (mId) => matchAnsweredCounts[mId] >= 20
    );

    let composureScore: number | null = null;
    if (eligibleMatchIds.length > 0) {
        // Lấy 5 câu hỏi cuối (order_index >= 21) của các trận hợp lệ
        const last5Words = answeredWords.filter(
            (w) => eligibleMatchIds.includes(w.match_id) && w.order_index >= 21
        );
        if (last5Words.length > 0) {
            const last5Correct = last5Words.filter((w) => Boolean(w.my_correct)).length;
            composureScore = Math.round((last5Correct / last5Words.length) * 100);
        }
    }

    // ─── PHÂN LOẠI CEFR BREAKDOWN ───
    const cefrA = answeredWords.filter((w) => ['A1', 'A2'].includes(w.level));
    const cefrB = answeredWords.filter((w) => ['B1', 'B2'].includes(w.level));
    const cefrC = answeredWords.filter((w) => ['C1', 'C2'].includes(w.level));

    const cefrBreakdown = {
        a1_a2: {
            total: cefrA.length,
            correct: cefrA.filter((w) => Boolean(w.my_correct)).length,
            rate: cefrA.length > 0 ? Math.round((cefrA.filter((w) => Boolean(w.my_correct)).length / cefrA.length) * 100) : 0,
        },
        b1_b2: {
            total: cefrB.length,
            correct: cefrB.filter((w) => Boolean(w.my_correct)).length,
            rate: cefrB.length > 0 ? Math.round((cefrB.filter((w) => Boolean(w.my_correct)).length / cefrB.length) * 100) : 0,
        },
        c1_c2: {
            total: cefrC.length,
            correct: cefrC.filter((w) => Boolean(w.my_correct)).length,
            rate: cefrC.length > 0 ? Math.round((cefrC.filter((w) => Boolean(w.my_correct)).length / cefrC.length) * 100) : 0,
        },
    };

    return {
        isLocked,
        tier,
        radar: {
            accuracy: accuracyScore,
            speed: speedScore,
            coreVocab: coreVocabScore,
            advancedVocab: advancedVocabScore,
            idioms: idiomsScore,
            composure: composureScore,
        },
        overview: {
            totalMatches,
            totalWins,
            totalLosses,
            winRate,
            avgTimeMs,
            bestStreak,
            currentStreak,
            totalWordsAnswered,
            totalWordsCorrect,
            overallAccuracy: accuracyScore,
        },
        topicPerformance: {
            bestTopics,
            weakTopics,
            allTopics,
        },
        cefrBreakdown,
        recentForm,
    };
}
