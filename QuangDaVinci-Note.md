### Quy trình CI/CD của Dự án

Dự án áp dụng tự động hóa thông qua GitHub Actions. Hệ thống tự động nhận diện Pipeline thông qua 2 file `frontend-ci.yml` và `backend-ci.yml` nằm trong thư mục `.github/workflows/`. 

Để tối ưu tài nguyên, hệ thống được thiết lập **chỉ chạy CI của phần có sự thay đổi** (Frontend hoặc Backend).

*   **CI (Continuous Integration - Tích hợp liên tục):** 
    *   Mỗi khi có code mới được `push` lên GitHub, hệ thống sẽ tự động chạy Test. 
    *   Nếu code chạy tốt (xanh), code được chấp nhận. Nếu có lỗi (đỏ), hệ thống sẽ cảnh báo. 
    *   *Xem chi tiết quá trình này ở tab **Actions** trên GitHub.*

*   **CD (Continuous Deployment - Triển khai liên tục):** 
    *   Chỉ khi bước CI báo trạng thái xanh, quá trình CD mới được kích hoạt.
    *   CD sẽ tự động mang đoạn code đạt chuẩn đưa thẳng lên máy chủ (Server) thật.

---

# 🛒 MODULE: GAMIFICATION & ECONOMY (CỬA HÀNG VẬT PHẨM)

**Phân quyền (RBAC):** Chỉ có `ADMIN` mới được quyền Thêm/Sửa/Xóa vật phẩm. Người dùng bình thường (`USER`) chỉ được phép Xem và Mua.

## 🛠 Giai đoạn 1: Thiết kế Kho lưu trữ (Database Schema)
1. **`wallets` (Quản lý kinh tế ảo):** Chứa số dư xu (`coin_balance`) và chuỗi ngày học.
2. **`billing_transactions` (Lịch sử giao dịch):** Sổ cái ghi nhận mọi biến động số dư (Ai, mua gì, trừ bao nhiêu xu, vào lúc nào). Đảm bảo tính minh bạch.
3. **`items` (Cửa hàng):** Lưu thông tin vật phẩm (Tên, Loại, Giá). 
   * **Lưu ý (Soft Delete):** Đã bổ sung cột `is_active BOOLEAN DEFAULT TRUE`. Khi Admin xóa vật phẩm, ta chỉ cập nhật `is_active = false` (Tạm ngưng bán) để không làm hỏng lịch sử túi đồ của người dùng đã mua trước đó.
4. **`user_items` (Túi đồ - Inventory):** Bảng trung gian (Many-to-Many). Lưu danh sách những món đồ user đang sở hữu và số lượng (`quantity`).

## ⚙️ Giai đoạn 2: API Quản lý Cửa hàng (Admin CRUD)
*Lưu ý: Các API này bắt buộc phải đi qua middleware `requireAdmin` để bảo mật.*
*   `GET    /api/store/admin/items` (Xem tất cả items, kể cả đã ngưng bán)
*   `POST   /api/store/admin/items` (Thêm vật phẩm mới)
*   `PUT    /api/store/admin/items/:id` (Sửa thông tin vật phẩm)
*   `DELETE /api/store/admin/items/:id` (Ngưng bán - Soft Delete, `is_active = false`)
*   `PATCH  /api/store/admin/items/:id/activate` (Kích hoạt lại vật phẩm đã ngưng bán)

## 💳 Giai đoạn 3: API Trải nghiệm Mua sắm (User Flow)
*   `GET  /api/store/items` (Cửa hàng): Trả về danh sách các vật phẩm đang được bán (`is_active = true`).
*   `GET  /api/store/inventory` (Túi đồ): Trả về danh sách vật phẩm user đang có.
*   `POST /api/store/buy/:itemId`: Nút thắt cổ chai của hệ thống. Bắt buộc dùng **Database Transaction** (`BEGIN`, `COMMIT`, `ROLLBACK`) để thực hiện nguyên tử 3 bước:
    1. Kiểm tra ví (`wallets`) có đủ tiền không? Nếu đủ thì trừ tiền.
    2. Ghi log hóa đơn vào `billing_transactions`.
    3. Thêm vật phẩm vào `user_items` (Hoặc tăng `quantity` lên +1 nếu đã có).
    *(Bảo mật bổ sung: Dùng `SELECT ... FOR UPDATE` (Row-locking) để chống spam click mua hàng 2 lần cùng lúc).*

## 🖥 Giai đoạn 4: Frontend UI (Cửa hàng & Túi đồ)
*   **Store UI (`StoreView.tsx`):** Hiển thị dạng Grid các thẻ (Card) vật phẩm kèm giá xu. Khi bấm "Mua", bật `Modal` xác nhận: *"Bạn có chắc muốn mua vật phẩm này với giá 50 xu không?"* để chống bấm nhầm.
*   **Inventory UI:** (Chưa có trên thiết kế gốc của đồng đội) Cần bổ sung một Tab hoặc một trang nhỏ liệt kê các vật phẩm user đang sở hữu kèm nút "Trang bị" (Equip) hoặc "Sử dụng" (Use).

---

# 🎨 THIẾT KẾ & BẢNG MÀU (DESIGN SYSTEM)

Hiện tại dự án sử dụng 2 bộ màu được gán trực tiếp (Inline Style) qua Object `L` (Light) và `D` (Dark) kết hợp với class `isDark` trên root để thay đổi thay vì dùng class chuẩn của Tailwind. Kiến trúc này giúp giữ nguyên thiết kế kính mờ (glassmorphism) đặc thù và không bị ảnh hưởng bởi layout bên ngoài.

Các View mới (`StoreView`, `ArenaView`, v.v.) sẽ áp dụng cùng một cấu trúc `const L` và `const D` này để đồng bộ.

## ☀️ Light Mode: "Soft Blue Mist"
- **Nền trang:** Gradient xanh dương nhạt (`linear-gradient(135deg, #f3f7ff 0%, #eef3ff 50%, #f7f3ff 100%)`)
- **Card/Panel:** Trắng trong mờ `rgba(255,255,255, 0.88)`
- **Viền Card:** Xanh mờ `rgba(37,99,235, 0.12)`
- **Tiêu đề (Title):** Đen xám `#0f172a`
- **Chữ nhấn/Sub-text:** Xanh dương `#2563eb`
- **Màu phụ (Muted):** Xám `#64748b`
- **Nút bấm (Button):** Gradient `#0b5cff → #1f58ff → #7c3aed`

## 🌙 Dark Mode: "Deep Space" (Dựa trên commit cb37607)
- **Nền trang:** Đen tím sâu `#080714`
- **Card/Panel:** Tím thẫm `#100e24` (hoặc `#0d0c1e` cho Modal)
- **Viền Card:** Tím mờ `rgba(167,139,250, 0.18)`
- **Tiêu đề (Title):** Trắng ngà `#f8fafc`
- **Chữ nhấn/Sub-text:** Lavender `#c4b5fd`
- **Màu phụ (Muted):** Xám nhạt `#94a3b8`
- **Nút bấm (Button):** Gradient `#7c3aed → #4f46e5`

---

# 🎙️ MODULE: AI VOICE ANALYSIS (SHADOWING)

## Giai đoạn 1: Database & Auto-fetch Transcript ✅

- Tạo 3 bảng MySQL: `shadowing_videos`, `shadowing_segments`, `user_shadowing_history`.
- API `POST /api/shadowing/videos`: nhận URL YouTube → gọi `youtube-transcript` kéo phụ đề tự động, gọi YouTube oEmbed API lấy title & channel thật → lưu vào DB.
- API `GET /api/shadowing/videos` và `GET /api/shadowing/videos/:id`.
- Frontend: card "Thêm video" với ô nhập URL, chọn độ khó, loading state, thông báo lỗi rõ ràng.

## Giai đoạn 2: Tích hợp AI (Whisper + So sánh text) ✅

- Backend nhận file ghi âm qua `multer` (memory buffer).
- Gọi **OpenAI Whisper API** (`whisper-1`) để chuyển giọng nói thành text.
- Hàm `compareWords(reference, spoken)` trong `shadowing-service.ts`: normalize (lowercase, bỏ dấu câu), so sánh word-by-word, trả về `{ text, status }`.
- Trả về `{ accuracy, spokenText, referenceText, feedback }` cho Frontend.
- *Nâng cấp sau:* Thay bằng **Azure Pronunciation Assessment** để có IPA từng âm tiết.

## Giai đoạn 3: Frontend WebRTC & Hoàn thiện ✅

- Tích hợp `react-youtube`: phát video, bắt sự kiện `onReady`, `onStateChange`.
- Phụ đề đồng bộ: `setInterval` 500ms → `getCurrentTime()` → so sánh `start_time`/`end_time` → highlight câu đang phát.
- WebRTC: `getUserMedia` xin quyền mic, `MediaRecorder` ghi âm, tổng hợp `Blob`, gửi qua `FormData`.
- Từ sai bôi đỏ dạng gạch chân lượn sóng, hover thấy gợi ý.
- Lưu lịch sử vào `user_shadowing_history` sau mỗi lần phân tích.
- Cập nhật Streak dùng hàm chung `updateStreak(userId)` (`backend/utils/streak.ts`).

---

## Streak Logic — Dùng chung (`backend/utils/streak.ts`)

Cập nhật `wallets`: `current_streak`, `longest_streak`, `last_study_date` sau mỗi lần học:
- **Chưa học hôm nay, ngày cuối là hôm qua:** `streak += 1` → chuỗi tiếp tục.
- **Đã học hôm nay rồi:** Không thay đổi (idempotent — tránh tăng 2 lần).
- **Bỏ học ≥ 1 ngày** (học ngày 1, bỏ ngày 2, học lại ngày 3): `streak = 1` (reset về đầu).
- `longest_streak` luôn được cập nhật nếu `current_streak` vượt kỷ lục.

---

## Luồng hoạt động

Shadowing là phương pháp luyện phát âm: người dùng nghe người bản xứ nói rồi nhại lại ngay lập tức. Hệ thống hoạt động theo luồng sau:

1. **Thêm video:** Người dùng dán URL YouTube → Backend gọi `youtube-transcript` kéo phụ đề, gọi YouTube oEmbed API lấy title & channel thật → lưu vào MySQL (`shadowing_videos`, `shadowing_segments`).
2. **Luyện tập:** Người dùng chọn video, trình phát YouTube nhúng vào trang. Phụ đề tự sáng lên theo mốc thời gian của video (`setInterval` + `player.getCurrentTime()`). Bấm vào câu phụ đề để tua video đến đúng đoạn đó.
3. **Ghi âm (WebRTC):** Người dùng bấm "Start Shadowing" → trình duyệt xin quyền Microphone → `MediaRecorder API` ghi âm. Video tự tạm dừng khi ghi âm.
4. **Phân tích AI:** Bấm "Stop & Analyze" → file `.webm` gửi lên Backend qua `FormData`. Backend gọi **OpenAI Whisper** (`whisper-1`) chuyển giọng nói thành text (truyền transcript gốc làm `prompt` để tăng độ chính xác).
5. **Chấm điểm:** Hàm `compareWords()` so sánh text Whisper với transcript gốc word-by-word (có normalize). Tính `accuracy`, trả về mảng token `{ text, status: 'correct' | 'wrong' }`.
6. **Lưu kết quả:** Lưu điểm vào `user_shadowing_history`. Gọi `updateStreak(userId)` cập nhật chuỗi ngày học.
7. **Hiển thị:** Từ sai bôi đỏ gạch chân lượn sóng. *Nâng cấp tương lai: dùng Azure Pronunciation Assessment để có phiên âm IPA từng âm tiết.*


Nháp:
Custom Player:
1. Thanh điều khiển (Control Bar)
Thanh này sẽ nằm bên dưới video (hoặc đè lên mép dưới video). Thay vì các nút xem phim thông thường, ta cần:
- Nút Play/Pause (Spacebar): Bắt buộc.
- Nút Tua lùi 5 giây (Phím mũi tên trái): Cực kỳ quan trọng. Nghe không rõ là bấm lùi ngay lập tức.
- Nút Tốc độ (Speed): Các mức 0.5x, 0.75x (rất cần cho người mới), 1x, 1.25x.
- (Tính năng Độc quyền) Nút Auto-Pause: Một nút gạt (Toggle). Khi bật lên, video cứ chạy hết 1 câu phụ đề là tự động dừng lại, để chừa khoảng lặng cho user ghi âm nhại lại. Khi ghi âm xong, tự động chạy câu tiếp theo.
- Nút Loop (Lặp câu): Bật lên thì video chỉ chạy đi chạy lại đúng cái câu (segment) hiện tại. Rất tốt để cày phát âm.
2. Menu Chuột phải (Custom Context Menu)
Ta phủ một thẻ div trong suốt lên video. Khi user click chuột phải, xổ ra 1 menu nhỏ gọn (Dark theme):
- Lưu câu này vào sổ tay (Save sentence)
- Lặp lại câu này (Loop)
- Chép script câu này (Copy text)
3. Phụ đề tương tác (Interactive Subtitles) & Popup Từ điển
Phụ đề không phải là một dòng chữ dính chết vào video, mà ta sẽ render nó thành từng chữ (từng thẻ <span>). Thao tác: chỉ click 1 lần (Single Click)
Quy trình chuẩn khi click vào 1 chữ (ví dụ chữ "Environment"): Video ngay lập tức bị Tạm dừng (Pause).Chữ "Environment" được bôi đậm (Highlight vàng).
Một Popup Card nổi lên ngay bên cạnh chữ đó (dùng thư viện như Floating UI hoặc Radix UI để canh toạ độ).
Popup Từ điển sẽ chứa những gì? Chúng ta sẽ kết hợp 2 công nghệ như đã chốt (Free API + AI) vào chung 1 cái Popup này:
- Phần trên (Dùng Free Dictionary API): Nút loa để nghe cách người bản xứ đọc riêng từ đó. Phiên âm IPA: /ɪnˈvaɪ.rən.mənt/.
- Phần giữa (Dùng Gemini - Context AI): Vì Frontend đã truyền nguyên cả câu đó cho Backend, nên Gemini sẽ trả về đúng 1 nghĩa ngắn gọn, khớp 100% với video. Ví dụ: Danh từ: Môi trường (sống, làm việc).
- Phần dưới (Tôi tính làm gì đó liên quan tới Hệ thống Gamification như Nút Lưu vào Flashcard (Tốn 10 Xu) nhưng họ hoàn toàn có thể lách luật bằng cách thêm từ từ sổ tay rồi sau khi kết thúc bào học sẽ tự tổng hợp vào flashcard nên chắc gamification để tính sau đi haha)

Tuy nhiên, hiện tại giao diện ta đang có 1 nhược điểm đó là video đang chiếm phần lớn bên trên, dưới là 2 khung start shadowing và khung chứa subtitles, điều này có nghĩa là user không thể vừa xem video vừa xem phụ đề, nếu họ muón xem phụ đề họ phải lướt xuống, và không nhìn thấy video. Nên tôi tính thay đổi, đẩy khung subtitles lên ngang hàng với video để người dùng có thể vừa xem video vừa đọc phụ đề. Và vì tôi muốn nhét thêm khá nhiều thứ (Gemini Vocab, Sổ tay), nếu chúng ta cứ xếp chồng chúng lên nhau thì cột sẽ dài lê thê. Nên tôi đề xuất Bản thiết kế UI Layout như sau:

CỘT BÊN TRÁI (60% Chiều rộng): KHU VỰC THỰC HÀNH (Practice Zone)
Cột này là nơi User tập trung cao độ nhất vào hình ảnh và âm thanh.

1. Phía Trên: Custom Video Player
- Video được thu gọn lại theo tỷ lệ 16:9 cho vừa tầm mắt.
- Bên trong video là Phụ đề tương tác nổi lên trên (Click vào chữ thì hiện Popup Từ điển).
2. Ở Giữa: Thanh Điều Khiển (Control Bar)
- Các nút Play/Pause, Tua lùi 5s, Toggle Auto-Pause, Thanh tiến trình, Cài đặt tốc độ.
3. Phía Dưới: Trạm Phân tích Giọng nói (Voice Analysis Station)
- Nút Start Shadowing lớn nổi bật.
- Khi đang thu âm: Hiện sóng âm thanh (Audio waveform) cho sinh động.
- Khi thu âm xong: Khung này sẽ mở rộng ra để hiển thị kết quả từ Whisper (bôi đỏ/xanh từng chữ) và Điểm số Accuracy. (Không gian 60% chiều ngang cực kỳ lý tưởng để hiển thị 1 câu văn dài mà không bị rớt dòng).

CỘT BÊN PHẢI (40% Chiều rộng): KHU VỰC DỮ LIỆU (Data & Tools)
Để tránh việc cuộn chuột mỏi tay, cột bên phải sẽ được thiết kế dưới dạng Các Thẻ (TABS). User muốn xem cái gì thì bấm sang Tab đó. Khu vực này có chiều cao cố định bằng với toàn bộ cột trái và có thanh cuộn riêng (overflow-y-auto).

1. Tab 1: Phụ đề (Transcript) - (Tab mặc định)
- Danh sách toàn bộ phụ đề. Dòng nào đang đọc sẽ được highlight. Bấm vào dòng nào video tua tới đó.
2. Tab 2: Từ Vựng (Vocabulary - Gemini)
- Nơi hiển thị mảng JSON 20 từ vựng quan trọng do Gemini tóm tắt.
- Mỗi từ có định nghĩa, phiên âm và 1 nút [+] Lưu vào sổ tay.
3. Tab 3: Sổ Tay (My Notebook)
- Nơi chứa những từ vựng và câu mà user đã bấm "Lưu" (từ Context Menu hoặc từ Tab Từ vựng).
- Sau khi học xong video, user có thể vào Tab này để xem lại tổng kết những gì mình vừa lưu lại trước khi tắt máy.