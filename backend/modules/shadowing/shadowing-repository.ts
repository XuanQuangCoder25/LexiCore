import { pool } from '../../config/mysql';
import { v4 as uuidv4 } from 'uuid';

export const getVideos = async () => {
    const [rows] = await pool.execute(
        `SELECT id, youtube_id, title, channel, duration, difficulty, created_at 
         FROM shadowing_videos 
         ORDER BY created_at DESC`
    );
    return rows as any[];
};

export const getVideoById = async (id: string) => {
    const [rows] = await pool.execute(
        `SELECT id, youtube_id, title, channel, duration, difficulty 
         FROM shadowing_videos 
         WHERE id = ? LIMIT 1`,
        [id]
    );
    const videos = rows as any[];
    return videos.length > 0 ? videos[0] : null;
};

export const getVideoByYoutubeId = async (youtubeId: string) => {
    const [rows] = await pool.execute(
        `SELECT id FROM shadowing_videos WHERE youtube_id = ? LIMIT 1`,
        [youtubeId]
    );
    const videos = rows as any[];
    return videos.length > 0 ? videos[0] : null;
};

export const insertVideo = async (data: {
    youtube_id: string;
    title: string;
    channel: string;
    duration: number;
    difficulty: string;
}) => {
    const id = uuidv4();
    await pool.execute(
        `INSERT INTO shadowing_videos (id, youtube_id, title, channel, duration, difficulty)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, data.youtube_id, data.title, data.channel, data.duration, data.difficulty]
    );
    return id;
};

export const insertSegments = async (
    videoId: string,
    segments: Array<{ start_time: number; end_time: number; transcript: string; order_index: number }>
) => {
    for (const seg of segments) {
        await pool.execute(
            `INSERT INTO shadowing_segments (id, video_id, start_time, end_time, transcript, order_index)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), videoId, seg.start_time, seg.end_time, seg.transcript, seg.order_index]
        );
    }
};

export const getSegmentById = async (id: string) => {
    const [rows] = await pool.execute(
        `SELECT id, video_id, transcript FROM shadowing_segments WHERE id = ? LIMIT 1`,
        [id]
    );
    const segs = rows as any[];
    return segs.length > 0 ? segs[0] : null;
};

export const getSegmentsByVideoId = async (videoId: string) => {
    const [rows] = await pool.execute(
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
