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


# 🏆 THU THẬP & DANH SÁCH BỘ SƯU TẬP (ACHIEVEMENTS & COLLECTIONS)

## 🏜️ Collection 1: Kẻ Du Mục Sa Mạc (Desert Nomads)
*Đây là vùng đất khởi đầu, khô cằn nhưng ẩn chứa sức sống mãnh liệt.*
- **Cặp 1 (Tier 1 - Cơ bản):** Lạc đà (Camel) — Ốc đảo xanh mát giữa biển cát (Desert Oasis).
- **Cặp 2 (Tier 2 - Khá):** Cáo Fennec tai to (Fennec Fox) — Đồi cát vàng ươm kéo dài bất tận dưới ánh hoàng hôn (Golden Dunes at Sunset).
- **Cặp 3 (Tier 3 - Hiếm):** Rắn đuôi chuông (Rattlesnake) — Hẻm núi đá đỏ khô cằn (Red Rock Canyon).
- **Cặp 4 (Tier 4 - Siêu hiếm):** Đại bàng sa mạc (Desert Falcon) — Tàn tích đền thờ cổ đại bị bão cát vùi lấp một nửa (Sand-buried Ancient Ruins).

## 🌊 Collection 2: Đại Dương Sâu Thẳm (Deep Ocean)
*Chủ đề khám phá từ mặt nước xuống tận đáy biển sâu.*
- **Cặp 1 (Tier 1 - Cơ bản):** Rùa biển (Sea Turtle) — Rạn san hô rực rỡ dưới ánh nắng (Coral Reef).
- **Cặp 2 (Tier 2 - Khá):** Cá voi xanh (Blue Whale) — Khung cảnh: Mặt biển mở (Open Sea) đang dậy sóng, xa xa là một bầu trời bão táp vĩ đại (Dramatic Stormy Sky).
- **Cặp 3 (Tier 3 - Hiếm):** Cá heo (Dolphin) — Rừng tảo bẹ khổng lồ dưới đáy biển lấp lánh tia nắng mặt trời (Kelp Forest).
- **Cặp 4 (Tier 4 - Siêu hiếm):** Cá voi sát thủ (Orca) — Rãnh đại dương sâu thẳm, đen kịt nhưng được thắp sáng bởi hàng ngàn rặng san hô sinh học (Abyssal Trench).

## 🌲 Collection 3: Thâm Sơn Cùng Cốc (Mystic Jungle)
*Một khu rừng nhiệt đới đầy bí ẩn và hoang dã.*
- **Cặp 1 (Tier 1 - Cơ bản):** Vẹt Macaw (Macaw) — Vòm cây cổ thụ rậm rạp đâm xuyên tầng mây (Canopy of Ancient Trees).
- **Cặp 2 (Tier 2 - Khá):** Ếch phi tiêu độc (Poison Dart Frog) — Thảm thực vật nhiệt đới với những cây nấm khổng lồ, sặc sỡ (Giant Flora).
- **Cặp 3 (Tier 3 - Hiếm):** Hổ vằn Bengal (Bengal Tiger) — Một thác nước hùng vĩ giấu mình sâu trong rừng rậm (Hidden Jungle Waterfall).
- **Cặp 4 (Tier 4 - Siêu hiếm):** Báo đen (Black Panther) — Ngôi đền cổ của người Maya/Inca bị rễ cây cổ thụ nuốt chửng (Overgrown Mayan Temple).

## ❄️ Collection 4: Kỷ Băng Hà (Arctic Tundra)
*Thế giới của tuyết trắng, băng giá và những hiện tượng kỳ ảo.*
- **Cặp 1 (Tier 1 - Cơ bản):** Chim Cánh Cụt (Penguin) — Vách băng khổng lồ sừng sững trên mặt biển (Giant Ice Cliffs).
- **Cặp 2 (Tier 2 - Khá):** Cú Tuyết (Snowy Owl) — Cánh đồng tuyết trắng xóa bất tận dưới bầu trời đêm (Endless White Tundra).
- **Cặp 3 (Tier 3 - Hiếm):** Chó Husky/Malamute — Rừng thông phủ đầy tuyết trắng xóa (Snowy Pine Forest).
- **Cặp 4 (Tier 4 - Siêu hiếm):** Sói Tuyết (Arctic Wolf) — Đỉnh núi tuyết rực sáng dưới dải ánh sáng Cực quang (Aurora Borealis).

## 🔮 Collection 5: Vương Quốc Pha Lê (Crystal Caverns)
*Để dành cho những Level siêu cao, mang hơi hướng Fantasy (Viễn tưởng).*
- **Cặp 1 (Tier 1 - Cơ bản):** Kỳ Giông (Axolotl) — Sông ngầm thạch anh tím (Amethyst Underground River).
- **Cặp 2 (Tier 2 - Khá):** Dơi Bạch Tạng (Albino Bat) — Vòm hang động lấp lánh tinh thể lưu huỳnh vàng (Yellow Sulfur Cave Vault).
- **Cặp 3 (Tier 3 - Hiếm):** Cua Đá Mù (Blind Cave Crab) — Rừng cột thạch nhũ pha lê khổng lồ chĩa từ dưới lên (Crystal Stalagmite Forest).
- **Cặp 4 (Tier 4 - Siêu hiếm):** Thằn Lằn Dung Nham (Lava Salamander) — Hồ dung nham xanh rực sáng dưới đáy hang (Glowing Blue Lava Lake).

## ☁️ Collection 6: Bầu Trời (Sky Realm)
*Môi trường của mây trắng, các tầng không khí, bão tố và ánh sáng mặt trời.*
- **Cặp 1 (Tier 1 - Cơ bản):** Chim Nhạn (Swallow) — Những đám mây trắng xốp bồng bềnh (Fluffy Cumulus Clouds).
- **Cặp 2 (Tier 2 - Khá):** Bồ Nông (Pelican) — Quần đảo lơ lửng trên không trung (Floating Islands).
- **Cặp 3 (Tier 3 - Hiếm):** Đại bàng hói (Bald Eagle) — Biển mây rực rỡ dưới ánh hoàng hôn (Sunset Sea of Clouds).
- **Cặp 4 (Tier 4 - Siêu Hiếm):** Chim Cắt Lớn (Peregrine Falcon) — Tâm bão sét với những đám mây đen cuồn cuộn cuộn xoáy (Eye of a Thunderstorm).

## 🐊 Collection 7: Đầm Lầy (Misty Swamplands)
*Môi trường hoang dã, ẩm ướt, đầy sương mù, bí ẩn và rêu phong.*
- **Cặp 1 (Tier 1 - Cơ bản):** Cò Trắng (Egret) — Cánh đồng cỏ lau bên bờ lạch (Reed Field).
- **Cặp 2 (Tier 2 - Khá):** Rùa Cá Sấu (Snapping Turtle) — Rừng ngập mặn với hệ thống rễ cây đan chằng chịt (Mangrove Roots).
- **Cặp 3 (Tier 3 - Hiếm):** Cóc Khổng Lồ (Goliath Frog) — Khu đầm lầy âm u phủ kín sương mù dày đặc (Misty Swamp).
- **Cặp 4 (Tier 4 - Siêu Hiếm):** Cá Sấu Mõm Ngắn (Alligator / Crocodile) — Tàn tích một chiếc thuyền hơi nước hoen gỉ bị bỏ hoang giữa đầm lầy rêu phong (Abandoned Sunken Steamboat).

# TASK OBJECTIVE
Thực thi tính năng phân quyền Hybrid RBAC cho role `CONTENT_CREATOR` trong hệ thống LexiCore. Dự án sử dụng Node.js/TypeScript (Backend) và React/Vite (Frontend).

# CONTEXT & BUSINESS LOGIC
LexiCore áp dụng mô hình Lai (Hybrid) cho việc tạo nội dung:
1. Mọi `USER` đều có thể tạo khóa học/bộ từ vựng riêng tư (Resource-level RBAC).
2. Chỉ những người có role `CONTENT_CREATOR` (đã được duyệt) mới có quyền xuất bản nội dung ra Public (Cộng đồng).
3. Admin có quyền phê duyệt/từ chối đơn xin làm Creator và có quyền Cấm (Suspend) Creator nếu vi phạm. Creator bị cấm sẽ rơi vào trạng thái "Shadow Ban": mất quyền tạo mới, nhưng nội dung cũ vẫn tồn tại cho học viên cũ tiếp tục học.

# REQUIRED IMPLEMENTATION PLAN

Vui lòng lập kế hoạch và thực hiện tuần tự theo các bước sau:

## Phase 1: Database & Models Update (bạn chỉ cần viết file schema và tôi sẽ tự thực thi bên datagrip, bạn không cần tự thêm vào aiven như lần trước)
1. Cập nhật file Schema/Models của User:
   - Thêm cột `creator_status` (ENUM: 'ACTIVE', 'SUSPENDED', mặc định là NULL).
2. Tạo bảng/model mới `creator_applications`:
   - Các cột: `id`, `user_id`, `reason` (Text), `qualifications` (Text/URL), `status` (ENUM: 'PENDING', 'APPROVED', 'REJECTED'), `admin_note` (Text).

## Phase 2: Backend APIs & Middleware
1. Viết Middleware: Kiểm tra `req.user.role === 'CONTENT_CREATOR'` VÀ `req.user.creator_status === 'ACTIVE'` (hoặc role là ADMIN).
2. Viết các API cho User:
   - `POST /api/creator/apply`: Nộp đơn xin làm Creator.
3. Viết các API cho Admin:
   - `GET /api/admin/creator-applications`: Lấy danh sách đơn xin duyệt.
   - `POST /api/admin/creator-applications/:id/approve`: Duyệt đơn (Update role = CONTENT_CREATOR, creator_status = ACTIVE).
   - `POST /api/admin/creator-applications/:id/reject`: Từ chối đơn (kèm body `admin_note`).
   - `POST /api/admin/creators/:userId/suspend`: Đình chỉ Creator (Update creator_status = SUSPENDED).

## Phase 3: Frontend UI
1. **User UI:** Chúng ta chưa làm phần profile này nên có lẽ bây giờ tạo giao diện đơn giản thôi, gồm chỗ để avatar cùng với ảnh nền, tên và tiểu sử, chỗ để xin làm creator, có một form/modal nhỏ để user điền lý do xin làm Creator. 
2. **Admin UI (Admin Panel):**
   - Tạo khu vực hộp thư để nhận thông báo về đơn xin duyệt làm creator và đơn report course từ user có kèm con số (Badge) báo hiệu số lượng đơn PENDING. (không biết có nên tách riêng ra 2 hộp thư 1 cái là creator request một cái là report không nhỉ)
   - Bảng danh sách đơn: Cột thông tin, cột hành động (Nút Tích Xanh - Approve, Nút Dấu X - Reject). Khi bấm Reject phải có chỗ nhập lý do.
   - Bảng Quản lý Creator đang hoạt động: Thêm nút "Đình chỉ" (Suspend) tài khoản.
3. **Public UI:** Thêm nút 🚩 Report (Báo cáo lạm dụng) nhỏ ở góc các khóa học/video public.
