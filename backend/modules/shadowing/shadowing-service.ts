import OpenAI from 'openai';
import redis from '../../config/redis';
import { AppError } from '../../errors/AppError';
import { updateStreak } from '../../utils/streak';
import { updateAchievementProgress, updateGoalProgress } from '../gamification/gamification-repository';
import { callGeminiWithRetry } from '../../utils/gemini';
import { getTierLimit, getUserTier, getVNDateKey, Tier } from '../../utils/tierLimits';
import {
    getVideosForUser,
    countUserVideos,
    hasUserSavedVideo,
    userHasVideoAccess,
    getVideoById,
    getVideoByYoutubeId,
    countSegmentsByVideoId,
    linkUserVideo,
    unlinkUserVideo,
    createVideoWithSegmentsAndLink,
    getSegmentById,
    getSegmentsByVideoId,
    saveUserHistory,
    getVideoAiSummary,
    updateVideoAiSummary,
    getNote,
    upsertNote,
} from './shadowing-repository';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
const INNERTUBE_CLIENT_VERSION = '20.10.38';
const MAX_GEMINI_TRANSCRIPT_CHARS = 24000;

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
        /^([a-zA-Z0-9_-]{11})$/,
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

async function fetchYoutubeVideoMeta(youtubeId: string): Promise<{ tracks: any[]; durationSeconds: number }> {
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
            const lengthSeconds = Number(data?.videoDetails?.lengthSeconds || 0);
            if (Array.isArray(tracks) && tracks.length > 0) {
                return { tracks, durationSeconds: Number.isFinite(lengthSeconds) ? lengthSeconds : 0 };
            }
        }
    } catch (e) {
        console.warn(`[Shadowing] InnerTube fetch failed for ${youtubeId}:`, e);
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
                const lengthSeconds = Number(data?.videoDetails?.lengthSeconds || 0);
                if (Array.isArray(tracks) && tracks.length > 0) {
                    return { tracks, durationSeconds: Number.isFinite(lengthSeconds) ? lengthSeconds : 0 };
                }
            }
        }
    } catch (e) {
        console.warn(`[Shadowing] Web page fetch fallback failed for ${youtubeId}:`, e);
    }

    return { tracks: [], durationSeconds: 0 };
}

function buildLimitErrorMessage(maxVideos: number, tier: Tier): string {
    return `Bạn đã lưu tối đa ${maxVideos} video cá nhân cho gói ${tier}. Vui lòng xóa bớt hoặc nâng cấp gói để lưu thêm video.`;
}

function buildDurationErrorMessage(maxMinutes: number, tier: Tier): string {
    return `Video dài hơn ${maxMinutes} phút. Gói ${tier} hiện tại chỉ hỗ trợ video có thời lượng tối đa ${maxMinutes} phút.`;
}

// ─── Handlers ──────────────────────────────────────────────────────────────────

export const getLibrary = async (userId: string) => {
    const [videos, used, tier] = await Promise.all([
        getVideosForUser(userId),
        countUserVideos(userId),
        getUserTier(userId),
    ]);

    const limit = getTierLimit('shadowingVideos', tier);
    const maxDurationMinutes = getTierLimit('shadowingVideoDurationMinutes', tier);

    return {
        videos,
        quota: {
            used,
            limit,
            maxDurationMinutes,
            tier,
        },
    };
};

export const getVideoDetail = async (id: string, userId: string) => {
    const video = await getVideoById(id);
    if (!video) throw new AppError('Video không tồn tại.', 404);

    const hasAccess = await userHasVideoAccess(userId, id);
    if (!hasAccess) {
        throw new AppError('Bạn chưa thêm video này vào thư viện cá nhân.', 403);
    }

    const segments = await getSegmentsByVideoId(id);
    return { ...video, segments };
};

export interface CheckManualSubResult {
    valid: boolean;
    reason?:
        | 'INVALID_URL'
        | 'ALREADY_EXISTS'
        | 'ALREADY_IN_SYSTEM'
        | 'LIMIT_REACHED'
        | 'DURATION_EXCEEDED'
        | 'NO_SUBTITLES'
        | 'NO_ENGLISH_SUB'
        | 'AUTO_GENERATED'
        | 'OK';
    message: string;
    isManual: boolean;
    isAutoGenerated?: boolean;
    cachedInCatalog?: boolean;
    youtubeId?: string;
    title?: string;
    channel?: string;
    duration?: number;
    track?: any;
}

export const checkManualSub = async (
    youtubeUrl: string,
    userId?: string
): Promise<CheckManualSubResult> => {
    const youtubeId = parseYoutubeId(youtubeUrl.trim());
    if (!youtubeId) {
        return {
            valid: false,
            reason: 'INVALID_URL',
            isManual: false,
            message: 'URL YouTube không hợp lệ. Vui lòng kiểm tra lại liên kết video.',
        };
    }

    const tier: Tier = userId ? await getUserTier(userId) : 'FREE';
    const maxVideos = getTierLimit('shadowingVideos', tier);
    const maxDurationMinutes = getTierLimit('shadowingVideoDurationMinutes', tier);

    // 1. Kiểm tra xem video đã có trong kho cache dùng chung chưa
    const existing = await getVideoByYoutubeId(youtubeId);
    if (existing) {
        if (existing.is_system) {
            return {
                valid: false,
                reason: 'ALREADY_IN_SYSTEM',
                isManual: true,
                youtubeId,
                title: existing.title,
                channel: existing.channel,
                duration: existing.duration,
                message: 'Video này đã có sẵn trong Thư viện hệ thống. Bạn có thể luyện tập ngay mà không tốn lượt lưu cá nhân.',
            };
        }

        if (userId && (await hasUserSavedVideo(userId, existing.id))) {
            return {
                valid: false,
                reason: 'ALREADY_EXISTS',
                isManual: true,
                youtubeId,
                title: existing.title,
                channel: existing.channel,
                duration: existing.duration,
                message: 'Video này đã có trong thư viện cá nhân của bạn.',
            };
        }

        if (userId && maxVideos !== -1) {
            const currentCount = await countUserVideos(userId);
            if (currentCount >= maxVideos) {
                return {
                    valid: false,
                    reason: 'LIMIT_REACHED',
                    isManual: true,
                    youtubeId,
                    title: existing.title,
                    channel: existing.channel,
                    duration: existing.duration,
                    message: buildLimitErrorMessage(maxVideos, tier),
                };
            }
        }

        if (
            userId &&
            maxDurationMinutes !== -1 &&
            existing.duration > maxDurationMinutes * 60
        ) {
            return {
                valid: false,
                reason: 'DURATION_EXCEEDED',
                isManual: true,
                youtubeId,
                title: existing.title,
                channel: existing.channel,
                duration: existing.duration,
                message: buildDurationErrorMessage(maxDurationMinutes, tier),
            };
        }

        return {
            valid: true,
            reason: 'OK',
            isManual: true,
            cachedInCatalog: true,
            youtubeId,
            title: existing.title,
            channel: existing.channel,
            duration: existing.duration,
            message: 'Video hợp lệ và đã có sẵn dữ liệu phụ đề, sẵn sàng thêm vào thư viện cá nhân!',
        };
    }

    // 2. Nếu là video mới hoàn toàn -> kiểm tra số lượng slot trước khi gọi YouTube API
    if (userId && maxVideos !== -1) {
        const currentCount = await countUserVideos(userId);
        if (currentCount >= maxVideos) {
            return {
                valid: false,
                reason: 'LIMIT_REACHED',
                isManual: false,
                youtubeId,
                message: buildLimitErrorMessage(maxVideos, tier),
            };
        }
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
        console.warn(`[Shadowing] oEmbed thất bại cho video ${youtubeId}, sử dụng tiêu đề mặc định.`);
    }

    const { tracks: captionTracks, durationSeconds } = await fetchYoutubeVideoMeta(youtubeId);
    if (!captionTracks || captionTracks.length === 0) {
        return {
            valid: false,
            reason: 'NO_SUBTITLES',
            isManual: false,
            youtubeId,
            title,
            channel,
            duration: durationSeconds,
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
            duration: durationSeconds,
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
            duration: durationSeconds,
            message: 'Video này sử dụng phụ đề tự động (Auto-generated) nên việc ngắt câu và đồng bộ thời gian chưa chuẩn xác. Vui lòng sử dụng video có phụ đề được biên dịch thủ công để tối ưu hiệu quả luyện tập Shadowing.',
        };
    }

    // Kiểm tra giới hạn thời lượng video theo gói hội viên
    if (
        userId &&
        maxDurationMinutes !== -1 &&
        durationSeconds > 0 &&
        durationSeconds > maxDurationMinutes * 60
    ) {
        return {
            valid: false,
            reason: 'DURATION_EXCEEDED',
            isManual: true,
            youtubeId,
            title,
            channel,
            duration: durationSeconds,
            message: buildDurationErrorMessage(maxDurationMinutes, tier),
        };
    }

    return {
        valid: true,
        reason: 'OK',
        isManual: true,
        youtubeId,
        title,
        channel,
        duration: durationSeconds,
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

export const addVideo = async (youtubeUrl: string, userId: string) => {
    const subCheck = await checkManualSub(youtubeUrl, userId);
    if (!subCheck.valid || !subCheck.isManual) {
        let statusCode = 422;
        if (subCheck.reason === 'ALREADY_EXISTS' || subCheck.reason === 'ALREADY_IN_SYSTEM') {
            statusCode = 409;
        } else if (subCheck.reason === 'LIMIT_REACHED' || subCheck.reason === 'DURATION_EXCEEDED') {
            statusCode = 403;
        }
        throw new AppError(
            subCheck.message || 'Video không đáp ứng tiêu chuẩn phụ đề thủ công.',
            statusCode
        );
    }

    const youtubeId = subCheck.youtubeId!;

    // Trường hợp video đã có trong kho cache dùng chung -> chỉ gắn vào thư viện cá nhân của user
    if (subCheck.cachedInCatalog) {
        const existing = await getVideoByYoutubeId(youtubeId);
        if (existing) {
            await linkUserVideo(userId, existing.id);
            const segmentsCount = await countSegmentsByVideoId(existing.id);
            return {
                videoId: existing.id,
                segmentsCount,
                title: existing.title,
                reusedCache: true,
            };
        }
    }

    if (!subCheck.track) {
        throw new AppError('Không tìm thấy track phụ đề thủ công hợp lệ.', 422);
    }

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
    } catch {
        throw new AppError('Không thể tải hoặc phân tích nội dung phụ đề thủ công.', 422);
    }

    if (!transcriptItems || transcriptItems.length === 0) {
        throw new AppError('Video này không có nội dung phụ đề hợp lệ.', 422);
    }

    const lastItem = transcriptItems[transcriptItems.length - 1];
    const transcriptDuration = Math.ceil(((lastItem?.offset ?? 0) + (lastItem?.duration ?? 0)) / 1000);
    const duration = subCheck.duration && subCheck.duration > 0 ? subCheck.duration : transcriptDuration;

    // Kiểm tra lại thời lượng trong trường hợp InnerTube không trả lengthSeconds
    const tier = await getUserTier(userId);
    const maxDurationMinutes = getTierLimit('shadowingVideoDurationMinutes', tier);
    if (maxDurationMinutes !== -1 && duration > maxDurationMinutes * 60) {
        throw new AppError(buildDurationErrorMessage(maxDurationMinutes, tier), 403);
    }

    const segments = transcriptItems.map((item, index) => ({
        start_time: item.offset / 1000,
        end_time: (item.offset + item.duration) / 1000,
        transcript: item.text.replace(/\n/g, ' ').trim(),
        order_index: index + 1,
    }));

    const result = await createVideoWithSegmentsAndLink(
        userId,
        { youtube_id: youtubeId, title, channel, duration },
        segments
    );

    return {
        videoId: result.videoId,
        segmentsCount: result.segmentsCount,
        title,
        reusedCache: result.reusedCache,
    };
};

export const deleteUserVideo = async (userId: string, videoId: string): Promise<void> => {
    const video = await getVideoById(videoId);
    if (!video) {
        throw new AppError('Video không tồn tại.', 404);
    }

    const isSaved = await hasUserSavedVideo(userId, videoId);
    if (!isSaved) {
        if (video.is_system) {
            throw new AppError('Không thể xóa video thuộc thư viện hệ thống.', 403);
        }
        throw new AppError('Bạn không có quyền xóa video này.', 403);
    }

    await unlinkUserVideo(userId, videoId);
};

export interface PronunciationQuotaInfo {
    usedToday: number;
    limitToday: number;
    remaining: number;
    tier: Tier;
}

export class PronunciationQuotaError extends AppError {
    public usedToday: number;
    public limitToday: number;
    public tier: Tier;

    constructor(message: string, usedToday: number, limitToday: number, tier: Tier) {
        super(message, 429);
        this.usedToday = usedToday;
        this.limitToday = limitToday;
        this.tier = tier;
    }
}

const PRONUNCIATION_DAILY_TTL_SECONDS = 90000; // 25 giờ để tự reset qua ngày mới UTC+7

function getPronunciationRedisKey(userId: string): string {
    return `pronunciation:daily_count:${userId}:${getVNDateKey()}`;
}

export const getPronunciationQuota = async (userId: string): Promise<PronunciationQuotaInfo> => {
    const tier = await getUserTier(userId);
    const limitToday: number = getTierLimit('pronunciationSentencesPerDay', tier);
    let usedToday = 0;

    try {
        const rawCount = await redis.get(getPronunciationRedisKey(userId));
        usedToday = parseInt(rawCount || '0', 10) || 0;
    } catch (err) {
        console.warn('[Pronunciation Quota] Không thể đọc Redis, tạm fallback về 0:', err);
    }

    const remaining = limitToday === -1 ? -1 : Math.max(0, limitToday - usedToday);
    return {
        usedToday,
        limitToday,
        remaining,
        tier,
    };
};

async function incrementPronunciationUsage(userId: string): Promise<void> {
    try {
        const key = getPronunciationRedisKey(userId);
        await redis.incr(key);
        await redis.expire(key, PRONUNCIATION_DAILY_TTL_SECONDS);
    } catch (err) {
        console.warn('[Pronunciation Quota] Không thể cập nhật bộ đếm Redis:', err);
    }
}

export const analyzeAudio = async (
    audioBuffer: Buffer,
    audioMimetype: string,
    segmentId: string,
    userId: string | null
) => {
    const segment = await getSegmentById(segmentId);
    if (!segment) throw new AppError('Không tìm thấy đoạn phụ đề này.', 404);

    if (userId) {
        const hasAccess = await userHasVideoAccess(userId, segment.video_id);
        if (!hasAccess) {
            throw new AppError('Bạn chưa thêm video này vào thư viện cá nhân.', 403);
        }

        const quota = await getPronunciationQuota(userId);
        if (quota.limitToday !== -1 && quota.usedToday >= quota.limitToday) {
            throw new PronunciationQuotaError(
                `Bạn đã dùng hết ${quota.limitToday} lượt luyện phát âm AI hôm nay cho gói ${quota.tier}. Nâng cấp gói để luyện tập nhiều hơn!`,
                quota.usedToday,
                quota.limitToday,
                quota.tier
            );
        }
    }

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

    let updatedQuota: PronunciationQuotaInfo | undefined;
    if (userId) {
        await incrementPronunciationUsage(userId);
        await saveUserHistory(userId, segment.video_id, segmentId, accuracy);
        await updateStreak(userId);
        // Tính thời lượng câu (giây) từ segment để cộng dồn tiến trình
        const durationSeconds = segment.end_time && segment.start_time
            ? (segment.end_time - segment.start_time)
            : 10;
        const secondsToStore = Math.round(durationSeconds);
        await updateAchievementProgress(userId, 'shadowing_minutes_studied', secondsToStore);
        await updateGoalProgress(userId, 'shadowing_minutes_studied', secondsToStore);
        updatedQuota = await getPronunciationQuota(userId);
    }

    return {
        spokenText,
        referenceText,
        accuracy,
        feedback: tokens,
        quota: updatedQuota,
    };
};

// ─── Gemini AI Summary ─────────────────────────────────────────────────────────────────

export interface GeminiSummary {
    summaryEn?: string;
    summary: string;
    vocabulary: Array<{
        word: string;
        ipa: string;
        partOfSpeech: string;
        definition: string;
        exampleSentence: string;
    }>;
}

function buildTranscriptForGemini(segments: Array<{ transcript: string }>): string {
    const fullTranscript = segments.map((s) => s.transcript).join(' ').trim();
    if (fullTranscript.length <= MAX_GEMINI_TRANSCRIPT_CHARS) {
        return fullTranscript;
    }
    // Video quá dài: lấy đều phần đầu, giữa và cuối để giữ trọn mạch nội dung mà không vượt ngưỡng token
    const chunkSize = Math.floor(MAX_GEMINI_TRANSCRIPT_CHARS / 3);
    const midStart = Math.floor((fullTranscript.length - chunkSize) / 2);
    const startPart = fullTranscript.slice(0, chunkSize);
    const midPart = fullTranscript.slice(midStart, midStart + chunkSize);
    const endPart = fullTranscript.slice(fullTranscript.length - chunkSize);
    return `${startPart}\n...\n${midPart}\n...\n${endPart}`;
}

export const getVideoSummary = async (videoId: string, userId: string): Promise<GeminiSummary> => {
    const video = await getVideoById(videoId);
    if (!video) throw new AppError('Video không tồn tại.', 404);

    const hasAccess = await userHasVideoAccess(userId, videoId);
    if (!hasAccess) {
        throw new AppError('Bạn chưa thêm video này vào thư viện cá nhân.', 403);
    }

    // 1. Kiểm tra cache dùng chung trong DB trước
    const cached = await getVideoAiSummary(videoId);
    if (cached) return cached as GeminiSummary;

    // 2. Chưa có cache -> lấy phụ đề và gọi Gemini một lần duy nhất
    const segments = await getSegmentsByVideoId(videoId);
    if (!segments.length) throw new AppError('Video không có phụ đề để phân tích.', 422);

    const transcript = buildTranscriptForGemini(segments);

    const prompt = `
You are an English learning assistant. Analyze the following transcript from a YouTube video.
Return a JSON object with EXACTLY this structure (no markdown, no code blocks, raw JSON only):
{
  "summaryEn": "A natural 3-4 sentence summary in English that covers the core ideas of the video and naturally weaves in the most important vocabulary from the talk.",
  "summary": "Bản dịch tiếng Việt tự nhiên, sát nghĩa với đoạn summaryEn ở trên (3-4 câu).",
  "vocabulary": [
    {
      "word": "the English word or phrase",
      "ipa": "/IPA/",
      "partOfSpeech": "noun | verb | adjective | adverb | phrase",
      "definition": "Giải nghĩa ngắn gọn bằng tiếng Việt theo đúng ngữ cảnh video này",
      "exampleSentence": "A short sentence from summaryEn or the transcript using this word"
    }
  ]
}
Rules:
- The "vocabulary" array must contain exactly 10 high-value entries (or fewer only if the transcript is very short).
- Prioritize valuable words/phrases that appear in "summaryEn" and in the video transcript itself; avoid trivial everyday words.
- Definitions MUST be context-aware in Vietnamese based on how the word is used in THIS video.
- Sort vocabulary by importance (most important first).

Transcript:
${transcript}
`;

    let result: GeminiSummary;
    try {
        const text = await callGeminiWithRetry(prompt);
        console.log('[Gemini] Raw response:', text.substring(0, 50) + '...');
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

    // 3. Lưu cache vào shadowing_videos để mọi người dùng về sau đều tái sử dụng không tốn token
    await updateVideoAiSummary(videoId, result);

    return result;
};

// ─── Notebook Service ─────────────────────────────────────────────────────────────────

export const fetchNote = async (userId: string, videoId: string): Promise<string> => {
    const hasAccess = await userHasVideoAccess(userId, videoId);
    if (!hasAccess) {
        throw new AppError('Bạn chưa thêm video này vào thư viện cá nhân.', 403);
    }
    return getNote(userId, videoId);
};

export const saveNote = async (userId: string, videoId: string, content: string): Promise<void> => {
    const hasAccess = await userHasVideoAccess(userId, videoId);
    if (!hasAccess) {
        throw new AppError('Bạn chưa thêm video này vào thư viện cá nhân.', 403);
    }
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
