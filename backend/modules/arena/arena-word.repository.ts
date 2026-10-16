import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WordLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type WordType =
    | 'noun' | 'verb' | 'adjective' | 'adverb'
    | 'phrase' | 'noun_phrase' | 'verb_phrase'
    | 'idiom' | 'collocation';

export interface ArenaWordInput {
    word: string;
    meaning: string;
    topic: string;
    level: WordLevel;
    word_type: WordType;
    example?: string;
}

export interface ArenaWordRow extends ArenaWordInput {
    id: string;
    created_by: string | null;
    created_at: string;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

const VALID_LEVELS: WordLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_TYPES: WordType[] = [
    'noun', 'verb', 'adjective', 'adverb',
    'phrase', 'noun_phrase', 'verb_phrase',
    'idiom', 'collocation',
];

export function validateWordInput(w: any): { valid: boolean; error?: string } {
    if (!w.word || typeof w.word !== 'string' || !w.word.trim())
        return { valid: false, error: `'word' là bắt buộc và phải là chuỗi không rỗng` };

    if (!w.meaning || typeof w.meaning !== 'string' || !w.meaning.trim())
        return { valid: false, error: `'meaning' là bắt buộc và phải là chuỗi không rỗng` };

    if (!w.topic || typeof w.topic !== 'string' || !w.topic.trim())
        return { valid: false, error: `'topic' là bắt buộc` };

    if (!VALID_LEVELS.includes(w.level))
        return { valid: false, error: `'level' không hợp lệ: "${w.level}". Phải là: ${VALID_LEVELS.join(', ')}` };

    if (!VALID_TYPES.includes(w.word_type))
        return { valid: false, error: `'word_type' không hợp lệ: "${w.word_type}". Phải là: ${VALID_TYPES.join(', ')}` };

    return { valid: true };
}

// ─── Queries ──────────────────────────────────────────────────────────────────


// Bulk-insert một mảng từ vựng. Dùng 1 câu INSERT duy nhất cho hiệu năng. Trả về số dòng đã chèn.

export const bulkInsertWords = async (
    words: ArenaWordInput[],
    adminId: string
): Promise<number> => {
    // Tạo danh sách placeholders: (?, ?, ?, ?, ?, ?, ?, ?)
    const placeholders = words.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');

    const values: any[] = [];
    for (const w of words) {
        values.push(
            uuidv4(),
            w.word.trim(),
            w.meaning.trim(),
            w.topic.trim().toLowerCase(),
            w.level,
            w.word_type,
            w.example?.trim() || null,
            adminId
        );
    }

    const [result]: any = await pool.execute(
        `INSERT INTO arena_words (id, word, meaning, topic, level, word_type, example, created_by)
         VALUES ${placeholders}`,
        values
    );

    return result.affectedRows as number;
};

// Lấy danh sách từ vựng (có filter + phân trang).
export const getWords = async (filters: {
    topic?: string;
    level?: string;
    word_type?: string;
    q?: string;
    page: number;
    limit: number;
}) => {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.topic) {
        conditions.push('topic = ?');
        params.push(filters.topic.toLowerCase());
    }
    if (filters.level) {
        conditions.push('level = ?');
        params.push(filters.level);
    }
    if (filters.word_type) {
        conditions.push('word_type = ?');
        params.push(filters.word_type);
    }
    if (filters.q) {
        conditions.push('(word LIKE ? OR meaning LIKE ?)');
        const like = `%${filters.q}%`;
        params.push(like, like);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await pool.execute(
        `SELECT id, word, meaning, topic, level, word_type, example, created_at
         FROM arena_words
         ${where}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, filters.limit, offset]
    );

    const [countRows]: any = await pool.execute(
        `SELECT COUNT(*) as total FROM arena_words ${where}`,
        params
    );

    return {
        data: rows as ArenaWordRow[],
        total: (countRows as any[])[0].total as number,
        page: filters.page,
        limit: filters.limit,
    };
};

// Cập nhật thông tin 1 từ vựng.
export const updateWord = async (
    id: string,
    fields: Partial<ArenaWordInput>
): Promise<boolean> => {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (fields.word !== undefined) { setClauses.push('word = ?'); params.push(fields.word.trim()); }
    if (fields.meaning !== undefined) { setClauses.push('meaning = ?'); params.push(fields.meaning.trim()); }
    if (fields.topic !== undefined) { setClauses.push('topic = ?'); params.push(fields.topic.trim().toLowerCase()); }
    if (fields.level !== undefined) { setClauses.push('level = ?'); params.push(fields.level); }
    if (fields.word_type !== undefined) { setClauses.push('word_type = ?'); params.push(fields.word_type); }
    if (fields.example !== undefined) { setClauses.push('example = ?'); params.push(fields.example?.trim() || null); }

    if (setClauses.length === 0) return false;

    params.push(id);
    const [result]: any = await pool.execute(
        `UPDATE arena_words SET ${setClauses.join(', ')} WHERE id = ?`,
        params
    );

    return result.affectedRows > 0;
};

// Xoá 1 từ vựng theo ID.
export const deleteWord = async (id: string): Promise<boolean> => {
    const [result]: any = await pool.execute(
        `DELETE FROM arena_words WHERE id = ?`,
        [id]
    );
    return result.affectedRows > 0;
};

// Lấy danh sách tất cả topic đang có (distinct).
export const getTopics = async (): Promise<string[]> => {
    const [rows]: any = await pool.execute(
        `SELECT DISTINCT topic FROM arena_words ORDER BY topic ASC`
    );
    return (rows as any[]).map((r: any) => r.topic);
};

export interface MatchWordCondition {
    levels: WordLevel[];
    types?: WordType[];
    count?: number;
}

// Lấy từ ngẫu nhiên cho 1 ván đấu theo điều kiện level + word_type.
export const getRandomWordsForMatch = async (
    levelConditions: MatchWordCondition[],
    totalCount: number
): Promise<ArenaWordRow[]> => {
    const allWords: ArenaWordRow[] = [];
    const selectedIds = new Set<string>();

    for (const cond of levelConditions) {
        if (cond.levels.length === 0) continue;

        const levelPlaceholders = cond.levels.map(() => '?').join(', ');
        const levelParams: any[] = [...cond.levels];

        let typeClause = '';
        if (cond.types && cond.types.length > 0) {
            typeClause = `AND word_type IN (${cond.types.map(() => '?').join(', ')})`;
            levelParams.push(...cond.types);
        }

        const limitCount = cond.count ?? totalCount;

        const [rows] = await pool.execute(
            `SELECT id, word, meaning, topic, level, word_type, example
             FROM arena_words
             WHERE level IN (${levelPlaceholders}) ${typeClause}
             ORDER BY RAND()
             LIMIT ?`,
            [...levelParams, limitCount]
        );

        for (const row of rows as ArenaWordRow[]) {
            if (!selectedIds.has(row.id)) {
                selectedIds.add(row.id);
                allWords.push(row);
            }
        }
    }

    // Fallback: nếu DB chưa đủ từ theo đúng điều kiện phân bổ, lấy thêm từ bất kỳ để đủ số lượng
    if (allWords.length < totalCount) {
        const needed = totalCount - allWords.length;
        let notInClause = '';
        const params: any[] = [];

        if (selectedIds.size > 0) {
            const idPlaceholders = Array.from(selectedIds).map(() => '?').join(', ');
            notInClause = `WHERE id NOT IN (${idPlaceholders})`;
            params.push(...Array.from(selectedIds));
        }

        params.push(needed);

        const [fallbackRows] = await pool.execute(
            `SELECT id, word, meaning, topic, level, word_type, example
             FROM arena_words
             ${notInClause}
             ORDER BY RAND()
             LIMIT ?`,
            params
        );

        for (const row of fallbackRows as ArenaWordRow[]) {
            if (!selectedIds.has(row.id)) {
                selectedIds.add(row.id);
                allWords.push(row);
            }
        }
    }

    // Shuffle tổng hợp rồi cắt đúng số cần
    for (let i = allWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = allWords[i];
        if (tmp !== undefined && allWords[j] !== undefined) {
            allWords[i] = allWords[j]!;
            allWords[j] = tmp;
        }
    }

    return allWords.slice(0, totalCount);
};
