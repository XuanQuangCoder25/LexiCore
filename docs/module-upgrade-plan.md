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

## Phần 2: Nâng cấp module Arena

### 2.1 Sửa logic bốc từ: Loại trừ idiom/collocation khỏi vòng bốc từ thường

**File cần sửa:** `backend/modules/arena/arena-word.repository.ts`

**Vị trí:** Hàm `getRandomWordsForMatch`, đoạn xây dựng `typeClause` (khoảng dòng 208-212).

**Vấn đề hiện tại:** Khi một condition không có trường `types` (tức là chỉ lọc theo level), câu SQL sẽ bốc bất kỳ `word_type` nào, bao gồm cả `idiom` và `collocation`. Điều này sai logic vì các rank thấp (Bronze, Silver) không được phép ra idiom/collocation nhưng nếu admin lỡ insert một idiom gắn level A1, nó sẽ bị bốc vào trận Bronze.

**Cách sửa:**
```typescript
let typeClause = '';
if (cond.types && cond.types.length > 0) {
    // Boc dung loai tu duoc chi dinh (vi du: chi idiom va collocation)
    typeClause = `AND word_type IN (${cond.types.map(() => '?').join(', ')})`;
    levelParams.push(...cond.types);
} else {
    // Boc tu thuong: luon loai tru idiom va collocation de dam bao dung logic rank
    typeClause = `AND word_type NOT IN ('idiom', 'collocation')`;
}
```

---

### 2.2 Sửa enum word_type trong DB: Xóa 'phrase' thừa

**File cần tạo:** `backend/database/migration_arena_wordtype.sql`

Tạo file SQL migration mới với nội dung sau (chạy trên DataGrip sau khi tạo):

```sql
-- Xoa gia tri 'phrase' khoi enum word_type vi no qua chung chung va trung voi noun_phrase, verb_phrase
-- Truoc khi ALTER, cap nhat cac ban ghi cu co word_type = 'phrase' sang 'noun_phrase' (an toan nhat)
UPDATE arena_words SET word_type = 'noun_phrase' WHERE word_type = 'phrase';

ALTER TABLE arena_words
  MODIFY COLUMN word_type ENUM(
    'noun',
    'verb',
    'adjective',
    'adverb',
    'noun_phrase',
    'verb_phrase',
    'idiom',
    'collocation'
  ) NOT NULL DEFAULT 'noun';
```

**File cần sửa sau khi chạy migration:**
- `backend/modules/arena/arena-word.repository.ts`: Xoa 'phrase' khoi mang `VALID_TYPES`.
- `frontend` (component form them tu vung Arena): Xoa option 'Cum tu' khoi dropdown `word_type`.

---

### 2.3 Thêm giới hạn số trận Rank mỗi ngày cho gói FREE

**File cần sửa:** `backend/modules/arena/arena-socket.ts`

**Thời điểm kiểm tra:** Ngay khi user gửi event `arena:join_queue` (xin vào hàng chờ ghép trận Rank), trước khi thêm vào queue.

**Logic cần thêm:**
1. Lấy tier hiện tại của user từ bảng `user_subscription` (LEFT JOIN, nếu không có hàng thì tier = 'FREE').
2. Lấy giới hạn `arenaDailyRankMatches` từ `tierLimits.ts`.
3. Nếu limit = -1 thì cho qua ngay.
4. Nếu limit > 0, kiểm tra Redis key `arena:daily_rank:{userId}:{YYYYMMDD}`.
5. Nếu số đếm trong Redis >= limit, emit lại cho client event `arena:queue_rejected` kèm message: "Bạn đã dùng hết 10 lượt đấu Rank hôm nay. Nâng cấp lên Starter để leo Rank không giới hạn!"
6. Nếu chưa đủ, cho vào queue bình thường.
7. Sau khi trận kết thúc (hàm `finalizeMatch` hoặc tương đương), tăng biến đếm Redis: `redis.incr('arena:daily_rank:{userId}:{YYYYMMDD}')` và set TTL 25 giờ nếu là lần đầu trong ngày.

> **Lưu ý:** Chỉ tăng biến đếm cho trận **Rank** (không phải Giao Hữu). Trận Giao Hữu không giới hạn cho tất cả tier.

---

### 2.4 Thêm cơ chế x2 Coin và EXP cho trận nhân thưởng hàng ngày

**File cần sửa:** `backend/modules/arena/arena-socket.ts`

**Thời điểm áp dụng:** Trong hàm tính phần thưởng cuối trận (ngay trước khi gọi `saveMatchTransaction`).

**Logic cần thêm:**
1. Lấy tier của từng người chơi (player1 và player2 riêng biệt vì 2 người có thể khác tier).
2. Lấy giới hạn `arenaDailyDoubleRewardMatches[tier]` từ `tierLimits.ts`.
3. Kiểm tra Redis key `arena:daily_x2:{userId}:{YYYYMMDD}`:
   - Nếu số đếm < giới hạn: Nhân đôi Coin và EXP (`coins * 2`, `exp * 2`), sau đó tăng biến đếm Redis.
   - Nếu số đếm >= giới hạn hoặc tier FREE: Dùng Coin và EXP gốc.
4. Giá trị Coin và EXP sau khi tính (đã nhân đôi hoặc không) được truyền vào `saveMatchTransaction` để lưu vào DB và cộng vào ví.
5. Trong payload `arena:game_over` gửi về client, thêm field `wasDoubleReward: boolean` để frontend hiển thị hiệu ứng "x2" nếu trận đó được nhân thưởng.

---

### 2.5 Thêm chế độ Đấu Giao Hữu (Friendly Match)

**Hiện trạng:** Arena chỉ có chế độ đấu Rank với đối thủ ngẫu nhiên. Chưa có Giao Hữu.

**Yêu cầu:**
- Tất cả tier (kể cả Free) đều được tạo phòng Giao Hữu và mời bạn bè.
- Trận Giao Hữu không tính RP (Rank Point) hay LP (Leaderboard Point), chỉ tính Coin và EXP thưởng như bình thường (có áp dụng x2 nếu còn lượt).
- Người mời nhập username hoặc userId của người được mời, hệ thống gửi thông báo qua Socket hoặc Bell.

**Files cần sửa/tạo:**

**`backend/modules/arena/arena-socket.ts`:** Thêm các Socket events:
- `arena:friendly_invite` (client gửi): `{ targetUserId: string }` - Gửi lời mời đấu Giao Hữu.
- `arena:friendly_invite_received` (server emit): Gửi về phía người được mời kèm thông tin người mời (avatar, tên, rank).
- `arena:friendly_accept` (client gửi): `{ inviteId: string }` - Chấp nhận lời mời.
- `arena:friendly_decline` (client gửi): `{ inviteId: string }` - Từ chối lời mời.
- Khi cả 2 đồng ý, tạo phòng riêng như flow Rank nhưng đánh dấu `matchType: 'FRIENDLY'` trong Redis room state.

**`backend/database/schema.sql`:** Thêm cột `match_type` vào bảng `arena_matches`:
```sql
ALTER TABLE arena_matches
  ADD COLUMN match_type ENUM('RANK', 'FRIENDLY') NOT NULL DEFAULT 'RANK'
  AFTER rank_snapshot;
```
Tạo file migration riêng: `backend/database/migration_arena_friendlymatch.sql`.

**Lưu ý khi lưu trận Giao Hữu:**
- `p1_points_change` = 0, `p2_points_change` = 0 (không tính RP).
- Không gọi hàm tính `rankProgression`, không cập nhật `rank_point` và `leaderboard_point` trong wallet.
- Vẫn tặng Coin và EXP và lưu vào `arena_match_words` đầy đủ như trận Rank để phục vụ thống kê Profile sau này.

---

### 2.6 Thêm dữ liệu cho Biểu đồ Mạng nhện 5 Kỹ năng (Pro Analytics)

**Mục đích:** Cung cấp API tính toán 5 chỉ số kỹ năng Arena để frontend vẽ biểu đồ mạng nhện trên trang Profile của gói PRO và ELITE.

**5 đỉnh kỹ năng và công thức tính (thang điểm 0 - 100):**

**Đỉnh 1: Tốc độ phản xạ (Speed)**
- Tính từ: Thời gian trả lời trung bình mỗi câu hỏi `p1_time_ms` trong `arena_match_words` (chỉ lấy các câu user đã trả lời, `p1_answer IS NOT NULL`).
- Công thức: `score = max(0, 100 - ((avgTimeMs - 1200) / 100) * 3)`. Trả lời trung bình dưới 1200ms đạt 100 điểm. Mỗi 100ms chậm hơn trừ 3 điểm.

**Đỉnh 2: Từ vựng cốt lõi (Core Vocab - A1, A2, B1)**
- Tính từ: `arena_match_words` JOIN `arena_words` lọc `level IN ('A1','A2','B1')` và `word_type NOT IN ('idiom','collocation')`.
- Công thức: `score = (so_cau_dung / tong_cau_A1_B1) * 100`.

**Đỉnh 3: Từ vựng nâng cao (Advanced - B2, C1, C2)**
- Tính từ: Tương tự trên nhưng lọc `level IN ('B2','C1','C2')` và `word_type NOT IN ('idiom','collocation')`.
- Công thức: `score = (so_cau_dung / tong_cau_B2_C2) * 100`. Nếu tong_cau_B2_C2 = 0 (chưa đấu rank cao) thì trả về null (không hiển thị đỉnh này).

**Đỉnh 4: Thành ngữ và Cụm từ (Idioms & Collocations)**
- Tính từ: `arena_match_words` JOIN `arena_words` lọc `word_type IN ('idiom','collocation')`.
- Công thức: `score = (so_cau_dung / tong_cau_idiom_collocation) * 100`. Nếu tong = 0 thì trả null (chưa gặp câu idiom nào).

**Đỉnh 5: Tâm lý thi đấu (Match Composure)**
- Tính từ: 5 câu hỏi cuối cùng mà user đã trả lời trong mỗi trận đấu đạt ngưỡng (theo `order_index` cao nhất).
- **Ngưỡng tối thiểu bắt buộc:** Chỉ tính composure cho trận nào người chơi trả lời được ít nhất **20/25 câu**. Nếu trận < 20 câu thì bỏ qua trận đó, điểm Composure tích lũy trên Profile giữ nguyên không thay đổi.
- Công thức: `score = (tong_cau_dung_cuoi_tran / tong_so_cau_cuoi_tran_hop_le) * 100`. Nếu chưa có trận nào đủ 20 câu thì trả về null.

**Vị trí hiển thị Biểu đồ Mạng nhện:**
- Đặt tại **Trang Profile cá nhân** hoặc **Tab Chỉ số cá nhân trong sảnh Arena** (phản ánh hồ sơ năng lực tích lũy qua các trận đấu), KHÔNG đặt ở màn hình tổng kết sau trận (tránh chật chội).

**Quy tắc xử lý các trường hợp đặc biệt trên Biểu đồ:**
- **Đỉnh Tâm lý thi đấu (Composure):** Nếu trận đấu có số câu trả lời < 20, trận đó bị loại khỏi mẫu tính. Chỉ số Composure trên biểu đồ tích lũy của người chơi giữ nguyên giá trị cũ, không bị trừ oan điểm.
- **Đỉnh Từ vựng nâng cao (B2-C2) & Thành ngữ (Idioms/Collocations) đối với Rank thấp (Bronze, Silver, Gold):**
  - Do ở rank thấp hệ thống chưa bốc từ B2-C2 hoặc Idioms/Collocations, người chơi chưa có cơ hội làm bài dạng này.
  - Trên biểu đồ mạng nhện, 2 đỉnh này sẽ hiển thị icon `Lock` từ `lucide-react` (màu xám slate hoặc vàng nhạt) kèm trạng thái: *"Chưa mở khóa"* và tooltip: *"Cần đạt rank Emerald trở lên để mở khóa đánh giá kỹ năng này"*, KHÔNG kéo về tâm bằng 0 (tránh người chơi hiểu lầm là mình bị điểm liệt). Khi người chơi leo lên rank có xuất hiện dạng từ này, biểu đồ sẽ mở khóa và bắt đầu tính điểm.

**Phạm vi tính toán:** Lấy tối đa 50 trận gần nhất của user (để không quá chậm, và phản ánh form hiện tại chứ không phải lịch sử xa).

**File cần tạo:** `backend/modules/arena/arena.repository.ts` (nếu chưa có) hoặc thêm vào file `arena.repository.ts` hiện có:
- Hàm: `getPlayerSpiderChartData(userId: string): Promise<SpiderChartData>`
- Trả về: `{ speed: number, coreVocab: number, advancedVocab: number | null, idioms: number | null, composure: number | null }`

**File cần tạo:** Route `GET /api/arena/profile-stats/:userId`
- Middleware: Kiểm tra user đang xem có phải chính mình hoặc profile công khai không.
- Kiểm tra tier của user đang **request** (không phải user được xem): Nếu tier FREE hoặc STARTER, trả về 403 kèm message: "Tính năng này dành cho gói PRO trở lên".
- Trả về JSON `SpiderChartData`.

**File cần sửa:** `backend/modules/arena/arena.route.ts` - Đăng ký route mới.

**File cần tạo (Frontend):** Component `ArenaSpiderChart.tsx` trong trang Profile:
- Dùng thư viện `recharts` (đã có trong dự án nếu dùng) hoặc `chart.js` để vẽ RadarChart.
- Chỉ render component này nếu user đang xem profile có tier PRO hoặc ELITE.
- Hiển thị tooltip khi hover vào từng đỉnh giải thích cách tính.

---

## Phần 3: Nâng cấp module Shadowing (Import Video cá nhân)

### 3.1 Thêm cột owner vào bảng shadowing_videos

**Vấn đề:** Bảng `shadowing_videos` hiện tại không có cột `created_by` (owner). Không biết video nào là của user nào để đếm giới hạn và phân quyền xóa.

**File cần tạo:** `backend/database/migration_shadowing_personal.sql`
```sql
-- Them cot created_by de xac dinh ai la chu so huu video ca nhan
-- NULL = video trong thu vien chung (cua admin/he thong), co gia tri = video ca nhan cua user do
ALTER TABLE shadowing_videos
  ADD COLUMN created_by VARCHAR(36) NULL DEFAULT NULL AFTER ai_summary,
  ADD INDEX idx_shadowing_videos_owner (created_by);
```

---

### 3.2 Thêm giới hạn khi import video YouTube cá nhân

**File cần sửa:** Backend service hoặc controller xử lý route thêm video mới (tìm route `POST /api/shadowing/videos` hoặc tương đương).

**Logic cần thêm (thực hiện trước khi INSERT):**

**Bước 1: Lấy tier**
```typescript
// Lay tier hien tai cua user tu bang user_subscription
const tierRow = await pool.query(
  `SELECT s.tier FROM user_subscription s
   WHERE s.user_id = ? AND s.status = 'ACTIVE' AND s.expires_at > NOW()
   ORDER BY s.expires_at DESC LIMIT 1`,
  [userId]
);
const tier: Tier = tierRow[0]?.tier || 'FREE';
```

**Bước 2: Kiểm tra số lượng video đã lưu**
```typescript
const maxVideos = getTierLimit('shadowingVideos', tier); // -1 la khong gioi han
if (maxVideos !== -1) {
  const [countRow] = await pool.query(
    `SELECT COUNT(*) as cnt FROM shadowing_videos WHERE created_by = ?`,
    [userId]
  );
  const currentCount = countRow[0]?.cnt || 0;
  if (currentCount >= maxVideos) {
    // Tra ve loi 403 kem thong bao
    return res.status(403).json({
      message: `Bạn đã lưu tối đa ${maxVideos} video. Nâng cấp gói để lưu thêm video.`
    });
  }
}
```

**Bước 3: Kiểm tra thời lượng video**
Khi frontend gửi lên YouTube link, backend cần gọi YouTube oEmbed API hoặc lấy metadata để biết `duration` (giây). So sánh với `getTierLimit('shadowingVideoDurationMinutes', tier) * 60`.
```typescript
const maxDurationMinutes = getTierLimit('shadowingVideoDurationMinutes', tier);
if (maxDurationMinutes !== -1 && videoDurationSeconds > maxDurationMinutes * 60) {
  return res.status(403).json({
    message: `Video dài hơn ${maxDurationMinutes} phút. Gói của bạn chỉ hỗ trợ video dưới ${maxDurationMinutes} phút.`
  });
}
```

---

### 3.3 Thêm route xóa video cá nhân

**File cần sửa:** `backend/modules/shadowing/` - Tìm route file và service file tương ứng.

**Route mới:** `DELETE /api/shadowing/videos/:videoId`

**Logic:**
1. Xác thực người dùng đang đăng nhập (middleware auth đã có).
2. Query: `SELECT created_by FROM shadowing_videos WHERE id = ?`.
3. Nếu `created_by` khác `userId` đang đăng nhập, trả 403: "Bạn không có quyền xóa video này."
4. Nếu `created_by` là NULL (video thư viện chung của hệ thống), trả 403: "Không thể xóa video thư viện hệ thống."
5. Nếu hợp lệ: `DELETE FROM shadowing_videos WHERE id = ? AND created_by = ?`.
6. Do có `ON DELETE CASCADE` trong schema, các bản ghi liên quan trong `shadowing_segments`, `user_shadowing_history`, `shadowing_notes` sẽ tự xóa theo.

**Frontend cần thêm:**
- Nút "Xóa khỏi danh sách" cạnh mỗi video cá nhân (chỉ hiển thị nếu `video.created_by === currentUserId`).
- Hiển thị nhãn số lượng video đã lưu: `Đã lưu X/Y video cá nhân` (Y = -1 thì hiện "Không giới hạn").

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
