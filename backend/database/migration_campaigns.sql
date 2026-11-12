-- ============================================================
-- MIGRATION: SUBSCRIPTION CAMPAIGNS & USER CLAIMS (FULL SCHEMA)
-- Chạy script này trên DataGrip để tạo bảng hoặc nâng cấp bảng
-- ============================================================

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

-- 6. Bảng lưu vết người dùng đã nhận quà chiến dịch
CREATE TABLE user_campaign_claims (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    campaign_id VARCHAR(36) NOT NULL,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_trial (user_id, campaign_id) -- Mỗi user chỉ được nhận 1 lần trong suốt đợt
);