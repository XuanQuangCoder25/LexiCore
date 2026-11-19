# Kế hoạch Đặc quyền Gói Hội viên LexiCore (Bản Thiết Kế Hoàn Thiện Chuẩn Xác)

> [!NOTE]
> **Quy tắc quan trọng khi triển khai:**
> - Toàn bộ icon trên giao diện bắt buộc sử dụng từ thư viện `lucide-react` (kết hợp màu Tailwind CSS), tuyệt đối không dùng emoji thô (như 🔒, 👑, ⭐, ⚡,...).
> - Làm tới đâu cập nhật tài liệu (`docs/`) và report tới đó.
> - **Lưu ý về Module SRS (Ôn tập ngắt quãng - Lưu từ vựng):** Module này thuộc phạm vi trách nhiệm của Partner. Nhóm ta chuẩn bị sẵn thông số cấu hình `srsWordsPerDay` trong file `tierLimits.ts`, còn việc áp dụng kiểm tra giới hạn và logic nghiệp vụ lưu từ sẽ do Partner tự triển khai sau.

---

## Bảng Đặc Quyền Tinh Gọn - Tier Privileges

| Quyền lợi / Tính năng | FREE | STARTER | PRO | ELITE |
|---|---|---|---|---|
| **Luyện phát âm AI (Whisper)** | 5 câu/ngày | 25 câu/ngày | 60 câu/ngày | 120 câu/ngày (Fair-use) |
| **Import Video YouTube cá nhân** | 3 video (<7 phút/video) | 10 video (<15 phút/video) | 50 video (mọi thời lượng) | Không giới hạn |
| **SRS - Lưu từ/ngày (Partner làm)** | 50 từ/ngày | 100 từ/ngày | Không giới hạn | Không giới hạn |
| **Lượt Đấu Rank Arena** | 10 trận/ngày | **Không giới hạn** | **Không giới hạn** | **Không giới hạn** |
| **Trận nhân đôi thưởng Arena (x2 Coin & EXP)** | Không có | **3 trận đầu/ngày** | **5 trận đầu/ngày** | **10 trận đầu/ngày** |
| **Hồ sơ năng lực Pro Analytics (Trang Profile)** | Cơ bản | Cơ bản | **Mở khóa Biểu đồ Mạng nhện 5 Kỹ năng + Tỷ lệ thắng chủ đề** | **Mở khóa Biểu đồ Mạng nhện 5 Kỹ năng + Tỷ lệ thắng chủ đề** |
| **Bảo vệ Chuỗi Streak tự động (Streak Immunity)** | Không | Không | Không | **Tự động giữ chuỗi (Không bao giờ đứt chuỗi)** |
| **Nhận diện VIP (Tên Gradient & Khung Avatar In-Game)** | Mặc định | Mặc định | **Tên Gradient Xanh Đại Dương** | **Tên Gradient Vàng Kim + Khung Avatar Mạ Vàng Phát Sáng** |

---

## Giải thích chi tiết các Cơ chế Nghiệp vụ

### 1. Biểu đồ Mạng nhện 5 Kỹ năng Tiếng Anh Thực Chiến (Trang Profile PRO & ELITE)
Mở khóa tab **"Hồ sơ năng lực"** trên trang cá nhân (`/profile`) của học viên:
* **5 Đỉnh Kỹ năng đo lường khoa học từ Database (thang điểm 0 - 100):**
  1. **Phát âm (Pronunciation Mastery):** Điểm trung bình `accuracy_score` từ các lượt luyện nói Shadowing (`user_shadowing_history`).
  2. **Tốc độ phản xạ (Reflex / Speed):** Thời gian trả lời trung bình mỗi câu hỏi trong Arena (`p1_time_ms`). Mốc $\le 1.2s$ đạt 100 điểm, mỗi $0.1s$ chậm hơn trừ 3 điểm.
  3. **Từ vựng cốt lõi (Core Vocab - A1, A2, B1):** Tỷ lệ chọn đúng các từ nền tảng trong `arena_match_words` JOIN `arena_words` có `level IN ('A1','A2','B1')`.
  4. **Từ vựng nâng cao & Thành ngữ (Advanced Mastery - B2, C1, C2, Idioms):** Tỷ lệ đúng các câu hỏi có `level IN ('B2','C1','C2')` hoặc `word_type IN ('idiom','collocation')`.
  5. **Bản lĩnh thi đấu (Composure / Consistency):** Tỷ lệ trả lời đúng ở **5 câu hỏi cuối trận** (giai đoạn áp lực thời gian gay cấn nhất) trong Arena.
* **Phân tích Tỷ lệ Thắng theo Chủ đề từ vựng (Topic Win Rate):**
  * Dữ liệu lấy từ cột `topic` trong bảng `arena_matches` (`technology`, `travel`, `business`, `daily_life`, `education`...).
  * Hiển thị tỷ lệ thắng (%) theo từng chủ đề kèm phân loại: *"Chủ đề sở trường"* (>70% thắng) và *"Chủ đề cần cải thiện"* (<40% thắng).

### 2. Nhận diện VIP (Đồng bộ Màu Sắc & Vị trí Hiển thị Đắt Giá)
* **Quy ước biểu tượng Vương miện (Icon Crown từ lucide-react):** Giữ độc quyền cho người đứng **Top 1 Bảng Xếp Hạng**, không bán bằng tiền.
* **Màu tên Gradient chuẩn thương hiệu LexiCore:**
  * **PRO:** Text Gradient **Xanh Dương Đại Dương (Ocean Blue)** (`from-sky-400 via-blue-500 to-indigo-600 font-bold`).
  * **ELITE:** Text Gradient **Vàng Hoàng Gia (Royal Gold)** (`from-amber-400 via-yellow-400 to-amber-600 font-bold drop-shadow-sm`).
* **Vị trí hiển thị Khung Mạ Vàng của ELITE (Nơi đối thủ ngắm nhìn lâu dài):**
  1. **Trong trận đấu Arena (In-Game Battle HUD):** Khung Avatar mạ vàng có hiệu ứng ánh kim phát sáng nhẹ hiển thị suốt trận đấu 5–6 phút cạnh thanh điểm.
  2. **Màn hình Tổng kết ván đấu (Match Result):** Thẻ vinh danh người chiến thắng bọc dải viền mạ vàng.
  3. **Bảng Xếp Hạng (Leaderboard):** Dòng tài khoản Elite có viền highlight mạ vàng sang trọng.
  4. **Thẻ Hồ Sơ Công Khai (Public Profile Modal):** Header bọc khung mạ vàng khi bạn bè hoặc người khác bấm vào xem thông tin.

### 3. Cơ chế Bảo vệ Chuỗi Streak tự động (ELITE Streak Immunity)
* Khi tài khoản có gói ELITE còn hiệu lực, nếu học viên bận rộn không vào học trong 3 ngày hay 7 ngày, chuỗi Streak không bị reset về 0. Khi học viên quay lại học bài, chuỗi sẽ tiếp tục tăng lên bình thường mà không cần dùng bùa bảo vệ `STREAK_FREEZE`.

### 4. Đấu Rank Arena & Trận nhân đôi thưởng (x2 Coin & EXP)
* **Đấu Giao Hữu:** Tất cả các tài khoản (kể cả Free) đều được tạo phòng và mời bạn bè thi đấu không giới hạn.
* **Đấu Rank:** 
  * Free: Tối đa **10 trận Rank/ngày**. Sau 10 trận, hệ thống hiển thị thông báo mời nâng cấp để tiếp tục leo rank.
  * Starter, Pro, Elite: Leo rank không giới hạn.
* **Trận nhân đôi x2:**
  * Áp dụng nhân x2 Coin & EXP cho các trận đầu tiên trong ngày (Starter 3 trận, Pro 5 trận, Elite 10 trận).
  * Các trận sau đó trong ngày nhận Coin & EXP ở mức gốc (x1.0).

---

## File định nghĩa trung tâm: `backend/utils/tierLimits.ts`

```typescript
export type Tier = 'FREE' | 'STARTER' | 'PRO' | 'ELITE';

export const TIER_LIMITS = {
  // So cau luyen phat am AI Whisper toi da trong 1 ngay
  pronunciationSentencesPerDay: {
    FREE: 5,
    STARTER: 25,
    PRO: 60,
    ELITE: 120, // Gioi han Fair-use bao ve chi phi API
  },

  // So luong video YouTube ca nhan duoc phep luu
  shadowingVideos: {
    FREE: 3,
    STARTER: 10,
    PRO: 50,
    ELITE: -1, // -1 la khong gioi han
  },

  // Thoi luong toi da cua 1 video duoc phep import (phut)
  shadowingVideoDurationMinutes: {
    FREE: 7,
    STARTER: 15,
    PRO: -1,
    ELITE: -1,
  },

  // Gioi han so tran Rank duoc phep danh trong 1 ngay (-1 la khong gioi han)
  arenaDailyRankMatches: {
    FREE: 10,
    STARTER: -1,
    PRO: -1,
    ELITE: -1,
  },

  // So tran duoc nhan doi (x2 Coin & EXP) moi ngay
  arenaDailyDoubleRewardMatches: {
    FREE: 0,
    STARTER: 3,
    PRO: 5,
    ELITE: 10,
  },

  // Gioi han tu vung luu vao SRS moi ngay (De danh cho Partner tich hop)
  srsWordsPerDay: {
    FREE: 50,
    STARTER: 100,
    PRO: -1,
    ELITE: -1,
  },

  // Mo khoa Ho so nang luc nang cao (Bieu do mang nhen 5 ky nang + Ty le thang theo chu de)
  hasAdvancedProfileAnalytics: {
    FREE: false,
    STARTER: false,
    PRO: true,
    ELITE: true,
  },

  // Tinh nang tu dong bao ve streak khong bao gio dut chuoi
  autoStreakImmunity: {
    FREE: false,
    STARTER: false,
    PRO: false,
    ELITE: true,
  },

  // Loai Gradient cho ten va khung vien avatar In-Game
  vipStyling: {
    FREE: 'NONE',
    STARTER: 'NONE',
    PRO: 'OCEAN_BLUE',
    ELITE: 'ROYAL_GOLD_FRAME',
  },
};

export function getTierLimit<K extends keyof typeof TIER_LIMITS>(
  feature: K,
  tier: Tier
): (typeof TIER_LIMITS)[K][Tier] {
  const safeTier: Tier = tier || 'FREE';
  return TIER_LIMITS[feature][safeTier];
}
```

---

## Thứ tự các bước triển khai Code

1. **Bước 1:** Tạo file định nghĩa trung tâm `backend/utils/tierLimits.ts`.
2. **Bước 2:** Cập nhật Quản lý Video Shadowing cá nhân:
   - Kiểm tra số lượng video và thời lượng tối đa khi user dán link YouTube import.
   - Viết route `DELETE /api/shadowing/videos/:videoId` và thêm nút Xóa video trên UI frontend.
3. **Bước 3:** Cập nhật Module Luyện phát âm AI (Shadowing):
   - Đếm quota số câu/ngày qua Redis trước khi gọi Whisper API.
   - Thêm API trả về số lượt còn lại để hiển thị nhãn `Còn X câu hôm nay` trên UI thu âm.
4. **Bước 4:** Cập nhật Đấu trường PvP Arena:
   - Áp dụng kiểm tra trần 10 trận Rank/ngày đối với tài khoản Free qua Redis key `arena:daily_rank:{userId}:{YYYYMMDD}`.
   - Áp dụng x2 Coin & EXP cho N trận đầu tiên trong ngày qua Redis key `arena:daily_x2:{userId}:{YYYYMMDD}`.
5. **Bước 5:** Trang Profile Cá Nhân (Pro Analytics):
   - Viết API tổng hợp chỉ số 5 đỉnh radar (Phát âm, Tốc độ, Từ vựng cơ bản, Từ vựng nâng cao, Bản lĩnh cuối trận) và thống kê tỷ lệ thắng theo `topic` từ `arena_matches`.
   - Hiển thị Biểu đồ Mạng nhện trên Profile cho Pro & Elite.
6. **Bước 6:** Tích hợp Streak Immunity & VIP Styling:
   - Cập nhật logic tính Streak nửa đêm: nếu có gói Elite còn hiệu lực, giữ nguyên streak không reset về 0.
   - Áp dụng class CSS Text Gradient (Xanh Dương Ocean cho Pro, Vàng Kim cho Elite) và Khung Avatar mạ vàng phát sáng trong trận đấu Arena, Leaderboard.
