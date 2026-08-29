-- A. AUTH
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    type ENUM('REGISTER', 'FORGOT_PASSWORD') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 2. Bảng Lịch sử giao dịch (Sử dụng JSON cho metadata)
CREATE TABLE billing_transactions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    amount INT NOT NULL,
    transaction_type ENUM(
        'EARN_QUIZ',
        'BUY_ITEM',
        'PVP_REWARD',
        'DAILY_STREAK'
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
        'AVATAR_FRAME'
    ) NOT NULL,
    price INT NOT NULL,
    description TEXT
);

-- 4. Bảng Túi đồ của User (Inventory)
CREATE TABLE user_items (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    item_id VARCHAR(36) NOT NULL,
    quantity INT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
);