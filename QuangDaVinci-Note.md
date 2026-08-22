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