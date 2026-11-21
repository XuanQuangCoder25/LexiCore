import { Request, Response } from 'express';
import {
    getWords,
    getTopics,
    bulkInsertWords,
    updateWord,
    deleteWord,
    validateWordInput,
    ArenaWordInput,
    VALID_LEVELS,
} from '../arena/arena-word.repository';
import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';

// ─── GET /api/admin/arena/words ───────────────────────────────────────────────
export const adminGetWords = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const filters = {
            topic: req.query.topic as string | undefined,
            level: req.query.level as string | undefined,
            word_type: req.query.word_type as string | undefined,
            q: req.query.q as string | undefined,
            page,
            limit,
        };
        const result = await getWords(filters);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[AdminArena] getWords error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ─── GET /api/admin/arena/topics ─────────────────────────────────────────────
export const adminGetTopics = async (_req: Request, res: Response) => {
    try {
        const topics = await getTopics();
        res.json({ success: true, data: topics });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ─── POST /api/admin/arena/words ──────────────────────────────────────────────
export const adminCreateWord = async (req: Request, res: Response) => {
    try {
        const body = req.body as ArenaWordInput;
        const validation = validateWordInput(body);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.error });
        }

        const normalizedWord = body.word.trim();
        const normalizedTopic = body.topic.trim().toLowerCase();

        // ── Kiểm tra trùng lặp: Một từ không thể xuất hiện 2 lần trong cùng một chủ đề
        const [existing]: any = await pool.execute(
            `SELECT id, word, meaning, topic, level, word_type
             FROM arena_words
             WHERE LOWER(TRIM(word)) = LOWER(?)
               AND LOWER(TRIM(topic)) = LOWER(?)
             LIMIT 1`,
            [normalizedWord, normalizedTopic]
        );

        if (existing && existing.length > 0) {
            const ex = existing[0];
            return res.status(409).json({
                success: false,
                code: 'DUPLICATE_WORD',
                message: `Từ "${normalizedWord}" đã tồn tại trong chủ đề "${normalizedTopic}" với nghĩa: "${ex.meaning}" (Cấp độ: ${ex.level}, Loại từ: ${ex.word_type}). Vui lòng cập nhật từ cũ thay vì thêm mới.`,
                data: ex,
            });
        }

        const adminId = (req as any).user?.id;
        const id = uuidv4();
        await pool.execute(
            `INSERT INTO arena_words (id, word, meaning, topic, level, word_type, example, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                normalizedWord,
                body.meaning.trim(),
                normalizedTopic,
                body.level,
                body.word_type,
                body.example?.trim() || null,
                adminId,
            ]
        );

        res.status(201).json({ success: true, message: 'Thêm từ vựng thành công', data: { id } });
    } catch (err) {
        console.error('[AdminArena] createWord error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ─── PUT /api/admin/arena/words/:id ──────────────────────────────────────────
export const adminUpdateWord = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        if (!id) {
            return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        }
        const fields = req.body as Partial<ArenaWordInput>;

        // Validate chỉ những field được gửi lên
        if (fields.level && !VALID_LEVELS.includes(fields.level)) {
            return res.status(400).json({ success: false, message: 'Level không hợp lệ' });
        }

        // Kiểm tra tránh trùng lặp khi cập nhật word hoặc topic
        if (fields.word || fields.topic) {
            const [cur]: any = await pool.execute('SELECT word, topic FROM arena_words WHERE id = ?', [id]);
            if (cur && cur.length > 0) {
                const targetWord = (fields.word ? fields.word.trim() : cur[0].word);
                const targetTopic = (fields.topic ? fields.topic.trim().toLowerCase() : cur[0].topic);

                const [dup]: any = await pool.execute(
                    `SELECT id, word, meaning, topic FROM arena_words
                     WHERE LOWER(TRIM(word)) = LOWER(?)
                       AND LOWER(TRIM(topic)) = LOWER(?)
                       AND id != ?
                     LIMIT 1`,
                    [targetWord, targetTopic, id]
                );

                if (dup && dup.length > 0) {
                    return res.status(409).json({
                        success: false,
                        code: 'DUPLICATE_WORD',
                        message: `Từ "${targetWord}" đã tồn tại trong chủ đề "${targetTopic}" với nghĩa: "${dup[0].meaning}". Không thể cập nhật thành từ bị trùng lặp.`,
                    });
                }
            }
        }

        const updated = await updateWord(id, fields);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy từ vựng' });
        }
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('[AdminArena] updateWord error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ─── DELETE /api/admin/arena/words/:id ───────────────────────────────────────
export const adminDeleteWord = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        if (!id) {
            return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        }
        const deleted = await deleteWord(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy từ vựng' });
        }
        res.json({ success: true, message: 'Đã xoá từ vựng' });
    } catch (err) {
        console.error('[AdminArena] deleteWord error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ─── POST /api/admin/arena/words/import ──────────────────────────────────────
// Body: { words: ArenaWordInput[] }
export const adminImportWords = async (req: Request, res: Response) => {
    try {
        const { words } = req.body as { words: ArenaWordInput[] };
        if (!Array.isArray(words) || words.length === 0) {
            return res.status(400).json({ success: false, message: 'Danh sách từ không hợp lệ hoặc rỗng' });
        }
        if (words.length > 500) {
            return res.status(400).json({ success: false, message: 'Tối đa 500 từ mỗi lần import' });
        }

        // Validate từng từ
        for (let i = 0; i < words.length; i++) {
            const v = validateWordInput(words[i]);
            if (!v.valid) {
                return res.status(400).json({ success: false, message: `Hàng ${i + 1}: ${v.error}` });
            }
        }

        // ── Kiểm tra và phân loại các từ trùng lặp theo cặp (word + topic)
        const topicsSet = new Set(words.map((w) => w.topic.trim().toLowerCase()));
        const topics = Array.from(topicsSet);

        // Map lưu các từ đã có trong database: key = "word::topic"
        const existingWordsMap = new Map<string, { meaning: string; level: string; word_type: string }>();

        if (topics.length > 0) {
            const placeholders = topics.map(() => '?').join(', ');
            const [existingRows]: any = await pool.execute(
                `SELECT LOWER(TRIM(word)) as word, LOWER(TRIM(topic)) as topic, meaning, level, word_type
                 FROM arena_words
                 WHERE LOWER(TRIM(topic)) IN (${placeholders})`,
                topics
            );

            for (const r of existingRows) {
                existingWordsMap.set(`${r.word}::${r.topic}`, {
                    meaning: r.meaning,
                    level: r.level,
                    word_type: r.word_type,
                });
            }
        }

        const toInsert: ArenaWordInput[] = [];
        const skippedWords: {
            word: string;
            topic: string;
            reason: string;
            existingMeaning?: string;
            existingLevel?: string;
            existingType?: string;
        }[] = [];

        // Set để chặn cả các từ trùng lặp ngay trong chính file CSV gửi lên
        const seenInBatch = new Set<string>();

        for (const w of words) {
            const cleanWord = w.word.trim();
            const cleanTopic = w.topic.trim().toLowerCase();
            const key = `${cleanWord.toLowerCase()}::${cleanTopic}`;

            if (existingWordsMap.has(key)) {
                const ex = existingWordsMap.get(key)!;
                skippedWords.push({
                    word: cleanWord,
                    topic: cleanTopic,
                    reason: 'Đã tồn tại trong cơ sở dữ liệu',
                    existingMeaning: ex.meaning,
                    existingLevel: ex.level,
                    existingType: ex.word_type,
                });
                continue;
            }

            if (seenInBatch.has(key)) {
                skippedWords.push({
                    word: cleanWord,
                    topic: cleanTopic,
                    reason: 'Bị trùng lặp ngay trong file CSV',
                });
                continue;
            }

            seenInBatch.add(key);
            toInsert.push({
                ...w,
                word: cleanWord,
                topic: cleanTopic,
            });
        }

        const adminId = (req as any).user?.id;
        let insertedCount = 0;
        if (toInsert.length > 0) {
            insertedCount = await bulkInsertWords(toInsert, adminId);
        }

        let message = '';
        if (insertedCount > 0 && skippedWords.length > 0) {
            message = `Nhập thành công ${insertedCount} từ vựng mới. Đã tự động bỏ qua ${skippedWords.length} từ bị trùng lặp trong cùng chủ đề.`;
        } else if (insertedCount > 0) {
            message = `Nhập thành công toàn bộ ${insertedCount} từ vựng!`;
        } else {
            message = `Tất cả ${skippedWords.length} từ vựng đều đã tồn tại trong cùng chủ đề. Không có từ mới nào được thêm.`;
        }

        res.status(201).json({
            success: true,
            message,
            data: {
                insertedCount,
                skippedCount: skippedWords.length,
                skippedWords,
            },
        });
    } catch (err) {
        console.error('[AdminArena] importWords error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

