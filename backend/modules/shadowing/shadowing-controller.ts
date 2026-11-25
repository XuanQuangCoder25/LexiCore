import { Request, Response } from 'express';
import {
    getLibrary,
    getVideoDetail,
    addVideo,
    deleteUserVideo,
    getPronunciationQuota,
    PronunciationQuotaError,
    analyzeAudio,
    getVideoSummary,
    fetchNote,
    saveNote,
    explainWordInContext,
    checkManualSub,
} from './shadowing-service';

export const getLibraryHandler = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const result = await getLibrary(user.id);
        res.json({ status: 'success', data: result.videos, quota: result.quota });
    } catch (error: any) {
        console.error(error);
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi server' });
    }
};

export const getVideoDetailHandler = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const data = await getVideoDetail(id as string, user.id);
        res.json({ status: 'success', data });
    } catch (error: any) {
        console.error(error);
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi server' });
    }
};

export const checkManualSubHandler = async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        const user = (req as any).user;
        if (!url) {
            return res.status(400).json({ status: 'error', message: 'Vui lòng cung cấp URL YouTube.' });
        }
        const result = await checkManualSub(url, user?.id);
        res.json({
            status: 'success',
            data: result,
        });
    } catch (error: any) {
        console.error('[Shadowing checkSub]', error);
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi kiểm tra phụ đề' });
    }
};

export const addVideoHandler = async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        const user = (req as any).user;
        if (!url) {
            return res.status(400).json({ status: 'error', message: 'Vui lòng cung cấp URL YouTube.' });
        }
        const result = await addVideo(url, user.id);
        res.status(201).json({
            status: 'success',
            message: `Đã thêm "${result.title}" và tải ${result.segmentsCount} câu phụ đề thành công!`,
            data: result,
        });
    } catch (error: any) {
        console.error(error);
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi server' });
    }
};

export const deleteVideoHandler = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const user = (req as any).user;
        await deleteUserVideo(user.id, videoId as string);
        res.json({
            status: 'success',
            message: 'Đã xóa video khỏi danh sách cá nhân.',
        });
    } catch (error: any) {
        console.error(error);
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi server' });
    }
};

export const getPronunciationQuotaHandler = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const quota = await getPronunciationQuota(user.id);
        res.json({ status: 'success', data: quota });
    } catch (error: any) {
        console.error(error);
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi server' });
    }
};

export const analyzeAudioHandler = async (req: Request, res: Response) => {
    try {
        const { segmentId } = req.params;
        const audioFile = req.file;
        const user = (req as any).user;

        if (!audioFile) {
            return res.status(400).json({ status: 'error', message: 'Không tìm thấy file ghi âm.' });
        }

        console.log(`[Whisper] Processing ${audioFile.size} bytes for segment ${segmentId}...`);

        const result = await analyzeAudio(
            audioFile.buffer,
            audioFile.mimetype,
            segmentId as string,
            user?.id ?? null
        );

        res.json({ status: 'success', data: result });
    } catch (error: any) {
        console.error(error);
        if (error instanceof PronunciationQuotaError) {
            return res.status(429).json({
                status: 'error',
                message: error.message,
                usedToday: error.usedToday,
                limitToday: error.limitToday,
                tier: error.tier,
            });
        }
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi phân tích AI' });
    }
};

export const getVideoSummaryHandler = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        console.log(`[Gemini] Fetching summary for video ${id}...`);
        const summary = await getVideoSummary(id as string, user.id);
        res.json({ status: 'success', data: summary });
    } catch (error: any) {
        console.error(error);
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi Gemini AI' });
    }
};

export const getNoteHandler = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const user = (req as any).user;
        const content = await fetchNote(user.id, videoId as string);
        res.json({ status: 'success', data: { content } });
    } catch (error: any) {
        console.error(error);
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi tải sổ tay.' });
    }
};

export const saveNoteHandler = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const user = (req as any).user;
        const { content = '' } = req.body;
        await saveNote(user.id, videoId as string, content);
        res.json({ status: 'success', message: 'Sổ tay đã được lưu.' });
    } catch (error: any) {
        console.error(error);
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi lưu sổ tay.' });
    }
};

export const explainWordHandler = async (req: Request, res: Response) => {
    try {
        const { word, sentence } = req.body;
        if (!word || !sentence) {
            return res.status(400).json({ status: 'error', message: 'Thiếu từ hoặc câu.' });
        }
        const explanation = await explainWordInContext(word, sentence);
        res.json({ status: 'success', data: { explanation } });
    } catch (error: any) {
        console.error(error);
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi Gemini AI' });
    }
};
