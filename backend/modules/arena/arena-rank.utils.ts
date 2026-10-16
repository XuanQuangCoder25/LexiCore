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
    LOSS: { rank_point: -15, leaderboard_point: -25 },
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
