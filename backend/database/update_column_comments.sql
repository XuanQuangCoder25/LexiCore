-- ============================================================
-- Script cập nhật toàn bộ COMMENT của các cột thành Tiếng Việt có dấu
-- Chạy trên DataGrip để chuẩn hóa mô tả các cột trong Database
-- ============================================================

-- 1. Bảng users
ALTER TABLE users 
    MODIFY COLUMN has_used_trial BOOLEAN NOT NULL DEFAULT FALSE 
    COMMENT 'Đã kích hoạt gói dùng thử Pro mặc định khi đăng ký tài khoản chưa';

-- 2. Bảng wallets
ALTER TABLE wallets 
    MODIFY COLUMN vnd_balance INT NOT NULL DEFAULT 0 
    COMMENT 'Số dư Ví LexiCore (VNĐ thực tế), đơn vị: đồng';

-- 3. Bảng credit_packages
ALTER TABLE credit_packages 
    MODIFY COLUMN is_trial BOOLEAN NOT NULL DEFAULT FALSE 
    COMMENT 'TRUE = gói dùng thử (gói mặc định hoặc sự kiện của Admin)',
    MODIFY COLUMN available_from DATETIME NULL 
    COMMENT 'Chiến dịch: gói chỉ hiển thị từ ngày này (NULL = hiển thị ngay)',
    MODIFY COLUMN available_until DATETIME NULL 
    COMMENT 'Chiến dịch: gói tự ẩn sau ngày này (NULL = không giới hạn)',
    MODIFY COLUMN sale_starts_at DATETIME NULL 
    COMMENT 'Ngày bắt đầu đợt giảm giá. NULL = áp dụng ngay lập tức. Sắp diễn ra nếu > NOW()';

-- 4. Bảng payment_orders
ALTER TABLE payment_orders 
    MODIFY COLUMN payment_reference VARCHAR(50) UNIQUE NULL 
    COMMENT 'Mã tham chiếu nội dung chuyển khoản (SePay khớp nội dung VietQR)';

-- 5. Bảng user_subscription
ALTER TABLE user_subscription 
    MODIFY COLUMN duration_days INT NOT NULL DEFAULT 30 
    COMMENT 'Số ngày của gói (7 / 30 / 365) - dùng cho prorated và tự động gia hạn';

-- 6. Bảng payment_announcements
ALTER TABLE payment_announcements 
    MODIFY COLUMN content TEXT NOT NULL 
    COMMENT 'Hỗ trợ Markdown định dạng văn bản (in đậm, danh sách...)',
    MODIFY COLUMN starts_at DATETIME NULL 
    COMMENT 'NULL = hiển thị ngay',
    MODIFY COLUMN ends_at DATETIME NULL 
    COMMENT 'NULL = hiển thị vô thời hạn';

-- 7. Bảng subscription_campaigns
ALTER TABLE subscription_campaigns 
    MODIFY COLUMN description TEXT NULL 
    COMMENT 'Mô tả sự kiện hiển thị cho học viên',
    MODIFY COLUMN banner_color VARCHAR(20) NULL DEFAULT '#7c3aed' 
    COMMENT 'Màu accent thẻ sự kiện trên trang Subscription (hex)';

-- 8. Bảng reward_campaigns (nếu đã tạo bảng)
ALTER TABLE reward_campaigns 
    MODIFY COLUMN name VARCHAR(255) NOT NULL 
    COMMENT 'Tên chiến dịch sự kiện',
    MODIFY COLUMN description TEXT NULL 
    COMMENT 'Nội dung hiển thị trong modal nhận quà',
    MODIFY COLUMN item_id VARCHAR(36) NULL 
    COMMENT 'ID vật phẩm tặng kèm trong bảng items, NULL nếu không tặng',
    MODIFY COLUMN fallback_coin INT NOT NULL DEFAULT 50 
    COMMENT 'Số Coin đền bù nếu học viên đã sở hữu vật phẩm này';

-- 9. Bảng user_campaign_claims (nếu đã nâng cấp bảng)
ALTER TABLE user_campaign_claims 
    MODIFY COLUMN campaign_id VARCHAR(36) NULL 
    COMMENT 'ID chiến dịch subscription_campaigns (nếu là SUBSCRIPTION)',
    MODIFY COLUMN reward_campaign_id VARCHAR(36) NULL 
    COMMENT 'ID chiến dịch reward_campaigns (nếu là REWARD)';

-- 10. Bảng system_announcements (nếu đã tạo bảng)
ALTER TABLE system_announcements 
    MODIFY COLUMN is_maintenance_active BOOLEAN NOT NULL DEFAULT FALSE 
    COMMENT 'TRUE = đang bật chế độ bảo trì khẩn',
    MODIFY COLUMN estimated_end DATETIME NULL 
    COMMENT 'Thời gian dự kiến hoàn tất bảo trì';

-- Kiểm tra lại danh sách comment vừa cập nhật
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND COLUMN_COMMENT != ''
ORDER BY TABLE_NAME, ORDINAL_POSITION;
