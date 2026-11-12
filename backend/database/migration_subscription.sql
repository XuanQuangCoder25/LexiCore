-- ============================================================
-- Migration: Subscription System v2 (Đầy đủ tiếng Việt có dấu)
-- Chạy 1 lần duy nhất trên DataGrip
-- ============================================================

-- ─── BLOCK 1: Mở rộng bảng wallets ───────────────────────────
-- Thêm số dư Ví LexiCore (tiền VNĐ thực) vào ví của người dùng

ALTER TABLE wallets
    ADD COLUMN IF NOT EXISTS vnd_balance INT NOT NULL DEFAULT 0
        COMMENT 'Số dư Ví LexiCore (VNĐ thực), đơn vị: đồng';

-- ─── BLOCK 2: Mở rộng bảng users ─────────────────────────────
-- has_used_trial: đánh dấu người dùng đã dùng gói dùng thử mặc định chưa

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN NOT NULL DEFAULT FALSE
        COMMENT 'Đã kích hoạt gói dùng thử Pro 3 ngày mặc định chưa';

-- ─── BLOCK 3: Mở rộng bảng credit_packages ───────────────────
-- Thêm các cột hỗ trợ gói dùng thử và chiến dịch khuyến mãi của Admin

ALTER TABLE credit_packages
    MODIFY COLUMN tier ENUM('STARTER', 'PRO', 'ELITE', 'TRIAL') NULL,

    ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT FALSE
        COMMENT 'TRUE = gói dùng thử (trial mặc định hoặc chiến dịch)',

    ADD COLUMN IF NOT EXISTS available_from DATETIME NULL
        COMMENT 'Chiến dịch: gói chỉ hiển thị từ ngày này (NULL = hiện luôn)',

    ADD COLUMN IF NOT EXISTS available_until DATETIME NULL
        COMMENT 'Chiến dịch: gói tự ẩn sau ngày này (NULL = không giới hạn)';

-- ─── BLOCK 4: Mở rộng bảng payment_orders ────────────────────
-- Sử dụng SePay (chuyển khoản VietQR) và Ví LexiCore (hỗ trợ Mock cho dev)

ALTER TABLE payment_orders
    MODIFY COLUMN gateway ENUM('SEPAY', 'WALLET', 'MOCK') NOT NULL DEFAULT 'SEPAY',
    ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(50) UNIQUE NULL
        COMMENT 'Mã tham chiếu nội dung chuyển khoản (SePay match nội dung VietQR)';

-- ─── BLOCK 5: Tạo bảng user_subscription ─────────────────────
-- Lưu trạng thái gói hội viên hiện tại của từng người dùng

CREATE TABLE IF NOT EXISTS user_subscription (
    id              VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    user_id         VARCHAR(36)  NOT NULL UNIQUE,
    package_id      VARCHAR(36)  NOT NULL,
    tier            ENUM('STARTER', 'PRO', 'ELITE', 'TRIAL') NOT NULL,
    duration_days   INT          NOT NULL DEFAULT 30
        COMMENT 'Số ngày của gói (7 / 30 / 365) - dùng cho prorated và tự động gia hạn',
    started_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP    NOT NULL,
    auto_renew      BOOLEAN      NOT NULL DEFAULT FALSE,
    email_reminder  BOOLEAN      NOT NULL DEFAULT TRUE,
    status          ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users (id)            ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES credit_packages (id),
    INDEX idx_sub_expires    (expires_at, status),
    INDEX idx_sub_autorenew  (auto_renew, expires_at, status)
);

-- ─── BLOCK 6: Tạo bảng payment_announcements ─────────────────
-- Admin đăng thông báo: khuyến mãi sắp tới, chính sách giá, hướng dẫn,...
-- Hiển thị trong Tab "Thông tin" của SubscriptionModal

CREATE TABLE IF NOT EXISTS payment_announcements (
    id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    title       VARCHAR(200) NOT NULL,
    content     TEXT         NOT NULL
        COMMENT 'Hỗ trợ Markdown định dạng văn bản (in đậm, danh sách...)',
    type        ENUM('INFO', 'SALE', 'NEW_FEATURE', 'POLICY') NOT NULL DEFAULT 'INFO',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    starts_at   DATETIME     NULL COMMENT 'NULL = hiển thị ngay',
    ends_at     DATETIME     NULL COMMENT 'NULL = hiển thị vô thời hạn',
    created_by  VARCHAR(36)  NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_ann_active (is_active, ends_at)
);

-- ─── BLOCK 7: Seed 9 gói hội viên chuẩn + 1 gói dùng thử ─────
-- Bảng giá đã chốt:
--   Starter : 9.000đ (7 ngày)  / 19.000đ (30 ngày)  / 159.000đ (365 ngày)
--   Pro     : 15.000đ (7 ngày) / 35.000đ (30 ngày)  / 269.000đ (365 ngày)
--   Elite   : 25.000đ (7 ngày) / 49.000đ (30 ngày)  / 349.000đ (365 ngày)

INSERT INTO credit_packages
    (slug, name, package_type, tier, price_vnd, price_usd,
     coin_amount, diamond_amount, duration_days,
     sale_percent, display_order, is_trial, features, is_active)
VALUES
    -- ── STARTER ──────────────────────────────────────────────
    ('sub-starter-7d',
     'Starter 7 ngày', 'SUBSCRIPTION', 'STARTER',
     9000, 0.39, 50, 2, 7, 0, 11, FALSE,
     '["Không quảng cáo làm phiền","Tặng 50 Coin khi đăng ký","Tặng 2 Diamond","Mở khóa toàn bộ từ vựng Arena"]',
     TRUE),

    ('sub-starter-30d',
     'Starter 1 tháng', 'SUBSCRIPTION', 'STARTER',
     19000, 0.79, 200, 5, 30, 0, 12, FALSE,
     '["Không quảng cáo làm phiền","Tặng 200 Coin mỗi tháng","Tặng 5 Diamond mỗi tháng","Mở khóa toàn bộ từ vựng Arena"]',
     TRUE),

    ('sub-starter-365d',
     'Starter 1 năm', 'SUBSCRIPTION', 'STARTER',
     159000, 6.49, 200, 5, 365, 0, 13, FALSE,
     '["Toàn bộ quyền lợi gói Starter","Tiết kiệm ~30% so với gói tháng","Tặng 200 Coin mỗi tháng","Tặng 5 Diamond mỗi tháng"]',
     TRUE),

    -- ── PRO ──────────────────────────────────────────────────
    ('sub-pro-7d',
     'Pro 7 ngày', 'SUBSCRIPTION', 'PRO',
     15000, 0.59, 125, 5, 7, 0, 21, FALSE,
     '["Bao gồm tất cả tính năng Starter","Nhận diện phát âm AI Voice Recognition","Báo cáo & Phân tích chi tiết tiến độ","Tặng 125 Coin","Tặng 5 Diamond"]',
     TRUE),

    ('sub-pro-30d',
     'Pro 1 tháng', 'SUBSCRIPTION', 'PRO',
     35000, 1.39, 500, 15, 30, 0, 22, FALSE,
     '["Bao gồm tất cả tính năng Starter","Nhận diện phát âm AI Voice Recognition","Báo cáo & Phân tích chi tiết tiến độ","Tặng 500 Coin mỗi tháng","Tặng 15 Diamond mỗi tháng","Huy hiệu Pro nổi bật"]',
     TRUE),

    ('sub-pro-365d',
     'Pro 1 năm', 'SUBSCRIPTION', 'PRO',
     269000, 10.99, 500, 15, 365, 0, 23, FALSE,
     '["Toàn bộ quyền lợi gói Pro","Tiết kiệm ~36% so với gói tháng","Tặng 500 Coin mỗi tháng","Tặng 15 Diamond mỗi tháng","Huy hiệu Pro độc quyền"]',
     TRUE),

    -- ── ELITE ─────────────────────────────────────────────────
    ('sub-elite-7d',
     'Elite 7 ngày', 'SUBSCRIPTION', 'ELITE',
     25000, 0.99, 375, 15, 7, 0, 31, FALSE,
     '["Bao gồm tất cả tính năng Pro","Phản hồi sửa lỗi phát âm AI không giới hạn","Hỗ trợ ưu tiên 24/7","Tặng 375 Coin","Tặng 15 Diamond"]',
     TRUE),

    ('sub-elite-30d',
     'Elite 1 tháng', 'SUBSCRIPTION', 'ELITE',
     49000, 1.99, 1500, 50, 30, 0, 32, FALSE,
     '["Bao gồm tất cả tính năng Pro","Phản hồi sửa lỗi phát âm AI không giới hạn","Hỗ trợ ưu tiên 24/7","Tặng 1.500 Coin mỗi tháng","Tặng 50 Diamond mỗi tháng","Khung viền Avatar & Huy hiệu Elite","Trải nghiệm sớm tính năng mới"]',
     TRUE),

    ('sub-elite-365d',
     'Elite 1 năm', 'SUBSCRIPTION', 'ELITE',
     349000, 13.99, 1500, 50, 365, 0, 33, FALSE,
     '["Toàn bộ quyền lợi cao cấp nhất Elite","Tiết kiệm ~41% so với gói tháng","Tặng 1.500 Coin mỗi tháng","Tặng 50 Diamond mỗi tháng","Khung viền Avatar & Huy hiệu Elite","Trải nghiệm sớm tính năng mới"]',
     TRUE),

    -- ── TRIAL MẶC ĐỊNH (Tự động kích hoạt khi đăng ký tài khoản) ──
    ('sub-trial-default',
     'Dùng thử Pro 3 ngày', 'SUBSCRIPTION', 'PRO',
     0, 0.00, 0, 0, 3, 0, 1, TRUE,
     '["Trải nghiệm toàn bộ tính năng Pro","Nhận diện phát âm AI Voice Recognition","Phản hồi chi tiết từng âm tiết","Phân tích năng lực học tập","Huy hiệu Pro trong 3 ngày"]',
     TRUE)

ON DUPLICATE KEY UPDATE
    name           = VALUES(name),
    price_vnd      = VALUES(price_vnd),
    price_usd      = VALUES(price_usd),
    coin_amount    = VALUES(coin_amount),
    diamond_amount = VALUES(diamond_amount),
    duration_days  = VALUES(duration_days),
    sale_percent   = VALUES(sale_percent),
    features       = VALUES(features),
    display_order  = VALUES(display_order),
    is_trial       = VALUES(is_trial);

-- ─── BLOCK 8: Vô hiệu hóa các gói cũ từ seed trước ───────────
UPDATE credit_packages
SET is_active = FALSE
WHERE slug IN (
    'sub-starter-monthly',
    'sub-pro-monthly',
    'sub-elite-monthly',
    'sub-trial-3days'
);

-- ─── BLOCK 9: Seed thông tin mặc định cho Tab Thông tin ──────
INSERT INTO payment_announcements (title, content, type, is_active)
VALUES
    ('Chính sách nâng cấp gói (Upgrade)',
     'Khi nâng cấp lên gói cao hơn, bạn chỉ cần trả phần tiền chênh lệch.\n\nCông thức: **Số tiền cần trả = Giá gói mới - (Giá gói cũ / Số ngày gói cũ x Số ngày còn lại)**\n\nSau khi thanh toán thành công, gói mới sẽ được kích hoạt ngay lập tức và thời hạn được tính lại từ ngày hôm nay.',
     'POLICY', TRUE),

    ('Quy định chu kỳ khi nâng cấp',
     'Để đảm bảo tối đa quyền lợi, hệ thống chỉ hỗ trợ nâng cấp lên gói có chu kỳ **tương đương hoặc dài hơn** gói hiện tại.\n\nVí dụ: Bạn đang dùng gói Pro 1 tháng thì có thể nâng cấp lên Elite 1 tháng hoặc Elite 1 năm (không áp dụng nâng cấp lên Elite 7 ngày).',
     'POLICY', TRUE),

    ('Gói thấp hơn & Hạ cấp',
     'Nếu bạn đang sử dụng gói Pro hoặc Elite, các quyền lợi của gói Starter **đã được bao gồm sẵn**. Do đó hệ thống sẽ tạm khóa các gói thấp hơn để tránh việc mua trùng lặp gây lãng phí.\n\nSau khi gói hiện tại hết hạn, bạn hoàn toàn có thể tự do đăng ký bất kỳ gói nào.',
     'POLICY', TRUE),

    ('Cách tính thời hạn sử dụng',
     'Hệ thống quy ước chuẩn: **1 tháng = 30 ngày** và **1 năm = 365 ngày**.\n\nCoin và Diamond tặng kèm sẽ được cộng ngay vào ví của bạn sau khi giao dịch thành công.\n\nNếu bật tính năng tự động gia hạn, hệ thống sẽ tự động trừ tiền từ Ví LexiCore vào ngày hết hạn. Nếu số dư ví không đủ, gói sẽ tự về Free và gửi email thông báo.',
     'INFO', TRUE),

    ('Hướng dẫn thanh toán',
     '**Chuyển khoản VietQR:** Quét mã QR trên màn hình bằng bất kỳ app ngân hàng nào (nội dung chuyển khoản và số tiền sẽ được tự động điền chính xác 100%). Hệ thống tự động kích hoạt sau 1-3 phút.\n\n**Ví LexiCore:** Thanh toán tức thì từ số dư có sẵn trong tài khoản LexiCore của bạn.',
     'INFO', TRUE)

ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    content = VALUES(content);

-- ============================================================
-- Kết thúc migration
-- ============================================================
