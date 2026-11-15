-- ============================================================
-- Migration: Thêm gói ảo "Nạp tiền Ví LexiCore" vào credit_packages
-- Phục vụ luồng nạp tiền vào Ví LexiCore qua SePay (VietQR)
-- ============================================================

INSERT INTO credit_packages (
    id,
    slug,
    name,
    package_type,
    tier,
    price_vnd,
    price_usd,
    coin_amount,
    diamond_amount,
    duration_days,
    sale_percent,
    display_order,
    is_trial,
    features,
    is_active
) VALUES (
    'pkg_wallet_topup',
    'wallet-topup',
    'Nạp tiền Ví LexiCore',
    'BUNDLE',
    NULL,
    0,
    0,
    0,
    0,
    NULL,
    0,
    999,
    FALSE,
    '["Nạp tiền vào số dư Ví LexiCore","Sử dụng để thanh toán gói hội viên và gia hạn tự động"]',
    TRUE
) ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    is_active = TRUE;

-- Kiểm tra lại bản ghi vừa thêm
SELECT id, slug, name, package_type, price_vnd, is_active
FROM credit_packages
WHERE slug = 'wallet-topup' OR id = 'pkg_wallet_topup';
