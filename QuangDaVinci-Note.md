# LexiCore - Tài Liệu Hệ Thống (System Reference)

---

## 1. Tổng Quan Kiến Trúc

- Monorepo với 2 thư mục chính: `backend/` và `frontend/`
- Backend: Node.js + Express.js + TypeScript, chạy port 5000
- Frontend: React + Vite + TypeScript + TailwindCSS v4, chạy port 5173
- Database chính (quan hệ): MySQL - lưu users, items, gamification
- Database phụ (document): MongoDB - lưu nội dung bài học/flashcard
- Cache: Redis
- File storage: Cloudinary (ảnh vật phẩm, avatar, cover photo)
- AI: OpenAI Whisper (speech-to-text), Google Gemini (contextual explanation, vocabulary summary)
- Real-time: Socket.IO (Arena PvP)
- CI/CD: GitHub Actions - kiểm tra riêng cho frontend hoặc backend khi có thay đổi tương ứng

### Route Prefix (API Endpoints)

```text
/api/auth               -> Auth module
/api/store              -> Economy (Store, Inventory)
/api/gamification       -> Gamification (Goals, Achievements, Collections, Leaderboard)
/api/admin              -> Admin HR (Users, Creator Applications)
/api/admin/gamification -> Admin Economy (Items, Collections, Goals, Achievements)
/api/shadowing          -> Shadowing module
/api/upload             -> Cloudinary upload
/api/arena              -> PvP Arena
/api/courses            -> Creator/Admin course management
/api/exams              -> Exam module
```

---

## 2. Phân Quyền (RBAC)

| Role | Quyền |
|---|---|
| USER | Tạo nội dung riêng tư, mua/trang bị vật phẩm, học, PvP |
| CONTENT_CREATOR | Được duyệt bởi Admin, có quyền xuất bản nội dung ra cộng đồng |
| ADMIN | Quản trị toàn bộ: duyệt Creator, ban user, quản lý Economy |

Cơ chế Shadow Ban: Creator bị cấm mất quyền tạo mới, nhưng nội dung cũ vẫn giữ lại để học viên cũ tiếp tục học.

Middleware bảo vệ:
- `requireAuth`: Kiểm tra JWT cookie hợp lệ, gán `req.user`.
- `requireRole(['admin'])`: Chặn request nếu không phải Admin.
- `optionalAuth`: Gán user nếu có token, không bắt buộc (dùng cho các API công khai như leaderboard).

---

## 3. Module Gamification & Economy (Cửa hàng vật phẩm)

Các file quan trọng:
- `backend/modules/economy/economy-repository.ts` - Logic mua và trang bị
- `backend/modules/economy/economy-route.ts` - Routes user
- `backend/modules/admin/gamification-admin.route.ts` - Routes admin
- `backend/modules/admin/gamification-admin.controller.ts` - Controller CRUD admin
- `frontend/src/app/components/dashboard/StoreView.tsx` - Giao diện cửa hàng và túi đồ

### Database Schema (MySQL)

| Bảng | Mô tả |
|---|---|
| `wallets` | Số dư `coin_balance`, `diamond_balance`, `exp`, `level`, `current_streak`, `longest_streak`, `last_study_date`, `arena_rank`, `leaderboard_point` |
| `billing_transactions` | Sổ cái giao dịch (ai mua gì, trừ bao nhiêu xu/kim cương, thời gian nào) |
| `items` | Vật phẩm: `name`, `type` (AVATAR/COVER_PHOTO/STREAK_FREEZE), `price`, `price_type` (COIN/DIAMOND), `image_url`, `required_level`, `collection_id`, `is_active` (Soft delete) |
| `collections` | Nhóm vật phẩm: `name`, `unlock_level`, `theme_color`, `image_url`, `description` |
| `user_items` | Túi đồ user: `user_id`, `item_id`, `quantity`, `is_active` |

Lưu ý Soft Delete: Dùng `is_active = false` thay vì xoá cứng khỏi database để bảo toàn lịch sử túi đồ của người dùng.

### API Endpoints

Dành cho User (`/api/store`):
```text
GET  /api/store/items           -> Danh sách vật phẩm đang bán (kèm is_owned cho user hiện tại)
GET  /api/store/inventory       -> Túi đồ của user
POST /api/store/buy/:itemId     -> Mua vật phẩm (dùng Database Transaction + Row Locking)
POST /api/store/equip/:itemId   -> Trang bị avatar/cover (cập nhật users.avatar_url / users.cover_url)
```

Dành cho Admin (`/api/admin/gamification`):
```text
GET/POST     /items              -> Xem danh sách / thêm vật phẩm mới
PUT          /items/:id          -> Sửa vật phẩm
PUT          /items/:id/toggle   -> Bật/Tắt trạng thái is_active

GET/POST     /collections        -> Xem / thêm bộ sưu tập
PUT          /collections/:id    -> Sửa bộ sưu tập
DELETE       /collections/:id    -> Xoá bộ sưu tập

GET/POST     /goals              -> Xem / thêm nhiệm vụ
PUT          /goals/:id          -> Sửa nhiệm vụ
PUT          /goals/:id/toggle   -> Bật/Tắt trạng thái

GET/POST     /achievements       -> Xem / thêm thành tựu
PUT          /achievements/:id   -> Sửa thành tựu
PUT          /achievements/:id/toggle -> Bật/Tắt trạng thái
```

### Logic mua hàng (`purchaseItem`)

Sử dụng Database Transaction: `BEGIN -> COMMIT / ROLLBACK`.

1. Kiểm tra đã sở hữu chưa (AVATAR và COVER_PHOTO chỉ mua 1 lần).
2. Dùng `SELECT ... FOR UPDATE` (Row-locking) để chống spam click 2 lần cùng lúc gây trừ tiền trùng.
3. Trừ `coin_balance` hoặc `diamond_balance` trong bảng `wallets`.
4. Insert vào `user_items` (dùng `ON DUPLICATE KEY UPDATE quantity = quantity + 1`).
5. Ghi log vào `billing_transactions`.
6. Sau khi commit: kích hoạt Gamification Events (`total_coin_spent`, `collection_completed`).

### Logic trang bị (`equipItemInDb`)

- Kiểm tra user có sở hữu item trong `user_items` không, nếu không trả về `NOT_OWNED`.
- Nếu item là `AVATAR`: `UPDATE users SET avatar_url = item.image_url WHERE id = userId`
- Nếu item là `COVER_PHOTO`: `UPDATE users SET cover_url = item.image_url WHERE id = userId`

### Hiển thị Avatar và Ảnh bìa trên Profile

- Trang Profile (`ProfileView.tsx`) đọc `avatar_url` và `cover_url` từ API `/api/auth/me`.
- Nếu có `avatar_url`: thay ảnh chữ cái mặc định bằng ảnh đại diện thật.
- Nếu có `cover_url`: phủ lên gradient nền mặc định bằng ảnh bìa.

### Tối ưu ảnh Cloudinary

File `frontend/src/app/services/arena-service.ts` cung cấp 2 hàm:

```ts
optimizeImageUrl(url, { width, aspectRatio })  // Chèn thông số transform vào giữa URL Cloudinary
optimizeAvatarUrl(url, size)                   // Shorthand cho avatar tỉ lệ 1:1
```

Nguyên tắc: Chèn cụm `w_{width},h_{height},c_fill,q_auto,f_auto` vào sau `/upload/` trong URL Cloudinary.
Gọi hàm này ở mọi nơi render ảnh từ Cloudinary để tránh vỡ nét và giảm dung lượng tải.

---

## 4. Module Gamification (Goals, Achievements, Collections)

Các file quan trọng:
- `backend/modules/gamification/gamification-repository.ts` - Toàn bộ logic nghiệp vụ
- `backend/modules/gamification/gamification-route.ts` - Routes user
- `backend/modules/gamification/gamification-controller.ts` - Controller

### Database Schema (MySQL)

| Bảng | Mô tả |
|---|---|
| `daily_goal_definitions` | Định nghĩa nhiệm vụ: `title`, `metric_key`, `target_value`, `type` (DAILY/WEEKLY), `is_active`, `reward_coin`, `reward_exp` |
| `user_daily_goals` | Tiến độ nhiệm vụ: `user_id`, `goal_id`, `date`, `current_progress`, `is_completed`, `is_claimed` |
| `achievement_definitions` | Định nghĩa thành tựu: `title`, `metric_key`, `target_value`, `category` (LEARNING/STREAK/PVP/COLLECTION), `reward_coin`, `reward_diamond`, `reward_exp` |
| `user_achievements` | Tiến độ thành tựu: `user_id`, `achievement_id`, `current_progress`, `is_unlocked`, `unlocked_at` |

### API Endpoints (User)

```text
GET  /api/gamification/daily-goals                     -> Nhiệm vụ hôm nay (tự động tạo nếu chưa có)
POST /api/gamification/daily-goals/claim/:goalId       -> Nhận thưởng nhiệm vụ đã hoàn thành
GET  /api/gamification/achievements                    -> Toàn bộ thành tựu kèm tiến độ user
GET  /api/gamification/collections                     -> Danh sách bộ sưu tập và tiến độ sở hữu
GET  /api/gamification/collections/:collectionId/items -> Vật phẩm trong collection kèm is_owned, is_equipped
GET  /api/gamification/leaderboard                     -> Bảng xếp hạng top 50 user theo leaderboard_point (public)
```

### Hàm cập nhật tiến độ (Background Events)

```ts
// Cộng dồn (coin_spent, lessons_completed, ...)
updateAchievementProgress(userId, metricKey, incrementValue)
updateGoalProgress(userId, metricKey, incrementValue)

// Đặt giá trị tuyệt đối - chỉ tăng, không giảm (dùng cho current_streak)
setAchievementProgress(userId, metricKey, absoluteValue)
```

Bảng các sự kiện kích hoạt tiến độ:

| Sự kiện | Metric key | Nơi gọi |
|---|---|---|
| Học Shadowing 1 câu | `shadowing_minutes_studied` | `shadowing-service.ts -> analyzeAudio()` |
| Mua vật phẩm | `total_coin_spent` | `economy-repository.ts -> purchaseItem()` |
| Hoàn thành bộ sưu tập | `collection_completed` | `economy-repository.ts -> purchaseItem()` |
| Học ngày mới | `total_active_days`, `current_streak` | `utils/streak.ts -> updateStreak()` |

### Logic xác định trạng thái is_equipped

Trong database không có cột `is_equipped`. Trạng thái này được suy ra trực tiếp qua câu lệnh SQL:

```sql
CASE WHEN i.type = 'AVATAR' AND u.avatar_url = i.image_url THEN 1
     WHEN i.type = 'COVER_PHOTO' AND u.cover_url = i.image_url THEN 1
     ELSE 0 END as is_equipped
```

### Giao diện AchievementsView.tsx (Frontend)

Bao gồm 4 tab chính: Nhiệm vụ, Thành tựu, Bộ Sưu Tập, Bảng Xếp Hạng.

Tab Bộ Sưu Tập:
- Màn hình danh sách: Grid các thẻ collection, click vào thẻ để xem chi tiết.
- Màn hình chi tiết: Banner trên cùng kèm thanh tiến độ sở hữu, chia làm 2 khu vực rõ ràng:
  - Ảnh Bìa: Tỉ lệ 16:9 (grid 2 cột)
  - Avatar: Tỉ lệ 1:1 (grid 6 cột)
- Nút "Trang bị" gọi `POST /api/store/equip/:itemId`, cập nhật giao diện optimistic.
- Avatar đang trang bị: Glow xanh viền `shadow-[0_0_15px_rgba(16,185,129,0.65)]` + nút "Đang dùng" màu xanh emerald với chấm ping nhấp nháy.

---

## 5. Logic Chuỗi Ngày Học (Streak) - `backend/utils/streak.ts`

Hàm `updateStreak(userId)` được gọi sau mỗi lần học thành công.

| Tình huống | Kết quả xử lý |
|---|---|
| Đã học hôm nay rồi | Giữ nguyên chuỗi (idempotent) |
| Học ngày hôm qua rồi học tiếp hôm nay | `current_streak += 1` |
| Bỏ 1 ngày trở lên nhưng còn vật phẩm `STREAK_FREEZE` | Trừ 1 Freeze, giữ nguyên chuỗi |
| Bỏ học từ 1 ngày trở lên, không có Freeze | `current_streak = 1` (reset về đầu) |

Giá trị `longest_streak` chỉ tăng hoặc giữ nguyên, không bao giờ bị giảm.

---

## 6. Hệ Thống Cấp Độ & EXP (`backend/utils/level.ts`)

Công thức lên cấp: EXP cần để lên từ Level `n` lên `n+1` = `100 + (n - 1) * 20`

```text
Level 1 -> 2: cần 100 EXP
Level 2 -> 3: cần 120 EXP
Level 5 -> 6: cần 180 EXP
```

Hàm `addExp(userId, expToAdd)`: Cộng EXP trực tiếp và tự động xử lý lên cấp nhiều lần nếu EXP vượt ngưỡng.

---

## 7. Module Shadowing (Phân tích giọng nói)

Các file quan trọng:
- `backend/modules/shadowing/shadowing-service.ts` - Toàn bộ business logic
- `backend/modules/shadowing/shadowing-route.ts` - Routes API
- `frontend/src/app/components/dashboard/ShadowingView.tsx` - Giao diện người dùng

### Database Schema (MySQL)

| Bảng | Mô tả |
|---|---|
| `shadowing_videos` | `youtube_id`, `title`, `channel`, `duration`, `thumbnail_url`, `ai_summary` (JSON cache) |
| `shadowing_segments` | `video_id`, `start_time`, `end_time`, `transcript`, `order_index` |
| `user_shadowing_history` | `user_id`, `video_id`, `segment_id`, `accuracy`, `created_at` |

### API Endpoints

```text
GET  /api/shadowing/videos               -> Thư viện video
GET  /api/shadowing/videos/:id           -> Chi tiết video kèm các đoạn segment
POST /api/shadowing/check-sub            -> Kiểm tra phụ đề thủ công TRƯỚC khi add
POST /api/shadowing/videos               -> Thêm video vào hệ thống (sau khi đã check-sub)
POST /api/shadowing/analyze/:segmentId   -> Gửi audio để phân tích Whisper và chấm điểm
GET  /api/shadowing/videos/:id/summary   -> Gemini AI Summary (lazy-load, cached DB)
GET  /api/shadowing/notes/:videoId       -> Lấy ghi chú cá nhân của user
PUT  /api/shadowing/notes/:videoId       -> Lưu ghi chú cá nhân
POST /api/shadowing/dictionary/explain   -> Gemini giải thích từ theo đúng ngữ cảnh
```

### Flow thêm video (checkManualSub -> addVideo)

1. Frontend gọi `POST /check-sub` với URL YouTube khi user bấm nút "Thêm video".
2. Backend thực thi `checkManualSub()`:
   - Parse YouTube ID từ URL (hỗ trợ nhiều định dạng URL rút gọn, thường hoặc raw ID).
   - Kiểm tra đã có trong DB chưa, nếu có trả về `ALREADY_EXISTS`.
   - Gọi YouTube InnerTube API để lấy danh sách caption tracks.
   - Fallback crawl HTML trang YouTube nếu InnerTube bị chặn.
   - Lọc track tiếng Anh (`languageCode: 'en'`).
   - Phân biệt phụ đề thủ công và tự động: `kind !== 'asr'` và `vssId` không bắt đầu bằng `'a.'`.
   - Chỉ cho phép phụ đề thủ công. Nếu là auto-generated sẽ trả về lỗi `AUTO_GENERATED`.
3. Nếu hợp lệ, frontend hiển thị thông tin video (title, channel) để user bấm xác nhận -> gọi `POST /videos`.
4. Backend `addVideo()` tải XML phụ đề từ `track.baseUrl` -> parse -> insert vào `shadowing_segments`.
5. Link `thumbnail_url` được lưu theo cú pháp: `https://img.youtube.com/vi/{youtubeId}/maxresdefault.jpg` (không cần API key).

### Flow phân tích giọng nói

1. Frontend dùng WebRTC (`getUserMedia` + `MediaRecorder`) ghi âm giọng đọc của user.
2. Đóng gói thành `Blob`, gửi `FormData` qua endpoint `POST /analyze/:segmentId`.
3. Backend nhận buffer qua `multer.memoryStorage()`.
4. Gửi buffer lên OpenAI Whisper API (`whisper-1`, `language: 'en'`) để nhận `spokenText`.
5. Hàm `compareWords(referenceText, spokenText)`: Chuẩn hoá chuỗi, so sánh word-by-word -> trả về `[{ text, status: 'correct'|'wrong' }]`.
6. Tính điểm: `accuracy = (correct / total) * 100`.
7. Lưu lịch sử học, gọi `updateStreak()` và cập nhật tiến độ Achievement/Goal.

### Giao diện học tập (Layout 60/40)

- Bên trái (60%): Trình phát video (react-youtube, ẩn controls gốc), Custom Control Bar, khu vực thu âm và phân tích giọng.
- Bên phải (40%): Tab Transcript (phụ đề tương tác từng từ), Tab Từ vựng Gemini, Tab Sổ tay ghi chú.

Custom Control Bar:
- Tự động dừng (Auto-Pause): Dừng video khi phát qua `end_time` của segment hiện tại.
- Lặp lại (Loop): Lặp lại segment (`seekTo(start_time)`).
- Tua lùi 5 giây, điều chỉnh tốc độ phát.

Phụ đề tương tác (Interactive Subtitles):
- Mỗi từ là 1 thẻ `<span>` có `onClick` để mở Dictionary Popup.
- Popup hỗ trợ kéo thả tự do bằng pointer events thuần React (`useRef`).
- Tra từ điển bằng Wiktionary REST API (ổn định, không dính CORS, không rate limit).
- Phát âm bằng Web Speech API (`window.speechSynthesis`), không cần file MP3.
- Giải thích ngữ cảnh bằng Gemini API (`/api/shadowing/dictionary/explain`).

Quy tắc màu sắc điểm số:
- `accuracy >= 80%`: Màu xanh lá (chuẩn).
- `accuracy` từ 50% đến 79%: Màu vàng (cảnh báo nhẹ).
- `accuracy < 50%`: Màu đỏ (cần luyện tập thêm).
- Từ đọc sai được gạch chân thẳng màu đỏ bên dưới.

---

## 8. Module Admin Panel

Các file quan trọng:
- `backend/modules/admin/admin.route.ts` + `admin.controller.ts`
- `backend/modules/admin/gamification-admin.route.ts` + `gamification-admin.controller.ts`
- `frontend/src/app/components/dashboard/AdminHRView.tsx`
- `frontend/src/app/components/dashboard/AdminEconomyView.tsx`

### AdminHRView - Quản Lý Nhân Sự

- Xem, phê duyệt hoặc từ chối đơn xin làm Content Creator.
- Đình chỉ (Suspend) hoặc kích hoạt lại (Reactivate) Creator vi phạm.
- Quản lý danh sách Users, khoá hoặc mở khoá tài khoản.
- Badge thông báo số lượng đơn chờ duyệt: `GET /api/admin/stats/pending`.

### AdminEconomyView - Quản Lý Kinh Tế & Gamification

Bao gồm 4 tab: Cửa hàng (Items), Bộ sưu tập (Collections), Nhiệm vụ (Goals), Thành tựu (Achievements).

Upload ảnh Cloudinary:
- Admin dán trực tiếp URL hoặc upload file qua nút "Tải ảnh lên".
- Upload gọi `POST /api/upload/image` (multer + Cloudinary SDK).
- Khung preview ảnh tự động tối ưu qua `optimizeImageUrl()`.
- Tỉ lệ preview chuẩn: COVER_PHOTO -> 16:9 (`w-36 h-20`), AVATAR -> 1:1 (`w-20 h-20`).

Ô nhập Level và Giá bán:
- Ô "Yêu cầu Level" và "Giá bán" không đặt số mặc định cố định để tránh bị kẹt không xoá được.
- Hiển thị qua placeholder; nếu để trống khi submit thì hệ thống mặc định coi như `required_level = 1` và `price = 0`.

---

## 9. Cấu Trúc File Chính

```text
backend/
├── server.ts                          # Entry point, dang ky tat ca routes
├── utils/
│   ├── streak.ts                      # updateStreak() dung chung
│   ├── level.ts                       # calculateNewLevel(), addExp()
│   └── gemini.ts                      # callGeminiWithRetry() goi Gemini kem retry
└── modules/
    ├── auth/                          # Dang ky, dang nhap, JWT, OTP, doi mat khau
    ├── economy/                       # Store, Inventory, Buy, Equip
    ├── gamification/                  # Goals, Achievements, Collections, Leaderboard
    ├── shadowing/                     # Video library, phan tich giong noi, AI summary
    ├── admin/                         # Admin HR va Admin Gamification
    ├── upload/                        # Upload anh Cloudinary
    ├── arena/                         # Dau truong PvP (Socket.IO)
    ├── course/                        # Khoa hoc (Creator, Admin, Student)
    ├── srs/                           # Spaced Repetition System (Flashcard)
    └── exam/                          # Module kiem tra

frontend/src/app/
├── services/
│   └── arena-service.ts               # optimizeImageUrl(), optimizeAvatarUrl(), getRankBadgeUrl()
└── components/dashboard/
    ├── StoreView.tsx                  # Cua hang va tui do
    ├── AchievementsView.tsx           # Nhiem vu, thanh tuu, bo suu tap, bang xep hang
    ├── ShadowingView.tsx              # Toan bo UI module Shadowing
    ├── AdminEconomyView.tsx           # Admin quan ly kinh te va gamification
    ├── AdminHRView.tsx                # Admin quan ly nhan su
    └── ProfileView.tsx                # Trang ho so ca nhan (avatar_url, cover_url)
```

---

## 10. Lưu Ý Kỹ Thuật Quan Trọng

1. Tailwind v4: Dự án dùng TailwindCSS v4. Tuyệt đối không dùng `bg-opacity-*`, thay bằng cú pháp slash như `bg-black/40`, `bg-emerald-500/10`.

2. Cấu trúc URL Cloudinary: Hàm `optimizeImageUrl` chỉ hoạt động với URL chứa `res.cloudinary.com` và `/upload/`. URL ngoài Cloudinary được trả về nguyên bản.

3. Kiểm tra is_equipped: Không tạo cột `is_equipped` trong database. Trạng thái trang bị được xác định bằng cách so khớp `item.image_url` với `users.avatar_url` hoặc `users.cover_url`.

4. Transaction khi giao dịch: Luôn dùng `pool.getConnection()` kết hợp `beginTransaction()` và `FOR UPDATE` cho các thao tác đọc ghi liên quan đến số dư ví và vật phẩm.

5. Tự động tạo Goals: Khi user gọi `GET /daily-goals`, nếu chưa có dữ liệu của ngày hoặc tuần hiện tại, hệ thống sẽ tự động khởi tạo từ các `daily_goal_definitions` đang kích hoạt.

6. Shadowing chỉ nhận phụ đề thủ công: Phụ đề tự động (ASR) bị chặn tại hàm `checkManualSub`. Điều kiện nhận diện là `kind !== 'asr'` và `!vssId.startsWith('a.')`.

7. Ảnh thumbnail Shadowing: Lấy trực tiếp từ YouTube theo định dạng `https://img.youtube.com/vi/{youtubeId}/maxresdefault.jpg` mà không cần Google API key.
