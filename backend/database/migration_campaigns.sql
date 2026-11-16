-- ============================================================
-- Migration: Marketing & Campaigns System
-- Chay tren DataGrip de cap nhat he thong Marketing
-- ============================================================

-- BLOCK 1: Them cot sale_starts_at vao bang credit_packages
ALTER TABLE credit_packages
    ADD COLUMN IF NOT EXISTS sale_starts_at DATETIME NULL
        COMMENT 'Ngay bat dau dot giam gia. NULL = ap dung ngay lap tuc. INCOMING neu > NOW()';

-- BLOCK 2: Mo rong bang subscription_campaigns
ALTER TABLE subscription_campaigns
    ADD COLUMN IF NOT EXISTS description TEXT NULL
        COMMENT 'Mo ta su kien hien thi cho hoc vien',
    ADD COLUMN IF NOT EXISTS banner_color VARCHAR(20) NULL DEFAULT '#7c3aed'
        COMMENT 'Mau accent the su kien tren trang Subscription (hex)',
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(36) NULL;

-- Tao rang buoc khoa ngoai neu chua co
SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'subscription_campaigns'
      AND CONSTRAINT_NAME = 'fk_sub_camp_creator'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE subscription_campaigns ADD CONSTRAINT fk_sub_camp_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;',
    'SELECT "Constraint fk_sub_camp_creator da ton tai";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- BLOCK 3: Tao bang reward_campaigns (Tang Coin, Diamond, Item)
CREATE TABLE IF NOT EXISTS reward_campaigns (
    id              VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    name            VARCHAR(255) NOT NULL COMMENT 'Ten chien dich su kien',
    description     TEXT         NULL     COMMENT 'Noi dung hien thi trong modal nhan qua',
    coin_amount     INT          NOT NULL DEFAULT 0,
    diamond_amount  INT          NOT NULL DEFAULT 0,
    item_id         VARCHAR(36)  NULL     COMMENT 'ID vat pham tang kem trong bang items, NULL neu khong tang',
    fallback_coin   INT          NOT NULL DEFAULT 50 COMMENT 'So Coin den bu neu hoc vien da so huu vat pham nay',
    starts_at       DATETIME     NOT NULL,
    ends_at         DATETIME     NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by      VARCHAR(36)  NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id)    REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_reward_active (is_active, starts_at, ends_at)
);

-- BLOCK 4: Mo rong bang user_campaign_claims de theo doi ca 2 loai chien dich
ALTER TABLE user_campaign_claims
    ADD COLUMN IF NOT EXISTS campaign_type ENUM('SUBSCRIPTION', 'REWARD') NOT NULL DEFAULT 'SUBSCRIPTION',
    ADD COLUMN IF NOT EXISTS reward_campaign_id VARCHAR(36) NULL;

-- Cap nhat khoa unique de khong xung dot giua Subscription Campaign va Reward Campaign
SET @uq_trial_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user_campaign_claims'
      AND INDEX_NAME = 'uq_user_trial'
);
SET @sql = IF(@uq_trial_exists > 0,
    'ALTER TABLE user_campaign_claims DROP INDEX uq_user_trial;',
    'SELECT "Index uq_user_trial khong ton tai";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @uq_sub_claim_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user_campaign_claims'
      AND INDEX_NAME = 'uq_user_sub_claim'
);
SET @sql = IF(@uq_sub_claim_exists = 0,
    'ALTER TABLE user_campaign_claims ADD UNIQUE KEY uq_user_sub_claim (user_id, campaign_id);',
    'SELECT "Index uq_user_sub_claim da ton tai";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @uq_reward_claim_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user_campaign_claims'
      AND INDEX_NAME = 'uq_user_reward_claim'
);
SET @sql = IF(@uq_reward_claim_exists = 0,
    'ALTER TABLE user_campaign_claims ADD UNIQUE KEY uq_user_reward_claim (user_id, reward_campaign_id);',
    'SELECT "Index uq_user_reward_claim da ton tai";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- BLOCK 5: Tao bang system_announcements (Thong bao he thong va Bao tri may chu)
CREATE TABLE IF NOT EXISTS system_announcements (
    id                    VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    type                  ENUM('MAINTENANCE', 'ANNOUNCEMENT') NOT NULL DEFAULT 'ANNOUNCEMENT',
    title                 VARCHAR(255) NOT NULL,
    message               TEXT         NOT NULL,
    is_maintenance_active BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'TRUE = dang bat che do bao tri khan',
    estimated_end         DATETIME     NULL COMMENT 'Thoi gian du kien hoan tat bao tri',
    starts_at             DATETIME     NULL,
    ends_at               DATETIME     NULL,
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by            VARCHAR(36)  NULL,
    created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- BLOCK 6: Tao bang email_blast_logs (Nhat ky gui email dien rong)
CREATE TABLE IF NOT EXISTS email_blast_logs (
    id               VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    subject          VARCHAR(255) NOT NULL,
    target_audience  ENUM('ALL', 'CREATORS', 'STARTER', 'PRO', 'ELITE', 'FREE') NOT NULL,
    total_recipients INT          NOT NULL DEFAULT 0,
    sent_count       INT          NOT NULL DEFAULT 0,
    failed_count     INT          NOT NULL DEFAULT 0,
    status           ENUM('PENDING', 'SENDING', 'DONE', 'FAILED') NOT NULL DEFAULT 'PENDING',
    heading          VARCHAR(255) NOT NULL,
    message          TEXT         NOT NULL,
    badge_text       VARCHAR(100) NULL,
    badge_type       ENUM('info', 'warning', 'danger', 'success') NULL DEFAULT 'info',
    action_text      VARCHAR(100) NULL,
    action_url       VARCHAR(500) NULL,
    created_by       VARCHAR(36)  NULL,
    started_at       TIMESTAMP    NULL,
    completed_at     TIMESTAMP    NULL,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
