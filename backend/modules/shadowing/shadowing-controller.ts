import { Request, Response } from 'express';
import { getVideos, getVideoById, getSegmentsByVideoId, saveUserHistory, seedSampleVideo } from './shadowing-repository';

export const getLibraryHandler = async (req: Request, res: Response) => {
    try {
        // Ensure there is at least one video in DB for testing
        await seedSampleVideo();
        
        const videos = await getVideos();
        res.json({ status: 'success', data: videos });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
};

export const getVideoDetailHandler = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const video = await getVideoById(id as string);
        if (!video) {
            return res.status(404).json({ status: 'error', message: 'Video không tồn tại' });
        }
        const segments = await getSegmentsByVideoId(id as string);
        res.json({ status: 'success', data: { ...video, segments } });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
};

export const analyzeAudioHandler = async (req: Request, res: Response) => {
    try {
        const { segmentId } = req.params;
        const audioFile = req.file;
        const user = (req as any).user; // From requireAuth middleware

        if (!audioFile) {
            return res.status(400).json({ status: 'error', message: 'Không tìm thấy file ghi âm.' });
        }

        // TODO: In the future, send `audioFile.buffer` to Azure Cognitive Services Pronunciation Assessment API
        // For now, we simulate AI processing time and return a mock response based on the teammate's UI design
        
        console.log(`[AI Voice Analysis] Processing ${audioFile.size} bytes for segment ${segmentId}...`);
        
        // Mock processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock Response matching SyllableToken structure in frontend
        const mockScore = 87;
        const mockFeedback = [
            { text: "So ", status: "correct" },
            { text: "I ", status: "correct" },
            { text: "had ", status: "correct" },
            { text: "a ", status: "correct" },
            { text: "choice. ", status: "correct" },
            { text: "I ", status: "correct" },
            { text: "could ", status: "correct" },
            { text: "go ", status: "correct" },
            { text: "back ", status: "wrong", ipa: "/bæk/" },
            { text: "to ", status: "correct" },
            { text: "the ", status: "correct" },
            { text: "way ", status: "correct" },
            { text: "things ", status: "wrong", ipa: "/θɪŋz/" },
            { text: "were,", status: "correct" }
        ];

        // Save history (Assume videoId is passed in body for ease)
        const videoId = req.body.videoId || 'unknown';
        if (user && user.id) {
            await saveUserHistory(user.id, videoId as string, segmentId as string, mockScore);
        }

        res.json({
            status: 'success',
            data: {
                accuracy: mockScore,
                feedback: mockFeedback
            }
        });

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Lỗi phân tích AI' });
    }
};
