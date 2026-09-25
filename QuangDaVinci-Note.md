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


Nháp:
Ý tưởng Gamification của tôi
Mỗi ngày có 3 nhiệm vụ hàng ngày (ta sẽ thiết kế một bảng nhiệm vụ gồm 3 card, mỗi card miêu tả 1 nhiệm vụ, có thể là sẽ có một nút để người dùng ấn vô xem nhiệm vụ hàng ngày, thời gian còn lại để thực hiện, hoàn thành hay chưa), hoàn thành nhiệm vụ hàng ngày (có lẽ là goal mà bạn nói) thì sẽ được coin, exp. 
Coin: dùng để mua avatar, đóng băng chuỗi,.. tôi không biết ta thiết kế cái vòng tròn avatar như nào và kiếm ảnh như nào để có thể thiết kế cái khung avatar, bạn có thể gợi ý không, nhưung khi ấn vào trang profile thì ngoài avatar ta sẽ có ảnh bìa (như facebook) và có thể mua ảnh bìa trong store luôn. và tôi sẽ kiếm ảnh sao cho nó có bộ đôi với nhau, như avatar cá heo thì có ảnh bìa biển, avatar lạc đà sẽ có ảnh bìa sa mạc,... và có thể sau này tôi thiết kế 1 trang giao diện gọi là bộ sưu tập để người dùng xem là mình đã sở hữu bao nhiêu bộ giao diện rồi
Exp: có được khi hoàn thành nhiệm vụ hàng ngày, khi chơi thắng pvp arena. Trong profile mốt ta sẽ thiết kế 1 thanh level, tích exp để lên level như các trò chơi, và mỗi level sẽ có thưởng phần thưởng là 1 cặp avatar - ảnh bìa (thứ mà không mua được ở store), hoặc có thể là có những món trong store bị khoá, chỉ khi đạt level nào đó mới mua được. Lý do mà tôi có ý định tạo 1 trang bộ sưu tập thay vì là mục "My items" trong store là vì mục đó chứa những thứ mình đã mua, còn có những thứ mình được thưởng khi lên level thì không phải là đã mua, và bộ sưu tập chỉ riêng về sưu tập thôi, như ảnh avatar, ảnh bìa, trông đẹp và vip hơn ảnh mua trong của hàng
Point: là điểm để xếo rank, chỉ có khi chiến thắng người khác ở đấu trường, và có hệ thống xếp hạng (tính sau) nhưng hiện tại thì chỉ cần xếp hạng theo top ví dụ top1, top2 toàn cầu thôi.
Achievement thì như bạn nói, là mấy cái nhiệm vụ nhưng là nhiệm vụ dài kì, là hoàn thành 50 bài học,... à ta cũng nên xem xét tính chuỗi trận thắng cho người dùng nữa, nó cũng dùng làm thành tựu được, và vì cái này phải tốn công sức lâu dài để làm nên phần thường cũng phải xứng đáng hơn, ngoài nhiều tiền coin ra thì ta có thể đẻ thêm 1 loại tiền tệ nữa là kim cương chẳng hạn, để mua mấy thứ vip hơn haha. Ta phân loại thưởng như sau
Thắng pvp: exp để lên level, point để lên hạng, coin
Hoàn thành nhiệm vụ hàng ngày: coin, exp
nhiệm vụ dài kỳ: coin, kim cương
point là để xếp hạng nên chỉ có khi đấu tranh mới có point để lên hạng chứ làm nhiệm vụ thì không có point
Rồi vậy là tôi đã lên ý tưởng về coin, kim cương, point, exp, thành tựu (achievement), còn thiếu gì nữa không nhỉ, bạn thấy ý tưởng này thế nào

Trả lời câu hỏi của bạn
1. PvP là nơi đấu tranh, cạnh tranh với nhau nên họ cần bảng xếp hạng để thi đua với nhau, ta nên tách biệt bxh này, không thể làm nhiêm vụ khác mà cũng được point lên rank, còn nếu không đấu pvp thì họ có thể thi đua với nhau ở level rồi, mà level thì ngoài kiếm exp từ pvp họ có thể kiếm exp từ nhiệm vụ hàng ngày và dài kỳ. Như bạn góp ý thì ta cũng có thể thêm cái streak leaderboard nữa, những nó không mang tính ganh đua ai học giỏi hơn, vì chỉ cần ai dùng web này trước thì sẽ có chuỗi dài hơn, và cũng sẽ có thành tựu dài kỳ là đạt chuỗi 30,60,...
2. Haha tôi hơi "quê" rồi vì nhầm level và lever, tôi đã chỉnh lại các từ trong file md thành level hết rồi. Level sẽ là do người dùng học lâu, học nhiều thì sẽ được level cao, như chơi game vậy á, level cao chứng tỏ kì cựu, và có bộ sưu tập đồ sộ, cứ lên level mới thì có đồ mới. Còn hạng như đồng bạc bạn nói thì giống như nên để nó ở pvp hơn, ví dụ ta sẽ có bao nhiêu điểm đến bao nhiêu điểm là rank đồng, và trong mỗi bậc rank sẽ có thứ hạng top 1, top 2,.. nhưng cái đó để cải thiện sau, hiện tại thì chỉ có xếp hạng con số thôi
3. Tôi quên mất vấn đề lưu ảnh, vì mỗi level đều có phần phưởng nên ta sẽ cần rất nhiều ảnh, mà lưu hết vào database của ta thì nó sẽ khổng lồ đúng không, thay vì ta chỉ cần lưu url ảnh nhưng nếu lưu url thì có nghĩa là ta dùng ảnh của nơi khác đúng không, nhưng đây là web riêng của ta nên tôi muốn dùng AI generate ảnh cho nó thuộc về chỉ web của ta thôi. Tôi cũng chưa biết sẽ dùng công cụ gì để generate ảnh nữa, gợi ý của bạn như nào
Bonus: Giao diện "bộ sưu tập" mà tôi nói thì nó chỉ hiện những thứ mà người chơi được thưởng, thường đi theo cặp (avatar + ảnh bìa), có thể là level 2 ta được ảnh con cá, level 3 ta được ảnh bìa đại dương. Ta sẽ thưởng theo bộ đôi và chủ đề, Có thể 1 collection không chỉ chứa 1 avatar và 1 ảnh bìa, có thể là ví dụ Collection Sa Mạc sẽ có avatar con lạc đà, cây xương rồng, người du mục, ảnh bìa sẽ có bãi cát, kim tự tháp, ngôi đền, vậy là collention đó có tới 6 món. Và mốt ta cũng sẽ có thành tự là "mở khoá đầy đủ 3 bộ sưu tập",... Còn trong store thì avatar và ảnh bìa nó sẽ không cần theo chủ đề, nó thập cẩm. và đã setup ảnh bìa như vậy rồi thì có lẽ ta không cần cái vật phẩm "Khung avatar" nữa nhỉ, và tôi cũng không biết code nó sao haha. Khi ghép trận thành công trên pvp thì ta sẽ hiển thị người chơi với tên, level, hạng (có thể ẩn tuỳ vào người chơi chọn), avatar và ảnh bìa luôn để người chơi có cái "flex". Hai người chơi 2 bên với avatar và ảnh bìa, ở giữa sẽ là chữ "vs", sau đó bắt đầu vào trận đấu. Ta cũng thống nhất cách gọi tên bộ sưu tập là gì được nhỉ, có thể là collection hoặc album, hay bundles (ví dụ collection desert, albulm forest, bundles deep sea,..) bạn thấy thế nào ^^! 

🏜️ Collection 1: Kẻ Du Mục Sa Mạc (Desert Nomads)
Đây là vùng đất khởi đầu, khô cằn nhưng ẩn chứa sức sống mãnh liệt.

Cặp 1 (Cơ bản): Lạc đà (Camel) — Ốc đảo xanh mát giữa biển cát (Desert Oasis).
Cặp 2: Cáo Fennec tai to (Fennec Fox) — Đồi cát vàng ươm kéo dài bất tận dưới ánh hoàng hôn (Golden Dunes at Sunset).
Cặp 3: Rắn đuôi chuông (Rattlesnake) — Hẻm núi đá đỏ khô cằn (Red Rock Canyon).
Cặp 4 (Siêu hiếm): Đại bàng sa mạc (Desert Falcon) — Tàn tích đền thờ cổ đại bị bão cát vùi lấp một nửa (Sand-buried Ancient Ruins).
🌊 Collection 2: Đại Dương Sâu Thẳm (Deep Ocean)
Chủ đề khám phá từ mặt nước xuống tận đáy biển sâu.

Cặp 1 (Cơ bản): Rùa biển (Sea Turtle) — Rạn san hô rực rỡ dưới ánh nắng (Coral Reef).
Cặp 2: Cá voi xanh (Blue Whale) — Khung cảnh: Mặt biển mở (Open Sea) đang dậy sóng, xa xa là một bầu trời bão táp vĩ đại (Dramatic Stormy Sky). Cá voi thường ngoi lên mặt nước, nên khung cảnh mặt biển hùng vĩ sẽ cực kỳ hợp lý!
Cặp 3: Cá heo (Dolphin) — Rừng tảo bẹ khổng lồ dưới đáy biển lấp lánh tia nắng mặt trời (Kelp Forest).
Cặp 4 (Siêu hiếm): Sứa phát sáng (Bioluminescent Jellyfish) — Rãnh đại dương sâu thẳm, đen kịt nhưng được thắp sáng bởi hàng ngàn rặng san hô sinh học (Abyssal Trench).
🌲 Collection 3: Thâm Sơn Cùng Cốc (Mystic Jungle) - MỚI
Một khu rừng nhiệt đới đầy bí ẩn và hoang dã.

Cặp 1 (Cơ bản): Vẹt Macaw (Macaw) — Vòm cây cổ thụ rậm rạp đâm xuyên tầng mây (Canopy of Ancient Trees).
Cặp 2: Ếch phi tiêu độc (Poison Dart Frog) — Thảm thực vật nhiệt đới với những cây nấm khổng lồ, sặc sỡ (Giant Flora).
Cặp 3: Hổ vằn Bengal (Bengal Tiger) — Một thác nước hùng vĩ giấu mình sâu trong rừng rậm (Hidden Jungle Waterfall).
Cặp 4 (Siêu hiếm): Báo đen (Black Panther) — Ngôi đền cổ của người Maya/Inca bị rễ cây cổ thụ nuốt chửng (Overgrown Mayan Temple).
❄️ Collection 4: Kỷ Băng Hà (Arctic Tundra) - MỚI
Thế giới của tuyết trắng, băng giá và những hiện tượng kỳ ảo.

Cặp 1 (Cơ bản): Chim Cánh Cụt (Penguin) — Vách băng khổng lồ sừng sững trên mặt biển (Giant Ice Cliffs).
Cặp 2: Cú Tuyết (Snowy Owl) — Cánh đồng tuyết trắng xóa bất tận dưới bầu trời đêm (Endless White Tundra).
Cặp 3: Chó Husky/Malamute — Rừng thông phủ đầy tuyết trắng xóa (Snowy Pine Forest).
Cặp 4 (Siêu hiếm): Sói Tuyết (Arctic Wolf) — Đỉnh núi tuyết rực sáng dưới dải ánh sáng Cực quang (Aurora Borealis).
🔮 Collection 5: Vương Quốc Pha Lê (Crystal Caverns) - Gợi ý viễn tưởng
Để dành cho những Level siêu cao, mang hơi hướng Fantasy.

Cặp 1 (Cơ bản): Kỳ Giông (Axolotl) — Sông ngầm thạch anh tím (Amethyst Underground River).
Cặp 2: Dơi Bạch Tạng (Albino Bat) — Vòm hang động lấp lánh tinh thể lưu huỳnh vàng (Yellow Sulfur Cave Vault).
Cặp 3: Cua Đá Mù (Blind Cave Crab) — Rừng cột thạch nhũ pha lê khổng lồ chĩa từ dưới lên (Crystal Stalagmite Forest).
Cặp 4 (Siêu hiếm): Thằn Lằn Dung Nham (Lava Salamander) — Hồ dung nham xanh rực sáng dưới đáy hang (Glowing Blue Lava Lake).

☁️ Collection 6: Bầu Trời (Sky Realm)
Môi trường của mây trắng, các tầng không khí, bão tố và ánh sáng mặt trời.

Cặp 1 (Tier 1): Chim Nhạn (Swallow) — Những đám mây trắng xốp bồng bềnh (Fluffy Cumulus Clouds).
Cặp 2 (Tier 2): Bồ Nông (Pelican) — Quần đảo lơ lửng trên không trung (Floating Islands).
Cặp 3 (Tier 3): Đại bàng hói (Bald Eagle) — Biển mây rực rỡ dưới ánh hoàng hôn (Sunset Sea of Clouds).
Cặp 4 (Tier 4 - Siêu Hiếm): Chim Cắt Lớn (Peregrine Falcon - sinh vật nhanh nhất hành tinh) — Tâm bão sét với những đám mây đen cuồn cuộn cuộn xoáy (Eye of a Thunderstorm).

🐊 Collection 7: Đầm Lầy (Misty Swamplands)
Môi trường hoang dã, ẩm ướt, đầy sương mù, bí ẩn và rêu phong.

Cặp 1 (Tier 1): Cò Trắng (Egret) — Cánh đồng cỏ lau bên bờ lạch (Reed Field).
Cặp 2 (Tier 2): Rùa Cá Sấu (Snapping Turtle) — Rừng ngập mặn với hệ thống rễ cây đan chằng chịt (Mangrove Roots).
Cặp 3 (Tier 3): Cóc Khổng Lồ (Goliath Frog) — Khu đầm lầy âm u phủ kín sương mù dày đặc (Misty Swamp).
Cặp 4 (Tier 4 - Siêu Hiếm): Cá Sấu Mõm Ngắn (Alligator / Crocodile) — Tàn tích một chiếc thuyền hơi nước hoen gỉ bị bỏ hoang giữa đầm lầy rêu phong (Abandoned Sunken Steamboat).

Collection 6: Bầu trời (chim ưng)
Collection 7: Đầm lầy (Hà mã, trâu đầm lầy)

* Ý tưởng thiết kế giao diện
1. Màn hình Chính (Trang Achievement / Gallery)
- Layout Lưới (Grid): Thay vì danh sách dài gồm thập cẩm các avatar, cover trong trang Achievement, chúng ta sẽ có một lưới các Card chữ nhật, mỗi card có hình của 1 tấm cover đại diện cho cái collection đó, 1 hàng có thể có 3,4 card tuỳ vào độ rộng của màn hình.
- Visual Card: Background của Card dùng 1 tấm Cover đặc trưng của collection (ví dụ: bãi cát cho sa mạc) và để tên của collection đó vào chính giữa card. Ta phủ một lớp mờ màu đen (Linear Gradient overlay từ dưới lên) để phần Text (Collection 1: Desert Survival) nổi bật hẳn lên.
- Tiến độ (Progress Bar): Nằm gọn gàng ở cạnh dưới của Card (vd: Thanh tiến trình lấp đầy 50%, ghi chú Đã thu thập: 4/8).
- Hiệu ứng Hover: Khi người dùng di chuột (Hover) vào Card, tấm ảnh nền bên dưới sẽ hơi zoom nhẹ lên (Scale 1.05) và viền Card phát sáng (có lẽ đây là lúc ta dùng theme_color để gán màu cho hào quang ở viền phát sáng)

2. Màn hình Chi Tiết (Khi bấm vào 1 Collection Card)
- Giao diện sẽ chuyển cảnh (hoặc mở ra 1 Modal lớn) tập trung hoàn toàn vào Collection đó.
- Bên trong này, chúng ta sẽ dùng lại thiết kế 4 Hàng (4 Cặp Avatar + Cover, cứ 1 avatar tương ứng với 1 cover như lạc đà - ốc đảo).
=> Khung lưới này sau này có chứa đến 50 Collection thì cũng chỉ cuộn mất 2-3 trang màn hình là cùng, không phải là khi vào trang achievement là thấy 1 đống avatar và cover lộn xộn, lướt hoài không hết

3. Xử lý phần Ảnh chưa mở khóa (The Tease)
Chúng ta không cần phải lưu 2 phiên bản ảnh (1 rõ, 1 mờ) trong database đâu. Ta sẽ dùng thẳng sức mạnh của CSS Filters để xử lý trực tiếp trên frontend:
- Hiệu ứng "Bóng Đêm Sương Mù": Ta sẽ mix 3 bộ lọc: grayscale(100%) (chuyển thành đen trắng) + brightness(40%) (làm tối đi) + blur(4px) (làm mờ). Kết quả là người dùng sẽ thấy một cái bóng đen mờ mờ ảo ảo của sinh vật, cực kỳ bí ẩn và nghệ thuật!
4. Icon Ổ Khóa (The Lock)
- Avatar và Cover nào chưa mở khoá thì ngoài làm mờ nó đi thì ta cũng chèn thêm 1 icon biểu thị là đang khoá, ta dùng icon của thư viện lucide-react