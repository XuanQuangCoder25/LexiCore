-- ============================================================
-- Migration: Marketing & Campaigns System
-- Chạy trên DataGrip để cập nhật hệ thống Marketing
-- ============================================================

-- BLOCK 1: Thêm cột sale_starts_at vào bảng credit_packages
ALTER TABLE credit_packages
ADD COLUMN IF NOT EXISTS sale_starts_at DATETIME NULL COMMENT 'Ngày bắt đầu đợt giảm giá. NULL = áp dụng ngay lập tức. INCOMING nếu > NOW()';

-- BLOCK 2: Mở rộng bảng subscription_campaigns
ALTER TABLE subscription_campaigns
ADD COLUMN IF NOT EXISTS description TEXT NULL COMMENT 'Mô tả sự kiện hiển thị cho học viên',
ADD COLUMN IF NOT EXISTS banner_color VARCHAR(20) NULL DEFAULT '#7c3aed' COMMENT 'Màu accent thẻ sự kiện trên trang Subscription (hex)',
ADD COLUMN IF NOT EXISTS created_by VARCHAR(36) NULL;

-- Tạo ràng buộc khóa ngoại nếu chưa có
SET
    @fk_exists = (
        SELECT COUNT(*)
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE
            CONSTRAINT_SCHEMA = DATABASE()
            AND TABLE_NAME = 'subscription_campaigns'
            AND CONSTRAINT_NAME = 'fk_sub_camp_creator'
    );

SET
    @sql = IF(
        @fk_exists = 0,
        'ALTER TABLE subscription_campaigns ADD CONSTRAINT fk_sub_camp_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;',
        'SELECT "Ràng buộc fk_sub_camp_creator đã tồn tại";'
    );

PREPARE stmt FROM @sql;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;

-- BLOCK 3: Tạo bảng reward_campaigns (Tặng Coin, Diamond, Vật phẩm)
CREATE TABLE IF NOT EXISTS reward_campaigns (
    id VARCHAR(36) PRIMARY KEY DEFAULT(UUID()),
    name VARCHAR(255) NOT NULL COMMENT 'Tên chiến dịch sự kiện',
    description TEXT NULL COMMENT 'Nội dung hiển thị trong modal nhận quà',
    coin_amount INT NOT NULL DEFAULT 0,
    diamond_amount INT NOT NULL DEFAULT 0,
    item_id VARCHAR(36) NULL COMMENT 'ID vật phẩm tặng kèm trong bảng items, NULL nếu không tặng',
    fallback_coin INT NOT NULL DEFAULT 50 COMMENT 'Số Coin đền bù nếu học viên đã sở hữu vật phẩm này',
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_reward_active (is_active, starts_at, ends_at)
);

-- BLOCK 4: Mở rộng bảng user_campaign_claims để theo dõi cả 2 loại chiến dịch
ALTER TABLE user_campaign_claims
ADD COLUMN IF NOT EXISTS campaign_type ENUM('SUBSCRIPTION', 'REWARD') NOT NULL DEFAULT 'SUBSCRIPTION',
ADD COLUMN IF NOT EXISTS reward_campaign_id VARCHAR(36) NULL;

-- Cập nhật khóa unique để không xung đột giữa Subscription Campaign và Reward Campaign
SET
    @uq_trial_exists = (
        SELECT COUNT(*)
        FROM information_schema.STATISTICS
        WHERE
            TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'user_campaign_claims'
            AND INDEX_NAME = 'uq_user_trial'
    );

SET
    @sql = IF(
        @uq_trial_exists > 0,
        'ALTER TABLE user_campaign_claims DROP INDEX uq_user_trial;',
        'SELECT "Chỉ mục uq_user_trial không tồn tại";'
    );

PREPARE stmt FROM @sql;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;

SET
    @uq_sub_claim_exists = (
        SELECT COUNT(*)
        FROM information_schema.STATISTICS
        WHERE
            TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'user_campaign_claims'
            AND INDEX_NAME = 'uq_user_sub_claim'
    );

SET
    @sql = IF(
        @uq_sub_claim_exists = 0,
        'ALTER TABLE user_campaign_claims ADD UNIQUE KEY uq_user_sub_claim (user_id, campaign_id);',
        'SELECT "Chỉ mục uq_user_sub_claim đã tồn tại";'
    );

PREPARE stmt FROM @sql;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;

SET
    @uq_reward_claim_exists = (
        SELECT COUNT(*)
        FROM information_schema.STATISTICS
        WHERE
            TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'user_campaign_claims'
            AND INDEX_NAME = 'uq_user_reward_claim'
    );

SET
    @sql = IF(
        @uq_reward_claim_exists = 0,
        'ALTER TABLE user_campaign_claims ADD UNIQUE KEY uq_user_reward_claim (user_id, reward_campaign_id);',
        'SELECT "Chỉ mục uq_user_reward_claim đã tồn tại";'
    );

PREPARE stmt FROM @sql;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;

-- BLOCK 5: Tạo bảng system_announcements (Thông báo hệ thống và Bảo trì máy chủ)
CREATE TABLE IF NOT EXISTS system_announcements (
    id VARCHAR(36) PRIMARY KEY DEFAULT(UUID()),
    type ENUM('MAINTENANCE', 'ANNOUNCEMENT') NOT NULL DEFAULT 'ANNOUNCEMENT',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_maintenance_active BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE = đang bật chế độ bảo trì khẩn',
    estimated_end DATETIME NULL COMMENT 'Thời gian dự kiến hoàn tất bảo trì',
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
);

-- BLOCK 6: Tạo bảng email_blast_logs (Nhật ký gửi email diện rộng)
CREATE TABLE IF NOT EXISTS email_blast_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT(UUID()),
    subject VARCHAR(255) NOT NULL,
    target_audience ENUM(
        'ALL',
        'CREATORS',
        'STARTER',
        'PRO',
        'ELITE',
        'FREE'
    ) NOT NULL,
    total_recipients INT NOT NULL DEFAULT 0,
    sent_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    status ENUM(
        'PENDING',
        'SENDING',
        'DONE',
        'FAILED'
    ) NOT NULL DEFAULT 'PENDING',
    heading VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    badge_text VARCHAR(100) NULL,
    badge_type ENUM(
        'info',
        'warning',
        'danger',
        'success'
    ) NULL DEFAULT 'info',
    action_text VARCHAR(100) NULL,
    action_url VARCHAR(500) NULL,
    created_by VARCHAR(36) NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
);