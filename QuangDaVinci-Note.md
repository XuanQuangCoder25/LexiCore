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

**Shadowing là gì?** 
Shadowing (cái bóng) là một phương pháp luyện nói rất nổi tiếng trong việc học ngoại ngữ. Quy trình của nó rất đơn giản:
1. Bạn **nghe** một đoạn video/audio của người bản xứ.
2. Bạn đọc phụ đề (transcript) và lập tức **nhại lại** (đọc theo) càng giống ngữ điệu, phát âm của họ càng tốt.
3. Trong dự án của chúng ta, khi người dùng nhại lại, trình duyệt sẽ dùng **WebRTC (MediaRecorder API)** để ghi âm giọng nói của họ.
4. Đoạn ghi âm này sẽ được gửi lên Backend. Backend sẽ gọi các API Trí tuệ nhân tạo (AI Speech-to-Text như Google Cloud Speech-to-Text, OpenAI Whisper, hoặc Azure Pronunciation Assessment).
5. AI sẽ nghe, phân tích và trả về kết quả: bạn phát âm sai từ nào, thiếu âm đuôi (ending sound) nào, và phiên âm IPA đúng của từ đó là gì.
6. Frontend nhận kết quả và bôi đỏ những từ sai (như thiết kế `ShadowingView.tsx` đồng đội đã làm).

## 🛠 Lộ trình triển khai (Roadmap)

### Giai đoạn 1: Khởi tạo Database Schema & WebRTC (Frontend)
1. **Database:** Cần bảng `shadowing_videos` (Lưu thông tin video YouTube, ID, tiêu đề), `shadowing_segments` (Lưu phụ đề và mốc thời gian start/end), và `user_shadowing_history` (Lưu lịch sử luyện tập, điểm số của user).
2. **WebRTC:** Ở Frontend (`ShadowingView.tsx`), cấu hình nút Record để xin quyền truy cập Microphone của trình duyệt (`navigator.mediaDevices.getUserMedia`).
3. Viết hàm thu âm thanh và xuất ra định dạng `.webm` hoặc `.wav` để chuẩn bị gửi lên Backend.

### Giai đoạn 2: Tích hợp AI (Backend)
1. Tạo module `shadowing-controller.ts` để nhận file ghi âm từ Frontend (Sử dụng thư viện `multer` để parse file).
2. Tích hợp AI API. *Lưu ý: Azure Pronunciation Assessment là lựa chọn tốt nhất hiện nay cho việc đánh giá phát âm vì nó trả về điểm số từng âm tiết (syllable) và IPA, rất khớp với thiết kế của đồng đội.*
3. Xử lý kết quả AI trả về và format lại thành mảng JSON để Frontend dễ dàng map vào giao diện.

### Giai đoạn 3: Ráp nối UI & Hoàn thiện luồng học
1. Ghép nối API vào giao diện `ShadowingView.tsx`.
2. Thay thế dữ liệu giả (mock data) bằng dữ liệu thật từ Backend.
3. Xử lý logic video YouTube (đồng bộ thời gian chạy của video với phụ đề đang sáng lên).
4. Tính toán điểm Accuracy, lưu lịch sử, và cập nhật Streak (chuỗi ngày học) cho user.