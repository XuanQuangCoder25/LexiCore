# 💳 HỆ SINH THÁI THANH TOÁN & GÓI HỘI VIÊN (PAYMENT & SUBSCRIPTION SYSTEM)

> **Tài liệu tham chiếu nghiệp vụ chuẩn (Single Source of Truth)**  
> Ghi nhận toàn bộ quyết định thiết kế, bảng giá, quy tắc gia hạn / nâng cấp bù trừ (Prorated), quy trình tích hợp cổng thanh toán SePay (VietQR) và Ví LexiCore nội bộ.

---

## 1. DANH MỤC GÓI HỘI VIÊN & BẢNG GIÁ CHUẨN

Hệ thống cung cấp 3 hạng gói hội viên chính thức phân chia theo 3 chu kỳ sử dụng (7 ngày, 30 ngày, 365 ngày), cùng 1 cơ chế gói trải nghiệm (Trial Plan):

| Hạng gói (Tier) | Chu kỳ 7 ngày | Chu kỳ 30 ngày (Tháng) | Chu kỳ 365 ngày (Năm) | Đặc quyền cốt lõi |
| :--- | :--- | :--- | :--- | :--- |
| **STARTER** | 9.000đ | 19.000đ | 159.000đ | Mở khóa toàn bộ thư viện Shadowing cơ bản, nhiệm vụ Daily, Streak freeze |
| **PRO** *(Phổ biến)* | 15.000đ | 35.000đ | 269.000đ | Whisper AI không giới hạn, từ điển ngữ cảnh Gemini, nhân 1.5x EXP và Coin |
| **ELITE** | 25.000đ | 49.000đ | 349.000đ | Toàn bộ quyền lợi Pro + Huy hiệu vinh danh độc quyền, vé đấu trường Arena VIP, hỗ trợ ưu tiên |
| **TRIAL** | - | 0đ (3 ngày) | - | Trải nghiệm hạng PRO 3 ngày, tự động cấp cho người dùng mới |

---

## 2. CHÍNH SÁCH GÓI DÙNG THỬ (TRIAL PLAN)

Hệ thống hỗ trợ 2 hình thức cấp gói Trial:

1. **Gói Trial mặc định cho người dùng mới (Onboarding Trial):**
   - **Thời hạn:** 3 ngày hạng **PRO**, giá 0đ (`slug = 'sub-trial-default'`).
   - **Cơ chế kích hoạt:** Tự động kích hoạt ngay khi đăng ký tài khoản thành công.
   - **Kiểm soát lạm dụng:** Trường `has_used_trial` trong bảng `users` được đánh dấu `TRUE`. Mỗi tài khoản chỉ được hưởng ưu đãi này duy nhất một lần.

2. **Gói Trial chiến dịch của Quản trị viên (Admin Campaign Trial):**
   - Admin có thể tạo các gói trial đặc biệt trong bảng `credit_packages` với `is_trial = TRUE`, `price_vnd = 0` (ví dụ: Tặng gói Elite 5 ngày dịp Tựu trường).
   - Gói được gắn thời gian hiệu lực qua hai cột:
     - `available_from`: Thời điểm bắt đầu xuất hiện trên giao diện.
     - `available_until`: Thời điểm kết thúc chiến dịch (quá hạn sẽ tự động ẩn).
   - **Chính sách:** Áp dụng cho toàn bộ học viên đăng nhập trong khoảng thời gian diễn ra chiến dịch mà không cần kiểm tra lịch sử tài khoản.

---

## 3. QUY TẮC MUA, GIA HẠN & NÂNG CẤP (PRORATED UPGRADE)

Để đảm bảo trải nghiệm công bằng và tránh thất thoát tài chính cho cả người dùng lẫn hệ thống, giao diện và backend tuân thủ nghiêm ngặt 3 quy tắc sau:

### Quy tắc 1: Mua cùng hạng gói (Gia hạn - Extension)
- **Hành vi:** Nút hành động trên thẻ đổi từ "Đăng ký" thành **"Gia hạn thêm X ngày"**.
- **Xử lý Backend:** Không reset lại ngày bắt đầu. Hệ thống thực hiện phép cộng dồn thời gian:
  $$\text{expires\_at}_{\text{mới}} = \text{expires\_at}_{\text{hiện tại}} + \text{duration\_days}$$

### Quy tắc 2: Mua hạng gói thấp hơn (Downgrade Prevention)
- **Hành vi:** Vô hiệu hóa (disable) nút bấm, hiển thị nhãn trạng thái **"Đã bao gồm trong gói của bạn"** hoặc **"Gói thấp hơn"**.
- **Ý nghĩa:** Tránh hoàn toàn bài toán hoàn tiền phức tạp (Refund) hoặc xếp hàng chờ hết hạn gói cao mới hạ xuống gói thấp.

### Quy tắc 3: Nâng cấp lên hạng gói cao hơn (Prorated Upgrade)
- **Hành vi:** Đổi nút thành **"Nâng cấp ngay"**.
- **Ràng buộc chu kỳ:** Bắt buộc nâng cấp lên gói có chu kỳ bằng hoặc dài hơn chu kỳ của gói đang sử dụng (ví dụ: đang dùng Pro 30 ngày thì chỉ được nâng lên Elite 30 ngày hoặc Elite 365 ngày, không được chọn Elite 7 ngày).
- **Công thức tính tiền bù trừ (Prorated Formula):**
  $$\text{Số tiền cần trả} = \text{Giá gói mới} - \left(\frac{\text{Giá gói cũ}}{30} \times \text{Số ngày còn lại của gói cũ}\right)$$
- **Xử lý Backend:** Ngay khi thanh toán thành công phần chênh lệch, hệ thống lập tức nâng `tier` của người dùng lên hạng mới và thiết lập lại thời hạn:
  $$\text{expires\_at} = \text{NOW}() + \text{duration\_days}_{\text{gói mới}}$$

---

## 4. HAI PHƯƠNG THỨC THANH TOÁN CHÍNH THỨC

Hệ thống loại bỏ hoàn toàn các cổng thanh toán doanh nghiệp phức tạp (như VNPay, MoMo) để chuyển sang hai hình thức tối ưu:

```
                          [ Người Dùng Chọn Gói ]
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
       [ PHƯƠNG THỨC 1: SEPAY ]               [ PHƯƠNG THỨC 2: VÍ NỘI BỘ ]
       - Hiển thị VietQR chuẩn                - Kiểm tra số dư ví (vnd_balance)
       - Mã tham chiếu tự động: LC######      - Modal xác nhận trước/sau trừ tiền
       - Khách chuyển khoản ngân hàng         - Trừ ví tức thì (Instant ACID)
                 │                                       │
                 ▼                                       │
       [ SEPAY WEBHOOK IPN ]                             │
       - Xác minh API Token SePay                        │
       - Khớp mã đơn payment_orders                      │
       - Đối soát số tiền khớp chuẩn                     │
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     ▼
                      [ KÍCH HOẠT DỊCH VỤ (ACID) ]
                      - Cập nhật user_subscription
                      - Ghi nhận payment_orders = SUCCESS
                      - Đồng bộ quyền lợi và thông báo
```

### 1. Cổng thanh toán SePay (Chuyển khoản VietQR tự động)
- **Nguyên lý:** Tích hợp giải pháp nhận diện thanh toán tự động qua tài khoản ngân hàng cá nhân thông qua chuẩn VietQR (Napas 247).
- **Mã tham chiếu thanh toán (`payment_reference`):**
  - Hệ thống tự sinh mã duy nhất dạng `LC` + 6 số ngẫu nhiên (ví dụ: `LC582914`).
  - Mã này được nhúng trực tiếp vào URL ảnh VietQR kèm số tài khoản, tên ngân hàng và số tiền chính xác.
  - Người dùng quét mã trên ứng dụng ngân hàng: **Toàn bộ thông tin được tự động điền sẵn**, người dùng không phải gõ tay bất kỳ ký tự nào, loại bỏ 100% rủi ro nhập sai nội dung.
- **Xử lý Webhook (IPN):**
  - SePay gửi thông báo HTTP POST đến endpoint công khai: `https://api.lexicore.site/api/payment/sepay/webhook`.
  - Backend thực hiện kiểm tra bảo mật (API Key), tìm đơn hàng qua `payment_reference`, đối soát số tiền chuyển thực tế với số tiền đơn hàng.
  - Chạy giao dịch MySQL Transaction đảm bảo tính nguyên tử (ACID): Cập nhật đơn hàng sang `SUCCESS`, cập nhật hoặc tạo mới bản ghi `user_subscription`.

### 2. Thanh toán bằng Ví LexiCore (VND Balance)
- **Nguyên lý:** Cho phép người dùng sử dụng số dư thực trong ví cá nhân (`wallets.vnd_balance`) để thanh toán.
- **Trải nghiệm người dùng (UX):**
  - Khi bấm chọn "Thanh toán bằng Ví LexiCore", giao diện chuyển đổi trực tiếp ngay trong `QRModal` hiển thị: Số dư hiện tại, Số tiền trừ và Số dư còn lại sau giao dịch.
  - Khi người dùng bấm "Xác nhận trừ tiền", backend kiểm tra `vnd_balance >= amount_vnd`, thực hiện trừ tiền và kích hoạt gói ngay lập tức trong 1 thao tác duy nhất.

### 3. Nạp tiền vào Ví LexiCore qua VietQR (SePay)
- **Nguyên lý:** Người dùng nhập số tiền linh hoạt (tối thiểu 10.000đ, tối đa 50.000.000đ) để nạp thêm số dư VNĐ vào Ví LexiCore.
- **Quy trình hoạt động:**
  1. Người dùng bấm nút "Nạp tiền" tại thẻ Ví LexiCore trên trang `SubscriptionView` -> Mở `WalletTopupModal`.
  2. Người dùng nhập số tiền hoặc chọn mức nạp nhanh (`50.000đ`, `100.000đ`, `200.000đ`, `500.000đ`).
  3. Bấm "Tạo mã QR nạp tiền" -> Frontend gọi `POST /api/payment/wallet/topup`.
  4. Backend tạo đơn hàng `payment_orders` gắn với gói `pkg_wallet_topup`, tự tăng mã `LC{order_number}` và sinh URL VietQR SePay với đúng số tiền yêu cầu.
  5. Mở `QRModal` hiển thị mã QR và bảng thông tin chuyển khoản.
  6. Người dùng chuyển khoản ngân hàng -> SePay gửi Webhook IPN -> Backend cộng tiền vào `wallets.vnd_balance` của người dùng.
  7. `QRModal` tự động bắt trạng thái thành công qua Polling và hiển thị thông báo: *"Đã nạp thành công {xxx} VNĐ vào Ví LexiCore!"*.

---

## 5. QUY TẮC VÒNG ĐỜI ĐƠN HÀNG & LỊCH SỬ GIAO DỊCH

Để giữ cho bảng lịch sử giao dịch luôn sạch đẹp và giải phóng tài nguyên cơ sở dữ liệu:

1. **Hiển thị có chọn lọc trên giao diện (Curated Transaction History):**
   - **Giao dịch SUCCESS:** Hiển thị toàn bộ lịch sử thanh toán thành công từ trước đến nay.
   - **Giao dịch PENDING:** Chỉ hiển thị tối đa **01 giao dịch PENDING duy nhất** (nếu là giao dịch được tạo gần đây nhất mà người dùng đang chờ thanh toán).
   - **Giao dịch CANCELLED:** Ẩn hoàn toàn khỏi bảng lịch sử giao dịch để người dùng không bị phân tâm bởi các lượt mở xem thử mã QR.
2. **Cơ chế "Đơn PENDING duy nhất" (Single Active Pending Order):**
   - Khi người dùng bấm tạo mã QR cho bất kỳ gói mới nào (hoặc nạp ví mới), backend tự động đánh dấu tất cả các đơn `PENDING` cũ trước đó của người dùng đó thành `CANCELLED`.
   - Đảm bảo mỗi tài khoản tại một thời điểm chỉ có tối đa 1 đơn chờ thanh toán có hiệu lực.
3. **Dọn dẹp cơ sở dữ liệu định kỳ (Housekeeping Cronjob):**
   - Tự động chạy ngầm hàng ngày lúc **00:30 (giờ Việt Nam)**:
     - Xóa vĩnh viễn các đơn `PENDING` quá **24 giờ** (đơn nháp bỏ dở).
     - Xóa vĩnh viễn các đơn `CANCELLED` quá **07 ngày**.
   - Giúp bảng `payment_orders` luôn tinh gọn và duy trì hiệu năng truy vấn cao.

---

## 6. DANH SÁCH API ENDPOINTS THANH TOÁN

| Phương thức | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/payment/packages` | Công khai | Lấy toàn bộ danh mục gói hội viên, coin pack, diamond pack |
| **GET** | `/api/payment/my-subscription` | User | Lấy trạng thái gói hội viên hiện tại, số dư ví VNĐ, coin và diamond |
| **PATCH** | `/api/payment/my-subscription` | User | Cập nhật cài đặt tự động gia hạn (`auto_renew`) và nhắc nhở email (`email_reminder`) |
| **GET** | `/api/payment/my-transactions` | User | Lấy lịch sử giao dịch (định dạng hiển thị cho bảng lịch sử) |
| **POST** | `/api/payment/sepay/init` | User | Khởi tạo đơn thanh toán gói qua VietQR SePay (`{ packageId }`) |
| **POST** | `/api/payment/wallet/topup` | User | Khởi tạo đơn nạp tiền vào Ví LexiCore qua VietQR SePay (`{ amountVnd }`) |
| **POST** | `/api/payment/wallet/pay` | User | Thanh toán gói cước bằng số dư Ví LexiCore (`{ packageId }`) |
| **POST** | `/api/payment/trial/activate` | User | Kích hoạt gói dùng thử Pro 3 ngày chào mừng |
| **POST** | `/api/payment/campaign/claim` | User | Nhận quà sự kiện chiến dịch miễn phí từ Admin (`{ campaignId }`) |
| **GET** | `/api/payment/order-status/:orderId` | User | Polling kiểm tra trạng thái đơn hàng (PENDING / SUCCESS / FAILED) |
| **GET** | `/api/payment/invoice/:orderId` | User | Lấy thông tin chi tiết hóa đơn điện tử phục vụ xuất chứng từ |
| **GET** | `/api/payment/orders` | User / Admin | Lấy danh sách lịch sử đơn hàng thanh toán đối soát |
| **POST** | `/api/payment/sepay/webhook` | SePay Server | Webhook nhận biến động số dư ngân hàng và tự động kích hoạt dịch vụ / nạp ví |

---

## 7. THIẾT KẾ CƠ SỞ DỮ LIỆU LIÊN QUAN

Module thanh toán được cấu thành từ 4 bảng MySQL chính trong `schema.sql`:

1. **`credit_packages`:** Danh mục các gói bán (hội viên, nạp coin/diamond), quản lý giá tiền, khuyến mãi (`sale_percent`, `sale_ends_at`), và khung giờ chiến dịch (`is_trial`, `available_from`, `available_until`).
2. **`payment_orders`:** Lưu vết toàn bộ đơn hàng giao dịch, lưu mã tham chiếu `payment_reference`, cổng thanh toán (`gateway`: `SEPAY`, `WALLET`, `MOCK`), trạng thái đơn (`PENDING`, `SUCCESS`, `FAILED`) và thông tin phản hồi từ webhook.
3. **`user_subscription`:** Quản lý gói cước kích hoạt của từng user (quan hệ 1-1 với `users`), lưu ngày bắt đầu, ngày hết hạn, cấu hình tự động gia hạn (`auto_renew`) và thông báo qua email (`email_reminder`).
4. **`payment_announcements`:** Quản lý các thông báo, chính sách khuyến mãi hoặc thông tin chi tiết quyền lợi hiển thị trên Tab "Thông tin" của `SubscriptionModal`.

---

## 8. LƯU Ý PHÁT TRIỂN & TEST SANDBOX

- **Môi trường Dev:** Cổng thanh toán giả lập `MOCK` được lưu trữ ở backend cho lập trình viên test nghiệp vụ nội bộ, tuyệt đối không hiển thị tùy chọn Mock trên giao diện người dùng production.
- **Quy chuẩn văn bản giao diện:** Tuyệt đối không dùng các ký tự Unicode lạ (`·`, `—`, `–`) trong JSX hiển thị mà dùng các ký tự chuẩn (`-`, `|`, `:`, `(`, `)`).

