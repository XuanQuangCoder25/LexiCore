import { Request, Response, NextFunction } from 'express';
import {
    getUserArenaProfile,
    getUserMatches,
    getMatchDetail,
    getLeaderboard,
} from './arena.repository';
import { RANK_TIER_DETAILS } from './arena-rank.utils';

// ─── 1. Lấy thông tin Arena Profile của người dùng đăng nhập ──────────────────
export const getMyArenaProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Yêu cầu đăng nhập.' });
            return;
        }

        const profile = await getUserArenaProfile(userId);
        if (!profile) {
            res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy hồ sơ người chơi.',
            });
            return;
        }

        res.status(200).json({
            status: 'success',
            data: profile,
        });
    } catch (error) {
        next(error);
    }
};

// ─── 2. Lấy danh sách lịch sử trận đấu (Phân trang + Lọc) ────────────────────
export const getMyArenaMatches = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Yêu cầu đăng nhập.' });
            return;
        }

        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
        const filter = (req.query.filter as string) || 'all';

        const result = await getUserMatches(userId, { page, limit, filter });

        res.status(200).json({
            status: 'success',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

// ─── 3. Lấy chi tiết ván đấu kèm 25 câu hỏi (đúng/sai/đáp án) ─────────────────
export const getArenaMatchById = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Yêu cầu đăng nhập.' });
            return;
        }

        const matchId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!matchId) {
            res.status(400).json({ status: 'error', message: 'Thiếu mã ván đấu (matchId).' });
            return;
        }

        const detail = await getMatchDetail(matchId, userId);
        if (!detail) {
            res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thông tin ván đấu này.',
            });
            return;
        }

        res.status(200).json({
            status: 'success',
            data: detail,
        });
    } catch (error) {
        next(error);
    }
};

// ─── 4. Lấy Bảng xếp hạng Arena (Leaderboard) ─────────────────────────────────
export const getArenaLeaderboardData = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
        const currentUserId = req.user?.id;

        const result = await getLeaderboard({ page, limit, currentUserId });

        res.status(200).json({
            status: 'success',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

// ─── 5. Lấy danh sách 14 cấp bậc Rank và thông số mốc điểm ────────────────────
export const getArenaRankTiers = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        res.status(200).json({
            status: 'success',
            data: RANK_TIER_DETAILS,
        });
    } catch (error) {
        next(error);
    }
};
