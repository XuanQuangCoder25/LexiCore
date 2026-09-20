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

## Giai đoạn 1: Database & Auto-fetch Transcript

- Tạo 3 bảng MySQL: `shadowing_videos`, `shadowing_segments`, `user_shadowing_history`.
- API `POST /api/shadowing/videos`: nhận URL YouTube → gọi `youtube-transcript` kéo phụ đề tự động, gọi YouTube oEmbed API lấy title & channel thật → lưu vào DB.
- API `GET /api/shadowing/videos` và `GET /api/shadowing/videos/:id`.
- Frontend: card "Thêm video" với ô nhập URL, chọn độ khó, loading state, thông báo lỗi rõ ràng.

## Giai đoạn 2: Tích hợp AI (Whisper + So sánh text)

- Backend nhận file ghi âm qua `multer` (memory buffer).
- Gọi **OpenAI Whisper API** (`whisper-1`) để chuyển giọng nói thành text.
- Hàm `compareWords(reference, spoken)` trong `shadowing-service.ts`: normalize (lowercase, bỏ dấu câu), so sánh word-by-word, trả về `{ text, status }`.
- Trả về `{ accuracy, spokenText, referenceText, feedback }` cho Frontend.
- *Nâng cấp sau:* Thay bằng **Azure Pronunciation Assessment** để có IPA từng âm tiết.

## Giai đoạn 3: Frontend WebRTC & Hoàn thiện

- Tích hợp `react-youtube`: phát video, bắt sự kiện `onReady`, `onStateChange`.
- Phụ đề đồng bộ: `setInterval` 500ms → `getCurrentTime()` → so sánh `start_time`/`end_time` → highlight câu đang phát.
- WebRTC: `getUserMedia` xin quyền mic, `MediaRecorder` ghi âm, tổng hợp `Blob`, gửi qua `FormData`.
- Từ sai bôi đỏ dạng gạch chân lượn sóng, hover thấy gợi ý.
- Lưu lịch sử vào `user_shadowing_history` sau mỗi lần phân tích.
- Cập nhật Streak dùng hàm chung `updateStreak(userId)` (`backend/utils/streak.ts`).

## Giai đoạn 4: Custom Video Player & Giao diện học tập

- **Bố cục (Layout):** Chia layout 60/40. Bên trái là khu vực thực hành (Video, Control Bar, Voice Analysis). Bên phải là hệ thống tab dữ liệu (Transcript, Gemini Vocab, Notebook).
- **Thanh điều khiển tuỳ chỉnh (Control Bar):** 
  - Thay thế các control mặc định của YouTube bằng các nút custom (Play/Pause, Tua lùi 5s, Tốc độ).
  - Thuật toán `Auto-Pause`: Tự động dừng video khi người dùng nghe xong một câu (dựa trên mốc `end_time` của segment hiện tại).
  - Thuật toán `Loop`: Liên tục lặp lại một câu (kết hợp `seekTo` và `start_time`, `end_time`).
- **Context Menu & Sổ tay:** 
  - Bắt sự kiện chuột phải (`onContextMenu`) trên từng câu phụ đề ở Tab Transcript.
  - Các chức năng: Lưu câu vào thẻ Notebook, Kích hoạt Loop câu đó, hoặc Copy text vào clipboard. Mọi thao tác lưu diễn ra âm thầm để không gián đoạn luồng học.

## Giai đoạn 5: Interactive Subtitles & AI Dictionary

- **Tokenization:** Phụ đề không còn là văn bản tĩnh mà được chẻ (split) thành từng từ vựng riêng biệt và render thông qua các thẻ `<span>` có sự kiện `onClick`.
- **Làm sạch chuỗi (String Cleaning):** Áp dụng Regex để lọc các ký tự đặc biệt, dấu câu dính vào từ, ép kiểu `toLowerCase()` trước khi gửi lên API để tránh lỗi 400/404.
- **Tích hợp API Tra từ:**
  - Chuyển sang sử dụng **Wiktionary REST API** (`en.wiktionary.org`) để đảm bảo tính ổn định, tốc độ phản hồi nhanh và không bị lỗi CORS/Rate Limit. Dữ liệu HTML trả về được lọc (strip tags) trước khi hiển thị.
  - Sử dụng Web Speech API tích hợp sẵn của trình duyệt (`window.speechSynthesis`) để đọc từ vựng thay vì tải file MP3, giúp đảm bảo 100% từ nào cũng có thể phát âm được mà không bị trễ.
- **Tích hợp Gemini AI Contextual Explanation:**
  - Gửi cả từ vựng và toàn bộ câu chứa từ đó lên Backend. 
  - Backend gọi **Gemini API** với prompt được tối ưu (yêu cầu trả về dạng text thuần dưới 40 chữ) để giải thích chính xác ý nghĩa của từ đó trong ngữ cảnh của câu.
- **UI/UX Popup:** Khung từ điển nổi (Dictionary Popup) áp dụng kỹ thuật Drag & Drop thuần React (sử dụng `useRef` và `pointer events`), cho phép người dùng thoải mái nắm kéo thả khung từ điển khắp màn hình để không bị che khuất video hay transcript.

---

## Streak Logic — Dùng chung (`backend/utils/streak.ts`)

Cập nhật `wallets`: `current_streak`, `longest_streak`, `last_study_date` sau mỗi lần học:
- **Chưa học hôm nay, ngày cuối là hôm qua:** `streak += 1` → chuỗi tiếp tục.
- **Đã học hôm nay rồi:** Không thay đổi (idempotent — tránh tăng 2 lần).
- **Bỏ học ≥ 1 ngày** (học ngày 1, bỏ ngày 2, học lại ngày 3): `streak = 1` (reset về đầu).
- `longest_streak` luôn được cập nhật nếu `current_streak` vượt kỷ lục.
*Nâng cấp tương lai: dùng Azure Pronunciation Assessment để có phiên âm IPA từng âm tiết.*

---


