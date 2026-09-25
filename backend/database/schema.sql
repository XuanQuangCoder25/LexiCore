-- A. AUTH
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM(
        'USER',
        'ADMIN',
        'CONTENT_CREATOR'
    ) DEFAULT 'USER',
    status ENUM('PENDING', 'ACTIVE', 'BANNED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    type ENUM('REGISTER', 'FORGOT_PASSWORD') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- B. GAMIFICATION

-- 1. Bảng Ví & Streak
CREATE TABLE wallets (
    user_id VARCHAR(36) PRIMARY KEY,
    coin_balance INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_study_date DATE,
    previous_streak INT DEFAULT 0,
    diamond_balance INT DEFAULT 0,
    exp INT DEFAULT 0,
    level INT DEFAULT 1,
    rank_point INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 2. Bảng Lịch sử giao dịch (Sử dụng JSON cho metadata)
CREATE TABLE billing_transactions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    amount INT NOT NULL,
    transaction_type ENUM(
        'EARN_DAILY_GOAL',
        'EARN_ACHIEVEMENT',
        'EARN_SHADOWING',
        'EARN_STREAK',
        'BUY_ITEM',
        'PVP_REWARD',
        'LEVEL_UP_REWARD'
    ) NOT NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 3. Bảng Vật phẩm (Shop)
CREATE TABLE items (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM(
        'STREAK_FREEZE',
        'STREAK_RESTORE',
        'AVATAR',
        'COVER_PHOTO'
    ) NOT NULL,
    price INT NOT NULL,
    description TEXT,
    price_type ENUM('COIN', 'DIAMOND') DEFAULT 'COIN', -- Để biết mua bằng Coin hay Diamond
    image_url VARCHAR(500),
    required_level INT DEFAULT 1
);

-- 4. Bảng Túi đồ của User (Inventory)
CREATE TABLE user_items (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    item_id VARCHAR(36) NOT NULL,
    quantity INT DEFAULT 1,
    is_active BOOLEAN DEFAULT FALSE,
    UNIQUE KEY uq_user_item (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
);

-- 5.  Bảng định nghĩa các thành tựu
CREATE TABLE achievement_definitions (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category ENUM(
        'LEARNING',
        'STREAK',
        'PVP',
        'COLLECTION'
    ) NOT NULL,
    target_value INT NOT NULL, -- Ví dụ: 30 (ngày streak), 50 (bài shadowing)
    metric_key VARCHAR(50) NOT NULL, -- Ví dụ: 'shadowing_count', 'current_streak'
    reward_coin INT DEFAULT 0,
    reward_diamond INT DEFAULT 0,
    reward_exp INT DEFAULT 0
);

-- 6. Bảng tiến trình thành tựu của user
CREATE TABLE user_achievements (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    achievement_id VARCHAR(36) NOT NULL,
    current_progress INT DEFAULT 0,
    is_unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMP NULL,
    UNIQUE KEY uq_user_achievement (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievement_definitions (id) ON DELETE CASCADE
);

-- 7. Bảng định nghĩa nhiệm vụ hàng ngày
CREATE TABLE daily_goal_definitions (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    metric_key VARCHAR(50) NOT NULL, -- 'shadowing_count', 'vocab_studied'
    target_value INT NOT NULL, -- Ví dụ: 5 (câu shadowing)
    reward_coin INT DEFAULT 50,
    reward_exp INT DEFAULT 20,
    type ENUM('DAILY', 'WEEKLY') DEFAULT 'DAILY',
    is_active BOOLEAN DEFAULT TRUE
);

-- 8. Bảng tiến trình nhiệm vụ hàng ngày của user
CREATE TABLE user_daily_goals (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    goal_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    current_progress INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    is_claimed BOOLEAN DEFAULT FALSE,
    UNIQUE KEY uq_user_goal_date (user_id, goal_id, date),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (goal_id) REFERENCES daily_goal_definitions (id) ON DELETE CASCADE
);

-- 9. Bảng định nghĩa bộ sưu tập theo level
CREATE TABLE collections (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    unlock_level INT NOT NULL,
    theme_color VARCHAR(20)
);

-- Các vật phẩm thuộc Collection thì được gắn collection_id trong bảng items
ALTER TABLE items
ADD COLUMN collection_id VARCHAR(36) NULL,
ADD FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE SET NULL;

-- 10. Bảng lưu collection mà user đã mở khóa
CREATE TABLE user_collections (
    user_id VARCHAR(36) NOT NULL,
    collection_id VARCHAR(36) NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, collection_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE
);

-- C. AI VOICE ANALYSIS (SHADOWING)

-- 1. Bảng lưu trữ Video YouTube
CREATE TABLE shadowing_videos (
    id VARCHAR(36) PRIMARY KEY,
    youtube_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    channel VARCHAR(100),
    duration INT,
    difficulty ENUM(
        'Beginner',
        'Intermediate',
        'Advanced'
    ) DEFAULT 'Intermediate',
    ai_summary JSON, -- Cache tóm tắt & từ vựng từ Gemini AI (lazy-load, lưu 1 lần dùng mãi)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng lưu trữ Phụ đề (Transcripts/Segments) của Video
CREATE TABLE shadowing_segments (
    id VARCHAR(36) PRIMARY KEY,
    video_id VARCHAR(36) NOT NULL,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    transcript TEXT NOT NULL,
    order_index INT NOT NULL,
    FOREIGN KEY (video_id) REFERENCES shadowing_videos (id) ON DELETE CASCADE
);

-- 3. Bảng lưu trữ Lịch sử luyện tập Shadowing của User
CREATE TABLE user_shadowing_history (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    video_id VARCHAR(36) NOT NULL,
    segment_id VARCHAR(36) NOT NULL,
    accuracy_score INT NOT NULL,
    audio_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES shadowing_videos (id) ON DELETE CASCADE,
    FOREIGN KEY (segment_id) REFERENCES shadowing_segments (id) ON DELETE CASCADE
);

-- 5. Sổ tay cá nhân của mỗi User cho từng Video
CREATE TABLE shadowing_notes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    video_id VARCHAR(36) NOT NULL,
    content TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_video_note (user_id, video_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES shadowing_videos (id) ON DELETE CASCADE
);