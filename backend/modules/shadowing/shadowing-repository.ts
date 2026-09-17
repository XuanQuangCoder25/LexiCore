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

// Seed function for development
export const seedSampleVideo = async () => {
    const videoId = "test-vid-1";
    
    // Check if exists
    const existing = await getVideoById(videoId);
    if (existing) return videoId;

    await pool.execute(
        `INSERT INTO shadowing_videos (id, youtube_id, title, channel, duration, difficulty)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [videoId, 'iCvmsMzlF7o', 'TED Talk: The Power of Vulnerability', 'TED', 1219, 'Advanced']
    );

    // Seed segments
    const segments = [
        { id: uuidv4(), start_time: 323, end_time: 327, transcript: "So I had a choice. I could go back to the way things were,", order: 1 },
        { id: uuidv4(), start_time: 327, end_time: 332, transcript: "or I could be brave and continue this vulnerable conversation.", order: 2 },
        { id: uuidv4(), start_time: 332, end_time: 337, transcript: "And that's when I learned something about vulnerability.", order: 3 }
    ];

    for (const seg of segments) {
        await pool.execute(
            `INSERT INTO shadowing_segments (id, video_id, start_time, end_time, transcript, order_index)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [seg.id, videoId, seg.start_time, seg.end_time, seg.transcript, seg.order]
        );
    }
    return videoId;
};
