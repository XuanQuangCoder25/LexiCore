import OpenAI from 'openai';
import { YoutubeTranscript } from 'youtube-transcript';
import { AppError } from '../../errors/AppError';
import { updateStreak } from '../../utils/streak';
import { updateAchievementProgress, updateGoalProgress } from '../gamification/gamification-repository';
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

const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
const INNERTUBE_CLIENT_VERSION = '20.10.38';

async function fetchCaptionTracks(youtubeId: string): Promise<any[]> {
    // 1. Thử qua InnerTube API trước (nhanh và chính xác)
    try {
        const resp = await fetch(INNERTUBE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`,
            },
            body: JSON.stringify({
                context: {
                    client: {
                        clientName: 'ANDROID',
                        clientVersion: INNERTUBE_CLIENT_VERSION,
                    },
                },
                videoId: youtubeId,
            }),
        });
        if (resp.ok) {
            const data = await resp.json() as any;
            const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (Array.isArray(tracks) && tracks.length > 0) {
                return tracks;
            }
        }
    } catch (e) {
        console.warn(`[Shadowing] InnerTube caption fetch failed for ${youtubeId}:`, e);
    }

    // 2. Fallback sang cào HTML trang YouTube nếu InnerTube bị chặn
    try {
        const pageResp = await fetch(`https://www.youtube.com/watch?v=${youtubeId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });
        if (pageResp.ok) {
            const html = await pageResp.text();
            const match = html.match(/var ytInitialPlayerResponse\s*=\s*({.+?});/);
            if (match && match[1]) {
                const data = JSON.parse(match[1]);
                const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                if (Array.isArray(tracks) && tracks.length > 0) {
                    return tracks;
                }
            }
        }
    } catch (e) {
        console.warn(`[Shadowing] Web page caption fetch fallback failed for ${youtubeId}:`, e);
    }

    return [];
}

export interface CheckManualSubResult {
    valid: boolean;
    reason?: 'INVALID_URL' | 'ALREADY_EXISTS' | 'NO_SUBTITLES' | 'NO_ENGLISH_SUB' | 'AUTO_GENERATED' | 'OK';
    message: string;
    isManual: boolean;
    isAutoGenerated?: boolean;
    youtubeId?: string;
    title?: string;
    channel?: string;
    track?: any;
}

export const checkManualSub = async (youtubeUrl: string): Promise<CheckManualSubResult> => {
    const youtubeId = parseYoutubeId(youtubeUrl.trim());
    if (!youtubeId) {
        return {
            valid: false,
            reason: 'INVALID_URL',
            isManual: false,
            message: 'URL YouTube không hợp lệ. Vui lòng kiểm tra lại liên kết video.',
        };
    }

    const existing = await getVideoByYoutubeId(youtubeId);
    if (existing) {
        return {
            valid: false,
            reason: 'ALREADY_EXISTS',
            isManual: true,
            youtubeId,
            message: 'Video này đã có trong thư viện của bạn.',
        };
    }

    // Lấy tiêu đề và tên kênh qua YouTube oEmbed
    let title = `YouTube Video (${youtubeId})`;
    let channel = 'YouTube Creator';
    try {
        const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`
        );
        if (oembedRes.ok) {
            const oembedData = await oembedRes.json() as { title: string; author_name: string };
            title = oembedData.title || title;
            channel = oembedData.author_name || channel;
        }
    } catch {
        // Nếu oEmbed gặp lỗi (mạng chậm, timeout hoặc video bị hạn chế nhúng),
        // chương trình sẽ dùng tiêu đề và tác giả mặc định đã khởi tạo ở dòng 174-175.
        console.warn(`[Shadowing] oEmbed thất bại cho video ${youtubeId}, sử dụng tiêu đề mặc định.`);
    }

    const captionTracks = await fetchCaptionTracks(youtubeId);
    if (!captionTracks || captionTracks.length === 0) {
        return {
            valid: false,
            reason: 'NO_SUBTITLES',
            isManual: false,
            youtubeId,
            title,
            channel,
            message: 'Video này không có phụ đề hoặc đã tắt tính năng phụ đề.',
        };
    }

    // Lọc các track phụ đề tiếng Anh
    const enTracks = captionTracks.filter(
        (t: any) => t.languageCode === 'en' || (typeof t.languageCode === 'string' && t.languageCode.startsWith('en'))
    );

    if (enTracks.length === 0) {
        return {
            valid: false,
            reason: 'NO_ENGLISH_SUB',
            isManual: false,
            youtubeId,
            title,
            channel,
            message: 'Video này không có phụ đề tiếng Anh để luyện tập Shadowing.',
        };
    }

    // Phụ đề thủ công do con người viết: kind !== 'asr' và vssId không bắt đầu bằng 'a.'
    const manualEnTrack = enTracks.find(
        (t: any) => t.kind !== 'asr' && (!t.vssId || !t.vssId.startsWith('a.'))
    );

    if (!manualEnTrack) {
        return {
            valid: false,
            reason: 'AUTO_GENERATED',
            isManual: false,
            isAutoGenerated: true,
            youtubeId,
            title,
            channel,
            message: 'Video này sử dụng phụ đề tự động (Auto-generated) nên việc ngắt câu và đồng bộ thời gian chưa chuẩn xác. Vui lòng sử dụng video có phụ đề được biên dịch thủ công để tối ưu hiệu quả luyện tập Shadowing.',
        };
    }

    return {
        valid: true,
        reason: 'OK',
        isManual: true,
        youtubeId,
        title,
        channel,
        track: manualEnTrack,
        message: 'Video có phụ đề tiếng Anh thủ công chuẩn xác!',
    };
};

function decodeEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function parseTranscriptXml(xml: string): Array<{ text: string; offset: number; duration: number }> {
    const results: Array<{ text: string; offset: number; duration: number }> = [];
    const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
    let match;
    while ((match = pRegex.exec(xml)) !== null) {
        const startMs = parseInt(match[1] || '0', 10);
        const durMs = parseInt(match[2] || '0', 10);
        const inner = match[3] || '';
        let text = '';
        const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
        let sMatch;
        while ((sMatch = sRegex.exec(inner)) !== null) {
            text += sMatch[1] || '';
        }
        if (!text) {
            text = inner.replace(/<[^>]+>/g, '');
        }
        text = decodeEntities(text).trim();
        if (text) {
            results.push({
                text,
                duration: durMs,
                offset: startMs,
            });
        }
    }
    if (results.length > 0) return results;

    const classicRegex = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
    let cMatch;
    while ((cMatch = classicRegex.exec(xml)) !== null) {
        results.push({
            text: decodeEntities(cMatch[3] || '').trim(),
            offset: Math.round(parseFloat(cMatch[1] || '0') * 1000),
            duration: Math.round(parseFloat(cMatch[2] || '0') * 1000),
        });
    }
    return results;
}

export const addVideo = async (youtubeUrl: string) => {
    const subCheck = await checkManualSub(youtubeUrl);
    if (!subCheck.valid || !subCheck.isManual || !subCheck.track) {
        throw new AppError(
            subCheck.message || 'Video không đáp ứng tiêu chuẩn phụ đề thủ công.',
            subCheck.reason === 'ALREADY_EXISTS' ? 409 : 422
        );
    }

    const youtubeId = subCheck.youtubeId!;
    const title = subCheck.title!;
    const channel = subCheck.channel!;

    // Tải trực tiếp phụ đề thủ công từ baseUrl của manual track
    let transcriptItems: Array<{ text: string; offset: number; duration: number }>;
    try {
        const transcriptResp = await fetch(subCheck.track.baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        });
        if (!transcriptResp.ok) {
            throw new Error('Failed to fetch transcript XML');
        }
        const xml = await transcriptResp.text();
        transcriptItems = parseTranscriptXml(xml);
    } catch (err: any) {
        throw new AppError('Không thể tải hoặc phân tích nội dung phụ đề thủ công.', 422);
    }

    if (!transcriptItems || transcriptItems.length === 0) {
        throw new AppError('Video này không có nội dung phụ đề hợp lệ.', 422);
    }

    const lastItem = transcriptItems[transcriptItems.length - 1];
    const duration = Math.ceil(((lastItem?.offset ?? 0) + (lastItem?.duration ?? 0)) / 1000);

    const videoId = await insertVideo({ youtube_id: youtubeId, title, channel, duration });

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
        // Tính thời lượng câu (giây) từ segment, quy đổi sang phần trăm phút để cộng dồn
        const durationSeconds = segment.end_time && segment.start_time
            ? (segment.end_time - segment.start_time)
            : 10; // fallback 10 giây nếu không có metadata
        const minuteFraction = Math.round((durationSeconds / 60) * 100) / 100;
        // Lưu bằng đơn vị 0.01 phút (tránh số thập phân, DB dùng INT)
        // Quy ước: target_value trong achievement_definitions tính bằng "1/100 phút" = giây * (100/60)
        const secondsToStore = Math.round(durationSeconds);
        await updateAchievementProgress(userId, 'shadowing_minutes_studied', secondsToStore);
        await updateGoalProgress(userId, 'shadowing_minutes_studied', secondsToStore);
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
