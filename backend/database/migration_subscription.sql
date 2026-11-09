-- ============================================================
-- Migration: Subscription System
-- Chạy file này 1 lần để bổ sung schema cho hệ thống subscription
-- ============================================================

-- 1. Thêm vnd_balance vào wallets (số dư Ví LexiCore thực = tiền VND)
ALTER TABLE wallets
    ADD COLUMN IF NOT EXISTS vnd_balance INT NOT NULL DEFAULT 0 COMMENT 'So du Vi LexiCore (VND thuc)';

-- 2. Thêm has_used_trial vào users (mỗi user chỉ được dùng thử 1 lần)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Mở rộng credit_packages: thêm tier TRIAL + cột is_trial
ALTER TABLE credit_packages
    MODIFY COLUMN tier ENUM('STARTER', 'PRO', 'ELITE', 'TRIAL') NULL,
    ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Mở rộng payment_orders: thêm gateway WALLET (thanh toán qua Ví LexiCore)
ALTER TABLE payment_orders
    MODIFY COLUMN gateway ENUM('VNPAY', 'MOMO', 'STRIPE', 'MOCK', 'WALLET') NOT NULL DEFAULT 'MOCK';

-- 5. Tạo bảng subscriptions (trạng thái gói hội viên hiện tại của user)
CREATE TABLE IF NOT EXISTS subscriptions (
    id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    user_id       VARCHAR(36)  NOT NULL UNIQUE,
    package_id    VARCHAR(36)  NOT NULL,
    tier          ENUM('STARTER', 'PRO', 'ELITE', 'TRIAL') NOT NULL,
    started_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at    TIMESTAMP    NOT NULL,
    auto_renew    BOOLEAN      NOT NULL DEFAULT FALSE,
    email_reminder BOOLEAN     NOT NULL DEFAULT TRUE,
    status        ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users (id)            ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES credit_packages (id),
    INDEX idx_subscriptions_expires (expires_at, status),
    INDEX idx_subscriptions_autorenew (auto_renew, expires_at)
);

-- 6. Seed: gói dùng thử 3 ngày (Pro tier, miễn phí)
INSERT INTO credit_packages
    (slug, name, package_type, tier, price_vnd, price_usd, coin_amount, diamond_amount,
     duration_days, sale_percent, display_order, is_trial, features, is_active)
VALUES
    ('sub-trial-3days', 'Dung thu 3 ngay', 'SUBSCRIPTION', 'PRO', 0, 0.00, 0, 0, 3, 0, 0, TRUE,
     '["Toan bo tinh nang Pro","AI Voice Recognition","Unlimited AI feedback","Analytics chi tiet","Badge Pro trong 3 ngay"]',
     TRUE)
ON DUPLICATE KEY UPDATE
    name          = VALUES(name),
    duration_days = VALUES(duration_days),
    is_trial      = VALUES(is_trial),
    features      = VALUES(features),
    display_order = VALUES(display_order);

