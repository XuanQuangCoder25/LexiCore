import { pool } from '../../config/mysql';
import {
    ArenaRank,
    RANK_THRESHOLDS,
    getRankOrder,
} from './arena-rank.utils';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface UserArenaProfileResult {
    user: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
        coverUrl: string | null;
        role?: string;
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
                m.total_questions, m.time_limit_sec,
                m.p1_correct, m.p1_time_used_ms,
                m.p2_correct, m.p2_time_used_ms,
                m.winner_id, m.result,
                m.p1_points_change, m.p2_points_change,
                m.started_at, m.ended_at,
                u1.full_name as p1_name, u1.avatar_url as p1_avatar,
                u2.full_name as p2_name, u2.avatar_url as p2_avatar,
                w1.arena_rank as p1_rank, w2.arena_rank as p2_rank
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

        return {
            id: m.id,
            startedAt: m.started_at,
            endedAt: m.ended_at,
            topic: m.topic,
            rankSnapshot: m.rank_snapshot,
            result: myResult,
            myPointsChange: Number(isP1 ? m.p1_points_change : m.p2_points_change) || 0,
            myCorrect: Number(isP1 ? m.p1_correct : m.p2_correct) || 0,
            totalQuestions: Number(m.total_questions) || 25,
            timeLimitSec: Number(m.time_limit_sec) || 360,
            opponent: {
                id: isP1 ? m.player2_id : m.player1_id,
                fullName: isP1 ? m.p2_name : m.p1_name,
                avatarUrl: isP1 ? m.p2_avatar : m.p1_avatar,
                rank: (isP1 ? m.p2_rank : m.p1_rank) || 'BRONZE',
            },
        };
    });

    return {
        user: {
            id: userRow.id,
            fullName: userRow.full_name,
            avatarUrl: userRow.avatar_url,
            coverUrl: userRow.cover_url,
            role: userRow.role || 'USER',
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
        recentMatches,
    };
}

// ─── 2. Lấy danh sách lịch sử trận đấu (Phân trang + Bộ lọc) ──────────────────

export async function getUserMatches(
    userId: string,
    options: { page?: number; limit?: number; filter?: string }
): Promise<{
    matches: MatchHistoryItem[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
}> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 10));
    const offset = (page - 1) * limit;
    const filter = (options.filter || 'all').toLowerCase();

    let whereClause = '(m.player1_id = ? OR m.player2_id = ?)';
    const queryParams: any[] = [userId, userId];

    if (filter === 'win') {
        whereClause = '((m.player1_id = ? AND m.result = "P1_WIN") OR (m.player2_id = ? AND m.result = "P2_WIN"))';
    } else if (filter === 'loss') {
        whereClause = '((m.player1_id = ? AND m.result = "P2_WIN") OR (m.player2_id = ? AND m.result = "P1_WIN"))';
    } else if (filter === 'draw') {
        whereClause = '((m.player1_id = ? OR m.player2_id = ?) AND m.result = "DRAW")';
    }

    // Đếm tổng số ván đấu phù hợp
    const [countRows] = await pool.execute(
        `SELECT COUNT(*) as total FROM arena_matches m WHERE ${whereClause}`,
        queryParams
    );
    const totalItems = Number((countRows as any[])[0]?.total) || 0;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    // Lấy dữ liệu phân trang
    const [rows] = await pool.execute(
        `SELECT m.id, m.player1_id, m.player2_id, m.topic, m.rank_snapshot,
                m.total_questions, m.time_limit_sec,
                m.p1_correct, m.p1_time_used_ms,
                m.p2_correct, m.p2_time_used_ms,
                m.winner_id, m.result,
                m.p1_points_change, m.p2_points_change,
                m.started_at, m.ended_at,
                u1.full_name as p1_name, u1.avatar_url as p1_avatar,
                u2.full_name as p2_name, u2.avatar_url as p2_avatar,
                w1.arena_rank as p1_rank, w2.arena_rank as p2_rank
         FROM arena_matches m
         JOIN users u1 ON m.player1_id = u1.id
         JOIN users u2 ON m.player2_id = u2.id
         LEFT JOIN wallets w1 ON m.player1_id = w1.user_id
         LEFT JOIN wallets w2 ON m.player2_id = w2.user_id
         WHERE ${whereClause}
         ORDER BY m.started_at DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, String(limit), String(offset)]
    );

    const matches: MatchHistoryItem[] = (rows as any[]).map((m) => {
        const isP1 = m.player1_id === userId;
        const myResult: 'WIN' | 'LOSS' | 'DRAW' = isP1
            ? (m.result === 'P1_WIN' ? 'WIN' : m.result === 'DRAW' ? 'DRAW' : 'LOSS')
            : (m.result === 'P2_WIN' ? 'WIN' : m.result === 'DRAW' ? 'DRAW' : 'LOSS');

        return {
            id: m.id,
            startedAt: m.started_at,
            endedAt: m.ended_at,
            topic: m.topic,
            rankSnapshot: m.rank_snapshot,
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
                rank: (isP1 ? m.p2_rank : m.p1_rank) || 'BRONZE',
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
                m.total_questions, m.time_limit_sec,
                m.p1_correct, m.p1_time_used_ms,
                m.p2_correct, m.p2_time_used_ms,
                m.winner_id, m.result,
                m.p1_points_change, m.p2_points_change,
                m.started_at, m.ended_at,
                u1.full_name as p1_name, u1.avatar_url as p1_avatar,
                u2.full_name as p2_name, u2.avatar_url as p2_avatar,
                w1.arena_rank as p1_rank, w2.arena_rank as p2_rank
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
        rankSnapshot: m.rank_snapshot,
        totalQuestions: Number(m.total_questions) || 25,
        timeLimitSec: Number(m.time_limit_sec) || 360,
        result: m.result,
        winnerId: m.winner_id,
        myResult,
        myStats: {
            id: isP1 ? m.player1_id : m.player2_id,
            fullName: isP1 ? m.p1_name : m.p2_name,
            avatarUrl: isP1 ? m.p1_avatar : m.p2_avatar,
            rank: (isP1 ? m.p1_rank : m.p2_rank) || 'BRONZE',
            correct: Number(isP1 ? m.p1_correct : m.p2_correct) || 0,
            timeMs: Number(isP1 ? m.p1_time_used_ms : m.p2_time_used_ms) || 0,
            pointsChange: Number(isP1 ? m.p1_points_change : m.p2_points_change) || 0,
        },
        opponentStats: {
            id: isP1 ? m.player2_id : m.player1_id,
            fullName: isP1 ? m.p2_name : m.p1_name,
            avatarUrl: isP1 ? m.p2_avatar : m.p1_avatar,
            rank: (isP1 ? m.p2_rank : m.p1_rank) || 'BRONZE',
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
           WHERE u.status = 'ACTIVE'
           ORDER BY w.leaderboard_point DESC, w.rank_point DESC, w.arena_total_wins DESC
           LIMIT ? OFFSET ?`
        : `SELECT u.id as user_id, u.full_name, u.avatar_url,
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
    let myRank = null;
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
