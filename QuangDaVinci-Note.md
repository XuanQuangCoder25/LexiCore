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

## 🎯 Giai đoạn 5: Nhiệm vụ (Goals) & Thành tựu (Achievements)
*   **Backend (`gamification-repository.ts`):** Quản lý logic Nhiệm vụ (Daily/Weekly) và Thành tựu. Tích hợp các hàm `updateGoalProgress()` và `updateAchievementProgress()` chạy ngầm.
*   **Tích hợp Event Trigger:** Gọi các hàm cập nhật tiến trình vào bên trong logic học tập (`streak.ts`, `shadowing-service.ts`) và mua sắm.
*   **Quy tắc Admin:** Quản trị viên chỉ được phép kích hoạt tối đa 3 nhiệm vụ cùng lúc để người dùng tập trung hoàn thành.

## 🖼 Giai đoạn 6: Media & Upload
*   Tích hợp API `POST /api/upload/image` sử dụng `multer` và `Cloudinary` để lưu trữ ảnh của vật phẩm, avatar, và cover photo trực tiếp từ Admin Dashboard.

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

# 🛡️ MODULE: ADMIN PANEL & RBAC (PHÂN QUYỀN VÀ QUẢN TRỊ)

Chúng ta đã tái cấu trúc và mở rộng khu vực Admin thành một phân hệ quản trị toàn diện, bao gồm các tab và logic phân quyền nâng cao.

## 1. Giao diện Quản trị (Admin Dashboard)
Dashboard được chia thành nhiều View riêng biệt để quản lý:
- **AdminHRView (Nhân sự & Báo cáo):** Quản lý hệ thống đơn từ, duyệt/từ chối role `CONTENT_CREATOR`, đình chỉ tài khoản vi phạm, và xử lý các báo cáo lạm dụng (Report) từ người dùng.
- **AdminEconomyView (Kinh tế & Gamification):** Tab chuyên sâu để vận hành nền kinh tế ảo. 
  - *Cửa hàng (Items):* Quản lý vật phẩm, giá cả (Coin/Diamond), ảnh đại diện (kết nối Cloudinary).
  - *Bộ sưu tập (Collections):* Quản lý nhóm vật phẩm, màu sắc chủ đề.
  - *Nhiệm vụ (Goals):* Bảng điều khiển Nhiệm vụ Hàng ngày/Tuần (giới hạn kích hoạt 3 nhiệm vụ/lúc).
  - *Thành tựu (Achievements):* Phân loại thành tựu với phần thưởng đa dạng (Coin, Kim cương, EXP).

## 2. Phân quyền Hybrid RBAC (Content Creator)
LexiCore áp dụng mô hình Lai (Hybrid) cho việc tạo nội dung:
1. Mọi `USER` đều có thể tạo khóa học/bộ từ vựng riêng tư (Resource-level RBAC).
2. Chỉ những người có role `CONTENT_CREATOR` (đã được duyệt) mới có quyền xuất bản nội dung ra Public (Cộng đồng).
3. Admin có quyền phê duyệt/từ chối đơn xin làm Creator và có quyền Cấm (Suspend) Creator nếu vi phạm. Creator bị cấm sẽ rơi vào trạng thái "Shadow Ban": mất quyền tạo mới, nhưng nội dung cũ vẫn tồn tại cho học viên cũ tiếp tục học.

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
--- 

# ⚔️ HỆ THỐNG HUY HIỆU XẾP HẠNG PVP (PVP ARENA RANK BADGES)

**Vị trí lưu trữ:** `frontend/public/assets/ranks/` (Core UI Asset, định dạng PNG tách nền trong suốt, tỉ lệ 1:1, tải tức thì không phụ thuộc CDN).

### Danh mục 13 Huy hiệu Xếp hạng chính thức:

| STT | Cấp Rank | Bậc | File UI (`/assets/ranks/`) | Linh vật đại diện | Chất liệu & Kiểu dáng Khiên | Ý nghĩa / Biểu trưng |
| :---: | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | **Đồng (Bronze)** | — | `rank-bronze.png` | **Chiến Binh Spartan** | Đồng đỏ & đồng cổ nguyên khối / Khiên tam giác tối giản | Tinh thần chiến binh sơ khởi, dũng cảm bước vào đấu trường. |
| 2 | **Bạc (Silver)** | — | `rank-silver.png` | **Đại Bàng Bạc** | Bạc 925 & bạch kim phay xước / Khiên tam giác dứt khoát | Tầm nhìn sắc bén, sự nhanh nhạy và đôi cánh vươn cao. |
| 3 | **Vàng (Gold)** | — | `rank-gold.png` | **Bò Tót Vàng** | Vàng ròng 24k cơ bắp nguyên khối / Khiên tam giác vàng | Sức mạnh kiên định, sự vững chãi và năng lượng hừng hực. |
| 4 | **Bạch Kim (Platinum)** | — | `rank-platinum.png` | **Sói Đầu Đàn** | Bạch kim sáng bóng + 1 rãnh vi mạch neon cyan / Khiên ngũ giác | Bản lĩnh thủ lĩnh, sắc lạnh và tư duy chiến thuật đỉnh cao. |
| 5 | **Lam Ngọc (Sapphire)** | **Bậc 1** | `rank-sapphire-1.png` | **Báo Săn Lam Ngọc** | Tinh thể Sapphire xanh hoàng gia / Khiên lục giác tinh thể | Tốc độ phản xạ thần tốc, dứt khoát trong từng câu hỏi. |
| 6 | | **Bậc 2** | `rank-sapphire-2.png` | **Hổ Xanh Lam Ngọc** | Tinh thể Sapphire gầm vang / Khiên lục giác tinh thể | Uy lực bộc phá mãnh liệt, áp đảo đấu trường. |
| 7 | **Lục Bảo (Emerald)** | **Bậc 1** | `rank-emerald-1.png` | **Sư Tử Hoàng Gia** | Ngọc Lục Bảo + vương miện vàng / Khiên bát giác Emerald-cut | Chúa sơn lâm làm chủ đấu trường, phong thái vương giả. |
| 8 | | **Bậc 2** | `rank-emerald-2.png` | **Bảo Tượng Hoàng Gia** | Ngọc Lục Bảo + đôi ngà ngọc & vương miện / Khiên bát giác Emerald-cut | Trí tuệ uyên bác, ký ức siêu phàm ("An Elephant Never Forgets"). |
| 9 | **Kim Cương (Diamond)** | **Bậc 1** | `rank-diamond-1.png` | **Kỳ Lân Pegasus Pha Lê** | Kim cương giác cắt tinh khiết / Khiên thoi kim cương (Rhombus) | Sự thuần khiết, thanh cao và khí phách kiêu hãnh. |
| 10 | | **Bậc 2** | `rank-diamond-2.png` | **Phượng Hoàng Pha Lê** | Kim cương tán sắc cầu vồng / Khiên giác cắt kim cương đa diện | Sự hoàn mỹ, bất tử và hào quang tỏa sáng rực rỡ. |
| 11 | **Đại Sư (Master)** | **Bậc 1** | `rank-master-1.png` | **Đại Pháp Sư Vũ Trụ** | Hắc diện thạch (Obsidian) & Vàng thần thoại / Vương Huy 8 cánh | Đỉnh cao tri thức nhân loại, làm chủ ma pháp ngôn từ. |
| 12 | | **Bậc 2** | `rank-master-2.png` | **Thần Long Phương Đông** | Rồng châu Á uốn lượn ngậm ngọc vũ trụ / Vương Huy 8 cánh | Linh khí trời đất, trí tuệ thần thánh và sự trường tồn. |
| 13 | | **Bậc 3** | `rank-master-3.png` | **Hắc Long Phương Tây** | Rồng khổng lồ sải cánh 4 chân thở lửa / Vương Huy 8 cánh | Đỉnh cao tối thượng của PvP Arena, biểu tượng kẻ bất bại! |

---

Để nhanh chóng có cái thử nghiệm thì ta sẽ phát triển 2 mode kia sau, hiện tại ta sẽ làm 1 mode trước thôi là việt anh, ta cho họ từ tiếng việt và chữ cái đầu tiên của từ tiếng anh, ta sẽ cho kí hiệu gạch chân để cho họ biết luôn là từ đó có mấy chữ cái (mỗi gạch chân là 1 từ). Các cấp bậc thì tôi muốn bậc đầu tiên là bronze, bỏ novice đi vì tôi muốn đồng bộ, tất cả đều là 1 loại đá quý/khoáng sản, trừ bậc cao nhất là master, ta sẽ bổ sung thêm 3 bậc: platinum (bạch kim) và sapphire (lam ngọc), emerald hoặc amethyst (thạch anh) (2 cái này bạn thấy cái nào hợp hơn), tôi không biết loại nào quý hơn nên bạn sắp xếp cấp bậc của chúng cho phù hợp nha. Về thời gian thì ta sẽ không giới hạn 5s cho 1 câu, ta sẽ cho họ 1 thời gian cụ thể cho cả bài như 5 phút, họ làm nhanh thì qua câu mới nhanh, làm chậm thì không hết được 20 câu. Về tính điểm thì ta so số câu đúng trước, nếu bằng nhau thì so đến thời gian, nếu vẫn huề nhau thì hoà (không có điểm nào). Về bảng xếp hạng thì bạn đề xuất ta tính bằng điểm riêng biệt với point trong wallet, vậy điểm này ta cũng sẽ tính giống level đúng không, đạt bao nhiêu thì sẽ lên rank, số điểm cộng thừa vẫn sẽ được cộng vào rank mới. Vậy cái leaderboard của ta bây giờ có lẽ chỉ thấy những người thuộc rank master thôi đúng không nhỉ, vì những người cao điểm nhất thì đồng nghĩa với việc là những người ở rank cao nhất mà đúng không haha. Sẵn tiện bạn có thể gợi ý cho tôi trang nào có từ vựng theo chủ đề không, còn độ khó thì làm sao ta biết được hay là trang web sẽ có để sẵn độ khó. Mà một từ thì có thể thuộc nhiều chủ để nữa nên ta cần sửa DB không. À ở các mức rank cao thì ngoài từ vựng thông thường ra sẽ có thêm tỉ lệ trúng idiom, collocation và cụm từ nữa nha (còn gì nữa không nhỉ), mà idiom thì có thể nó là một câu thành ngữ mà không liên quan đến chủ đề gì, nói đến đây tôi cũng có một băn khoăn và lung lay về ý tưởng random topic, đó là có những từ không thuộc chủ đề nào thì sao (ví dụ pollution thì ta có thể cho nó thuộc environment, còn các từ chung chung như manipulate, delay, postpone,... thì sao nhỉ), không thể nào họ học từ vựng mà chỉ có những từ của 1 topic không thôi, hay là những từ đó ta sẽ cho nó vào kiểu bài tập điền khuyết
Ta là backend trước vì frontend tôi cần cải tổ và cũng đã có sẵn ý tưởng rồi, sẽ trình bày với bạn sau.

Your suggest
Dạng câu hỏi trong Arena (mở rộng):

Thay vì chỉ "biết nghĩa từ" có thể có 2-3 mode:
* 🔤 Word → Meaning (tiếng Anh ra tiếng Việt)
* 📝 Fill in the blank (dùng example + 4 lựa chọn)
* 🇻🇳 Meaning → Word (tiếng Việt ra tiếng Anh)
cho giao diện nhập chữ từng ô (như Wordle), mỗi ô 1 chữ cái, ô đầu tiên đã điền sẵn. Vừa thân thiện vừa chống typo.

🌐 Nguồn từ vựng theo chủ đề + độ khó
Trang tôi thực sự khuyên dùng:

- Oxford Learner's Word Lists — Phân loại theo topic VÀ CEFR level sẵn, chính xác nhất cho mục đích này.
- Cambridge English Vocabulary Lists — Cũng có CEFR.
- Vocabulary.com — Có difficulty score cho từng từ, rất tiện.
IELTS Vocabulary by topic (British Council) — Phân chia theo topic chuẩn IELTS.
Về độ khó: Oxford và Cambridge đã map sẵn CEFR (A1→C2) cho từng từ, không cần tự đánh giá. Bạn chỉ cần tra và nhập.

🤔 Từ "chung chung" không có topic (manipulate, delay, postpone...)
Đây là câu hỏi hay nhất và tôi đồng ý là ý tưởng "chỉ random topic" có lỗ hổng. Giải pháp tôi đề xuất: 2 loại topic đặc biệt:

- general — Từ như manipulate, delay, postpone, establish... (thường = Academic Word List). Áp dụng cho mọi trận đấu bất kể topic được chọn là gì.
- academic — Academic collocation, phrase kiểu "carry out research", "draw a conclusion"...