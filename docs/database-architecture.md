# 🗄️ KIẾN TRÚC CƠ SỞ DỮ LIỆU ĐA TẦNG (POLYGLOT PERSISTENCE ARCHITECTURE)

> **Tài liệu đặc tả cơ sở dữ liệu LexiCore**  
> Tổng hợp toàn bộ cấu trúc bảng, mối quan hệ thực thể, chiến lược phân vùng dữ liệu trên MySQL, MongoDB và Redis.

---

## 1. TỔNG QUAN CHIẾN LƯỢC LƯU TRỮ ĐA CƠ SỞ DỮ LIỆU

Hệ thống LexiCore không sử dụng một cơ sở dữ liệu đơn lẻ mà áp dụng chiến lược **Polyglot Persistence** (lưu trữ đa cơ sở dữ liệu) phù hợp với từng đặc thù nghiệp vụ:

```
                            [ MÁY CHỦ LEXICORE (BACKEND) ]
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
  [ MYSQL (AIVEN CLOUD) ]       [ MONGODB (ATLAS CLOUD) ]     [ REDIS (UPSTASH CLOUD) ]
  - Dữ liệu quan hệ chặt chẽ    - Tài liệu phi cấu trúc       - Bộ nhớ đệm In-memory
  - Giao dịch tài chính (ACID)  - Khóa học & Creator Studio   - Hàng đợi ghép trận Arena
  - Users, Wallets, Payments    - Learning Analytics & Logs   - Caching dữ liệu tần suất cao
```

---

## 2. BẢN ĐỒ PHÂN VÙNG BẢNG TRONG MYSQL (`schema.sql`)

Toàn bộ cấu trúc cơ sở dữ liệu quan hệ được định nghĩa tập trung trong file [backend/database/schema.sql](file:///e:/Downloads/LexiCore/backend/database/schema.sql) và chia thành các phân vùng logic:

```
schema.sql
├── Phân vùng A: AUTH & USERS (Tài khoản & Phân quyền)
├── Phân vùng B: GAMIFICATION & ECONOMY (Ví, Vật phẩm, Nhiệm vụ, Thành tựu)
├── Phân vùng C: AI SHADOWING (Video, Phụ đề, Lịch sử luyện nói, Sổ tay)
├── Phân vùng D: PVP ARENA (Từ vựng thi đấu, Trận đấu 1v1, Chi tiết câu hỏi)
├── Phân vùng E: PAYMENT & CREDIT PACKAGES (Gói hội viên, Đơn hàng, Thông báo)
├── Phân vùng X: NOTIFICATIONS & SETTINGS (Cài đặt người dùng & Thông báo in-app)
└── Phân vùng Y: FRIENDS & DIRECT MESSAGING (Kết bạn, Phòng chat, Tin nhắn 1-1)
```

---

### PHÂN VÙNG A: AUTH & USERS (Xác thực & Người dùng)

| Tên bảng | Khóa chính | Mục đích sử dụng | Ràng buộc quan trọng |
| :--- | :--- | :--- | :--- |
| **`users`** | `id` (VARCHAR 36) | Lưu thông tin định danh học viên, email, mật khẩu băm Bcrypt, vai trò (`USER`, `ADMIN`, `CONTENT_CREATOR`), trạng thái (`PENDING`, `ACTIVE`, `BANNED`), và cờ `has_used_trial` (chống lạm dụng gói trial). | `email` UNIQUE |
| **`creator_applications`** | `id` (VARCHAR 36) | Lưu đơn đăng ký trở thành Content Creator kèm lý do, chứng chỉ và trạng thái duyệt của Admin. | `user_id` UNIQUE, `ON DELETE CASCADE` |

---

### PHÂN VÙNG B: GAMIFICATION & ECONOMY (Kinh tế & Game hóa)

| Tên bảng | Khóa chính | Mục đích sử dụng | Ràng buộc quan trọng |
| :--- | :--- | :--- | :--- |
| **`wallets`** | `user_id` (VARCHAR 36) | Quản lý toàn bộ tài sản của học viên: số dư `coin_balance`, `diamond_balance`, số dư ví thực `vnd_balance`, kinh nghiệm `exp`, cấp độ `level`, điểm `rank_point`, chuỗi học `current_streak`, và thống kê Arena. | Quan hệ 1-1 với `users`, `ON DELETE CASCADE` |
| **`billing_transactions`**| `id` (VARCHAR 36) | Lịch sử biến động tài sản ảo (nhận thưởng nhiệm vụ, mua vật phẩm, thưởng thăng cấp) kèm `metadata` dạng JSON. | `user_id` FK, `ON DELETE CASCADE` |
| **`items`** | `id` (VARCHAR 36) | Danh mục vật phẩm trong Cửa hàng: Avatar, Ảnh bìa, Băng bảo vệ streak (`STREAK_FREEZE`), giá bán và cấp độ yêu cầu mở khóa. | `collection_id` FK, `ON DELETE SET NULL` |
| **`user_items`** | `id` (VARCHAR 36) | Kho đồ cá nhân (Inventory), lưu danh sách vật phẩm người dùng đã mua và trạng thái đang trang bị (`is_active`). | `UNIQUE KEY (user_id, item_id)` |
| **`achievement_definitions`** | `id` (VARCHAR 36) | Định nghĩa các mốc danh hiệu thành tựu, chỉ số mục tiêu (`target_value`), khóa đo lường (`metric_key`) và phần thưởng. | Danh mục hệ thống |
| **`user_achievements`** | `id` (VARCHAR 36) | Theo dõi tiến độ tích lũy thành tựu của từng học viên và thời điểm mở khóa. | `UNIQUE KEY (user_id, achievement_id)` |
| **`daily_goal_definitions`** | `id` (VARCHAR 36) | Định nghĩa nhiệm vụ hàng ngày (`DAILY`) và hàng tuần (`WEEKLY`). | Danh mục hệ thống |
| **`user_daily_goals`** | `id` (VARCHAR 36) | Ghi nhận tiến độ làm nhiệm vụ của học viên theo ngày (`date`), trạng thái hoàn thành và đã nhận thưởng (`is_claimed`). | `UNIQUE KEY (user_id, goal_id, date)` |
| **`collections`** | `id` (VARCHAR 36) | Bộ sưu tập vật phẩm theo chủ đề (sa mạc, đại dương...) kèm cấp độ mở khóa `unlock_level`. | Phân nhóm vật phẩm |
| **`user_collections`** | `(user_id, collection_id)` | Lưu vết các bộ sưu tập người dùng đã mở khóa thành công khi thăng cấp. | Composite PK |

---

### PHÂN VÙNG C: AI VOICE ANALYSIS (Luyện phát âm Shadowing)

| Tên bảng | Khóa chính | Mục đích sử dụng | Ràng buộc quan trọng |
| :--- | :--- | :--- | :--- |
| **`shadowing_videos`** | `id` (VARCHAR 36) | Lưu trữ thông tin video YouTube đã qua kiểm định phụ đề thủ công, kèm cột `ai_summary` (JSON cache tóm tắt và từ vựng từ Google Gemini). | `youtube_id` indexed |
| **`shadowing_segments`** | `id` (VARCHAR 36) | Lưu từng câu phụ đề tương ứng với mốc thời gian bắt đầu (`start_time`) và kết thúc (`end_time`). | `video_id` FK, `ON DELETE CASCADE` |
| **`user_shadowing_history`** | `id` (VARCHAR 36) | Lưu lịch sử từng lần thu âm của học viên, điểm phát âm chính xác từ Whisper AI (`accuracy_score`) và đường dẫn file ghi âm `audio_url`. | `user_id`, `video_id`, `segment_id` FK |
| **`shadowing_notes`** | `id` (VARCHAR 36) | Sổ tay ghi chú cá nhân của học viên cho từng bài học video. | `UNIQUE KEY (user_id, video_id)` |

---

### PHÂN VÙNG D: PVP ARENA (Đấu trường từ vựng thời gian thực)

| Tên bảng | Khóa chính | Mục đích sử dụng | Ràng buộc quan trọng |
| :--- | :--- | :--- | :--- |
| **`arena_words`** | `id` (VARCHAR 36) | Ngân hàng từ vựng thi đấu phân loại theo cấp độ CEFR (A1-C2), chủ đề (`topic`) và loại từ (`word_type`: `noun`, `verb`, `adjective`, `adverb`, `noun_phrase`, `verb_phrase`, `idiom`, `collocation` - đã loại bỏ giá trị thừa `phrase`). | Admin quản trị CRUD, INDEX(`level`, `word_type`) |
| **`arena_matches`** | `id` (VARCHAR 36) | Lưu kết quả các trận đấu 1v1: Người chơi 1, Người chơi 2, chế độ đấu (`match_type`: `RANK` hoặc `FRIENDLY`), trạng thái áp dụng x2 Coin/EXP (`p1_x2_applied`, `p2_x2_applied`), kết quả, thời gian làm bài, điểm rank thay đổi (`p1_points_change`, `p2_points_change`). | `player1_id`, `player2_id` FK |
| **`arena_match_words`** | `id` (VARCHAR 36) | Lưu chi tiết từng câu hỏi trong trận (câu trả lời của 2 người chơi, số lượt thử, đúng/sai, thời gian phản hồi mili-giây `p1_time_ms`, `p2_time_ms`) phục vụ màn hình tổng kết trận và thuật toán tính toán Hồ sơ Năng lực 6 chiều (Radar Analytics). | `match_id` FK, `ON DELETE CASCADE` |

**Cơ chế lưu trữ In-Memory & Caching (Redis Upstash cho Arena):**

| Redis Key Pattern | Kiểu dữ liệu | TTL | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `arena:daily_rank:{userId}:{YYYYMMDD}` | String (Counter) | 25 giờ | Đếm số trận leo Rank đã chơi trong ngày của tài khoản `FREE`. Chặn vào queue khi đạt 10 trận/ngày. Múi giờ UTC+7. |
| `arena:daily_x2:{userId}:{YYYYMMDD}` | String (Counter) | 25 giờ | Đếm số trận đã nhận x2 Coin & EXP trong ngày (STARTER: 3, PRO: 5, ELITE: 10). Múi giờ UTC+7. |
| `arena:queue:{rankGroup}` | List / Set | 60 giây | Hàng đợi ghép trận thời gian thực theo nhóm Rank tương đồng. |
| `arena:room:{roomId}` | Hash / JSON | 600 giây | Lưu trạng thái ván đấu trực tiếp, danh sách 25 câu hỏi và tiến trình thi đấu. |

---

### PHÂN VÙNG F: MARKETING & CAMPAIGNS (Chiến dịch & Vận hành)

| Tên bảng | Khóa chính | Mục đích sử dụng | Ràng buộc quan trọng |
| :--- | :--- | :--- | :--- |
| **`reward_campaigns`** | `id` (INT AUTO_INCREMENT) | Lưu trữ các chiến dịch tặng quà sự kiện do Admin tạo. Mỗi chiến dịch có loại phần thưởng (`coin`, `diamond`, `item`), số lượng, thời gian hiệu lực (`starts_at`, `ends_at`), cờ hoạt động (`is_active`) và `fallback_coin` (số coin thay thế khi người dùng đã có vật phẩm). | `created_by` FK tới `users.id` |
| **`system_announcements`** | `id` (INT AUTO_INCREMENT) | Quản lý thông báo bảo trì hệ thống. Lưu trạng thái (`is_maintenance`), tiêu đề, thông điệp, thời gian bắt đầu/kết thúc dự kiến và admin tạo. Chỉ một bản ghi `is_maintenance = TRUE` được phép tồn tại tại một thời điểm. | `is_maintenance` tự quản lý |
| **`email_blast_logs`** | `id` (INT AUTO_INCREMENT) | Ghi lại nhật ký các đợt gửi email diện rộng: tiêu đề, nội dung, số email đã gửi, trạng thái (`sent`, `failed`), admin gửi và thời gian. | `sent_by` FK tới `users.id` |

**Các cột mở rộng cấu hình chiến dịch:**

| Bảng | Cột mới | Mô tả |
| :--- | :--- | :--- |
| `credit_packages` | `sale_starts_at DATETIME NULL` | Thời điểm bắt đầu đợt sale % (kết hợp với `sale_ends_at` đã có). Hệ thống tính runtime tại thời điểm request, không dùng cron. |
| `subscription_campaigns` | `description TEXT NULL` | Mô tả chi tiết chiến dịch gói trial sự kiện. |
| `subscription_campaigns` | `banner_color VARCHAR(20) NULL` | Mã màu Tailwind hiển thị thẻ campaign trên trang Subscription. |
| `subscription_campaigns` | `created_by VARCHAR(36) NULL` | Admin tạo chiến dịch (FK tới `users.id`). |
| `user_campaign_claims` | `campaign_type ENUM('subscription','reward')` | Phân loại lượt nhận: gói hội viên sự kiện hay quà tặng Coin/Diamond/Item. |
| `user_campaign_claims` | `reward_campaign_id INT NULL` | FK tới `reward_campaigns.id` (NULL nếu là subscription campaign). |

---

### PHÂN VÙNG E: PAYMENT & CREDIT PACKAGES (Thanh toán & Gói Hội viên)

| Tên bảng | Khóa chính | Mục đích sử dụng | Ràng buộc quan trọng |
| :--- | :--- | :--- | :--- |
| **`credit_packages`** | `id` (VARCHAR 36) | Danh mục 9 gói hội viên + 1 gói trial + các gói nạp coin/diamond. Chứa giá tiền VND, số ngày (`duration_days`), cấu hình khuyến mãi (`sale_percent`, `sale_ends_at`) và khung giờ chiến dịch (`is_trial`, `available_from`, `available_until`). | `slug` UNIQUE |
| **`payment_orders`** | `id` (VARCHAR 36) | Lưu trữ các đơn hàng thanh toán, mã đối soát VietQR duy nhất `payment_reference` (`LC######`), cổng thanh toán (`SEPAY`, `WALLET`, `MOCK`), trạng thái đơn (`PENDING`, `SUCCESS`, `FAILED`) và log webhook. | `payment_reference` UNIQUE, `user_id` FK |
| **`user_subscription`** | `id` (VARCHAR 36) | Quản lý trạng thái gói hội viên hiện tại của từng học viên: Hạng gói (`STARTER`, `PRO`, `ELITE`), ngày bắt đầu, ngày hết hạn `expires_at`, tự động gia hạn `auto_renew` và trạng thái `ACTIVE`. | `user_id` UNIQUE (Quan hệ 1-1), `package_id` FK |
| **`payment_announcements`** | `id` (VARCHAR 36) | Bảng tin quản trị hiển thị các thông báo chính sách, hướng dẫn thanh toán, thông tin quyền lợi chi tiết trên Tab "Thông tin" của `SubscriptionModal`. | Hỗ trợ định dạng Markdown |

---

### PHÂN VÙNG X: NOTIFICATIONS & SETTINGS (Cài đặt & Thông báo)

| Tên bảng | Khóa chính | Mục đích sử dụng | Ràng buộc quan trọng |
| :--- | :--- | :--- | :--- |
| **`user_settings`** | `user_id` (VARCHAR 36) | Cài đặt cá nhân của học viên: bật/tắt nhắc nhở qua Email, bật/tắt thông báo In-app, giờ hẹn học (`reminder_time`, mặc định 20:00) và múi giờ (`Asia/Ho_Chi_Minh`). | Quan hệ 1-1 với `users`, `ON DELETE CASCADE` |
| **`notifications`** | `id` (VARCHAR 36) | Lưu các thông báo gửi đến học viên trong ứng dụng (nhắc nhở học tập, quà tặng, thông báo nâng cấp). | `user_id` FK, `ON DELETE CASCADE` |

---

### PHÂN VÙNG Y: FRIENDS & DIRECT MESSAGING (Bạn bè & Nhắn tin 1-1)

| Tên bảng | Khóa chính | Mục đích sử dụng | Ràng buộc quan trọng |
| :--- | :--- | :--- | :--- |
| **`friendships`** | `id` (VARCHAR 36) | Quản lý quan hệ bạn bè giữa 2 người dùng (`pending`, `accepted`, `rejected`, `blocked`). Cột `pair_key` có dạng `<id_nho>:<id_lon>` để ngăn chặn hoàn toàn việc gửi lời mời trùng lặp 2 chiều. | `pair_key` UNIQUE |
| **`conversations`** | `id` (VARCHAR 36) | Phòng hội thoại chat riêng 1-1 giữa 2 học viên, luôn chuẩn hóa `user1_id < user2_id` và cập nhật mốc `last_message_at`. | `UNIQUE KEY (user1_id, user2_id)` |
| **`messages`** | `id` (BIGINT AUTO_INCREMENT) | Nội dung tin nhắn trao đổi trong phòng chat, khóa chính kiểu `BIGINT` tăng dần để phục vụ phân trang vô tận hiệu năng cao (Cursor-based Pagination). | `conversation_id` FK, `ON DELETE CASCADE` |

---

## 3. QUY TẮC TOÀN VẸN DỮ LIỆU & GIAO DỊCH (ACID)

1. **Ràng buộc khóa ngoại an toàn:**
   - Toàn bộ các bảng liên quan đến học viên đều sử dụng `ON DELETE CASCADE` với `users.id`, đảm bảo khi xóa tài khoản thì toàn bộ dữ liệu phụ thuộc được dọn dẹp sạch sẽ.
   - Các bảng danh mục (như `created_by` của admin hoặc `collection_id`) sử dụng `ON DELETE SET NULL` để không làm mất dữ liệu người dùng khi danh mục bị thay đổi.
2. **Tính nguyên tử trong giao dịch tài chính (ACID):**
   - Mọi thao tác trừ tiền ví, cộng thưởng nhiệm vụ, kích hoạt gói hội viên và xử lý webhook SePay đều bắt buộc chạy trong MySQL Transaction:
     ```typescript
     const conn = await pool.getConnection();
     try {
       await conn.beginTransaction();
       // 1. Kiểm tra điều kiện & trừ tiền
       // 2. Kích hoạt dịch vụ & cập nhật trạng thái đơn
       await conn.commit();
     } catch (err) {
       await conn.rollback();
       throw err;
     } finally {
       conn.release();
     }
     ```

---

## 4. QUẢN TRỊ LƯỢC ĐỒ DỮ LIỆU & NGUỒN CHÂN LÝ DUY NHẤT (SINGLE SOURCE OF TRUTH)

- **Tập trung nguồn chân lý (Single Source of Truth):** Toàn bộ cấu trúc cơ sở dữ liệu của hệ thống LexiCore được quản lý tập trung và chuẩn hóa 100% tại tệp [backend/database/schema.sql](file:///e:/Downloads/LexiCore/backend/database/schema.sql). Đây là bản thiết kế chuẩn xác nhất phản ánh đầy đủ cấu trúc dữ liệu đang vận hành trên môi trường thực tế (Aiven MySQL). Mọi định nghĩa bảng, kiểu dữ liệu ENUM, chỉ mục Index và ràng buộc khóa ngoại ACID đều được đồng bộ tại đây.
- Các script SQL cập nhật bổ sung (migration) chỉ là công cụ hỗ trợ thao tác nhanh qua DataGrip trong quá trình phát triển tính năng mới và không được lưu giữ như tài liệu kiến trúc lâu dài.

