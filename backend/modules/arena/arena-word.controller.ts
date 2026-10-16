import { Request, Response } from 'express';
import * as wordRepo from './arena-word.repository';

const MAX_BULK_SIZE = 500;

// ─── POST /api/arena/admin/words/bulk ─────────────────────────────────────────

// Thêm nhiều từ vựng cùng lúc.
export const bulkCreateWords = async (req: Request, res: Response): Promise<void> => {
    try {
        const { words } = req.body;

        if (!Array.isArray(words) || words.length === 0) {
            res.status(400).json({ success: false, message: "'words' phải là mảng không rỗng." });
            return;
        }

        if (words.length > MAX_BULK_SIZE) {
            res.status(400).json({
                success: false,
                message: `Tối đa ${MAX_BULK_SIZE} từ mỗi lần nhập. Bạn đang gửi ${words.length} từ.`,
            });
            return;
        }

        // Validate từng phần tử trước khi insert
        for (let i = 0; i < words.length; i++) {
            const { valid, error } = wordRepo.validateWordInput(words[i]);
            if (!valid) {
                res.status(400).json({
                    success: false,
                    message: `Lỗi ở từ thứ ${i + 1}: ${error}`,
                    index: i,
                });
                return;
            }
        }

        const inserted = await wordRepo.bulkInsertWords(words, req.user!.id);

        res.status(201).json({
            success: true,
            message: `Đã thêm thành công ${inserted} từ vựng.`,
            inserted,
        });
    } catch (error: any) {
        console.error('[Arena] bulkCreateWords error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET /api/arena/admin/words ───────────────────────────────────────────────

// Lấy danh sách từ vựng với filter + phân trang.
export const listWords = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            topic,
            level,
            word_type,
            q,
            page = '1',
            limit = '50',
        } = req.query as Record<string, string>;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

        // exactOptionalPropertyTypes: chỉ đưa key vào object khi có giá trị thực
        const filters: {
            topic?: string;
            level?: string;
            word_type?: string;
            q?: string;
            page: number;
            limit: number;
        } = { page: pageNum, limit: limitNum };

        if (topic) filters.topic = topic;
        if (level) filters.level = level;
        if (word_type) filters.word_type = word_type;
        if (q) filters.q = q;

        const result = await wordRepo.getWords(filters);

        res.json({
            success: true,
            data: result.data,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: Math.ceil(result.total / result.limit),
            },
        });
    } catch (error: any) {
        console.error('[Arena] listWords error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── PUT /api/arena/admin/words/:id ───────────────────────────────────────────

// Cập nhật thông tin 1 từ vựng.
export const editWord = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params['id'] as string;
        const { word, meaning, topic, level, word_type, example } = req.body;

        // Chỉ đưa key vào partial khi có giá trị gửi lên
        const partial: any = {};
        if (word !== undefined) partial.word = word;
        if (meaning !== undefined) partial.meaning = meaning;
        if (topic !== undefined) partial.topic = topic;
        if (level !== undefined) partial.level = level;
        if (word_type !== undefined) partial.word_type = word_type;
        if (example !== undefined) partial.example = example;

        if (Object.keys(partial).length === 0) {
            res.status(400).json({ success: false, message: 'Không có field nào được gửi để cập nhật.' });
            return;
        }

        // Validate các giá trị enum bằng cách merge vào dummy đầy đủ
        const dummyForValidation = { word: 'x', meaning: 'x', topic: 'x', level: 'B1', word_type: 'noun', ...partial };
        const { valid, error } = wordRepo.validateWordInput(dummyForValidation);
        if (!valid) {
            res.status(400).json({ success: false, message: error });
            return;
        }

        const updated = await wordRepo.updateWord(id, partial);
        if (!updated) {
            res.status(404).json({ success: false, message: 'Không tìm thấy từ vựng với ID này.' });
            return;
        }

        res.json({ success: true, message: 'Cập nhật thành công.' });
    } catch (error: any) {
        console.error('[Arena] editWord error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── DELETE /api/arena/admin/words/:id ────────────────────────────────────────

// Xoá 1 từ vựng theo ID.
export const removeWord = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params['id'] as string;
        const deleted = await wordRepo.deleteWord(id);

        if (!deleted) {
            res.status(404).json({ success: false, message: 'Không tìm thấy từ vựng với ID này.' });
            return;
        }

        res.json({ success: true, message: 'Đã xoá từ vựng.' });
    } catch (error: any) {
        console.error('[Arena] removeWord error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET /api/arena/admin/words/topics ────────────────────────────────────────

// Lấy danh sách tất cả topic hiện có (để hiển thị dropdown filter cho Admin UI).

export const listTopics = async (_req: Request, res: Response): Promise<void> => {
    try {
        const topics = await wordRepo.getTopics();
        res.json({ success: true, data: topics });
    } catch (error: any) {
        console.error('[Arena] listTopics error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
