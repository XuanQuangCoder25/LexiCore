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

        const adminId = (req as any).user?.id;
        const id = uuidv4();
        await pool.execute(
            `INSERT INTO arena_words (id, word, meaning, topic, level, word_type, example, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                body.word.trim(),
                body.meaning.trim(),
                body.topic.trim().toLowerCase(),
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

        const adminId = (req as any).user?.id;
        const count = await bulkInsertWords(words, adminId);
        res.status(201).json({ success: true, message: `Import thành công ${count} từ vựng` });
    } catch (err) {
        console.error('[AdminArena] importWords error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

