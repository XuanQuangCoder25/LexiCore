-- A. AUTH
-- 1. Bảng users
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
    creator_status ENUM('ACTIVE', 'SUSPENDED') NULL DEFAULT NULL,
    avatar_url VARCHAR(255) NULL,
    cover_url VARCHAR(255) NULL,
    has_used_trial BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Da kich hoat goi trial mac dinh khi dang ky chua',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Bảng đơn xin làm Creator
CREATE TABLE creator_applications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    qualifications TEXT,
    status ENUM(
        'PENDING',
        'APPROVED',
        'REJECTED'
    ) DEFAULT 'PENDING',
    admin_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
    vnd_balance INT NOT NULL DEFAULT 0 COMMENT 'So du Vi LexiCore (VND thuc)',
    exp INT DEFAULT 0,
    level INT DEFAULT 1,
    rank_point INT DEFAULT 0,
    leaderboard_point INT DEFAULT 0,
    arena_rank ENUM(
        'BRONZE',
        'SILVER',
        'GOLD',
        'PLATINUM_1',
        'PLATINUM_2',
        'SAPPHIRE_1',
        'SAPPHIRE_2',
        'EMERALD_1',
        'EMERALD_2',
        'DIAMOND_1',
        'DIAMOND_2',
        'MASTER_1',
        'MASTER_2',
        'MASTER_3'
    ) DEFAULT 'BRONZE',
    arena_highest_rank ENUM(
        'BRONZE',
        'SILVER',
        'GOLD',
        'PLATINUM_1',
        'PLATINUM_2',
        'SAPPHIRE_1',
        'SAPPHIRE_2',
        'EMERALD_1',
        'EMERALD_2',
        'DIAMOND_1',
        'DIAMOND_2',
        'MASTER_1',
        'MASTER_2',
        'MASTER_3'
    ) DEFAULT 'BRONZE',
    arena_current_win_streak INT DEFAULT 0,
    arena_longest_win_streak INT DEFAULT 0,
    arena_total_wins INT DEFAULT 0,
    arena_total_losses INT DEFAULT 0,
    arena_total_draws INT DEFAULT 0,
    arena_total_matches INT DEFAULT 0,
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
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price_type ENUM('COIN', 'DIAMOND') DEFAULT 'COIN',
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
    reward_exp INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE
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

INSERT INTO
    daily_goal_definitions (
        id,
        title,
        description,
        icon,
        metric_key,
        target_value,
        reward_coin,
        reward_exp,
        type
    )
VALUES (
        'goal_1',
        'PvP',
        'Hoàn thành 1 trận PvP',
        'Swords',
        'pvp_match_played',
        1,
        50,
        50,
        'DAILY'
    ),
    (
        'goal_4',
        'PvP',
        'Hoàn thành 10 trận PvP',
        'Swords',
        'pvp_match_played',
        10,
        600,
        600,
        'WEEKLY'
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
    theme_color VARCHAR(20),
    is_deleted BOOLEAN DEFAULT FALSE
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

-- D. PVP ARENA
-- 1. Kho từ vựng Arena
CREATE TABLE arena_words (
    id VARCHAR(36) PRIMARY KEY,
    word VARCHAR(150) NOT NULL,
    meaning VARCHAR(255) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    level ENUM(
        'A1',
        'A2',
        'B1',
        'B2',
        'C1',
        'C2'
    ) NOT NULL,
    word_type ENUM(
        'noun',
        'verb',
        'adjective',
        'adverb',
        'phrase',
        'noun_phrase',
        'verb_phrase',
        'idiom',
        'collocation'
    ) NOT NULL DEFAULT 'noun',
    example TEXT NULL,
    created_by VARCHAR(36) NULL, -- Admin ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_arena_words_topic (topic),
    INDEX idx_arena_words_level (level),
    INDEX idx_arena_words_type (word_type),
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
);

-- 2. Lịch sử các ván đấu PvP
CREATE TABLE arena_matches (
    id VARCHAR(36) PRIMARY KEY,
    player1_id VARCHAR(36) NOT NULL,
    player2_id VARCHAR(36) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    rank_snapshot ENUM(
        'BRONZE',
        'SILVER',
        'GOLD',
        'PLATINUM_1',
        'PLATINUM_2',
        'SAPPHIRE_1',
        'SAPPHIRE_2',
        'EMERALD_1',
        'EMERALD_2',
        'DIAMOND_1',
        'DIAMOND_2',
        'MASTER_1',
        'MASTER_2',
        'MASTER_3'
    ) NOT NULL,
    total_questions INT NOT NULL DEFAULT 25,
    time_limit_sec INT NOT NULL DEFAULT 360, -- 6 phút = 360 giây
    p1_correct INT DEFAULT 0, -- Kết quả player 1
    p1_time_used_ms INT DEFAULT 0,
    p2_correct INT DEFAULT 0, -- Kết quả player 2
    p2_time_used_ms INT DEFAULT 0,
    winner_id VARCHAR(36) NULL, -- Kết quả ván đấu (NULL = hoà)
    result ENUM('P1_WIN', 'P2_WIN', 'DRAW') NOT NULL,
    p1_points_change INT DEFAULT 0, -- Thay đổi điểm Arena (+25 / -15 / 0)
    p2_points_change INT DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (player1_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (player2_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_arena_matches_p1 (player1_id),
    INDEX idx_arena_matches_p2 (player2_id),
    INDEX idx_arena_matches_started (started_at)
);

-- 3. Chi tiết từng câu hỏi trong ván đấu
-- Dùng để hiển thị màn hình tổng kết (xanh/đỏ cho từng từ) sau ván
CREATE TABLE arena_match_words (
    id VARCHAR(36) PRIMARY KEY,
    match_id VARCHAR(36) NOT NULL,
    word_id VARCHAR(36) NOT NULL,
    order_index TINYINT NOT NULL, -- Thứ tự câu hỏi (1..25)
    p1_answer VARCHAR(150) NULL, -- Đáp án player 1 nhập
    p1_correct BOOLEAN DEFAULT FALSE,
    p1_time_ms INT DEFAULT 0, -- Thời gian trả lời (ms)
    p2_answer VARCHAR(150) NULL,
    p2_correct BOOLEAN DEFAULT FALSE,
    p2_time_ms INT DEFAULT 0,
    FOREIGN KEY (match_id) REFERENCES arena_matches (id) ON DELETE CASCADE,
    FOREIGN KEY (word_id) REFERENCES arena_words (id) ON DELETE CASCADE,
    INDEX idx_match_words_match (match_id)
);

-- E. PAYMENT & CREDIT PACKAGES
-- 1. Bảng danh mục gói nạp và subscription
CREATE TABLE IF NOT EXISTS credit_packages (
    id VARCHAR(36) PRIMARY KEY DEFAULT(UUID()),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE, -- VD: sub-starter-monthly, coin-small, diamond-large
    package_type ENUM(
        'SUBSCRIPTION',
        'COIN_PACK',
        'DIAMOND_PACK',
        'BUNDLE'
    ) NOT NULL,
    tier ENUM(
        'STARTER',
        'PRO',
        'ELITE',
        'TRIAL'
    ) NULL,
    is_trial BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE = goi dung thu (trial default hoac campaign)',
    available_from DATETIME NULL COMMENT 'Campaign: goi chi hien tu ngay nay (NULL = hien luon)',
    available_until DATETIME NULL COMMENT 'Campaign: goi tu an sau ngay nay (NULL = khong gioi han)',
    price_vnd INT NOT NULL DEFAULT 0,
    price_usd DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    coin_amount INT NOT NULL DEFAULT 0,
    diamond_amount INT NOT NULL DEFAULT 0,
    duration_days INT NULL, -- Thời hạn subscription (ngày), NULL = không có subscription
    sale_percent INT NOT NULL DEFAULT 0, -- Sale
    sale_ends_at DATETIME NULL,
    features JSON NULL, -- Danh sách features dạng JSON array
    display_order INT NOT NULL DEFAULT 0, -- Thứ tự hiển thị
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Bảng lịch sử đơn thanh toán
CREATE TABLE IF NOT EXISTS payment_orders (
    id VARCHAR(36) PRIMARY KEY DEFAULT(UUID()),
    user_id VARCHAR(36) NOT NULL,
    package_id VARCHAR(36) NOT NULL,
    amount_vnd INT NOT NULL, -- Số tiền thực tế tính phí (sau giảm giá)
    gateway ENUM('SEPAY', 'WALLET', 'MOCK') NOT NULL DEFAULT 'SEPAY',
    payment_reference VARCHAR(50) UNIQUE NULL COMMENT 'Ma tham chieu noi dung chuyen khoan (SePay match noi dung VietQR)',
    status ENUM(
        'PENDING',
        'SUCCESS',
        'FAILED',
        'CANCELLED',
        'REFUNDED'
    ) NOT NULL DEFAULT 'PENDING',
    gateway_txn_id VARCHAR(255) NULL, -- Mã giao dịch từ gateway
    gateway_response JSON NULL,
    metadata JSON NULL, -- Metadata bổ sung
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_payment_orders_user (user_id, status),
    INDEX idx_payment_orders_gateway_txn (gateway_txn_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES credit_packages (id)
);

-- 3. Bảng lưu trạng thái gói hội viên hiện tại của từng user
CREATE TABLE IF NOT EXISTS user_subscription (
    id VARCHAR(36) PRIMARY KEY DEFAULT(UUID()),
    user_id VARCHAR(36) NOT NULL UNIQUE,
    package_id VARCHAR(36) NOT NULL,
    tier ENUM(
        'STARTER',
        'PRO',
        'ELITE',
        'TRIAL'
    ) NOT NULL,
    duration_days INT NOT NULL DEFAULT 30 COMMENT 'Số ngày của gói (7 / 30 / 365) - dùng cho prorated và tự động gia hạn',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    email_reminder BOOLEAN NOT NULL DEFAULT TRUE,
    status ENUM(
        'ACTIVE',
        'EXPIRED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES credit_packages (id),
    INDEX idx_sub_expires (expires_at, status),
    INDEX idx_sub_autorenew (
        auto_renew,
        expires_at,
        status
    )
);

-- 4. Hiển thị thông báo của admin (Tab "Thông tin" trong SubscriptionModal)
CREATE TABLE IF NOT EXISTS payment_announcements (
    id VARCHAR(36) PRIMARY KEY DEFAULT(UUID()),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL COMMENT 'Hỗ trợ Markdown định dạng văn bản (in đậm, danh sách...)',
    type ENUM(
        'INFO',
        'SALE',
        'NEW_FEATURE',
        'POLICY'
    ) NOT NULL DEFAULT 'INFO',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at DATETIME NULL COMMENT 'NULL = hiển thị ngay',
    ends_at DATETIME NULL COMMENT 'NULL = hiển thị vô thời hạn',
    created_by VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_ann_active (is_active, ends_at)
);

-- 5. Bảng quản lý chiến dịch sự kiện của Admin
CREATE TABLE subscription_campaigns (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- Ví dụ: 'Mừng tựu trường', 'Kỷ niệm thành lập'
    tier ENUM('STARTER', 'PRO', 'ELITE') NOT NULL,
    duration_days INT NOT NULL,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng theo dõi lượt nhận quà (Mỗi user nhận đúng 1 lần / chiến dịch)
CREATE TABLE user_campaign_claims (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    campaign_id VARCHAR(36) NOT NULL,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_trial (user_id, campaign_id) -- Mỗi user chỉ được nhận 1 lần trong suốt đợt
);

-- X. NOTIFICATIONS & SETTINGS
-- 1. Bảng Cài đặt người dùng (Nhắc nhở học tập)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id VARCHAR(36) PRIMARY KEY,
    enable_email_reminder BOOLEAN DEFAULT TRUE,
    enable_in_app_reminder BOOLEAN DEFAULT TRUE,
    reminder_time VARCHAR(10) DEFAULT '20:00',
    timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 2. Bảng Thông báo trong ứng dụng (In-app notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) DEFAULT 'reminder',
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_created (created_at)
);

-- Y. FRIENDS & DIRECT MESSAGING
-- 1. Quan hệ kết bạn (pair_key = "<id nhỏ>:<id lớn>" do service tính, chặn trùng hai chiều)
-- Với status 'blocked', requester_id là người chặn.
CREATE TABLE IF NOT EXISTS friendships (
    id VARCHAR(36) PRIMARY KEY,
    requester_id VARCHAR(36) NOT NULL,
    receiver_id VARCHAR(36) NOT NULL,
    pair_key VARCHAR(73) NOT NULL,
    status ENUM(
        'pending',
        'accepted',
        'rejected',
        'blocked'
    ) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_friendship_pair (pair_key),
    INDEX idx_friendships_receiver (receiver_id, status),
    INDEX idx_friendships_requester (requester_id, status),
    FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 2. Phòng chat 1-1 (luôn lưu user1_id < user2_id)
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(36) PRIMARY KEY,
    user1_id VARCHAR(36) NOT NULL,
    user2_id VARCHAR(36) NOT NULL,
    last_message_at TIMESTAMP(3) NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_conversation_pair (user1_id, user2_id),
    INDEX idx_conversations_user2 (user2_id),
    INDEX idx_conversations_last_message (last_message_at),
    FOREIGN KEY (user1_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 3. Tin nhắn (id BIGINT tăng dần để phân trang cursor-based)
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP(3) NULL DEFAULT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_messages_conversation_id (conversation_id, id),
    INDEX idx_messages_unread (
        conversation_id,
        sender_id,
        is_read
    ),
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
);