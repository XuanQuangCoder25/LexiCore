# Bản Phân Tích Tính Năng: Module Course (Khóa Học)
(Dựa trên kiến trúc và các module hiện tại của LexiCore)
Lưu ý: khi tạo giao diện mới thì hãy tận dụng những tài nguyên fe có sẵn để đảm bảo rằng các trang giao diện đồng nhất với nhau. Hãy check kĩ ở trong src/components để biết có thể sử dụng component nào.

## 1. Cấu trúc cốt lõi của một khóa học (Course Structure)
Để module khóa học có tính linh hoạt và mở rộng cao, dữ liệu không chỉ dừng lại ở Course -> Lesson mà nên được phân cấp thành 4 tầng logic như sau:

*   **Khóa học (Course):** Thực thể lớn nhất chứa các thông tin tổng quan (Tiêu đề, mô tả, ảnh bìa, cấp độ, v.v.).
    *   **Chương / Phần (Chapter / Section / Module):** Nhóm các bài học lại với nhau theo chủ đề (Ví dụ: "Chương 1: Từ vựng nền tảng").
        *   **Bài học (Lesson):** Đơn vị học tập cụ thể, là một bước mà người dùng phải hoàn thành (Hiện tại model `Lesson` đã có `durationMinutes`, `order`).
            *   **Nội dung (Content Items):** Một bài học có thể bao gồm nhiều dạng nội dung kết hợp:
                *   *Video / Audio giảng dạy.*
                *   *Tài liệu đọc (Rich Text / Markdown / PDF).*
                *   *Flashcard Deck* (Bộ thẻ từ vựng đính kèm).
                *   *Quiz / Mini-Test* (Bài kiểm tra nhanh đánh giá kiến thức).

## 2. Chức năng dành cho Học viên (Student Features)

*   **Khám phá và Lọc khóa học (Course Discovery):**
    *   **Marketplace / Danh sách:** Giao diện hiển thị các khóa học đang `Published` (Đã phát hành).
    *   **Bộ lọc thông minh:** Tìm kiếm khóa học theo trình độ ngôn ngữ (`A1 Beginner`, `B2 Upper Intermediate` - khớp với trường `level` trong `User`), theo từ khóa hoặc mức độ phổ biến.
    *   **Trang chi tiết khóa học:** Xem lộ trình (Syllabus), yêu cầu đầu vào, và đọc các Đánh giá (Ratings/Reviews).
*   **Luồng tham gia học tập (Learning Flow):**
    *   **Đăng ký học (Enrollment):** Học viên bắt đầu khóa học (Thêm vào danh sách `enrolledCourses`).
    *   **Không gian học tập (Learning Workspace):** Giao diện tập trung hiển thị nội dung bài học. Có sidebar bên cạnh hiển thị danh sách chương và tiến độ.
    *   **Tương tác đa dạng:** Người dùng có thể vừa xem video, sau đó chuyển sang lật Flashcard, và cuối cùng làm Quiz ngay trong cùng một luồng bài học.
*   **Theo dõi tiến độ và Điều kiện hoàn thành (Progress Tracking):**
    *   **Cập nhật tiến độ:** Tự động tính toán `progressPercentage` dựa trên số lesson đã hoàn thành so với tổng số lesson.
    *   **Điều kiện khắt khe (Completion Rules):** Có thể cài đặt bài học yêu cầu phải xem trên 80% thời lượng video, hoặc làm Quiz đạt điểm qua môn thì mới mở khóa bài tiếp theo (Drip content).
    *   **Cấp chứng nhận:** Màn hình chúc mừng hoặc cấp chứng chỉ ảo khi học viên hoàn thành 100% khóa học.

## 3. Chức năng dành cho Người tạo/Quản trị (Creator/Admin Features)(Chức năng tạo ra khóa học này sẽ được tạo trong trang creator studio)

Phần này phục vụ cho những User có role là `content_creator` hoặc `admin`.()

*   **Quản lý thông tin khóa học (Course Info Management):**
    *   Tạo mới, chỉnh sửa và xóa (CRUD) các thông tin cơ bản: Tên, mô tả, ảnh bìa, gán tags.
    *   Quản lý vòng đời xuất bản: Chuyển đổi trạng thái giữa `Draft` (Bản nháp), `Published` (Xuất bản) và `Suspended` (Tạm ngưng).
*   **Trình thiết kế khóa học (Course Builder):**
    *   **Giao diện Kéo Thả (Drag & Drop):** Sắp xếp thứ tự (`order`) của các Chapter, Lesson một cách trực quan.
    *   **Biên tập nội dung (Content Editor):** Trình soạn thảo văn bản kết hợp tính năng tải lên tài liệu, nhúng video.
    *   **Gắn kết tài nguyên (Resource Attachment):** Giao diện cho phép chọn một bộ Flashcard hoặc một bài Exam có sẵn trong kho lưu trữ của Creator để đính kèm vào Bài học hiện tại.
*   **Quản lý học viên & Thống kê (Analytics Dashboard):**
    *   Xem danh sách các học viên đã đăng ký (`enrolledCourses`).
    *   Thống kê tỷ lệ giữ chân, số bài học trung bình một người hoàn thành (Completion rate).
    *   Theo dõi và phản hồi đánh giá của học viên.

## 4. Điểm chạm với hệ thống hiện tại (System Integrations)
Module Course không thể đứng độc lập mà sẽ đóng vai trò "Trái tim", gắn kết hầu hết các tính năng đang có của LexiCore:

*   **Tích hợp Module Auth & User:**
    *   Xác thực quyền (`role: content_creator` / `admin` mới được truy cập Course Builder).
    *   Cập nhật mảng `enrolledCourses` và `completedLessons` vào database User khi học.
*   **Tích hợp Module SRS & Flashcard:**
    *   Hiện model `Flashcard` đã có sẵn liên kết `courseId` và `lessonId`.
    *   Khi học viên học qua bài có chứa Flashcard, hệ thống tự động đẩy số từ vựng này vào quá trình lặp lại ngắt quãng (Spaced Repetition / model `RetentionLog`).
    *   Tự động cộng dồn vào `totalWordsLearned` của User.
*   **Tích hợp Module Exam:**
    *   Tái sử dụng các model `Exam` và `Question` để tạo các bài thi Final Test cuối khóa hoặc Mini-Quiz cuối bài học.
    *   Thành tích làm bài được lưu vào `ExamResult` và đối chiếu điều kiện để quyết định có cho học viên qua bài hay không.
*   **Tích hợp Gamification & Economy:**
    *   **Động lực học:** Khi hoàn thành 1 lesson hoặc 1 khóa học, hệ thống gọi API cấp điểm kinh nghiệm, tăng `streak` (chuỗi ngày học) và cải thiện `weeklyActivityScore`.
    *   **Thành tựu:** Mở khóa các huy hiệu trong model `Achievement` (Ví dụ: "Học viên xuất sắc", "Cày cuốc xuyên đêm").
    *   **Kinh tế:** Có thể dùng điểm thưởng/tiền ảo trong `economy` để mua các khóa học Premium.
*   **Tích hợp Module Upload:**
    *   Xử lý việc lưu trữ và tối ưu hóa việc phân phối file Video, Audio, Thumbnail và file đính kèm của khóa học (kết nối trực tiếp với các API thuộc thư mục `upload`).
