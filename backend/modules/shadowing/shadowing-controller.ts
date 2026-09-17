import { Request, Response } from 'express';
import { getLibrary, getVideoDetail, addVideo, analyzeAudio } from './shadowing-service';

export const getLibraryHandler = async (req: Request, res: Response) => {
    try {
        const videos = await getLibrary();
        res.json({ status: 'success', data: videos });
    } catch (error: any) {
        console.error(error);
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi server' });
    }
};

export const getVideoDetailHandler = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = await getVideoDetail(id as string);
        res.json({ status: 'success', data });
    } catch (error: any) {
        console.error(error);
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi server' });
    }
};

export const addVideoHandler = async (req: Request, res: Response) => {
    try {
        const { url, difficulty = 'Intermediate' } = req.body;
        if (!url) {
            return res.status(400).json({ status: 'error', message: 'Vui lòng cung cấp URL YouTube.' });
        }
        const result = await addVideo(url, difficulty);
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
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message || 'Lỗi phân tích AI' });
    }
};
