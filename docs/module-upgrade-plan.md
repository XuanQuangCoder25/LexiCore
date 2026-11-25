# Kế hoạch nâng cấp từng module LexiCore

> Thực hiện theo đúng thứ tự các phần dưới đây. Mỗi phần ghi rõ file nào cần sửa, sửa gì, và tại sao.
> **Quy tắc code & giao diện:**
> - Tuyệt đối không dùng emoji (như 🔒, 👑, ⭐,...) trong giao diện frontend lẫn backend/database. Toàn bộ icon bắt buộc sử dụng từ thư viện `lucide-react` (có thể phối màu Tailwind CSS đẹp mắt).
> - Tiếng Việt có dấu đầy đủ trong comments và các chuỗi hiển thị cho người dùng.
> - Không dùng ký tự gạch ngang dài hoặc ký tự đặc biệt AI.
> - **Cập nhật tài liệu song song (Docs & Reports):** Khi triển khai xong từng tính năng hoặc thay đổi schema/API, bắt buộc cập nhật ngay vào tài liệu tương ứng trong thư mục `docs/` (như `docs/gamification.md`, `docs/database-architecture.md`, `docs/system-overview.md`,...) và ghi chú vào report tiến độ, làm tới đâu cập nhật tài liệu tới đó.

---

## Phần 1: Tạo file cấu hình đặc quyền trung tâm

### File cần tạo: `backend/utils/tierLimits.ts`

Tạo mới hoàn toàn. File này là nguồn chuẩn duy nhất định nghĩa giới hạn theo tier cho toàn bộ hệ thống. Các module khác import từ đây, không hardcode số trực tiếp.

```typescript
export type Tier = 'FREE' | 'STARTER' | 'PRO' | 'ELITE';

export const TIER_LIMITS = {
  // So cau luyen phat am AI Whisper toi da trong 1 ngay
  pronunciationSentencesPerDay: {
    FREE: 5,
    STARTER: 25,
    PRO: 60,
    ELITE: 120,
  },

  // So luong video YouTube ca nhan duoc phep luu tren he thong
  shadowingVideos: {
    FREE: 3,
    STARTER: 10,
    PRO: 50,
    ELITE: -1,
  },

  // Thoi luong toi da cho phep cua 1 video khi import (don vi: phut, -1 la khong gioi han)
  shadowingVideoDurationMinutes: {
    FREE: 7,
    STARTER: 15,
    PRO: -1,
    ELITE: -1,
  },

  // So tran Rank toi da duoc phep danh trong 1 ngay (-1 la khong gioi han)
  arenaDailyRankMatches: {
    FREE: 10,
    STARTER: -1,
    PRO: -1,
    ELITE: -1,
  },

  // So tran duoc nhan doi thuong (x2 Coin va EXP) moi ngay
  arenaDailyDoubleRewardMatches: {
    FREE: 0,
    STARTER: 3,
    PRO: 5,
    ELITE: 10,
  },

  // Gioi han tu vung luu vao SRS moi ngay (Partner tich hop sau)
  srsWordsPerDay: {
    FREE: 50,
    STARTER: 100,
    PRO: -1,
    ELITE: -1,
  },

  // Mo khoa bieu do nang luc nang cao tren trang Profile
  hasAdvancedProfileAnalytics: {
    FREE: false,
    STARTER: false,
    PRO: true,
    ELITE: true,
  },

  // Tu dong bao ve chuoi Streak khong bao gio dut (Elite)
  autoStreakImmunity: {
    FREE: false,
    STARTER: false,
    PRO: false,
    ELITE: true,
  },

  // Loai gradient hien thi cho ten nguoi dung o Leaderboard va Arena
  vipStyling: {
    FREE: 'NONE',
    STARTER: 'NONE',
    PRO: 'OCEAN_BLUE',
    ELITE: 'ROYAL_GOLD',
  },
};

// Ham tien ich lay gioi han theo tier
export function getTierLimit<K extends keyof typeof TIER_LIMITS>(
  feature: K,
  tier: Tier
): (typeof TIER_LIMITS)[K][Tier] {
  const safeTier: Tier = tier || 'FREE';
  return TIER_LIMITS[feature][safeTier];
}
```

---

## Phần 2: Nâng cấp module Arena [TRẠNG THÁI: ĐÃ HOÀN THÀNH 100%]

> **Tổng kết:** Đã hoàn thành toàn bộ 6 mục tiêu kế hoạch ban đầu cùng 4 hạng mục cải tiến thực chiến phát sinh (Cơ chế 3 lần thử giải bài toán câu sai, chuẩn hóa hiển thị kết quả trận đấu, bảng phân tích học thuật Tracker-style và Thẻ Khóa VIP mạ vàng hoàng gia).

### 2.1 Sửa logic bốc từ: Loại trừ idiom/collocation khỏi vòng bốc từ thường [ĐÃ XONG]

- **File đã sửa:** `backend/modules/arena/arena-word.repository.ts` (hàm `getRandomWordsForMatch`).
- **Nghiệp vụ đã hiện thực:** Khi điều kiện không truyền danh sách `types` (lọc từ thường theo CEFR), SQL tự động áp dụng `AND word_type NOT IN ('idiom', 'collocation')`. Điều này ngăn chặn việc các bậc rank thấp (Bronze, Silver, Gold) bốc nhầm cụm từ cố định hoặc thành ngữ khó.

---

### 2.2 Sửa enum word_type trong DB: Xóa 'phrase' thừa [ĐÃ XONG]

- **Cấu trúc dữ liệu:** Cập nhật bảng `arena_words` trong `backend/database/schema.sql`.
- **Nghiệp vụ đã hiện thực:** Cập nhật các bản ghi cũ `word_type = 'phrase'` sang `noun_phrase`, sau đó `MODIFY COLUMN word_type` với danh sách enum chuẩn: `'noun', 'verb', 'adjective', 'adverb', 'noun_phrase', 'verb_phrase', 'idiom', 'collocation'`.
- Đồng bộ mảng kiểm tra hợp lệ trong `arena-word.repository.ts` và loại bỏ tùy chọn thừa trên giao diện quản trị từ vựng.

---

### 2.3 Thêm giới hạn số trận Rank mỗi ngày cho gói FREE [ĐÃ XONG]

- **File đã sửa:** `backend/modules/arena/arena-socket.ts`, `backend/modules/arena/arena-word.route.ts`, `frontend/src/app/components/dashboard/arena/ArenaHub.tsx`
- **Nghiệp vụ đã hiện thực:**
  - Ngay khi người dùng gửi sự kiện `arena:join_queue`, hệ thống kiểm tra hạng gói từ bảng `user_subscription`.
  - Nếu là tài khoản `FREE`, kiểm tra Redis key `arena:daily_rank:{userId}:{YYYYMMDD}` (múi giờ UTC+7). Nếu số trận đã chơi >= 10, máy chủ phát sự kiện `arena:queue_rejected` kèm thông báo nâng cấp.
  - Sau khi trận đấu Rank kết thúc, hàm `finalizeMatch` gọi `redis.incr` và set TTL 25 giờ.
  - **Giao diện Arena Hub:** Hiển thị trực tiếp số trận leo Rank còn lại trong ngày (hoặc biểu tượng vô hạn đối với Starter trở lên) ngay tại hàng thông tin người chơi ở cột trái, giữ tính cân đối và đối xứng hoàn hảo với thẻ thông tin Rank ở cột phải.

---

### 2.4 Thêm cơ chế x2 Coin và EXP cho trận nhân thưởng hàng ngày [ĐÃ XONG]

- **File đã sửa:** `backend/modules/arena/arena-socket.ts`, `backend/modules/arena/arena.repository.ts`, `frontend/src/app/components/dashboard/arena/ArenaMatchResult.tsx`, `frontend/src/app/components/dashboard/arena/ArenaHub.tsx`
- **Nghiệp vụ đã hiện thực:**
  - Hạn mức theo gói từ `tierLimits.ts`: FREE (0 trận), STARTER (3 trận), PRO (5 trận), ELITE (10 trận/ngày).
  - Sử dụng Redis key `arena:daily_x2:{userId}:{YYYYMMDD}` theo dõi số trận đã nhận thưởng x2 trong ngày.
  - Trong `finalizeMatch`, kiểm tra quota của từng đấu thủ (P1 và P2 độc lập): nếu còn lượt thì nhân đôi Coin và EXP (`coins * 2`, `exp * 2`), ghi nhận vào DB và gán cờ `p1_x2_applied` / `p2_x2_applied`.
  - **Màn hình Kết quả (ArenaMatchResult):** Bổ sung khu vực hiển thị biến động Coin & EXP sắc nét với màu xanh ngọc lục bảo (Emerald) chuẩn nhận diện thương hiệu cho Coin và icon thanh kiếm danh dự cho EXP; hiển thị tag "Thưởng x2 Gói VIP" nổi bật.

---

### 2.5 Thêm chế độ Đấu Giao Hữu (Friendly Match) [ĐÃ XONG]

- **File đã tạo/sửa:** `backend/database/schema.sql`, `backend/modules/arena/arena-socket.ts`, `backend/modules/arena/arena.repository.ts`
- **Nghiệp vụ đã hiện thực:**
  - Thêm cột `match_type ENUM('RANK', 'FRIENDLY') NOT NULL DEFAULT 'RANK'` vào bảng `arena_matches`.
  - Bổ sung luồng Socket.IO: `arena:friendly_invite`, `arena:friendly_invite_received`, `arena:friendly_accept`, `arena:friendly_decline`.
  - Trận đấu Giao Hữu không tính biến động RP (Rank Point) và LP (Leaderboard Point), nhưng vẫn cộng thưởng Coin & EXP (có áp dụng nhân đôi x2 nếu còn quota) và ghi chi tiết từng câu hỏi vào `arena_match_words` để phục vụ tính toán hồ sơ năng lực.

---

### 2.6 Hồ Sơ Năng Lực 6 Chiều Radar (Pro Analytics) [ĐÃ XONG]

- **File đã tạo/sửa:**
  - Backend: `backend/modules/arena/arena.repository.ts` (hàm `getPlayerRadarStats`), `backend/modules/arena/arena.controller.ts`, `backend/modules/arena/arena-word.route.ts` (endpoint `GET /api/arena/radar-stats`).
  - Frontend: `frontend/src/app/components/dashboard/arena/ArenaRadarStats.tsx`, tích hợp Tab thứ 4 "Năng lực" (icon `BarChart2`) trong `ArenaView.tsx`.
- **6 đỉnh năng lực Lục giác (Thang điểm 0 - 100):**
  1. **Độ chính xác (Accuracy):** Tính trên tổng số câu đã làm thực tế qua 50 trận gần nhất (`(correct / total_answered) * 100`).
  2. **Tốc độ phản xạ (Speed):** Lấy tổng thời gian làm bài `p1_time_ms` chia cho số câu đã làm thực tế; ngưỡng dưới 1200ms đạt 100 điểm, mỗi 100ms chậm hơn trừ 3 điểm (`max(0, 100 - ((avg - 1200)/100) * 3)`).
  3. **Từ vựng cốt lõi (Core Vocab):** Tỷ lệ chính xác các câu từ vựng A1 - B1 (loại trừ idiom/collocation).
  4. **Từ vựng nâng cao (Advanced Vocab):** Tỷ lệ chính xác các câu B2 - C2 (loại trừ idiom/collocation). Trả về `null` kèm nhãn "Chưa mở khóa" nếu người chơi ở rank thấp chưa từng gặp dạng từ này.
  5. **Thành ngữ & Cụm từ (Idioms & Collocations):** Tỷ lệ chính xác các câu `word_type IN ('idiom', 'collocation')`. Trả về `null` nếu chưa gặp câu hỏi nào.
  6. **Tâm lý thi đấu (Match Composure):** Đo lường bản lĩnh ở 5 câu cuối cùng của các trận đấu căng thẳng. **Chỉ tính cho các trận người chơi làm từ 20/25 câu trở lên**. Nếu không có trận nào đạt ngưỡng, trả về `null` để bảo toàn chỉ số, không trừ oan điểm.

---

### 2.7 Các Nâng Cấp Bổ Sung Ngoài Dự Kiến Đã Hoàn Thiện [ĐÃ XONG]

1. **Cơ chế Gameplay 3 Lượt Thử (Three-Attempt Typo Tolerance):**
   - Giải quyết triệt để vấn đề trước đây hệ thống không có khái niệm "câu sai" (người học gõ sai được gõ lại vô hạn đến khi đúng hoặc bỏ qua).
   - Thiết lập tối đa 2 lần sai cho phép người học sửa lỗi chính tả/typo (hiệu ứng rung đỏ, cảnh báo số lượt thử còn lại, giữ nguyên streak).
   - Sai lần thứ 3: Tính là SAI chính thức, ngắt streak, ghi nhận câu sai vào cơ sở dữ liệu và chuyển ngay sang câu tiếp theo. Bổ sung chỉ báo 3 chấm trực quan trên nút điều khiển.
2. **Cải tổ Màn hình Kết quả Trận đấu (ArenaMatchResult UX):**
   - Loại bỏ hiệu ứng gạch ngang (`line-through`) gây khó đọc chữ cái sai; chuyển sang **Tô đỏ + Gạch chân (`underline`)** kèm mũi tên trỏ sang đáp án đúng màu xanh.
   - Chuẩn hóa trạng thái "Chưa trả lời" với nhãn màu xám trung tính, không dùng icon X đỏ.
   - Sửa lỗi logic tab lọc: Khi đối thủ đầu hàng sớm và người chơi chưa trả lời câu nào, màn hình hiển thị lời giải thích hợp lý thay vì thông báo chúc mừng sai ngữ cảnh.
3. **Mở rộng Dashboard Học thuật (Tracker-style Analytics):**
   - Bổ sung Top 3 chủ đề sở trường có tỷ lệ thắng cao nhất và danh sách chủ đề cần cải thiện.
   - Phân tích độ thuần thục từ vựng theo khung tham chiếu chuẩn Châu Âu CEFR (A1 - C2).
   - Biểu đồ xu hướng phong độ và tỷ lệ chính xác qua 10 trận đấu gần nhất.
4. **Thẻ Khóa VIP Mạ Vàng Hoàng Gia (Royal Gold Plated Paywall Card):**
   - Thiết kế dành riêng cho tài khoản `FREE` và `STARTER` khi xem tab Năng lực: Khung viền đôi mạ vàng `border-amber-400/80`, ánh sáng hào quang hoàng gia, dải sáng kim loại trên đỉnh card, huy hiệu vương miện mạ vàng kèm ổ khóa tinh xảo.
   - Nút nâng cấp đa tầng hoàng kim nổi khối, tuyệt đối không dùng icon AI/spark, đem lại cảm giác sang trọng và kích thích người dùng nâng cấp gói PRO/ELITE.

---

## Phần 3: Nâng cấp module Shadowing (Thư viện cá nhân & Tối ưu AI Cache) [TRẠNG THÁI: ĐÃ HOÀN THÀNH 100%]

> **Tổng kết:** Đã nâng cấp từ phương án 1 bảng ban đầu sang mô hình **Kho nội dung dùng chung (`shadowing_videos`) + Thư viện sở hữu cá nhân (`user_shadowing_videos`)**, vừa bảo đảm tính riêng tư tuyệt đối giữa các người dùng và áp dụng hạn mức gói hội viên, vừa tái sử dụng hoàn toàn phụ đề và cache Gemini AI khi nhiều người dùng import cùng một video YouTube.

### 3.1 Tách bảng sở hữu `user_shadowing_videos` & chuẩn hóa `shadowing_videos` [ĐÃ XONG]

- **File đã tạo/sửa:** `backend/database/migration_shadowing_personal.sql`, `backend/database/schema.sql`.
- **Thiết kế thực tế:**
  - `shadowing_videos`: Lưu trữ thông tin video duy nhất theo `youtube_id` (`UNIQUE`), bổ sung cột `is_system BOOLEAN NOT NULL DEFAULT FALSE` và `INDEX idx_shadowing_videos_system (is_system)` để phân biệt video thư viện hệ thống với video do người dùng tự import.
  - `user_shadowing_videos`: Bảng liên kết cá nhân (`id`, `user_id`, `video_id`, `created_at`) với `UNIQUE KEY uq_user_shadowing_video (user_id, video_id)` và `INDEX idx_user_shadowing_owner_created (user_id, created_at)`.
  - Các bảng phụ thuộc (`shadowing_segments`, `user_shadowing_history`, `shadowing_notes`) giữ nguyên khóa ngoại tới `shadowing_videos(id)` mà không bị nhân bản dữ liệu.

---

### 3.2 Áp dụng giới hạn theo Tier & Tái sử dụng Cache khi import video [ĐÃ XONG]

- **File đã sửa:** `backend/modules/shadowing/shadowing-repository.ts`, `backend/modules/shadowing/shadowing-service.ts`, `backend/modules/shadowing/shadowing-controller.ts`.
- **Nghiệp vụ đã hiện thực:**
  - `GET /api/shadowing/videos`: Truy vấn theo chỉ mục `user_shadowing_videos` kết hợp `UNION ALL` với `shadowing_videos WHERE is_system = TRUE`, bảo đảm mỗi học viên chỉ thấy video cá nhân của chính mình (cùng video hệ thống nếu có) và không phải quét dữ liệu của user khác; trả kèm `quota: { used, limit, maxDurationMinutes, tier }`.
  - Giới hạn số lượng video cá nhân theo [tierLimits.ts](file:///e:/Downloads/LexiCore/backend/utils/tierLimits.ts): `FREE` (3), `STARTER` (10), `PRO` (50), `ELITE` (không giới hạn).
  - Giới hạn thời lượng mỗi video khi import: `FREE` (7 phút), `STARTER` (15 phút), `PRO` và `ELITE` (không giới hạn), lấy chính xác từ YouTube `videoDetails.lengthSeconds` (fallback qua timestamp phụ đề cuối).
  - **Cơ chế Deduplication & Reuse Cache:** Nếu `youtube_id` đã có trong `shadowing_videos` (do người dùng khác import trước đó), hệ thống vẫn kiểm tra đầy đủ quota số lượng và thời lượng theo tier của người dùng hiện tại, sau đó chỉ chèn 1 bản ghi vào `user_shadowing_videos` mà không cần gọi lại YouTube hay nhân bản `shadowing_segments`, đồng thời dùng lại ngay `ai_summary` đã cache.
  - Kiểm soát quyền truy cập (`userHasVideoAccess`) trên `GET /videos/:id`, `GET /videos/:id/summary`, `POST /analyze/:segmentId`, `GET/PUT /notes/:videoId`: từ chối HTTP 403 nếu video không phải hệ thống và chưa được user lưu vào thư viện cá nhân.

---

### 3.3 Route xóa video cá nhân & Cập nhật giao diện ShadowingView [ĐÃ XONG]

- **File đã sửa:** `backend/modules/shadowing/shadowing-route.ts`, `frontend/src/app/components/dashboard/ShadowingView.tsx`.
- **Nghiệp vụ đã hiện thực:**
  - **Route mới:** `DELETE /api/shadowing/videos/:videoId` chỉ xóa dòng liên kết trong `user_shadowing_videos WHERE user_id = ? AND video_id = ?` (từ chối HTTP 403 với video hệ thống hoặc video không thuộc sở hữu). Cơ chế này giữ nguyên bản ghi cache `shadowing_videos` cho các người dùng khác và bảo toàn `user_shadowing_history` (streak, thành tựu) của chính học viên.
  - **Frontend (`ShadowingView.tsx`):** Hiển thị bộ đếm `Đã lưu X/Y video cá nhân` và giới hạn thời lượng tối đa theo gói hiện tại; tách khu `Video của tôi` và `Thư viện hệ thống`; bổ sung Empty State thân thiện khi chưa có video; nút Xóa kèm `AlertDialog` xác nhận và thông báo `sonner`.

---

### 3.4 Tối ưu Gemini AI Summary (Đọc đầy đủ Script, Song ngữ Anh - Việt, 10 từ cốt lõi) [ĐÃ XONG]

- **File đã sửa:** `backend/modules/shadowing/shadowing-service.ts`, `frontend/src/app/components/dashboard/ShadowingView.tsx`.
- **Nghiệp vụ đã hiện thực:**
  - Thay vì cắt cứng 150 câu đầu tiên, `buildTranscriptForGemini` lấy toàn bộ transcript (với ngưỡng an toàn 24.000 ký tự; video quá dài được trích đều 3 đoạn đầu - giữa - cuối).
  - Prompt trả về JSON gồm `summaryEn` (tóm tắt 3-4 câu tiếng Anh lồng ghép từ khóa trọng tâm), `summary` (bản dịch tiếng Việt tương ứng) và giảm từ 20 xuống **10 từ vựng cốt lõi** (giảm ~40-50% output token, tăng tốc độ phản hồi và chất lượng từ vựng). Tương thích ngược với các bản ghi JSON cũ không có `summaryEn`.

---

## Phần 4: Nâng cấp module Pronunciation (Giới hạn số câu Whisper)

### 4.1 Kiểm tra quota trước khi gọi Whisper API

**File cần sửa:** Service hoặc controller xử lý route phân tích phát âm (endpoint `POST /api/shadowing/analyze/:segmentId` hoặc tương đương).

**Logic cần thêm (trước khi gọi Whisper API):**

```typescript
import { getTierLimit, Tier } from '../../utils/tierLimits';
import { redis } from '../../config/redis';

// 1. Lay tier
const tier: Tier = await getUserTier(userId); // Viet ham nay rieng, query user_subscription

// 2. Lay gioi han
const maxSentences = getTierLimit('pronunciationSentencesPerDay', tier);

// 3. Kiem tra Redis
const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD theo UTC+7
const redisKey = `pronunciation:daily_count:${userId}:${today}`;
const usedCount = parseInt(await redis.get(redisKey) || '0', 10);

if (maxSentences !== -1 && usedCount >= maxSentences) {
  return res.status(429).json({
    message: `Bạn đã dùng hết ${maxSentences} lượt luyện phát âm AI hôm nay. Nâng cấp gói để luyện tập nhiều hơn!`,
    usedToday: usedCount,
    limitToday: maxSentences,
  });
}

// 4. Goi Whisper API (code hien tai)
// ...

// 5. Sau khi thanh cong, tang bien dem Redis (TTL 25 gio de bao dam reset sau 00:00)
await redis.incr(redisKey);
await redis.expire(redisKey, 90000); // 25 gio tinh bang giay
```

### 4.2 Thêm API lấy quota còn lại trong ngày

**Route mới:** `GET /api/shadowing/pronunciation-quota`

**Response:**
```json
{
  "usedToday": 3,
  "limitToday": 5,
  "remaining": 2,
  "tier": "FREE"
}
```
Frontend dùng response này để hiển thị nhãn `Còn 2/5 lượt hôm nay` cạnh nút thu âm.

---

## Phần 5: Nâng cấp Bảo vệ Streak tự động cho gói ELITE

### 5.1 Sửa logic cron job reset streak

**File cần sửa:** Tìm file cron job tính streak hàng đêm (thường là trong `backend/jobs/` hoặc được đăng ký trong `server.ts`).

**Logic cần thêm:** Trước khi reset `current_streak` về 0 cho một user không học hôm nay, kiểm tra:

```typescript
// Kiem tra user co dang co goi ELITE con han khong
const eliteRow = await pool.query(
  `SELECT id FROM user_subscription
   WHERE user_id = ? AND tier = 'ELITE' AND status = 'ACTIVE' AND expires_at > NOW()`,
  [userId]
);

if (eliteRow.length > 0) {
  // User dang co goi ELITE: Khong reset streak, bo qua
  continue;
}

// Khong co Elite: Reset streak nhu binh thuong
await pool.query(
  `UPDATE wallets SET current_streak = 0 WHERE user_id = ?`,
  [userId]
);
```

---

## Phần 6: Nâng cấp hiển thị VIP Styling (Gradient tên)

### 6.1 Thêm helper lấy CSS class gradient theo tier

**File cần tạo (Frontend):** `frontend/src/utils/vipStyling.ts`

```typescript
export type Tier = 'FREE' | 'STARTER' | 'PRO' | 'ELITE';

// Tra ve Tailwind class cho ten hien thi theo tier
export function getNameGradientClass(tier: Tier): string {
  switch (tier) {
    case 'PRO':
      // Xanh Duong Dai Duong (Ocean Blue)
      return 'bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent font-bold';
    case 'ELITE':
      // Vang Kim Hoang Gia (Royal Gold)
      return 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-600 bg-clip-text text-transparent font-bold drop-shadow-sm';
    default:
      return '';
  }
}
```

### 6.2 Áp dụng gradient tại các vị trí hiển thị tên người dùng

Áp dụng hàm `getNameGradientClass(user.tier)` tại các component sau:
- **Bảng Xếp Hạng (Leaderboard):** Dòng tên của từng người chơi.
- **Màn hình In-Game Arena (HUD thanh thông tin):** Tên hiển thị cạnh avatar trong trận đấu.
- **Màn hình Tổng kết ván đấu (Match Result):** Tên trên thẻ kết quả.
- **Thẻ Hồ Sơ Công Khai (Public Profile Modal):** Tên hiển thị trên header.

**Điều kiện hiển thị:** Gradient chỉ hiển thị khi `tier` là `PRO` hoặc `ELITE`, các tier khác hiển thị tên bình thường.

---

## Thứ tự thực hiện khuyến nghị

1. Phần 1: Tạo `tierLimits.ts` (nền tảng cho tất cả phần còn lại).
2. Phần 2.1 + 2.2: Sửa logic bốc từ Arena và migration xóa 'phrase' (sửa bug tồn tại).
3. Phần 3: Nâng cấp Shadowing import video (migration + logic + route xóa).
4. Phần 4: Nâng cấp Pronunciation quota (Redis + API).
5. Phần 2.3 + 2.4: Thêm giới hạn Rank và x2 thưởng vào Arena socket.
6. Phần 2.5: Thêm chế độ Giao Hữu (phức tạp hơn, cần socket events mới).
7. Phần 2.6: API và frontend Biểu đồ Mạng nhện Profile (Pro Analytics).
8. Phần 5: Streak Immunity cho Elite.
9. Phần 6: VIP Gradient tên.

---

## Lưu ý quan trọng cho agent thực hiện

- **Quy chuẩn Icon:** Toàn bộ icon trên giao diện bắt buộc dùng component từ thư viện `lucide-react` (kết hợp các class Tailwind CSS để đổi màu, đổ bóng đẹp mắt), tuyệt đối không chèn emoji thô (như 🔒, 👑, ⭐, ⚡,...).
- **Cập nhật tài liệu song song (Docs & Reports):** Làm tới đâu cập nhật tài liệu tới đó. Mỗi khi hoàn thành một module hoặc thay đổi schema/API/luồng nghiệp vụ:
  - Phải cập nhật ngay vào file tài liệu tương ứng trong thư mục `docs/` (ví dụ: `docs/gamification.md` cho cơ chế x2 Arena, `docs/database-architecture.md` cho các bảng/cột mới, `docs/system-overview.md` cho các API mới).
  - Ghi nhận chi tiết vào báo cáo để không bị sót thông tin.
- **Không xóa file `BillingWalletSection.tsx`** vì đây là code của partner.
- **Không dùng emoji hoặc ký tự Unicode đặc biệt** (gạch ngang dài, chấm giữa...) trong code, comment hay chuỗi insert DB.
- **Tiếng Việt có dấu** trong các chuỗi hiển thị cho người dùng (message lỗi, label...).
- **Build check** sau mỗi phần lớn: `cd frontend && pnpm run build`, `cd backend && npx tsc --noEmit`.
- **Migration SQL** phải tạo thành file riêng trong `backend/database/`, không sửa trực tiếp `schema.sql`. Nhắc nhở người dùng chạy migration trên DataGrip.
- **Redis key format cho ngày:** Dùng múi giờ UTC+7 (Việt Nam), không dùng UTC để tránh lệch ngày.
