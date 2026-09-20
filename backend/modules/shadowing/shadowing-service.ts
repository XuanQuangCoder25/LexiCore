import OpenAI from 'openai';
import { YoutubeTranscript } from 'youtube-transcript';
import { AppError } from '../../errors/AppError';
import { updateStreak } from '../../utils/streak';
import { callGeminiWithRetry } from '../../utils/gemini';
import {
    getVideos,
    getVideoById,
    getVideoByYoutubeId,
    insertVideo,
    insertSegments,
    getSegmentById,
    getSegmentsByVideoId,
    saveUserHistory,
    getVideoAiSummary,
    updateVideoAiSummary,
    getNote,
    upsertNote,
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

    let spokenText: string;
    try {
        const audioFile = new File([new Uint8Array(audioBuffer)], 'recording.webm', { type: audioMimetype });
        const whisperResponse = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'en',
            prompt: referenceText,
        });
        spokenText = whisperResponse.text;
    } catch (err: any) {
        console.error('[Whisper] OpenAI error:', err?.message);
        const msg = err?.message || '';
        if (msg.includes('credits') || msg.includes('quota') || msg.includes('billing') || err?.status === 429) {
            throw new AppError('OpenAI hết credits. Vui lòng nạp thêm tại platform.openai.com/settings/organization/billing/overview', 402);
        }
        throw new AppError(`Lỗi Whisper API: ${msg || 'Không xác định'}`, 500);
    }

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

// ─── Gemini AI Summary ─────────────────────────────────────────────────────────────────

export interface GeminiSummary {
    summary: string;
    vocabulary: Array<{
        word: string;
        ipa: string;
        partOfSpeech: string;
        definition: string;
        exampleSentence: string;
    }>;
}

export const getVideoSummary = async (videoId: string): Promise<GeminiSummary> => {
    // 1. Kiểm tra cache trong DB trước
    const cached = await getVideoAiSummary(videoId);
    if (cached) return cached as GeminiSummary;

    // 2. Chưa có cache → lấy phụ đề và gọi Gemini
    const segments = await getSegmentsByVideoId(videoId);
    if (!segments.length) throw new AppError('Video không có phụ đề để phân tích.', 422);

    // Lấy tối đa 150 câu đầu để tiết kiệm token
    const transcript = segments
        .slice(0, 150)
        .map((s: any) => s.transcript)
        .join(' ');

    const prompt = `
You are an English learning assistant. Analyze the following transcript from a YouTube video.
Return a JSON object with EXACTLY this structure (no markdown, no code blocks, raw JSON only):
{
  "summary": "A concise 2-3 sentence summary of the video content in Vietnamese",
  "vocabulary": [
    {
      "word": "the English word",
      "ipa": "/phên âm IPA/",
      "partOfSpeech": "noun | verb | adjective | adverb | phrase",
      "definition": "Giải nghĩa ngắn gọn bằng tiếng Việt, dựa đúng theo ngữ cảnh video này",
      "exampleSentence": "A short example sentence from or inspired by the transcript"
    }
  ]
}
Rules:
- The "vocabulary" array must contain exactly 20 entries.
- Only include vocabulary that is truly important and appears meaningfully in this specific transcript.
- Definitions MUST be context-aware (based on how the word is used in THIS video, not general meaning).
- Sort vocabulary by importance (most important first).

Transcript:
${transcript}
`;

    let result: GeminiSummary;
    try {
        // callGeminiWithRetry tự động retry 3 lần khi bị 503 (quá tải)
        const text = await callGeminiWithRetry(prompt);
        console.log('[Gemini] Raw response:', text.substring(0, 50) + '...');
        // Loại bỏ markdown code fences nếu Gemini vẫn thêm vào
        const cleanJson = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        result = JSON.parse(cleanJson) as GeminiSummary;
    } catch (err: any) {
        console.error('[Gemini] Error:', err?.message);
        const status = err?.status;
        if (status === 503 || status === 429) {
            throw new AppError('Gemini đang quá tải. Vui lòng thử lại sau 10 giây.', 503);
        }
        throw new AppError(`Gemini lỗi: ${err?.message || 'Không xác định'}`, 500);
    }

    // 3. Lưu vào DB để dùng lại lần sau
    await updateVideoAiSummary(videoId, result);

    return result;
};

// ─── Notebook Service ─────────────────────────────────────────────────────────────────

export const fetchNote = async (userId: string, videoId: string): Promise<string> => {
    return getNote(userId, videoId);
};

export const saveNote = async (userId: string, videoId: string, content: string): Promise<void> => {
    await upsertNote(userId, videoId, content);
};

// ─── Interactive Dictionary Service ──────────────────────────────────────────────────

export const explainWordInContext = async (word: string, sentence: string): Promise<string> => {
    const prompt = `Giải thích cực kỳ ngắn gọn nghĩa của từ "${word}" trong câu: "${sentence}".
Yêu cầu:
- Chỉ đưa ra nghĩa tiếng Việt của từ đó và nghĩa tiếng Việt của cả câu đó.
- Tuyệt đối KHÔNG dùng ký tự markdown (như **, *, gạch đầu dòng, số thứ tự).
- Viết thành 1 đoạn văn bản thuần tuý, trôi chảy, dưới 40 chữ.`;

    const result = await callGeminiWithRetry(prompt);
    return result;
};
