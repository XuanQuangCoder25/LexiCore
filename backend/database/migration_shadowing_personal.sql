-- Di chuyển sang cơ chế Thư viện Shadowing cá nhân kết hợp kho dữ liệu dùng chung (Cache)
-- Xóa dữ liệu thử nghiệm cũ để đảm bảo ràng buộc UNIQUE cho youtube_id
DELETE FROM shadowing_videos WHERE id IS NOT NULL;

-- Bổ sung cờ đánh dấu video hệ thống và ràng buộc UNIQUE cho youtube_id
ALTER TABLE shadowing_videos
    ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE AFTER ai_summary,
    ADD UNIQUE KEY uq_shadowing_youtube_id (youtube_id),
    ADD INDEX idx_shadowing_videos_system (is_system);

-- Tạo bảng liên kết lưu thư viện video cá nhân của từng người dùng
CREATE TABLE IF NOT EXISTS user_shadowing_videos (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    video_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_shadowing_video (user_id, video_id),
    INDEX idx_user_shadowing_owner_created (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES shadowing_videos (id) ON DELETE CASCADE
);

-- Kiểm tra kết quả migration
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_NAME = 'shadowing_videos' AND COLUMN_NAME = 'is_system';

SHOW TABLES LIKE 'user_shadowing_videos';
