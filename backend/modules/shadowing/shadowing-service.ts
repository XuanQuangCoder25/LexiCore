import OpenAI from 'openai';
import { YoutubeTranscript } from 'youtube-transcript';
import { AppError } from '../../errors/AppError';
import { updateStreak } from '../../utils/streak';
import {
    getVideos,
    getVideoById,
    getVideoByYoutubeId,
    insertVideo,
    insertSegments,
    getSegmentById,
    getSegmentsByVideoId,
    saveUserHistory,
} from './shadowing-repository';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Hàm tiện ích ──────────────────────────────────────────────────────────────

/**
 * Parse YouTube ID từ nhiều dạng URL khác nhau:
 *  - https://www.youtube.com/watch?v=iCvmsMzlF7o
 *  - https://youtu.be/iCvmsMzlF7o
 *  - iCvmsMzlF7o (truyền thẳng ID)
 */
function parseYoutubeId(input: string): string | null {
    const urlPatterns = [
        /(?:v=|\/embed\/|\/v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/, // raw ID
    ];
    for (const pattern of urlPatterns) {
        const match = input.match(pattern);
        if (match) return match[1] as string;
    }
    return null;
}

export function compareWords(
    referenceText: string,
    spokenText: string
): Array<{ text: string; status: 'correct' | 'wrong' }> {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s']/g, '').trim();

    const refWords = referenceText.split(/\s+/).filter(Boolean);
    const spokenWords = normalize(spokenText).split(/\s+/).filter(Boolean);

    const result: Array<{ text: string; status: 'correct' | 'wrong' }> = [];

    refWords.forEach((word, i) => {
        const clean = normalize(word);
        const spoken = spokenWords[i] ?? '';
        result.push({
            text: word + (i < refWords.length - 1 ? ' ' : ''),
            status: clean === spoken ? 'correct' : 'wrong',
        });
    });

    return result;
}

// ─── Handlers ──────────────────────────────────────────────────────────────────

export const getLibrary = async () => {
    return getVideos();
};

export const getVideoDetail = async (id: string) => {
    const video = await getVideoById(id);
    if (!video) throw new AppError('Video không tồn tại.', 404);
    const segments = await getSegmentsByVideoId(id);
    return { ...video, segments };
};

export const addVideo = async (youtubeUrl: string, difficulty: string) => {
    const youtubeId = parseYoutubeId(youtubeUrl.trim());
    if (!youtubeId) throw new AppError('URL YouTube không hợp lệ.', 400);

    const existing = await getVideoByYoutubeId(youtubeId);
    if (existing) throw new AppError('Video này đã có trong thư viện.', 409);

    // Lấy title và channel thật từ YouTube oEmbed API (free, không cần API key)
    let title = `YouTube Video (${youtubeId})`;
    let channel = 'Unknown';
    try {
        const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`
        );
        if (oembedRes.ok) {
            const oembedData = await oembedRes.json() as { title: string; author_name: string };
            title = oembedData.title;
            channel = oembedData.author_name;
        }
    } catch {
        // Không có title thật thì dùng fallback, không throw lỗi
        console.warn(`[Shadowing] oEmbed failed for ${youtubeId}, using fallback title.`);
    }

    let transcriptItems: Array<{ text: string; offset: number; duration: number }>;
    try {
        transcriptItems = await YoutubeTranscript.fetchTranscript(youtubeId, { lang: 'en' });
    } catch (err: any) {
        throw new AppError(
            'Không thể lấy phụ đề tự động. Video này có thể tắt phụ đề hoặc không có phụ đề tiếng Anh.',
            422
        );
    }

    if (!transcriptItems || transcriptItems.length === 0) {
        throw new AppError('Video này không có phụ đề.', 422);
    }

    const lastItem = transcriptItems[transcriptItems.length - 1];
    const duration = Math.ceil(((lastItem?.offset ?? 0) + (lastItem?.duration ?? 0)) / 1000);

    const videoId = await insertVideo({ youtube_id: youtubeId, title, channel, duration, difficulty });

    const segments = transcriptItems.map((item, index) => ({
        start_time: item.offset / 1000,
        end_time: (item.offset + item.duration) / 1000,
        transcript: item.text.replace(/\n/g, ' ').trim(),
        order_index: index + 1,
    }));

    await insertSegments(videoId, segments);

    return { videoId, segmentsCount: segments.length, title };
};

export const analyzeAudio = async (
    audioBuffer: Buffer,
    audioMimetype: string,
    segmentId: string,
    userId: string | null
) => {
    const segment = await getSegmentById(segmentId);
    if (!segment) throw new AppError('Không tìm thấy đoạn phụ đề này.', 404);

    const referenceText: string = segment.transcript;

    const audioFile = new File([new Uint8Array(audioBuffer)], 'recording.webm', { type: audioMimetype });
    const whisperResponse = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en',
        prompt: referenceText,
    });

    const spokenText = whisperResponse.text;

    const tokens = compareWords(referenceText, spokenText);
    const correctCount = tokens.filter(t => t.status === 'correct').length;
    const accuracy = Math.round((correctCount / tokens.length) * 100);

    if (userId) {
        await saveUserHistory(userId, segment.video_id, segmentId, accuracy);
        await updateStreak(userId);
    }

    return {
        spokenText,
        referenceText,
        accuracy,
        feedback: tokens,
    };
};
