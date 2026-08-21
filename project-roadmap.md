# KẾ HOẠCH DỰ ÁN (ROADMAP 10 TUẦN)


## 1. CHIẾN LƯỢC CƠ SỞ DỮ LIỆU (POLYGLOT PERSISTENCE)

Hệ thống kết hợp sức mạnh của RDBMS và NoSQL. Việc chọn DB phụ thuộc vào bản chất dữ liệu:

*   **MySQL (Dữ liệu quan hệ, cần tính ACID cao & cấu trúc chặt chẽ):**
    *   **Users & Auth:** Thông tin người dùng, mật khẩu (hash), lịch sử đăng nhập.
    *   **Billing & Store:** Giao dịch mua sắm, số dư xu (Coins), túi đồ (Inventory).
    *   **Core Metadata:** Danh mục Khóa học (Courses), Bài học (Lessons), cấu trúc cây kỹ năng, định nghĩa Thành tựu (Achievements).
    *   **Social Connections:** Danh sách bạn bè (Friends), hệ thống Follow.
*   **MongoDB (Dữ liệu phi cấu trúc, Big Data, cần tốc độ & schema linh hoạt):**
    *   **Learning Analytics:** Logs học tập của User, thời gian học (Study Sessions), dữ liệu tính toán Đường cong quên lãng (Forgetting Curve).
    *   **User-Generated Content (UGC):** Dữ liệu Flashcards, Decks, Nội dung từ Creator Studio (vì schema bài học người dùng tự tạo rất linh hoạt).
    *   **Social & Real-time:** Nội dung Post/Comment trong Community, Lịch sử chat, Logs trận đấu PvP Arena.

---

## 2. CHIẾN LƯỢC CHỐNG CONFLICT (ZERO-CONFLICT WORKFLOW)

Để đảm bảo 2 Dev (A và B) code song song mà không dẫm chân lên nhau (Git conflict):
1.  **Giao tiếp API (API Contract First):** Sáng Thứ Hai hàng tuần, 2 Dev bắt buộc họp 1 tiếng để thống nhất JSON schema (Request/Response) cho các tính năng trong Sprint. Đẩy lên Postman/Swagger trước khi viết bất kỳ dòng code logic nào.
2.  **Chia dọc theo Feature (Vertical Slicing):** Mỗi Dev tự bao thầu toàn bộ luồng của một tính năng (từ thiết kế DB -> viết API backend -> móc API vào UI frontend).
3.  **Cô lập File (File Isolation):** Mỗi người làm việc trên các View, Controller, và Route hoàn toàn khác nhau. Nếu cần tái sử dụng một UI Component chung, phải thông báo và người kia sẽ `git pull` trước khi dùng.

---

## 3. LUỒNG GIT & DOCKER

**Luồng Git (Git Flow):**
*   `main`: Code ổn định, sẵn sàng deploy (chỉ merge vào tuần 10).
*   `develop`: Nhánh tích hợp chính. 
*   `feature/<tên-tính-năng>` (VD: `feature/auth-login`, `feature/course-list`): Dev tự tạo nhánh từ `develop`. Hoàn thành tính năng phải tạo Pull Request (PR) để người kia Review Code trước khi merge vào `develop`.

**Docker Workflow:**
*   Dùng `docker-compose.yml` tạo 4 container: `frontend` (Vite), `backend` (Node.js), `mysql`, `mongodb`.
*   Local Dev chỉ cần chạy `docker-compose up -d` là có đủ môi trường giống hệt nhau, không lỗi vặt về phiên bản OS/Node.

---

## 4. LỘ TRÌNH CHI TIẾT 10 SPRINT (TUẦN 1 - TUẦN 10)

### TUẦN 1: Nền Tảng (Infrastructure) & Module Xác Thực (Auth)
*   **🎯 Mục tiêu Sprint:** Môi trường dev sẵn sàng, hoàn thiện luồng đăng nhập/đăng ký. Bổ sung UI Auth còn thiếu.
*   **🧑‍💻 Dev A (Setup & Register):**
    *   *Backend:* Thiết lập `docker-compose.yml` (MySQL, Mongo, Redis). Viết API `POST /api/v1/auth/register` và `POST /api/v1/auth/forgot-password`. Tạo bảng `Users` (MySQL).
    *   *Frontend:* Thiết kế và code UI màn hình Đăng ký / Quên mật khẩu.
*   **👨‍💻 Dev B (Login & Middleware):**
    *   *Backend:* Cấu hình Swagger/Postman. Viết API `POST /api/v1/auth/login`, `GET /api/v1/auth/me`. Viết JWT Middleware để bảo vệ Route.
    *   *Frontend:* Thiết kế và code UI màn hình Đăng nhập. Cấu hình Axios/Fetch instance để đính kèm Token.
*   **🔗 Điểm giao tiếp:** Test luồng tạo tài khoản mới -> Đăng nhập thành công -> Lưu token vào Cookie/LocalStorage -> Gọi API `me` lấy thông tin user.

### TUẦN 2: Dashboard & Lõi Theo Dõi Tiến Độ
*   **🎯 Mục tiêu Sprint:** Giao diện Dashboard hiển thị thông số thật và biểu đồ Đường cong quên lãng (Memory Retention).
*   **🧑‍💻 Dev A (Quick Stats):**
    *   *Backend:* Collection `StudySessions` (Mongo). API `GET /api/v1/dashboard/stats` (Tính toán số giờ học, số bài, level).
    *   *Frontend:* Sửa `DashboardView.tsx`, thay thế mock data ở phần "Quick Stats" bằng dữ liệu API.
*   **👨‍💻 Dev B (Forgetting Curve):**
    *   *Backend:* Collection `RetentionLogs` (Mongo). API `GET /api/v1/dashboard/retention`.
    *   *Frontend:* Xử lý logic truyền dữ liệu API vào component `RetentionChart` (trong `DashboardView.tsx`).
*   **🔗 Điểm giao tiếp:** Hiển thị Dashboard hoàn chỉnh, đảm bảo DB response khớp với interface `RetentionPoint` ở UI.

### TUẦN 3: Khóa Học (Courses) & Bài Học
*   **🎯 Mục tiêu Sprint:** Hoàn thiện luồng duyệt khóa học, bắt đầu học và ghi nhận tiến độ bài học.
*   **🧑‍💻 Dev A (Catalog & Overview):**
    *   *Backend:* Bảng `Courses`, `Lessons` (MySQL). API `GET /api/v1/courses`, `GET /api/v1/courses/:id`.
    *   *Frontend:* Đổ dữ liệu vào `CoursesView.tsx` (danh sách khóa học) và "Current Courses" ở Dashboard.
*   **👨‍💻 Dev B (Lesson Execution):**
    *   *Backend:* Bảng `UserProgress` (MySQL). API `POST /api/v1/lessons/:id/complete`.
    *   *Frontend:* Code logic bấm "Start" bài học, làm bài xong cập nhật thanh Progress (thanh % màu xanh).
*   **🔗 Điểm giao tiếp:** Click vào 1 khóa học -> Học 1 lesson -> Về Dashboard thấy Progress bar tăng lên.

### TUẦN 4: Flashcards & Hệ thống Lặp Lại Ngắt Quãng (SRS)
*   **🎯 Mục tiêu Sprint:** Tính năng ôn tập từ vựng lõi bằng thuật toán SRS.
*   **🧑‍💻 Dev A (Deck Management):**
    *   *Backend:* Collection `Decks`, `Cards` (Mongo). Các API CRUD bộ thẻ.
    *   *Frontend:* Gắn API vào `FlashcardsView.tsx` (Hiển thị list Decks, số lượng card).
*   **👨‍💻 Dev B (SRS Algorithm):**
    *   *Backend:* Collection `CardReviews` (Mongo). Viết thuật toán SRS tính toán ngày ôn tập kế tiếp. API `POST /api/v1/reviews`.
    *   *Frontend:* UI lật thẻ nhớ, bấm chọn độ khó (Dễ/Khó), gửi API review.
*   **🔗 Điểm giao tiếp:** Dev A tạo Card mới -> Dev B vào ôn tập Card đó -> Ngày hôm sau hệ thống mới bắt ôn lại.

### TUẦN 5: Shadowing (Luyện Âm) & Luyện Tập (Practice)
*   **🎯 Mục tiêu Sprint:** Tương tác với Media (Audio) và làm trắc nghiệm.
*   **🧑‍💻 Dev A (Shadowing Module):**
    *   *Backend:* Collection `AudioTracks` (Mongo) chứa URL file audio và mảng phụ đề (subtitles).
    *   *Frontend:* Cập nhật `ShadowingView.tsx`, làm tính năng Audio Player có sync text (Karaoke effect).
*   **👨‍💻 Dev B (Practice Exercises):**
    *   *Backend:* Collection `Questions` (Mongo). API `GET /api/v1/practice`, `POST /api/v1/practice/submit`.
    *   *Frontend:* Cập nhật `PracticeView.tsx`, xử lý UI cho các dạng bài (Trắc nghiệm, Điền từ).
*   **🔗 Điểm giao tiếp:** Dev A play audio thành công, Dev B submit bài tập trả về điểm đúng/sai chuẩn xác.

### TUẦN 6: Luyện Thi (Exam) & Cộng Đồng (Community)
*   **🎯 Mục tiêu Sprint:** Thi thử và tương tác với các User khác qua Feed.
*   **🧑‍💻 Dev A (Exam Prep):**
    *   *Backend:* Bảng `Exams`, `ExamResults` (MySQL). Tính giờ đếm ngược server-side.
    *   *Frontend:* Cập nhật `ExamView.tsx`, giao diện làm bài thi full-screen, chấm điểm IELTS/TOEIC.
*   **👨‍💻 Dev B (Community Forum):**
    *   *Backend:* Collection `Posts`, `Comments` (Mongo). API Feed.
    *   *Frontend:* Cập nhật `CommunityView.tsx`, tạo UI Post bài mới, comment, like.
*   **🔗 Điểm giao tiếp:** Dev A chia sẻ kết quả điểm thi (từ Exam) thẳng lên bài viết trên Community của Dev B.

### TUẦN 7: Đấu Trường PvP (Arena - Socket.io)
*   **🎯 Mục tiêu Sprint:** Thi đấu Real-time giữa các học viên.
*   **🧑‍💻 Dev A (Matchmaking & Lobby):**
    *   *Backend:* Setup Socket.io. Viết logic Hàng đợi (Queue), Room creation. Collection `ArenaMatches` (Mongo).
    *   *Frontend:* Cập nhật `ArenaView.tsx`, logic tìm trận (Finding opponent...), đếm ngược chờ kết nối.
*   **👨‍💻 Dev B (Real-time Gameplay):**
    *   *Backend:* Logic Socket `submit_answer`, `update_score`, Broadcast điểm số realtime.
    *   *Frontend:* Giao diện chọn đáp án nhanh, thanh máu/điểm số nhảy realtime cho cả 2 bên.
*   **🔗 Điểm giao tiếp:** Hai dev mở 2 trình duyệt khác nhau -> Tìm trận -> Cùng chơi và ra kết quả Thắng/Thua.

### TUẦN 8: Cửa Hàng (Store) & Thành Tựu (Achievements)
*   **🎯 Mục tiêu Sprint:** Kinh tế ảo (Gamification) và giữ chân người dùng.
*   **🧑‍💻 Dev A (Store Economy):**
    *   *Backend:* Bảng `Items`, `UserInventory` (MySQL). API mua hàng, trừ Coins (cần dùng Transaction để tránh lạm phát).
    *   *Frontend:* Cập nhật `StoreView.tsx`, hiển thị vật phẩm, click Mua và thay đổi số Coins ở Header.
*   **👨‍💻 Dev B (Achievements & Badges):**
    *   *Backend:* Bảng `Achievements`, `UserAchievements` (MySQL). API quét điều kiện nhận huy hiệu.
    *   *Frontend:* Cập nhật `AchievementsView.tsx`, UI Popup nhận thưởng.
*   **🔗 Điểm giao tiếp:** Mua vật phẩm (Dev A) -> Thỏa mãn điều kiện tiêu 1000 xu -> Unlocked Badge "Phú Ông" (Dev B).

### TUẦN 9: Creator Studio & Hệ thống Bạn bè (Friends)
*   **🎯 Mục tiêu Sprint:** Hoàn thiện UGC và tính năng Notification.
*   **🧑‍💻 Dev A (Creator Studio):**
    *   *Backend:* Các API cho phép User tự upload Courses/Flashcards cá nhân (Lưu vào Mongo).
    *   *Frontend:* Cập nhật `CreatorStudioView.tsx`, form tạo bài học phức tạp (Draft mode).
*   **👨‍💻 Dev B (Friends & Notifications):**
    *   *Backend:* Bảng `Friendships` (MySQL), Cấu trúc Notification (Mongo).
    *   *Frontend:* Gắn API vào `FriendsPanel` (thanh bên phải) và `NotificationPopover` ở top header. Realtime nhắc nhở.
*   **🔗 Điểm giao tiếp:** Dev A xuất bản khóa học -> Dev B (là bạn bè) nhận được Notification.

### TUẦN 10: Testing, Bug Fixing, Tối Ưu & Deployment
*   **🎯 Mục tiêu Sprint:** Hoàn thiện sản phẩm ở mức sẵn sàng cho Production.
*   **🧑‍💻 Dev A (Frontend & DevOps):**
    *   Viết E2E Testing bằng Cypress.
    *   Build Vite cho Production. Cấu hình Nginx reverse proxy trong file `docker-compose.prod.yml`.
*   **👨‍💻 Dev B (Backend & Security):**
    *   Đánh Index cho các bảng MySQL và collection Mongo để chống lag.
    *   Setup Sentry/Datadog để track error. Review bảo mật API (Rate limiting, Helmet).
*   **🔗 Điểm giao tiếp:** Deploy toàn bộ lên Staging Server (AWS/DigitalOcean). Thực hiện test chéo toàn diện luồng (từ Đăng ký đến Mua đồ, Chơi PvP). Fix mọi Bug P1 & P2.




 📅 LỘ TRÌNH 10 SPRINT CHI TIẾT (TẬP TRUNG VÀO 3 TRỤ CỘT)

### SPRINT 1: Nền tảng Core & Hệ thống Auth
*   **🎯 Mục tiêu:** Móng nhà vững chắc, Dockerize toàn bộ (Node, MySQL, Mongo, Redis).
*   **🧑‍💻 Dev A:** Cấu hình Docker Compose (4 services). Xây dựng API và UI cho màn hình Đăng ký, Quên mật khẩu.
*   **👨‍💻 Dev B:** Cấu hình Swagger. Xây dựng API và UI Đăng nhập, JWT Middleware (Lưu HttpOnly Cookie để bảo mật).

### SPRINT 2: "BỘ NÃO" SRS (SPACED REPETITION SYSTEM) 🧠
*   **🎯 Mục tiêu:** Xây dựng thuật toán lặp lại ngắt quãng cốt lõi - Trái tim của hệ thống Flashcard.
*   **🧑‍💻 Dev A (Thuật toán Backend):** Thiết kế collection `CardReviews`. Viết thuật toán toán học (FSRS/SM-2) tính toán các chỉ số: `ease_factor`, `interval`, và trả về danh sách thẻ `due_cards` (thẻ đến hạn ôn).
*   **👨‍💻 Dev B (Trải nghiệm Frontend):** Xây dựng UI Flashcards. Code Animation lật thẻ 3D mượt mà bằng `framer-motion`. Tích hợp 4 nút (Again, Hard, Good, Easy) và nối API để update độ khó của thẻ.
*   **🔥 Điểm nhấn:** Animation lật bài mượt như Tinder, thuật toán trả về chính xác ngày ôn tiếp theo cho từng thẻ.

### SPRINT 3: TÍCH HỢP AI CHẤM ĐIỂM PHÁT ÂM (SHADOWING) 🤖
*   **🎯 Mục tiêu:** Biến tính năng Shadowing thành gia sư phát âm.
*   **🧑‍💻 Dev A (AI Integration):** Tích hợp Whisper API/Google Speech-to-Text. Nhận file âm thanh từ Frontend -> Gửi lên AI -> Nhận text và độ tự tin (confidence score) -> Chấm điểm (0-100) và highlight từ phát âm sai.
*   **👨‍💻 Dev B (Voice UI/UX):** Code giao diện thu âm, hiển thị Waveform (sóng âm) trực tiếp bằng Web Audio API. Viết logic hiển thị kết quả AI (Tô màu Xanh/Đỏ cho từng từ theo điểm số).
*   **🔥 Điểm nhấn:** User thu âm xong, sau 1-2 giây hệ thống chỉ đích danh từ nào đọc sai và phát âm mẫu lại từ đó.

### SPRINT 4: DASHBOARD & TRỰC QUAN HÓA "ĐƯỜNG CONG QUÊN LÃNG" 📊
*   **🎯 Mục tiêu:** Cho User thấy hệ thống SRS đang hoạt động hiệu quả thế nào để tạo động lực.
*   **🧑‍💻 Dev A (Data Aggregation):** Viết logic API tổng hợp dữ liệu từ MongoDB để tính toán: Tỉ lệ nhớ thực tế (Actual Retention) so với Không ôn tập (Forgetting Curve).
*   **👨‍💻 Dev B (Data Visualization):** Sử dụng `Recharts` hoặc `D3.js` để code biểu đồ "Memory Retention" sinh động. Biểu đồ phải thay đổi theo thời gian thực dựa vào số lượng thẻ user đã ôn.

### SPRINT 5: HỌC TẬP CƠ BẢN & AI TRỢ LÝ NGỮ PHÁP 🤖
*   **🎯 Mục tiêu:** Cấu trúc khóa học tĩnh và AI Chatbot hỗ trợ khi làm bài sai.
*   **🧑‍💻 Dev A (AI Grammar Backend):** Xây dựng API tích hợp ChatGPT. Khi user chọn sai một câu trắc nghiệm ngữ pháp, gửi Context lên AI để lấy câu giải thích (Ví dụ: "Tại sao ở đây dùng has been mà không phải is?").
*   **👨‍💻 Dev B (Course UI & AI Widget):** Làm luồng duyệt khóa học. Code một UI Popover "Hỏi AI" xuất hiện mỗi khi làm bài tập, render câu trả lời dạng stream (từng chữ một giống ChatGPT).
*   **🔥 Điểm nhấn:** User không bao giờ bị kẹt khi học. Luôn có AI giải thích lỗi sai ngay tại chỗ.

### SPRINT 6: ĐẤU TRƯỜNG PvP - LÕI REAL-TIME & MATCHMAKING ⚔️
*   **🎯 Mục tiêu:** Hệ thống Socket.io nền tảng, đảm bảo không có độ trễ (Zero-latency feel).
*   **🧑‍💻 Dev A (Hệ thống Hàng đợi - Queue):** Dùng Redis lập trình thuật toán Matchmaking theo ELO Rank (Ghép 2 người có trình độ ngang nhau trong vòng tối đa 10 giây). Quản lý Socket Rooms.
*   **👨‍💻 Dev B (Lobby Animation):** Thiết kế màn hình "Finding Opponent" cực kỳ kịch tính (radar quét, đồng hồ đếm ngược), hiệu ứng "VSSSSS" khi tìm thấy đối thủ hiển thị avatar 2 bên.

### SPRINT 7: ĐẤU TRƯỜNG PvP - GAMEPLAY & COMBAT LÕI ⚔️
*   **🎯 Mục tiêu:** Biến bài kiểm tra thành một trận game đối kháng căng thẳng.
*   **🧑‍💻 Dev A (Game Server):** Validation đáp án chống hack (Server authoritative). Tính điểm số dựa trên tốc độ trả lời (nhanh được nhiều điểm, Combo x2 x3), đồng bộ máu (HP) hai bên.
*   **👨‍💻 Dev B (Game Client):** Nhận event từ Socket. Code hiệu ứng nổ tung (Particle effects), giật màn hình khi bị trừ máu, thanh Combo bốc cháy khi trả lời đúng liên tiếp.
*   **🔥 Điểm nhấn:** Tốc độ đồng bộ cực cao. Cảm giác đánh trúng đối thủ qua âm thanh và hình ảnh mạnh mẽ (Gamification đỉnh cao).

### SPRINT 8: CỬA HÀNG (STORE), KINH TẾ ẢO & VẬT PHẨM PvP
*   **🎯 Mục tiêu:** Hệ thống tiền tệ (Coins) dùng để mua vật phẩm tương tác trong PvP.
*   **🧑‍💻 Dev A (Economy API):** Bảng `UserInventory` (MySQL) và Transaction DB để mua bán. Viết logic áp dụng Vật phẩm trong trận đấu (ví dụ: Item "Sương mù" che màn hình đối thủ).
*   **👨‍💻 Dev B (Store & Item UI):** Giao diện Cửa hàng rực rỡ, hòm đồ. Nút sử dụng kỹ năng (Item) trong màn hình PvP (Sprint 7) được kích hoạt.
*   **🔥 Điểm nhấn:** Người chơi dùng Xu kiếm được từ SRS để mua Item, mang vào PvP phá rối đối thủ (tạo tính cạnh tranh rất cao).

### SPRINT 9: CREATOR STUDIO & COMMUNITY (UGC)
*   **🎯 Mục tiêu:** Mở rộng nội dung thông qua cộng đồng.
*   **🧑‍💻 Dev A:** Xây dựng API cho phép User tự upload list từ vựng (csv/excel) -> Hệ thống tự động dùng AI dịch và tìm ảnh minh họa tạo thành Deck (Flashcard).
*   **👨‍💻 Dev B:** Giao diện Creator Studio kéo thả, Bảng tin Cộng đồng (Feed) để chia sẻ bộ từ vựng và bảng xếp hạng (Leaderboard) hàng tuần.

### SPRINT 10: TỐI ƯU HÓA HIỆU NĂNG, LOAD TEST & DEPLOYMENT
*   **🎯 Mục tiêu:** Hệ thống mượt mà, sẵn sàng đón hàng ngàn CCU (Concurrent Users).
*   **🧑‍💻 Dev A (Backend/DevOps):** Dùng `JMeter` Load Test Socket.io server. Cấu hình rate-limit cho AI API để tránh tốn tiền. Deploy Docker lên Cloud (AWS/VPS) với Nginx.
*   **👨‍💻 Dev B (Frontend QA):** Audit bundle size của Vite, Lazy load các thư viện nặng (Framer motion, Lottie). Viết E2E Test bằng Cypress để đảm bảo luồng PvP không bao giờ lỗi.
*   **🤝 Khép lại dự án:** Launching, thu thập feedback và sẵn sàng bảo trì.