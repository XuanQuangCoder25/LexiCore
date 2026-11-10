-- ============================================================
-- Migration: Subscription System v2
-- Chay 1 lan duy nhat tren DB hien tai
-- Kiem tra ky tung block truoc khi execute
-- ============================================================

-- ─── BLOCK 1: Mo rong bang wallets ───────────────────────────
-- Them so du Vi LexiCore (tien VND thuc) vao vi cua user

ALTER TABLE wallets
    ADD COLUMN IF NOT EXISTS vnd_balance INT NOT NULL DEFAULT 0
        COMMENT 'So du Vi LexiCore (VND thuc), don vi: dong';

-- ─── BLOCK 2: Mo rong bang users ─────────────────────────────
-- has_used_trial: danh dau user da dung goi trial mac dinh khi dang ky chua
-- (goi trial campaign cua admin thi khong track ca nhan, ai cung lay duoc)

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN NOT NULL DEFAULT FALSE
        COMMENT 'Da kich hoat goi trial mac dinh khi dang ky chua';

-- ─── BLOCK 3: Mo rong bang credit_packages ───────────────────
-- Them cac cot ho tro trial va campaign window cua admin

ALTER TABLE credit_packages
    MODIFY COLUMN tier ENUM('STARTER', 'PRO', 'ELITE', 'TRIAL') NULL,

    ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT FALSE
        COMMENT 'TRUE = goi dung thu (trial default hoac campaign)',

    ADD COLUMN IF NOT EXISTS available_from DATETIME NULL
        COMMENT 'Campaign: goi chi hien tu ngay nay (NULL = hien luon)',

    ADD COLUMN IF NOT EXISTS available_until DATETIME NULL
        COMMENT 'Campaign: goi tu an sau ngay nay (NULL = khong gioi han)';

-- ─── BLOCK 4: Mo rong bang payment_orders ────────────────────
-- Them gateway WALLET (thanh toan qua Vi LexiCore)

ALTER TABLE payment_orders
    MODIFY COLUMN gateway ENUM('VNPAY', 'MOMO', 'STRIPE', 'MOCK', 'WALLET')
        NOT NULL DEFAULT 'MOCK';

-- ─── BLOCK 5: Tao bang subscriptions ─────────────────────────
-- Luu trang thai goi hoi vien hien tai cua tung user

CREATE TABLE IF NOT EXISTS subscriptions (
    id              VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    user_id         VARCHAR(36)  NOT NULL UNIQUE,
    package_id      VARCHAR(36)  NOT NULL,
    tier            ENUM('STARTER', 'PRO', 'ELITE', 'TRIAL') NOT NULL,
    duration_days   INT          NOT NULL DEFAULT 30
        COMMENT 'So ngay cua goi (7 / 30 / 365) - dung cho prorated va auto-renew',
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

-- ─── BLOCK 6: Tao bang payment_announcements ─────────────────
-- Admin dang thong bao: sale sap toi, ghi chu, chinh sach gia,...
-- Hien thi trong Tab "Thong tin" cua SubscriptionModal

CREATE TABLE IF NOT EXISTS payment_announcements (
    id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    title       VARCHAR(200) NOT NULL,
    content     TEXT         NOT NULL
        COMMENT 'Markdown duoc phep, hien thi trong tab Thong tin modal',
    type        ENUM('INFO', 'SALE', 'NEW_FEATURE', 'POLICY') NOT NULL DEFAULT 'INFO',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    starts_at   DATETIME     NULL COMMENT 'NULL = hien ngay',
    ends_at     DATETIME     NULL COMMENT 'NULL = hien mai mai',
    created_by  VARCHAR(36)  NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_ann_active (is_active, ends_at)
);

-- ─── BLOCK 7: Seed 9 goi subscription + 1 goi trial mac dinh ─
-- Bang gia (da chot):
--   Starter : 9.000d (7d) / 19.000d (30d) / 159.000d (365d)
--   Pro     : 15.000d (7d) / 35.000d (30d) / 269.000d (365d)
--   Elite   : 25.000d (7d) / 49.000d (30d) / 349.000d (365d)

INSERT INTO credit_packages
    (slug, name, package_type, tier, price_vnd, price_usd,
     coin_amount, diamond_amount, duration_days,
     sale_percent, display_order, is_trial, features, is_active)
VALUES
    -- ── STARTER ──────────────────────────────────────────────
    ('sub-starter-7d',
     'Starter 7 ngay', 'SUBSCRIPTION', 'STARTER',
     9000, 0.39, 50, 2, 7, 0, 11, FALSE,
     '["Khong quang cao","50 Coin","2 Diamond","Truy cap tu vung Arena"]',
     TRUE),

    ('sub-starter-30d',
     'Starter 1 thang', 'SUBSCRIPTION', 'STARTER',
     19000, 0.79, 200, 5, 30, 0, 12, FALSE,
     '["Khong quang cao","200 Coin/thang","5 Diamond/thang","Truy cap tu vung Arena"]',
     TRUE),

    ('sub-starter-365d',
     'Starter 1 nam', 'SUBSCRIPTION', 'STARTER',
     159000, 6.49, 200, 5, 365, 0, 13, FALSE,
     '["Toan bo quyen loi Starter","Tiet kiem ~30% so voi goi thang","200 Coin/thang","5 Diamond/thang"]',
     TRUE),

    -- ── PRO ──────────────────────────────────────────────────
    ('sub-pro-7d',
     'Pro 7 ngay', 'SUBSCRIPTION', 'PRO',
     15000, 0.59, 125, 5, 7, 0, 21, FALSE,
     '["Tat ca tinh nang Starter","AI Voice Recognition","Analytics chi tiet","125 Coin","5 Diamond"]',
     TRUE),

    ('sub-pro-30d',
     'Pro 1 thang', 'SUBSCRIPTION', 'PRO',
     35000, 1.39, 500, 15, 30, 0, 22, FALSE,
     '["Tat ca tinh nang Starter","AI Voice Recognition","Analytics chi tiet","500 Coin/thang","15 Diamond/thang","Badge Pro"]',
     TRUE),

    ('sub-pro-365d',
     'Pro 1 nam', 'SUBSCRIPTION', 'PRO',
     269000, 10.99, 500, 15, 365, 0, 23, FALSE,
     '["Toan bo quyen loi Pro","Tiet kiem ~36% so voi goi thang","500 Coin/thang","15 Diamond/thang","Badge Pro doc quyen"]',
     TRUE),

    -- ── ELITE ─────────────────────────────────────────────────
    ('sub-elite-7d',
     'Elite 7 ngay', 'SUBSCRIPTION', 'ELITE',
     25000, 0.99, 375, 15, 7, 0, 31, FALSE,
     '["Tat ca tinh nang Pro","Unlimited AI feedback","Priority support","375 Coin","15 Diamond"]',
     TRUE),

    ('sub-elite-30d',
     'Elite 1 thang', 'SUBSCRIPTION', 'ELITE',
     49000, 1.99, 1500, 50, 30, 0, 32, FALSE,
     '["Tat ca tinh nang Pro","Unlimited AI feedback","Priority support","1500 Coin/thang","50 Diamond/thang","Elite frame + badge","Early access"]',
     TRUE),

    ('sub-elite-365d',
     'Elite 1 nam', 'SUBSCRIPTION', 'ELITE',
     349000, 13.99, 1500, 50, 365, 0, 33, FALSE,
     '["Toan bo quyen loi Elite","Tiet kiem ~41% so voi goi thang","1500 Coin/thang","50 Diamond/thang","Elite frame + badge","Early access"]',
     TRUE),

    -- ── TRIAL MAC DINH (auto-activate khi dang ky tai khoan) ──
    -- price_vnd = 0, is_trial = TRUE
    -- Khong co available_from/until (hien luon cho logic register)
    ('sub-trial-default',
     'Pro 3 ngay dung thu', 'SUBSCRIPTION', 'PRO',
     0, 0.00, 0, 0, 3, 0, 1, TRUE,
     '["Toan bo tinh nang Pro","AI Voice Recognition","Unlimited AI feedback","Analytics chi tiet","Badge Pro trong 3 ngay"]',
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

-- ─── BLOCK 8: Vo hieu hoa cac goi cu (tu seed truoc) ─────────
-- Cac slug nay duoc tao o seed ban dau, nay thay the bang slug moi
-- Khong xoa de giu lich su payment_orders tham chieu

UPDATE credit_packages
SET is_active = FALSE
WHERE slug IN (
    'sub-starter-monthly',
    'sub-pro-monthly',
    'sub-elite-monthly',
    'sub-trial-3days'
);

-- ─── BLOCK 9: Seed thong bao mac dinh cho Tab Thong tin ───────
-- Admin co the sua/them trong Admin Panel sau, day chi la du lieu khoi dong

INSERT INTO payment_announcements (title, content, type, is_active)
VALUES
    ('Chinh sach nang cap goi (Upgrade)',
     'Khi nang cap len goi cao hon, ban chi tra phan chenh lech.\n\nCong thuc: **So tien can tra = Gia goi moi - (Gia goi cu / So ngay goi cu x So ngay con lai)**\n\nSau khi thanh toan, goi moi co hieu luc ngay lap tuc va thoi han duoc tinh lai tu ngay hom nay.',
     'POLICY', TRUE),

    ('Quy dinh chu ky khi nang cap',
     'De bao dam quyen loi cua ban, chung toi chi cho phep nang cap len goi co chu ky **tuong duong hoac dai hon** goi dang su dung.\n\nVi du: Dang dung Pro 1 thang → co the nang cap len Elite 1 thang hoac Elite 1 nam, nhung khong the Elite 7 ngay.',
     'POLICY', TRUE),

    ('Goi thap hon & Downgrade',
     'Neu ban dang su dung goi Pro hoac Elite, cac tinh nang cua goi Starter da **duoc bao gom san**. Vi vay chung toi khoa chuc nang mua goi thap hon de tranh lang phi.\n\nSau khi goi hien tai het han, ban co the tu do chon bat ky goi nao.',
     'POLICY', TRUE),

    ('Cach tinh thoi han',
     '1 thang = 30 ngay | 1 nam = 365 ngay\n\nCoin & Diamond duoc cong vao vi ngay sau khi thanh toan thanh cong.\n\nGoi tu dong gia han (neu bat) se tru tu Vi LexiCore khi den han. Neu so du khong du, goi se ve Free va ban nhan thong bao email.',
     'INFO', TRUE),

    ('Huong dan thanh toan',
     '**Chuyen khoan ngan hang:** Quet ma QR hoac chuyen theo thong tin hien thi. He thong tu dong xac nhan sau 1-5 phut.\n\n**Vi LexiCore:** Thanh toan tuc thi tu so du Vi. Nap tien vao Vi tai trang Goi Hoi Vien.',
     'INFO', TRUE)

ON DUPLICATE KEY UPDATE title = VALUES(title);

-- ============================================================
-- Ket thuc migration
-- Kiem tra sau khi chay:
--   SELECT COUNT(*) FROM credit_packages WHERE package_type = 'SUBSCRIPTION'; -- nen la 10
--   SHOW COLUMNS FROM subscriptions;
--   SHOW COLUMNS FROM wallets LIKE 'vnd_balance';
--   SELECT slug, name, price_vnd, duration_days, is_active FROM credit_packages
--     WHERE package_type = 'SUBSCRIPTION' ORDER BY display_order;
-- ============================================================
