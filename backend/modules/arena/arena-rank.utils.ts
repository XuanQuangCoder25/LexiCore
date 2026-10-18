import {
    getRandomWordsForMatch,
    MatchWordCondition,
    WordLevel,
    WordType,
} from './arena-word.repository';

// ─── Types & Constants ────────────────────────────────────────────────────────

export type ArenaRank =
    | 'BRONZE'
    | 'SILVER'
    | 'GOLD'
    | 'PLATINUM'
    | 'PLATINUM_1'
    | 'PLATINUM_2'
    | 'SAPPHIRE_1'
    | 'SAPPHIRE_2'
    | 'EMERALD_1'
    | 'EMERALD_2'
    | 'DIAMOND_1'
    | 'DIAMOND_2'
    | 'MASTER_1'
    | 'MASTER_2'
    | 'MASTER_3';

export const TOTAL_MATCH_QUESTIONS = 25;
export const MATCH_TIME_LIMIT_SEC = 360; // 6 phút

// Thứ tự cấp bậc rank (từ thấp đến cao)
export const RANK_ORDER: Record<string, number> = {
    BRONZE: 0,
    SILVER: 1,
    GOLD: 2,
    PLATINUM: 3,
    PLATINUM_1: 3,
    PLATINUM_2: 4,
    SAPPHIRE_1: 5,
    SAPPHIRE_2: 6,
    EMERALD_1: 7,
    EMERALD_2: 8,
    DIAMOND_1: 9,
    DIAMOND_2: 10,
    MASTER_1: 11,
    MASTER_2: 12,
    MASTER_3: 13,
};

// Cấu hình điểm thưởng/phạt
export const POINTS_CONFIG = {
    WIN: { rank_point: 25, leaderboard_point: 25 },
    LOSS: { rank_point: -20, leaderboard_point: -20 },
    DRAW: { rank_point: 0, leaderboard_point: 0 },
} as const;

// Mốc điểm rank_point để thăng lên bậc kế tiếp
export const RANK_THRESHOLDS: Record<string, number> = {
    BRONZE: 200,
    SILVER: 250,
    GOLD: 300,
    PLATINUM_1: 350,
    PLATINUM_2: 400,
    SAPPHIRE_1: 450,
    SAPPHIRE_2: 500,
    EMERALD_1: 550,
    EMERALD_2: 600,
    DIAMOND_1: 700,
    DIAMOND_2: 800,
    MASTER_1: 900,
    MASTER_2: 1000,
    MASTER_3: Infinity,
};

// ─── Helpers: So sánh cấp bậc rank ─────────────────────────────────────────────

export function getRankOrder(rank?: string | null): number {
    if (!rank) return 0;
    const cleanRank = rank.toUpperCase().trim();
    return RANK_ORDER[cleanRank] ?? 0;
}

//  Tìm cấp bậc thấp hơn giữa 2 người chơi để cân bằng tỉ lệ độ khó câu hỏi
export function getLowerRank(rank1?: string | null, rank2?: string | null): ArenaRank {
    const r1 = (rank1 ? rank1.toUpperCase().trim() : 'BRONZE') as ArenaRank;
    const r2 = (rank2 ? rank2.toUpperCase().trim() : 'BRONZE') as ArenaRank;

    const order1 = getRankOrder(r1);
    const order2 = getRankOrder(r2);

    return order1 <= order2 ? r1 : r2;
}

//  Tìm cấp bậc cao hơn giữa 2 người chơi hoặc so sánh rank mới với rank cao nhất
export function getHigherRank(rank1?: string | null, rank2?: string | null): ArenaRank {
    const r1 = (rank1 ? rank1.toUpperCase().trim() : 'BRONZE') as ArenaRank;
    const r2 = (rank2 ? rank2.toUpperCase().trim() : 'BRONZE') as ArenaRank;

    const order1 = getRankOrder(r1);
    const order2 = getRankOrder(r2);

    return order1 >= order2 ? r1 : r2;
}

// ─── Cấu hình tỉ lệ từ vựng cho từng Rank (Tổng 25 câu) ────────────────────────

export const RANK_WORD_DISTRIBUTION: Record<string, MatchWordCondition[]> = {
    // BRONZE: 90% A1/A2, 10% B1/B2
    BRONZE: [
        { levels: ['A1', 'A2'], count: 22 },
        { levels: ['B1', 'B2'], count: 3 },
    ],
    // SILVER: 50% A1/A2, 50% B1/B2
    SILVER: [
        { levels: ['A1', 'A2'], count: 12 },
        { levels: ['B1', 'B2'], count: 13 },
    ],
    // GOLD: 20% A1/A2, 80% B1/B2
    GOLD: [
        { levels: ['A1', 'A2'], count: 5 },
        { levels: ['B1', 'B2'], count: 20 },
    ],
    // PLATINUM (Bậc 1): 10% A1/A2, 60% B1/B2, 30% C1
    PLATINUM_1: [
        { levels: ['A1', 'A2'], count: 2 },
        { levels: ['B1', 'B2'], count: 15 },
        { levels: ['C1'], count: 8 },
    ],
    // PLATINUM (Bậc 2)
    PLATINUM_2: [
        { levels: ['A1', 'A2'], count: 2 },
        { levels: ['B1', 'B2'], count: 15 },
        { levels: ['C1'], count: 8 },
    ],
    // SAPPHIRE 1 & 2: 40% B1/B2, 50% C1, 10% C2
    SAPPHIRE_1: [
        { levels: ['B1', 'B2'], count: 10 },
        { levels: ['C1'], count: 12 },
        { levels: ['C2'], count: 3 },
    ],
    SAPPHIRE_2: [
        { levels: ['B1', 'B2'], count: 10 },
        { levels: ['C1'], count: 12 },
        { levels: ['C2'], count: 3 },
    ],
    // EMERALD 1 & 2: 20% B1/B2, 50% C1, 20% C2, 10% idiom/collocation
    EMERALD_1: [
        { levels: ['B1', 'B2'], count: 5 },
        { levels: ['C1'], count: 12 },
        { levels: ['C2'], count: 5 },
        { levels: ['B1', 'B2', 'C1', 'C2'], types: ['idiom', 'collocation'], count: 3 },
    ],
    EMERALD_2: [
        { levels: ['B1', 'B2'], count: 5 },
        { levels: ['C1'], count: 12 },
        { levels: ['C2'], count: 5 },
        { levels: ['B1', 'B2', 'C1', 'C2'], types: ['idiom', 'collocation'], count: 3 },
    ],
    // DIAMOND 1 & 2: 10% B1/B2, 40% C1, 30% C2, 20% idiom/collocation
    DIAMOND_1: [
        { levels: ['B1', 'B2'], count: 2 },
        { levels: ['C1'], count: 10 },
        { levels: ['C2'], count: 8 },
        { levels: ['B1', 'B2', 'C1', 'C2'], types: ['idiom', 'collocation'], count: 5 },
    ],
    DIAMOND_2: [
        { levels: ['B1', 'B2'], count: 2 },
        { levels: ['C1'], count: 10 },
        { levels: ['C2'], count: 8 },
        { levels: ['B1', 'B2', 'C1', 'C2'], types: ['idiom', 'collocation'], count: 5 },
    ],
    // MASTER 1, 2 & 3: 5% B1/B2, 30% C1, 35% C2, 30% idiom/collocation
    MASTER_1: [
        { levels: ['B1', 'B2'], count: 1 },
        { levels: ['C1'], count: 7 },
        { levels: ['C2'], count: 9 },
        { levels: ['B1', 'B2', 'C1', 'C2'], types: ['idiom', 'collocation'], count: 8 },
    ],
    MASTER_2: [
        { levels: ['B1', 'B2'], count: 1 },
        { levels: ['C1'], count: 7 },
        { levels: ['C2'], count: 9 },
        { levels: ['B1', 'B2', 'C1', 'C2'], types: ['idiom', 'collocation'], count: 8 },
    ],
    MASTER_3: [
        { levels: ['B1', 'B2'], count: 1 },
        { levels: ['C1'], count: 7 },
        { levels: ['C2'], count: 9 },
        { levels: ['B1', 'B2', 'C1', 'C2'], types: ['idiom', 'collocation'], count: 8 },
    ],
};

// ─── Helpers: Gợi ý mặt nạ từ vựng (Word Mask) ───────────────────────────────

//  Tạo chuỗi gạch chân gợi ý chữ cái:
//  - Giữ nguyên chữ cái đầu tiên của mỗi từ trong cụm.
//  - Các chữ cái còn lại chuyển thành gạch dưới '_'.
export function createWordMask(phrase: string): string {
    const trimmed = phrase.trim();
    if (!trimmed) return '';

    return trimmed
        .split(/\s+/)
        .map((singleWord) => {
            if (singleWord.length <= 1) return singleWord;
            const first = singleWord[0];
            const rest = singleWord.slice(1).replace(/[a-zA-Z]/g, '_');
            return [first, ...rest.split('')].join(' ');
        })
        .join('   ');
}

// ─── Types câu hỏi trong ván đấu ──────────────────────────────────────────────

export interface ArenaMatchQuestion {
    id: string; // ID của từ trong DB
    word: string; // Đáp án tiếng Anh (lưu trên server / Redis state)
    meaning: string; // Nghĩa tiếng Việt (hiển thị cho người chơi)
    topic: string;
    level: WordLevel;
    word_type: WordType;
    mask: string; // Chuỗi gợi ý gạch chân (ví dụ "a _ _ _ _")
    example?: string;
}

export interface ArenaPublicQuestion {
    id: string;
    meaning: string;
    topic: string;
    level: WordLevel;
    word_type: WordType;
    mask: string;
    example?: string;
}

//  Chuyển đổi danh sách câu hỏi thành dạng Public (che đáp án word) để gửi cho client
export function toPublicQuestions(questions: ArenaMatchQuestion[]): ArenaPublicQuestion[] {
    return questions.map(({ id, meaning, topic, level, word_type, mask, example }) => ({
        id,
        meaning,
        topic,
        level,
        word_type,
        mask,
        ...(example ? { example } : {}),
    }));
}

//  Lấy danh sách 25 từ phân bổ theo rank snapshot cho ván đấu
export async function fetchMatchQuestions(
    lowerRank: ArenaRank,
    totalCount: number = TOTAL_MATCH_QUESTIONS
): Promise<ArenaMatchQuestion[]> {
    const rankKey = (lowerRank || 'BRONZE').toUpperCase();
    const distribution = RANK_WORD_DISTRIBUTION[rankKey] || RANK_WORD_DISTRIBUTION['BRONZE']!;

    const words = await getRandomWordsForMatch(distribution, totalCount);

    return words.map((w) => ({
        id: w.id,
        word: w.word.trim(),
        meaning: w.meaning.trim(),
        topic: w.topic,
        level: w.level,
        word_type: w.word_type,
        mask: createWordMask(w.word),
        ...(w.example ? { example: w.example } : {}),
    }));
}

// ─── Xác định kết quả ván đấu ───────────────────────────────────────────

export type MatchResult = 'P1_WIN' | 'P2_WIN' | 'DRAW';

//  Xác định kết quả ván đấu:
export function determineMatchResult(
    p1Correct: number,
    p2Correct: number,
    p1TimeMs: number,
    p2TimeMs: number,
    surrenderedUserId?: string,
    player1Id?: string,
    player2Id?: string
): MatchResult {
    // 1. Trường hợp có người chơi đầu hàng
    if (surrenderedUserId) {
        if (surrenderedUserId === player1Id) return 'P2_WIN';
        if (surrenderedUserId === player2Id) return 'P1_WIN';
    }

    // 2. So sánh số câu trả lời đúng
    if (p1Correct > p2Correct) return 'P1_WIN';
    if (p2Correct > p1Correct) return 'P2_WIN';

    // 3. So sánh thời gian làm bài
    if (p1TimeMs < p2TimeMs) return 'P1_WIN';
    if (p2TimeMs < p1TimeMs) return 'P2_WIN';

    // 4. Bằng nhau cả câu đúng và thời gian -> Hoà
    return 'DRAW';
}

// ─── Tính điểm thay đổi dựa trên kết quả ──────────────────────────────────

export interface PointsChange {
    rankPointDelta: number;
    leaderboardPointDelta: number;
}

//  Tính điểm thay đổi:
//  - Thắng: +25 RP/LP
//  - Thua: -20 RP/LP
//  - Hoà: +0 RP/LP
export function calculatePointsChange(playerResult: 'WIN' | 'LOSS' | 'DRAW'): PointsChange {
    if (playerResult === 'WIN') {
        return {
            rankPointDelta: POINTS_CONFIG.WIN.rank_point,
            leaderboardPointDelta: POINTS_CONFIG.WIN.leaderboard_point,
        };
    }
    if (playerResult === 'LOSS') {
        return {
            rankPointDelta: POINTS_CONFIG.LOSS.rank_point,
            leaderboardPointDelta: POINTS_CONFIG.LOSS.leaderboard_point,
        };
    }
    return {
        rankPointDelta: POINTS_CONFIG.DRAW.rank_point,
        leaderboardPointDelta: POINTS_CONFIG.DRAW.leaderboard_point,
    };
}

// ─── Kiểm tra thăng bậc / hạ bậc Rank ──────────────────────────────────────

export const ORDERED_RANKS: ArenaRank[] = [
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM_1',
    'PLATINUM_2',
    'SAPPHIRE_1',
    'SAPPHIRE_2',
    'EMERALD_1',
    'EMERALD_2',
    'DIAMOND_1',
    'DIAMOND_2',
    'MASTER_1',
    'MASTER_2',
    'MASTER_3',
];


export interface RankProgressionResult {
    newRank: ArenaRank;
    newRankPoint: number;
    newLeaderboardPoint: number;
    rankPointDelta: number;
    leaderboardPointDelta: number;
    isPromoted: boolean;
    isDemoted: boolean;
    promotionDetails?: {
        oldRank: ArenaRank;
        newRank: ArenaRank;
        overflowPoints: number;
    };
    demotionDetails?: {
        oldRank: ArenaRank;
        newRank: ArenaRank;
    };
}

//  Tính toán cập nhật Rank và Điểm số:
//  - Thăng bậc khi: điểm mới > threshold. Hạ bậc: Điểm âm
export function calculateRankProgression(
    currentRank: ArenaRank,
    currentRankPoint: number,
    currentLeaderboardPoint: number,
    playerResult: 'WIN' | 'LOSS' | 'DRAW'
): RankProgressionResult {
    const { rankPointDelta, leaderboardPointDelta } = calculatePointsChange(playerResult);

    // Điểm leaderboard không âm
    const newLeaderboardPoint = Math.max(0, currentLeaderboardPoint + leaderboardPointDelta);

    const tentativeRankPoint = currentRankPoint + rankPointDelta;
    const currentIndex = ORDERED_RANKS.indexOf(currentRank);
    const threshold = RANK_THRESHOLDS[currentRank] ?? Infinity;

    // THẮNG HOẶC ĐIỂM DƯƠNG: Kiểm tra thăng bậc
    // Phải LỚN HƠN mốc thăng bậc mới lên rank kế tiếp
    if (tentativeRankPoint > threshold && currentIndex < ORDERED_RANKS.length - 1 && threshold !== Infinity) {
        const nextRank = ORDERED_RANKS[currentIndex + 1]!;
        const overflowPoints = tentativeRankPoint - threshold;

        return {
            newRank: nextRank,
            newRankPoint: overflowPoints,
            newLeaderboardPoint,
            rankPointDelta,
            leaderboardPointDelta,
            isPromoted: true,
            isDemoted: false,
            promotionDetails: {
                oldRank: currentRank,
                newRank: nextRank,
                overflowPoints,
            },
        };
    }

    // THUA VÀ ĐIỂM ÂM: Kiểm tra hạ bậc
    if (tentativeRankPoint < 0) {
        // Nếu không phải là BRONZE (currentIndex > 0) -> Tụt xuống bậc rank ngay liền kề phía dưới
        if (currentIndex > 0) {
            const prevRank = ORDERED_RANKS[currentIndex - 1]!;
            const prevThreshold = RANK_THRESHOLDS[prevRank] ?? 0;
            const newRankPoint = Math.max(0, prevThreshold + tentativeRankPoint);

            return {
                newRank: prevRank,
                newRankPoint,
                newLeaderboardPoint,
                rankPointDelta,
                leaderboardPointDelta,
                isPromoted: false,
                isDemoted: true,
                demotionDetails: {
                    oldRank: currentRank,
                    newRank: prevRank,
                },
            };
        }

        // Nếu là BRONZE -> Không thể tụt thêm, điểm rank_point chặn sàn ở mức 0
        return {
            newRank: currentRank,
            newRankPoint: 0,
            newLeaderboardPoint,
            rankPointDelta,
            leaderboardPointDelta,
            isPromoted: false,
            isDemoted: false,
        };
    }

    // TRƯỜNG HỢP BÌNH THƯỜNG (0 <= tentativeRankPoint <= threshold)
    return {
        newRank: currentRank,
        newRankPoint: tentativeRankPoint,
        newLeaderboardPoint,
        rankPointDelta,
        leaderboardPointDelta,
        isPromoted: false,
        isDemoted: false,
    };
}

// ─── Danh mục chi tiết 14 bậc Rank (Phục vụ Frontend Modal & Badges) ──────────

export interface RankTierDetail {
    rank: ArenaRank;
    name: string;
    order: number;
    threshold: number;
    badgeFile: string;
    mascot: string;
    meaning: string;
    color: string;
}

export const RANK_TIER_DETAILS: RankTierDetail[] = [
    {
        rank: 'BRONZE',
        name: 'BRONZE',
        order: 0,
        threshold: 200,
        badgeFile: 'rank-bronze.png',
        mascot: 'Chiến Binh Spartan',
        meaning: 'Tinh thần chiến binh sơ khởi, dũng cảm bước vào đấu trường.',
        color: '#cd7f32',
    },
    {
        rank: 'SILVER',
        name: 'SILVER',
        order: 1,
        threshold: 250,
        badgeFile: 'rank-silver.png',
        mascot: 'Đại Bàng Bạc',
        meaning: 'Tầm nhìn sắc bén, sự nhanh nhạy và đôi cánh vươn cao.',
        color: '#c0c0c0',
    },
    {
        rank: 'GOLD',
        name: 'GOLD',
        order: 2,
        threshold: 300,
        badgeFile: 'rank-gold.png',
        mascot: 'Bò Tót Vàng',
        meaning: 'Sức mạnh kiên định, sự vững chãi và năng lượng hừng hực.',
        color: '#ffd700',
    },
    {
        rank: 'PLATINUM_1',
        name: 'PLATINUM I',
        order: 3,
        threshold: 350,
        badgeFile: 'rank-platinum-1.png',
        mascot: 'Sói Đầu Đàn',
        meaning: 'Bản lĩnh thủ lĩnh, sắc lạnh và tư duy chiến thuật đỉnh cao.',
        color: '#00e5ff',
    },
    {
        rank: 'PLATINUM_2',
        name: 'PLATINUM II',
        order: 4,
        threshold: 400,
        badgeFile: 'rank-platinum-2.png',
        mascot: 'Sói Đầu Đàn Hào Quang',
        meaning: 'Bản lĩnh thủ lĩnh tối thượng, chuẩn bị bứt phá lên hàng bảo thạch.',
        color: '#00f0ff',
    },
    {
        rank: 'SAPPHIRE_1',
        name: 'SAPPHIRE I',
        order: 5,
        threshold: 450,
        badgeFile: 'rank-sapphire-1.png',
        mascot: 'Báo Săn Lam Ngọc',
        meaning: 'Tốc độ phản xạ thần tốc, dứt khoát trong từng câu hỏi.',
        color: '#0f52ba',
    },
    {
        rank: 'SAPPHIRE_2',
        name: 'SAPPHIRE II',
        order: 6,
        threshold: 500,
        badgeFile: 'rank-sapphire-2.png',
        mascot: 'Hổ Xanh Lam Ngọc',
        meaning: 'Uy lực bộc phá mãnh liệt, áp đảo đấu trường.',
        color: '#0047ab',
    },
    {
        rank: 'EMERALD_1',
        name: 'EMERALD I',
        order: 7,
        threshold: 550,
        badgeFile: 'rank-emerald-1.png',
        mascot: 'Sư Tử Hoàng Gia',
        meaning: 'Chúa sơn lâm làm chủ đấu trường, phong thái vương giả.',
        color: '#50c878',
    },
    {
        rank: 'EMERALD_2',
        name: 'EMERALD II',
        order: 8,
        threshold: 600,
        badgeFile: 'rank-emerald-2.png',
        mascot: 'Bảo Tượng Hoàng Gia',
        meaning: 'Trí tuệ uyên bác, ký ức siêu phàm ("An Elephant Never Forgets").',
        color: '#00a86b',
    },
    {
        rank: 'DIAMOND_1',
        name: 'DIAMOND I',
        order: 9,
        threshold: 700,
        badgeFile: 'rank-diamond-1.png',
        mascot: 'Kỳ Lân Pegasus Pha Lê',
        meaning: 'Sự thuần khiết, thanh cao và khí phách kiêu hãnh.',
        color: '#b9f2ff',
    },
    {
        rank: 'DIAMOND_2',
        name: 'DIAMOND II',
        order: 10,
        threshold: 800,
        badgeFile: 'rank-diamond-2.png',
        mascot: 'Phượng Hoàng Pha Lê',
        meaning: 'Sự hoàn mỹ, bất tử và hào quang tỏa sáng rực rỡ.',
        color: '#40e0d0',
    },
    {
        rank: 'MASTER_1',
        name: 'MASTER I',
        order: 11,
        threshold: 900,
        badgeFile: 'rank-master-1.png',
        mascot: 'Đại Pháp Sư Vũ Trụ',
        meaning: 'Đỉnh cao tri thức nhân loại, làm chủ ma pháp ngôn từ.',
        color: '#9d00ff',
    },
    {
        rank: 'MASTER_2',
        name: 'MASTER II',
        order: 12,
        threshold: 1000,
        badgeFile: 'rank-master-2.png',
        mascot: 'Thần Long Phương Đông',
        meaning: 'Linh khí trời đất, trí tuệ thần thánh và sự trường tồn.',
        color: '#ff0055',
    },
    {
        rank: 'MASTER_3',
        name: 'MASTER III',
        order: 13,
        threshold: Infinity,
        badgeFile: 'rank-master-3.png',
        mascot: 'Hắc Long Phương Tây',
        meaning: 'Đỉnh cao tối thượng của PvP Arena, biểu tượng kẻ bất bại!',
        color: '#ff2a2a',
    },
];


