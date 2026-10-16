import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';
import { ArenaRank, MatchResult, RankProgressionResult } from './arena-rank.utils';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface MatchWordRecord {
    wordId: string;
    orderIndex: number;
    p1Answer: string | null;
    p1Correct: boolean;
    p1TimeMs: number;
    p2Answer: string | null;
    p2Correct: boolean;
    p2TimeMs: number;
}

export interface PlayerFinalStats {
    userId: string;
    correct: number;
    timeMs: number;
    progression: RankProgressionResult;
    winStreak: number;
}

export interface SaveMatchTransactionParams {
    matchId: string;
    player1Id: string;
    player2Id: string;
    topic: string;
    rankSnapshot: ArenaRank;
    totalQuestions: number;
    timeLimitSec: number;
    startedAt: string; // ISO hoặc SQL timestamp string
    endedAt: string;
    result: MatchResult;
    winnerId: string | null;
    p1: PlayerFinalStats;
    p2: PlayerFinalStats;
    words: MatchWordRecord[];
}

export interface UserWalletData {
    user_id: string;
    arena_rank: ArenaRank;
    rank_point: number;
    leaderboard_point: number;
    arena_current_win_streak: number;
    arena_longest_win_streak: number;
}

// ─── Lấy thông tin Wallets của 2 người chơi ──────────────────────────────────

export async function getPlayersWallets(
    player1Id: string,
    player2Id: string
): Promise<Map<string, UserWalletData>> {
    const map = new Map<string, UserWalletData>();

    const [rows] = await pool.execute(
        `SELECT user_id,
                COALESCE(arena_rank, 'BRONZE') as arena_rank,
                COALESCE(rank_point, 0) as rank_point,
                COALESCE(leaderboard_point, 0) as leaderboard_point,
                COALESCE(arena_current_win_streak, 0) as arena_current_win_streak,
                COALESCE(arena_longest_win_streak, 0) as arena_longest_win_streak
         FROM wallets
         WHERE user_id IN (?, ?)`,
        [player1Id, player2Id]
    );

    for (const row of rows as any[]) {
        map.set(row.user_id, {
            user_id: row.user_id,
            arena_rank: (row.arena_rank || 'BRONZE') as ArenaRank,
            rank_point: Number(row.rank_point) || 0,
            leaderboard_point: Number(row.leaderboard_point) || 0,
            arena_current_win_streak: Number(row.arena_current_win_streak) || 0,
            arena_longest_win_streak: Number(row.arena_longest_win_streak) || 0,
        });
    }

    return map;
}

// ─── Thực thi Transaction lưu toàn bộ dữ liệu ván đấu vào MySQL ──────────

export async function saveMatchTransaction(params: SaveMatchTransactionParams): Promise<void> {
    const {
        matchId,
        player1Id,
        player2Id,
        topic,
        rankSnapshot,
        totalQuestions,
        timeLimitSec,
        startedAt,
        endedAt,
        result,
        winnerId,
        p1,
        p2,
        words,
    } = params;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Cập nhật Wallets cho Player 1
        const p1IsWin = result === 'P1_WIN' ? 1 : 0;
        const p1IsLoss = result === 'P2_WIN' ? 1 : 0;
        const p1IsDraw = result === 'DRAW' ? 1 : 0;

        await connection.execute(
            `UPDATE wallets SET
                arena_rank = ?,
                rank_point = ?,
                leaderboard_point = ?,
                arena_current_win_streak = ?,
                arena_longest_win_streak = GREATEST(COALESCE(arena_longest_win_streak, 0), ?),
                arena_total_wins = arena_total_wins + ?,
                arena_total_losses = arena_total_losses + ?,
                arena_total_draws = arena_total_draws + ?,
                arena_total_matches = arena_total_matches + 1
             WHERE user_id = ?`,
            [
                p1.progression.newRank,
                p1.progression.newRankPoint,
                p1.progression.newLeaderboardPoint,
                p1.winStreak,
                p1.winStreak,
                p1IsWin,
                p1IsLoss,
                p1IsDraw,
                player1Id,
            ]
        );

        // 2. Cập nhật Wallets cho Player 2
        const p2IsWin = result === 'P2_WIN' ? 1 : 0;
        const p2IsLoss = result === 'P1_WIN' ? 1 : 0;
        const p2IsDraw = result === 'DRAW' ? 1 : 0;

        await connection.execute(
            `UPDATE wallets SET
                arena_rank = ?,
                rank_point = ?,
                leaderboard_point = ?,
                arena_current_win_streak = ?,
                arena_longest_win_streak = GREATEST(COALESCE(arena_longest_win_streak, 0), ?),
                arena_total_wins = arena_total_wins + ?,
                arena_total_losses = arena_total_losses + ?,
                arena_total_draws = arena_total_draws + ?,
                arena_total_matches = arena_total_matches + 1
             WHERE user_id = ?`,
            [
                p2.progression.newRank,
                p2.progression.newRankPoint,
                p2.progression.newLeaderboardPoint,
                p2.winStreak,
                p2.winStreak,
                p2IsWin,
                p2IsLoss,
                p2IsDraw,
                player2Id,
            ]
        );

        // 3. Ghi record vào arena_matches
        await connection.execute(
            `INSERT INTO arena_matches (
                id, player1_id, player2_id, topic, rank_snapshot,
                total_questions, time_limit_sec,
                p1_correct, p1_time_used_ms,
                p2_correct, p2_time_used_ms,
                winner_id, result,
                p1_points_change, p2_points_change,
                started_at, ended_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                matchId,
                player1Id,
                player2Id,
                topic || 'general',
                rankSnapshot,
                totalQuestions,
                timeLimitSec,
                p1.correct,
                p1.timeMs,
                p2.correct,
                p2.timeMs,
                winnerId,
                result,
                p1.progression.rankPointDelta,
                p2.progression.rankPointDelta,
                startedAt,
                endedAt,
            ]
        );

        // 4. Bulk insert 25 câu hỏi chi tiết vào arena_match_words
        if (words.length > 0) {
            const placeholders = words.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
            const flatValues: any[] = [];

            for (const w of words) {
                flatValues.push(
                    uuidv4(),
                    matchId,
                    w.wordId,
                    w.orderIndex,
                    w.p1Answer,
                    w.p1Correct ? 1 : 0,
                    w.p1TimeMs,
                    w.p2Answer,
                    w.p2Correct ? 1 : 0,
                    w.p2TimeMs
                );
            }

            await connection.execute(
                `INSERT INTO arena_match_words (
                    id, match_id, word_id, order_index,
                    p1_answer, p1_correct, p1_time_ms,
                    p2_answer, p2_correct, p2_time_ms
                ) VALUES ${placeholders}`,
                flatValues
            );
        }

        // Commit transaction thành công
        await connection.commit();
        console.log(`[Arena Transaction] Đã lưu thành công ván đấu ${matchId} vào MySQL!`);
    } catch (error) {
        await connection.rollback();
        console.error(`[Arena Transaction] Lỗi khi lưu ván đấu ${matchId}, đã rollback:`, error);
        throw error;
    } finally {
        connection.release();
    }
}
