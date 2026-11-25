import { pool } from '../../config/mysql';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

export interface ShadowingVideoRow {
    id: string;
    youtube_id: string;
    title: string;
    channel: string;
    duration: number;
    is_system: number | boolean;
    is_owner?: number | boolean;
    added_at?: string;
    created_at?: string;
}

export interface ShadowingSegmentInput {
    start_time: number;
    end_time: number;
    transcript: string;
    order_index: number;
}

// Lấy danh sách video cá nhân của user kết hợp video thư viện hệ thống (nếu có)
export const getVideosForUser = async (userId: string): Promise<ShadowingVideoRow[]> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT sv.id, sv.youtube_id, sv.title, sv.channel, sv.duration, sv.is_system,
                1 AS is_owner, usv.created_at AS added_at
         FROM user_shadowing_videos usv
         INNER JOIN shadowing_videos sv ON sv.id = usv.video_id
         WHERE usv.user_id = ?

         UNION ALL

         SELECT sv.id, sv.youtube_id, sv.title, sv.channel, sv.duration, sv.is_system,
                0 AS is_owner, sv.created_at AS added_at
         FROM shadowing_videos sv
         WHERE sv.is_system = TRUE
           AND NOT EXISTS (
               SELECT 1 FROM user_shadowing_videos usv2
               WHERE usv2.video_id = sv.id AND usv2.user_id = ?
           )
         ORDER BY is_owner DESC, added_at DESC`,
        [userId, userId]
    );
    return rows as ShadowingVideoRow[];
};

export const countUserVideos = async (userId: string): Promise<number> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS cnt FROM user_shadowing_videos WHERE user_id = ?`,
        [userId]
    );
    return Number(rows[0]?.cnt ?? 0);
};

export const hasUserSavedVideo = async (userId: string, videoId: string): Promise<boolean> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 1 FROM user_shadowing_videos WHERE user_id = ? AND video_id = ? LIMIT 1`,
        [userId, videoId]
    );
    return rows.length > 0;
};

export const userHasVideoAccess = async (userId: string, videoId: string): Promise<boolean> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 1
         FROM shadowing_videos sv
         LEFT JOIN user_shadowing_videos usv
           ON sv.id = usv.video_id AND usv.user_id = ?
         WHERE sv.id = ? AND (sv.is_system = TRUE OR usv.id IS NOT NULL)
         LIMIT 1`,
        [userId, videoId]
    );
    return rows.length > 0;
};

export const getVideoById = async (id: string): Promise<ShadowingVideoRow | null> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, youtube_id, title, channel, duration, is_system
         FROM shadowing_videos
         WHERE id = ? LIMIT 1`,
        [id]
    );
    return rows.length > 0 ? (rows[0] as ShadowingVideoRow) : null;
};

export const getVideoByYoutubeId = async (youtubeId: string): Promise<ShadowingVideoRow | null> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, youtube_id, title, channel, duration, is_system
         FROM shadowing_videos
         WHERE youtube_id = ? LIMIT 1`,
        [youtubeId]
    );
    return rows.length > 0 ? (rows[0] as ShadowingVideoRow) : null;
};

export const countSegmentsByVideoId = async (videoId: string): Promise<number> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS cnt FROM shadowing_segments WHERE video_id = ?`,
        [videoId]
    );
    return Number(rows[0]?.cnt ?? 0);
};

export const linkUserVideo = async (
    userId: string,
    videoId: string,
    conn?: PoolConnection
): Promise<void> => {
    const executor = conn ?? pool;
    await executor.execute(
        `INSERT IGNORE INTO user_shadowing_videos (id, user_id, video_id)
         VALUES (?, ?, ?)`,
        [uuidv4(), userId, videoId]
    );
};

export const unlinkUserVideo = async (userId: string, videoId: string): Promise<number> => {
    const [result] = await pool.execute<ResultSetHeader>(
        `DELETE FROM user_shadowing_videos WHERE user_id = ? AND video_id = ?`,
        [userId, videoId]
    );
    return result.affectedRows;
};

const insertSegmentsBatch = async (
    conn: PoolConnection,
    videoId: string,
    segments: ShadowingSegmentInput[]
): Promise<void> => {
    const CHUNK_SIZE = 200;
    for (let i = 0; i < segments.length; i += CHUNK_SIZE) {
        const chunk = segments.slice(i, i + CHUNK_SIZE);
        const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const values: Array<string | number> = [];
        for (const seg of chunk) {
            values.push(
                uuidv4(),
                videoId,
                seg.start_time,
                seg.end_time,
                seg.transcript,
                seg.order_index
            );
        }
        await conn.execute(
            `INSERT INTO shadowing_segments (id, video_id, start_time, end_time, transcript, order_index)
             VALUES ${placeholders}`,
            values
        );
    }
};

// Lưu video mới cùng danh sách segments và gắn vào thư viện cá nhân của user trong một transaction
export const createVideoWithSegmentsAndLink = async (
    userId: string,
    data: {
        youtube_id: string;
        title: string;
        channel: string;
        duration: number;
    },
    segments: ShadowingSegmentInput[]
): Promise<{ videoId: string; segmentsCount: number; reusedCache: boolean }> => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const videoId = uuidv4();
        await conn.execute(
            `INSERT INTO shadowing_videos (id, youtube_id, title, channel, duration, is_system)
             VALUES (?, ?, ?, ?, ?, FALSE)`,
            [videoId, data.youtube_id, data.title, data.channel, data.duration]
        );
        await insertSegmentsBatch(conn, videoId, segments);
        await linkUserVideo(userId, videoId, conn);
        await conn.commit();
        return { videoId, segmentsCount: segments.length, reusedCache: false };
    } catch (err: any) {
        await conn.rollback();
        // Trường hợp 2 user import cùng một video mới ở cùng thời điểm -> dùng lại bản ghi vừa tạo
        if (err?.code === 'ER_DUP_ENTRY') {
            const existing = await getVideoByYoutubeId(data.youtube_id);
            if (existing) {
                await linkUserVideo(userId, existing.id);
                const segmentsCount = await countSegmentsByVideoId(existing.id);
                return { videoId: existing.id, segmentsCount, reusedCache: true };
            }
        }
        throw err;
    } finally {
        conn.release();
    }
};

export const getSegmentById = async (id: string) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, video_id, start_time, end_time, transcript FROM shadowing_segments WHERE id = ? LIMIT 1`,
        [id]
    );
    return rows.length > 0 ? rows[0] : null;
};

export const getSegmentsByVideoId = async (videoId: string) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, start_time, end_time, transcript, order_index
         FROM shadowing_segments
         WHERE video_id = ?
         ORDER BY order_index ASC`,
        [videoId]
    );
    return rows as any[];
};

export const saveUserHistory = async (userId: string, videoId: string, segmentId: string, score: number) => {
    const id = uuidv4();
    await pool.execute(
        `INSERT INTO user_shadowing_history (id, user_id, video_id, segment_id, accuracy_score)
         VALUES (?, ?, ?, ?, ?)`,
        [id, userId, videoId, segmentId, score]
    );
    return id;
};

// ─── Gemini AI Summary Cache ────────────────────────────────────────────────────

export const getVideoAiSummary = async (videoId: string): Promise<any | null> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT ai_summary FROM shadowing_videos WHERE id = ? LIMIT 1`,
        [videoId]
    );
    if (!rows.length || !rows[0].ai_summary) return null;
    const raw = rows[0].ai_summary;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
};

export const updateVideoAiSummary = async (videoId: string, summary: object): Promise<void> => {
    await pool.execute(
        `UPDATE shadowing_videos SET ai_summary = ? WHERE id = ?`,
        [JSON.stringify(summary), videoId]
    );
};

// ─── Shadowing Notes (Sổ tay) ───────────────────────────────────────────────────

export const getNote = async (userId: string, videoId: string): Promise<string> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT content FROM shadowing_notes WHERE user_id = ? AND video_id = ? LIMIT 1`,
        [userId, videoId]
    );
    return rows.length > 0 ? (rows[0].content ?? '') : '';
};

export const upsertNote = async (userId: string, videoId: string, content: string): Promise<void> => {
    await pool.execute(
        `INSERT INTO shadowing_notes (id, user_id, video_id, content)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE content = VALUES(content), updated_at = CURRENT_TIMESTAMP`,
        [uuidv4(), userId, videoId, content]
    );
};
