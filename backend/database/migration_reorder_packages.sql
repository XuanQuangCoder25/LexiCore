-- ============================================================
-- CAP NHAT THU TU HIEN THI (display_order) CHO CAC GOI
-- Chay tren DataGrip de sap xep cac goi trong modal
-- ============================================================

-- PHUONG AN 1 (KHUYEN DUNG): Sap xep theo TIER (Starter -> Pro -> Elite)
-- Trong moi Tier sap xep theo chu ky: 1 tuan -> 1 thang -> 1 nam

-- 1. Goi Dung thu Pro (Trial mac dinh)
UPDATE credit_packages SET display_order = 1, name = 'Dùng thử Pro' WHERE slug = 'sub-trial-default';

-- 2. Nhom STARTER
UPDATE credit_packages SET display_order = 2, name = 'Starter 1 tuần' WHERE slug = 'sub-starter-7d';
UPDATE credit_packages SET display_order = 3, name = 'Starter 1 tháng' WHERE slug = 'sub-starter-30d';
UPDATE credit_packages SET display_order = 4, name = 'Starter 1 năm'   WHERE slug = 'sub-starter-365d';

-- 3. Nhom PRO
UPDATE credit_packages SET display_order = 5, name = 'Pro 1 tuần'     WHERE slug = 'sub-pro-7d';
UPDATE credit_packages SET display_order = 6, name = 'Pro 1 tháng'    WHERE slug = 'sub-pro-30d';
UPDATE credit_packages SET display_order = 7, name = 'Pro 1 năm'      WHERE slug = 'sub-pro-365d';

-- 4. Nhom ELITE
UPDATE credit_packages SET display_order = 8, name = 'Elite 1 tuần'    WHERE slug = 'sub-elite-7d';
UPDATE credit_packages SET display_order = 9, name = 'Elite 1 tháng'   WHERE slug = 'sub-elite-30d';
UPDATE credit_packages SET display_order = 10, name = 'Elite 1 năm'    WHERE slug = 'sub-elite-365d';

-- Kiem tra ket qua sau khi update
SELECT id, slug, name, tier, duration_days, price_vnd, display_order, is_trial
FROM credit_packages
WHERE package_type = 'SUBSCRIPTION' AND is_active = TRUE
ORDER BY display_order ASC;

