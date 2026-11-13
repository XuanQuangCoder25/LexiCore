# LEXICORE — SYSTEM OVERVIEW (Tài Liệu Hệ Thống Tổng Quan)

> Tài liệu tổng hợp kiến trúc, phân quyền, danh sách module, luồng nghiệp vụ chính và cấu trúc mã nguồn.
> Đây là điểm tra cứu nhanh đầu tiên trước khi đi sâu vào tài liệu chuyên biệt.

**Tài liệu chuyên biệt liên quan:**
- [database-architecture.md](./database-architecture.md) — Schema MySQL, MongoDB, Redis chi tiết
- [payment-subscription.md](./payment-subscription.md) — Nghiệp vụ thanh toán, bảng giá, Prorated Upgrade
- [gamification.md](./gamification.md) — Huy hiệu Rank, danh mục Bộ Sưu Tập
- [design-system.md](./design-system.md) — Màu sắc, Dark/Light mode
- [deployment.md](./deployment.md) — Hướng dẫn triển khai Vercel + Render + Hostinger
- [dev-conventions.md](./dev-conventions.md) — Quy tắc code bắt buộc

---

## 1. TỔNG QUAN KIẾN TRÚC

- **Monorepo** với 2 thư mục chính: `backend/` và `frontend/`
- **Backend:** Node.js + Express.js + TypeScript, chạy port 5000
- **Frontend:** React + Vite + TypeScript + TailwindCSS v4, chạy port 5173
- **Database chính (quan hệ):** MySQL (Aiven Cloud) — users, wallets, gamification, payment
- **Database phụ (document):** MongoDB (Atlas) — nội dung khóa học, Creator Studio
- **Cache & Queue:** Redis (Upstash) — hàng đợi ghép trận Arena, session cache
- **File storage:** Cloudinary — ảnh vật phẩm, avatar, cover photo
- **AI:** OpenAI Whisper (speech-to-text phát âm), Google Gemini (giải thích ngữ cảnh, tóm tắt video)
- **Real-time:** Socket.IO (Arena PvP 1v1, Social/Chat namespace)
- **Email:** Resend API — OTP, nhắc nhở hết hạn gói
- **Payment:** SePay VietQR — cổng thanh toán cá nhân, miễn phí, webhook tự động
- **CI/CD:** Vercel (frontend, auto-deploy từ GitHub `main`) + Render (backend, auto-deploy từ GitHub `main`)

---

## 2. ROUTE PREFIX — API ENDPOINTS

```text
/api/auth                    -> Đăng ký, đăng nhập, OTP, JWT refresh, hồ sơ
/api/store                   -> Cửa hàng (Store) và Kho đồ (Inventory)
/api/gamification            -> Goals, Achievements, Collections, Leaderboard
/api/shadowing               -> Thư viện video, phân tích giọng nói AI, AI summary
/api/arena                   -> Từ vựng Arena (CRUD), Rank utilities
/api/payment                 -> Gói hội viên, SePay VietQR, Ví LexiCore, Webhook
/api/courses                 -> Creator/Admin quản lý khóa học
/api/v1/student/courses      -> Student học khóa học
/api/exams                   -> Module kiểm tra (Exam Builder)
/api/v1/srs                  -> Spaced Repetition System (Flashcard)
/api/admin                   -> Admin HR (Users, Creator Applications)
/api/admin/gamification      -> Admin Economy (Items, Collections, Goals, Achievements)
/api/admin/arena             -> Admin Arena (Từ vựng, Cấu hình rank)
/api/upload                  -> Upload ảnh lên Cloudinary
/api/notifications           -> Thông báo in-app
/api/social                  -> Kết bạn, nhắn tin trực tiếp (DM)
/api/community               -> Bài đăng cộng đồng
/api/v1/creator              -> Creator Studio (xuất bản nội dung)
```

---

## 3. PHÂN QUYỀN (RBAC)

| Role | Quyền |
|---|---|
| `USER` | Học tập, mua/trang bị vật phẩm, PvP Arena, kết bạn, đăng bài cộng đồng |
| `CONTENT_CREATOR` | Tất cả quyền USER + tạo và xuất bản khóa học ra cộng đồng (phải được Admin duyệt) |
| `ADMIN` | Toàn quyền: duyệt Creator, khoá user, quản lý Economy, tạo chiến dịch khuyến mãi |

**Middleware bảo vệ:**
- `requireAuth` — Xác thực JWT cookie, gán `req.user`. Áp dụng cho hầu hết routes.
- `requireRole(['ADMIN'])` — Chặn nếu không phải Admin. Áp dụng cho `/api/admin/*`.
- `optionalAuth` — Gán user nếu có token, không bắt buộc (dùng cho Leaderboard, public pages).

**Cơ chế Shadow Ban Creator:** Creator bị đình chỉ mất quyền tạo nội dung mới, nhưng nội dung cũ vẫn giữ nguyên để học viên đang học không bị gián đoạn.

---

## 4. MODULE ECONOMY & CỬA HÀNG

**File chính:**
- `backend/modules/economy/economy-repository.ts` — Logic mua và trang bị
- `backend/modules/admin/gamification-admin.controller.ts` — CRUD admin
- `frontend/src/app/components/dashboard/StoreView.tsx`

**API (User):**
```text
GET  /api/store/items          -> Danh sách vật phẩm (kèm is_owned cho user đang đăng nhập)
GET  /api/store/inventory      -> Kho đồ của user
POST /api/store/buy/:itemId    -> Mua vật phẩm (Transaction + Row-level Locking)
POST /api/store/equip/:itemId  -> Trang bị Avatar/Cover
```

**API (Admin — `/api/admin/gamification`):**
```text
GET/POST  /items              -> Danh sách / thêm vật phẩm
PUT       /items/:id          -> Sửa vật phẩm
PUT       /items/:id/toggle   -> Bật/Tắt is_active (Soft delete)
GET/POST  /collections        -> Danh sách / thêm bộ sưu tập
PUT/DEL   /collections/:id    -> Sửa / Xóa bộ sưu tập
GET/POST  /goals              -> Danh sách / thêm nhiệm vụ
PUT       /goals/:id/toggle   -> Bật/Tắt nhiệm vụ
GET/POST  /achievements       -> Danh sách / thêm thành tựu
PUT       /achievements/:id/toggle -> Bật/Tắt thành tựu
```

**Logic mua hàng (`purchaseItem`):**
1. Kiểm tra đã sở hữu chưa (AVATAR và COVER_PHOTO chỉ mua 1 lần)
2. `SELECT ... FOR UPDATE` chống spam click đồng thời
3. Trừ `coin_balance` hoặc `diamond_balance` trong `wallets`
4. Insert vào `user_items` (`ON DUPLICATE KEY UPDATE quantity = quantity + 1`)
5. Ghi log vào `billing_transactions`
6. Kích hoạt Gamification Events: `total_coin_spent`, `collection_completed`

---

## 5. MODULE GAMIFICATION

**File chính:**
- `backend/modules/gamification/gamification-repository.ts`
- `frontend/src/app/components/dashboard/AchievementsView.tsx` — Tab: Nhiệm vụ / Thành tựu / Bộ Sưu Tập / Bảng XH

**API (User):**
```text
GET  /api/gamification/daily-goals                      -> Nhiệm vụ hôm nay (tự tạo nếu chưa có)
POST /api/gamification/daily-goals/claim/:goalId        -> Nhận thưởng nhiệm vụ
GET  /api/gamification/achievements                     -> Toàn bộ thành tựu kèm tiến độ
GET  /api/gamification/collections                      -> Danh sách bộ sưu tập + tiến độ sở hữu
GET  /api/gamification/collections/:id/items            -> Vật phẩm trong collection (kèm is_owned, is_equipped)
GET  /api/gamification/leaderboard                      -> Top 50 theo leaderboard_point (public)
```

**Hàm cập nhật tiến độ (gọi từ các module khác):**
```ts
updateAchievementProgress(userId, metricKey, incrementValue)  // Cộng dồn
updateGoalProgress(userId, metricKey, incrementValue)          // Cộng dồn
setAchievementProgress(userId, metricKey, absoluteValue)       // Đặt tuyệt đối (chỉ tăng)
```

| Sự kiện | Metric key | Nơi gọi |
|---|---|---|
| Phân tích audio Shadowing | `shadowing_minutes_studied` | `shadowing-service.ts` |
| Mua vật phẩm | `total_coin_spent` | `economy-repository.ts` |
| Hoàn thành bộ sưu tập | `collection_completed` | `economy-repository.ts` |
| Học ngày mới | `total_active_days`, `current_streak` | `utils/streak.ts` |
| Thắng trận Arena | `arena_wins` | `arena-socket.ts` |

**Streak (`backend/utils/streak.ts`):**

| Tình huống | Kết quả |
|---|---|
| Đã học hôm nay rồi | Giữ nguyên (idempotent) |
| Hôm qua học, hôm nay học tiếp | `current_streak += 1` |
| Bỏ 1+ ngày nhưng có STREAK_FREEZE | Trừ 1 Freeze, giữ chuỗi |
| Bỏ 1+ ngày, không có Freeze | `current_streak = 1` |

`longest_streak` chỉ tăng hoặc giữ nguyên, không bao giờ giảm.

**Level & EXP (`backend/utils/level.ts`):**

Công thức: EXP cần lên từ Level `n` lên `n+1` = `100 + (n - 1) * 20`

```
Level 1 -> 2: 100 EXP    Level 2 -> 3: 120 EXP    Level 5 -> 6: 180 EXP
```

`addExp(userId, expToAdd)` tự động xử lý lên cấp nhiều lần nếu EXP vượt ngưỡng.

---

## 6. MODULE SHADOWING

**File chính:**
- `backend/modules/shadowing/shadowing-service.ts`
- `frontend/src/app/components/dashboard/ShadowingView.tsx`

**API:**
```text
GET  /api/shadowing/videos              -> Thư viện video
GET  /api/shadowing/videos/:id          -> Chi tiết + danh sách segments
POST /api/shadowing/check-sub           -> Kiểm tra phụ đề thủ công (trước khi thêm)
POST /api/shadowing/videos              -> Thêm video sau khi check-sub thành công
POST /api/shadowing/analyze/:segmentId  -> Gửi audio -> Whisper -> chấm điểm
GET  /api/shadowing/videos/:id/summary  -> Gemini AI Summary (lazy cache vào DB)
GET/PUT /api/shadowing/notes/:videoId   -> Ghi chú cá nhân của user
POST /api/shadowing/dictionary/explain  -> Gemini giải thích từ theo ngữ cảnh câu
```

**Flow thêm video:**
1. `POST /check-sub` với URL YouTube
2. `checkManualSub()`: parse ID → kiểm tra DB → InnerTube API → lọc track tiếng Anh → xác nhận `kind !== 'asr'`
3. Nếu hợp lệ, frontend hiển thị preview → user xác nhận → `POST /videos`
4. `addVideo()`: tải XML từ `track.baseUrl` → parse → insert segments vào DB

**Flow phân tích giọng nói:**
1. Frontend: `getUserMedia` + `MediaRecorder` → ghi âm → Blob → `FormData`
2. Backend: `multer.memoryStorage()` → buffer → Whisper API (`whisper-1`, `language: 'en'`)
3. `compareWords(referenceText, spokenText)` → `[{ text, status: 'correct'|'wrong' }]`
4. `accuracy = (correct / total) * 100` → lưu history → `updateStreak()` → cập nhật Achievement/Goal

**Quy tắc màu kết quả:**
- `accuracy >= 80%` → Xanh lá
- `50% ≤ accuracy < 80%` → Vàng
- `accuracy < 50%` → Đỏ

**Giao diện layout 60/40:**
- **60% trái:** Player YouTube (react-youtube + custom controls), khu vực thu âm
- **40% phải:** Tab Transcript tương tác (click từ → Dictionary Popup kéo thả), Tab Từ vựng Gemini, Tab Sổ tay
- Dictionary Popup: tra Wiktionary REST API + phát âm Web Speech API + giải thích ngữ cảnh Gemini

---

## 7. MODULE ARENA PvP

**File chính:**
- `backend/modules/arena/arena-socket.ts` — Engine ghép trận, xử lý real-time
- `backend/modules/arena/arena-rank.utils.ts` — 15 bậc rank, phân phối từ vựng CEFR
- `backend/modules/arena/arena-word.repository.ts` — Ngân hàng từ vựng

**Cơ chế ghép trận:**
- Hàng đợi lưu trên Redis theo cấp rank
- Ghép hai người cùng cấp hoặc gần nhau nhất
- 25 câu/trận, giới hạn 360 giây (6 phút)
- Từ vựng chọn theo `getLowerRank()` giữa hai người chơi (cân bằng độ khó)

**Điểm sau mỗi trận:**
```
Thắng: rank_point +25, leaderboard_point +25
Thua:  rank_point -20, leaderboard_point -20
Hòa:   rank_point ±0,  leaderboard_point ±0
```

Thăng bậc khi `rank_point` vượt `RANK_THRESHOLDS[currentRank]`. Giáng bậc khi về 0.
Chi tiết 15 bậc và huy hiệu → xem [gamification.md](./gamification.md)

---

## 8. MODULE PAYMENT & SUBSCRIPTION

**File chính:**
- `backend/modules/payment/payment.service.ts`
- `backend/modules/payment/subscription-cron.ts`

**Luồng SePay VietQR:**
1. `POST /api/payment/sepay/init` → tạo đơn PENDING → sinh `orderCode = LC{n}` → trả QR URL
2. Frontend polling `GET /api/payment/order-status/:orderId` mỗi 4 giây
3. SePay gửi webhook POST → xác thực API Key → tìm mã `LC{n}` trong `content` → SUCCESS → kích hoạt subscription

**Luồng Ví LexiCore (nội bộ):**
- Thanh toán tức thì, không qua bên thứ ba
- Transaction ACID: trừ ví → tạo đơn SUCCESS → kích hoạt subscription

Chính sách mua/nâng cấp, bảng giá, Prorated → xem [payment-subscription.md](./payment-subscription.md)

---

## 9. MODULE ADMIN PANEL

**File chính:**
- `backend/modules/admin/admin.route.ts` + `admin.controller.ts` — HR
- `backend/modules/admin/gamification-admin.route.ts` — Economy
- `backend/modules/admin/arena-admin.route.ts` — Arena
- `frontend/.../AdminHRView.tsx` + `AdminEconomyView.tsx`

**AdminHRView:**
- Duyệt / từ chối đơn xin Content Creator
- Đình chỉ / kích hoạt lại Creator vi phạm
- Khoá / mở khoá tài khoản User
- Badge đơn chờ duyệt: `GET /api/admin/stats/pending`

**AdminEconomyView (4 tab):**
- Cửa hàng (Items): CRUD vật phẩm, upload ảnh Cloudinary, Soft delete toggle
- Bộ sưu tập (Collections): CRUD collections
- Nhiệm vụ (Goals): CRUD goal definitions
- Thành tựu (Achievements): CRUD achievement definitions

**Admin Campaign (Khuyến mãi):**
- Tạo chiến dịch giảm giá: chọn gói → `sale_percent` + `sale_ends_at`
- Tạo gói trial đặc biệt: chọn tier (STARTER/PRO/ELITE) → `duration_days` → `available_from` → `available_until`

---

## 10. TÁC VỤ NỀN ĐỊNH KỲ (CRON JOBS)

| Lịch | Tác vụ | File |
|---|---|---|
| `0 0 * * *` (00:00 ICT) | Dọn dẹp `sale_percent` / `sale_ends_at` đã hết hạn | `subscription-cron.ts` |
| `5 0 * * *` (00:05 ICT) | Auto-renew gói hội viên qua Ví, đánh dấu EXPIRED | `subscription-cron.ts` |
| `0 9 * * *` (09:00 ICT) | Gửi email + in-app nhắc gói sắp hết hạn trong 72h | `subscription-cron.ts` |
| `*/10 * * * *` (mỗi 10 phút) | Ping `/health` để tránh Render cold start | `utils/keep-alive.ts` |
| `*/10 * * * *` (mỗi 10 phút) | GitHub Actions ping từ bên ngoài (lớp dự phòng) | `.github/workflows/keep-alive.yml` |
| `* * * * *` (mỗi phút) | Kiểm tra và gửi thông báo học tập | `notification-cron.ts` |

---

## 11. CẤU TRÚC THƯ MỤC MÃ NGUỒN

```text
LexiCore/
├── backend/
│   ├── config/            # Kết nối MySQL, MongoDB, Redis
│   ├── database/          # schema.sql (toàn bộ DDL), migration files
│   ├── errors/            # AppError class
│   ├── middlewares/       # requireAuth, requireRole, errorHandler, multer
│   ├── modules/
│   │   ├── admin/         # HR + Economy + Arena admin
│   │   ├── arena/         # Socket engine, rank utils, word repository
│   │   ├── auth/          # JWT, OTP, bcrypt, profile
│   │   ├── community/     # Bài đăng cộng đồng
│   │   ├── course/        # Khóa học (Creator + Student routes)
│   │   ├── creator/       # Creator Studio, đơn đăng ký
│   │   ├── dashboard/     # Tổng quan trang chủ
│   │   ├── economy/       # Cửa hàng, kho đồ, mua, trang bị
│   │   ├── exam/          # Exam Builder, bài kiểm tra
│   │   ├── gamification/  # Goals, Achievements, Collections, Leaderboard
│   │   ├── notification/  # In-app + email notifications
│   │   ├── payment/       # SePay, Ví LexiCore, Subscription, Campaign
│   │   ├── shadowing/     # Video library, Whisper, Gemini, notes
│   │   ├── social/        # Kết bạn, nhắn tin DM (Socket /chat)
│   │   ├── srs/           # Spaced Repetition (Flashcard)
│   │   └── upload/        # Cloudinary upload
│   ├── utils/
│   │   ├── streak.ts      # updateStreak()
│   │   ├── level.ts       # addExp(), calculateNewLevel()
│   │   ├── gemini.ts      # callGeminiWithRetry()
│   │   └── keep-alive.ts  # initKeepAliveCron()
│   └── server.ts          # Entry point, đăng ký routes, Socket.IO, cron init
│
├── frontend/src/app/
│   ├── components/        # UI components dùng lại
│   ├── features/          # Tính năng theo domain (auth, community, social)
│   ├── services/          # Axios instances, optimizeImageUrl(), getRankBadgeUrl()
│   └── utils/             # Helpers frontend
│
└── docs/                  # Tài liệu kỹ thuật (file này đang ở đây)
```

