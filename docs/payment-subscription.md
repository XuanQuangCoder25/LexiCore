# 💳 HỆ SINH THÁI THANH TOÁN & GÓI HỘI VIÊN (PAYMENT & SUBSCRIPTION SYSTEM)

> **Tài liệu tham chiếu nghiệp vụ chuẩn (Single Source of Truth)**  
> Ghi nhận toàn bộ quyết định thiết kế, bảng giá, quy tắc gia hạn / nâng cấp bù trừ (Prorated), quy trình tích hợp cổng thanh toán SePay (VietQR) và Ví LexiCore nội bộ.

---

## 1. DANH MỤC GÓI HỘI VIÊN & BẢNG GIÁ CHUẨN

Hệ thống cung cấp 3 hạng gói hội viên chính thức phân chia theo 3 chu kỳ sử dụng (7 ngày, 30 ngày, 365 ngày), cùng 1 cơ chế gói trải nghiệm (Trial Plan):

| Hạng gói (Tier) | Chu kỳ 7 ngày | Chu kỳ 30 ngày (Tháng) | Chu kỳ 365 ngày (Năm) | Đặc quyền cốt lõi |
| :--- | :--- | :--- | :--- | :--- |
| **STARTER** | 9.000đ | 19.000đ | 159.000đ | 25 câu phát âm Whisper/ngày, 10 video Shadowing (<15 phút), Đấu Rank vô hạn, 3 trận x2 Coin & EXP/ngày |
| **PRO** *(Phổ biến)* | 15.000đ | 35.000đ | 269.000đ | 60 câu Whisper/ngày, 50 video mọi thời lượng, 5 trận x2/ngày, Radar Năng lực 6D, Tên Ocean Blue + Khung Sapphire |
| **ELITE** | 25.000đ | 49.000đ | 349.000đ | 120 câu Whisper/ngày, Video không giới hạn, 10 trận x2/ngày, Tự động bảo vệ Streak, Tên Royal Gold + Khung Mạ Vàng + Highlight |
| **TRIAL** | - | 0đ (3 ngày) | - | Trải nghiệm hạng PRO 3 ngày, áp dụng một lần cho tài khoản miễn phí mới |

---

## 2. CHÍNH SÁCH GÓI DÙNG THỬ (TRIAL PLAN) & QUÀ TẶNG SỰ KIỆN

Hệ thống hỗ trợ 2 hình thức cấp gói dùng thử / sự kiện với quy tắc bảo vệ đặc quyền nghiêm ngặt:

1. **Gói Trial mặc định cho người dùng mới (Onboarding Trial):**
   - **Thời hạn:** 3 ngày hạng **PRO**, giá 0đ (`slug = 'sub-trial-default'`).
   - **Đối tượng áp dụng:** Chỉ dành riêng cho tài khoản Miễn phí (`FREE`) chưa từng sử dụng Trial.
   - **Kiểm soát lạm dụng & Bảo vệ gói trả phí:**
     - Trường `has_used_trial` trong bảng `users` được đánh dấu `TRUE`. Mỗi tài khoản chỉ được hưởng ưu đãi này duy nhất một lần.
     - **Chặn tuyệt đối (Lock / Reject)** đối với học viên đang có gói hội viên trả phí còn hạn (`STARTER`, `PRO`, `ELITE`). Nút trên giao diện bị khóa với text `"Đang có gói {tier}"`, backend từ chối kích hoạt với HTTP 400 để tránh trường hợp học viên vô tình bị hạ gói hoặc mất chu kỳ trả phí.

2. **Gói quà tặng chiến dịch của Quản trị viên (Admin Campaign Trial / Event Gift):**
   - Admin có thể tạo các gói sự kiện trong bảng `subscription_campaigns` (ví dụ: Tặng gói Elite 5 ngày dịp Tựu trường, Tết Nguyên Đán).
   - Gói được gắn thời gian hiệu lực qua hai cột `starts_at` và `ends_at`.
   - **Quy tắc phân tầng bảo vệ quyền lợi học viên:**
     - **Hạ gói (Downgrade Prevention):** Nếu hạng của gói sự kiện thấp hơn gói học viên đang dùng (ví dụ đang dùng `ELITE` mà sự kiện tặng `PRO`), hệ thống khóa nút với text `"Đã bao gồm trong {tier}"`, backend từ chối nhận quà để tránh hạ cấp đặc quyền.
     - **Cùng hạng (Extension):** Nếu sự kiện cùng hạng với gói học viên đang có (ví dụ cùng là `ELITE`), hệ thống **cộng dồn nối tiếp số ngày quà tặng** vào hạn dùng cũ (`expires_at = expires_at_cũ + duration_days`).
     - **Nâng hạng (Upgrade Experience):** Nếu sự kiện có hạng cao hơn gói học viên đang có (ví dụ đang `STARTER` nhận quà `ELITE`), hệ thống nâng hạng trải nghiệm lên `ELITE` và đảm bảo **không bao giờ làm giảm số ngày sử dụng còn lại của gói cũ** (`expires_at = GREATEST(expires_at_cũ, NOW() + duration_days)`).
     - **Kiểm soát lượt nhận:** Mỗi học viên chỉ được nhận tối đa 1 lần cho mỗi chiến dịch (lưu vết trong bảng `user_campaign_claims`).

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

### 3. Cơ chế Tự động gia hạn (Auto-Renew) & Xử lý khi thiếu số dư ví
- **Nguyên lý hoạt động:**
  - Người dùng có thể bật tính năng "Tự động gia hạn" tại trang Gói Hội viên (có modal xác nhận chi tiết tên gói, mức phí định kỳ và cam kết minh bạch).
  - Tính năng **chỉ áp dụng cho các gói trả phí chính thức** (thuộc 9 gói), tuyệt đối không áp dụng cho gói dùng thử (Trial) hoặc gói sự kiện miễn phí.
  - **Thời điểm ghi nhận giao dịch thành công:** Hệ thống **chỉ tạo và ghi nhận giao dịch thành công (`SUCCESS`) vào đúng ngày hết hạn chu kỳ cũ** (lúc 00:05) khi tiền ví được trừ thành công và chu kỳ mới được kích hoạt (mã đơn `#RENEW_xxxx`). Khi bật toggle ở giữa tháng, hệ thống chỉ lưu cấu hình, không trừ tiền và không tạo đơn hàng.
- **Xử lý khi số dư Ví LexiCore không đủ để gia hạn:**
  1. **Tự động tắt tính năng gia hạn:** Backend cập nhật ngay `auto_renew = FALSE` trong database, toggle trên giao diện người dùng tự động chuyển về trạng thái **TẮT** để tránh quét trừ tiền lặp lại.
  2. **Ghi nhận giao dịch Thất bại (FAILED):** Tạo 1 bản ghi trong `payment_orders` với `status = 'FAILED'`, `gateway = 'WALLET'`, mã đơn `#FAIL_xxxx` để hiển thị minh bạch trong bảng Lịch sử giao dịch.
  3. **Gửi thông báo In-app:** Bắn thông báo quả chuông nêu rõ số dư hiện tại không đủ và thông báo đã tắt tính năng tự động gia hạn.
  4. **Gửi Email thông báo chính thức:** Gửi email đến hòm thư người dùng qua Resend, trong mail ghi rõ: *"Hệ thống đã tự động tắt tính năng tự động gia hạn trên tài khoản của bạn để tránh phát sinh lỗi. Bạn vui lòng nạp thêm tiền vào ví để duy trì đặc quyền."*
  5. **Chuyển gói về Miễn phí:** Gói cước hết hạn chu kỳ sẽ tự động chuyển về hạng `FREE`, tuyệt đối không trừ âm tiền ví hay phát sinh nợ phí.

### 4. Nạp tiền vào Ví LexiCore qua VietQR (SePay)
- **Nguyên lý:** Người dùng nhập số tiền linh hoạt (tối thiểu 10.000đ, tối đa 50.000.000đ) để nạp thêm số dư VNĐ vào Ví LexiCore.
- **Quy trình hoạt động:**
  1. Người dùng bấm nút "Nạp tiền" tại thẻ Ví LexiCore trên trang `SubscriptionView` -> Mở `WalletTopupModal`.
  2. Người dùng nhập số tiền hoặc chọn mức nạp nhanh (`50.000đ`, `100.000đ`, `200.000đ`, `500.000đ`).
  3. Bấm "Tạo mã QR nạp tiền" -> Frontend kiểm tra hạn mức chi tiêu trong ngày trước khi gọi `POST /api/payment/wallet/topup`.
  4. Backend tạo đơn hàng `payment_orders` gắn với gói `pkg_wallet_topup`, tự tăng mã `LC{order_number}` và sinh URL VietQR SePay với đúng số tiền yêu cầu.
  5. Mở `QRModal` hiển thị mã QR và bảng thông tin chuyển khoản.
  6. Người dùng chuyển khoản ngân hàng -> SePay gửi Webhook IPN -> Backend cộng tiền vào `wallets.vnd_balance` của người dùng.
  7. `QRModal` tự động bắt trạng thái thành công qua Polling và hiển thị thông báo: *"Đã nạp thành công {xxx} VNĐ vào Ví LexiCore!"*.

### 5. Cơ chế Cảnh báo chi tiêu có trách nhiệm (Responsible Spending Warning)
- **Mục đích:** Bảo vệ người học (học sinh, sinh viên) tránh việc nạp tiền bốc đồng, chi tiêu quá mức hoặc thao tác nhầm lẫn số tiền lớn trong cùng một ngày.
- **Hằng số cấu hình:** Hạn mức cảnh báo nạp trong ngày `DAILY_TOPUP_LIMIT_THRESHOLD = 1.000.000 VNĐ`.
- **Logic kiểm tra:**
  - Backend cung cấp trường `todayTopupVnd` trong API `GET /api/payment/my-subscription`, tính tổng số tiền từ các đơn nạp ví thành công (`gateway = 'SEPAY'`, `package_id = 'pkg_wallet_topup'`, `status = 'SUCCESS'`) kể từ mốc 00:00:00 của ngày hiện tại.
  - Khi người dùng chọn hoặc nhập số tiền nạp mới (`amount`), hệ thống tính tổng dự kiến:
    $$\text{projectedTotal} = \text{todayTopupVnd} + \text{amount}$$
  - **Quy tắc kích hoạt cảnh báo:**
    - Nếu $\text{projectedTotal} \le 1.000.000 \text{ VNĐ}$: Hệ thống chuyển thẳng sang bước tạo mã VietQR SePay bình thường.
    - Nếu $\text{projectedTotal} > 1.000.000 \text{ VNĐ}$ (từ 1.000.001 VNĐ trở lên): Modal `WalletTopupModal` lập tức chuyển sang trạng thái cảnh báo (`step = 'WARNING'`) ngay trong cùng một modal để người dùng cân nhắc.
- **Trải nghiệm người dùng tại màn hình cảnh báo:**
  - Hiển thị hộp cảnh báo tông màu hổ phách (Amber) với tiêu đề "Nhắc nhở chi tiêu có trách nhiệm".
  - Nội dung giải thích chi tiết: Số tiền đã nạp hôm nay, số tiền chuẩn bị nạp, tổng dự kiến vượt ngưỡng hạn mức khuyến nghị 1.000.000 VNĐ/ngày.
  - Hai lựa chọn quyết định:
    1. **"Cân nhắc lại"**: Đóng cảnh báo và quay về màn hình nhập tiền để người dùng điều chỉnh mức nạp hợp lý hơn.
    2. **"Tôi hiểu, tiếp tục nạp"**: Người dùng chủ động xác nhận mong muốn nạp tiếp, hệ thống tiến hành tạo đơn hàng và mở mã VietQR SePay.

---

## 5. QUY TẮC VÒNG ĐỜI ĐƠN HÀNG & LỊCH SỬ GIAO DỊCH

Để giữ cho bảng lịch sử giao dịch luôn sạch đẹp và giải phóng tài nguyên cơ sở dữ liệu:

1. **Hiển thị có chọn lọc trên giao diện (Curated Transaction History):**
   - **Giao dịch SUCCESS:** Hiển thị toàn bộ lịch sử thanh toán thành công từ trước đến nay.
   - **Giao dịch PENDING:** Chỉ hiển thị tối đa **01 giao dịch PENDING duy nhất** (nếu là giao dịch được tạo gần đây nhất mà người dùng đang chờ thanh toán).
   - **Giao dịch CANCELLED:** Ẩn hoàn toàn khỏi bảng lịch sử giao dịch để người dùng không bị phân tâm bởi các lượt mở xem thử mã QR.
2. **Người dùng chủ động huỷ đơn (User-Initiated Cancellation):**
   - Trên bảng lịch sử giao dịch, tại dòng có trạng thái `PENDING`, hiển thị nút hành động **"Huỷ"** (icon `X`).
   - Khi học viên bấm Huỷ, hệ thống gọi API `DELETE /api/payment/order/:orderId` để chuyển trạng thái sang `CANCELLED` trong cơ sở dữ liệu, đồng thời loại bỏ ngay dòng đó khỏi bảng lịch sử trên giao diện.
3. **Cơ chế "Đơn PENDING duy nhất" (Single Active Pending Order):**
   - Khi người dùng bấm tạo mã QR cho bất kỳ gói mới nào (hoặc nạp ví mới), backend tự động đánh dấu tất cả các đơn `PENDING` cũ trước đó của người dùng đó thành `CANCELLED`.
   - Đảm bảo mỗi tài khoản tại một thời điểm chỉ có tối đa 1 đơn chờ thanh toán có hiệu lực.
4. **Dọn dẹp cơ sở dữ liệu định kỳ (Housekeeping Cronjob):**
   - Tự động chạy ngầm mỗi giờ một lần (`0 * * * *`):
     - Xóa vĩnh viễn các đơn `CANCELLED` quá **01 giờ** (tối ưu dung lượng bảng khi học viên tạo và huỷ nhiều đơn).
     - Xóa vĩnh viễn các đơn `PENDING` quá **24 giờ** (đơn nháp bị bỏ dở quá lâu).
   - Giúp bảng `payment_orders` luôn tinh gọn và duy trì hiệu năng truy vấn cao.

---

## 6. DANH SÁCH API ENDPOINTS THANH TOÁN

| Phương thức | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/payment/packages` | Công khai | Lấy toàn bộ danh mục gói hội viên, coin pack, diamond pack |
| **GET** | `/api/payment/my-subscription` | User | Lấy trạng thái gói hội viên hiện tại, số dư ví VNĐ, coin, diamond và tổng tiền nạp trong ngày (`todayTopupVnd`) |
| **PATCH** | `/api/payment/my-subscription` | User | Cập nhật cài đặt tự động gia hạn (`auto_renew`) và nhắc nhở email (`email_reminder`) |
| **GET** | `/api/payment/my-transactions` | User | Lấy lịch sử giao dịch (định dạng hiển thị cho bảng lịch sử) |
| **DELETE** | `/api/payment/order/:orderId` | User | Huỷ đơn hàng đang chờ thanh toán (`PENDING`) của chính người dùng |
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

---

## 9. CHIẾN DỊCH MARKETING & QUẢN LÝ KHUYẾN MÃI

### 9.1 Quản lý Sale % theo thời gian thực (Runtime Sale)

Admin có thể áp dụng mức giảm giá % cho bất kỳ gói nào trong số 21 gói (9 gói hội viên + 6 gói coin + 6 gói diamond) qua endpoint `PATCH /api/admin/packages/:id/sale`. Mỗi đợt sale lưu 3 trường:
- `sale_percent` — mức giảm giá (0-100)
- `sale_starts_at` — thời điểm bắt đầu
- `sale_ends_at` — thời điểm kết thúc

**Không dùng cron để xóa sale hết hạn.** Hàm `calcFinalPrice()` trong `payment.service.ts` tính runtime: nếu `NOW()` nằm trong khoảng `[sale_starts_at, sale_ends_at]` thì áp dụng giảm giá, ngược lại trả về giá gốc. Điều này tránh race condition giữa cron và webhook.

Khi admin set sale thành công, hệ thống tự động đẩy thông báo in-app (loại `sale`) đến toàn bộ user đang hoạt động trong 7 ngày gần nhất. Thông báo có nút "Xem ưu đãi" dẫn thẳng đến trang Subscription.

### 9.2 Chiến dịch Quà tặng sự kiện (Reward Campaign)

Khác với `subscription_campaigns` (tặng gói hội viên), `reward_campaigns` cho phép Admin tặng Coin, Diamond hoặc vật phẩm (item) đặc biệt:

| Loại quà | Hành vi khi nhận |
| :--- | :--- |
| `coin` | Cộng thẳng vào `wallets.coin_balance`, ghi log `billing_transactions` |
| `diamond` | Cộng thẳng vào `wallets.diamond_balance`, ghi log `billing_transactions` |
| `item` | Thêm vào `user_items` với số lượng 1 (hoặc tăng thêm nếu là STREAK_FREEZE/RESTORE) |
| `item` (đã có) | Cộng thay thế bằng `fallback_coin` vào `coin_balance` |

Luồng nhận quà: Người dùng mở Bell thông báo -> thấy thông báo loại `reward` -> nhấn "Nhận quà ngay" -> `RewardClaimModal` hiện ra -> gọi `POST /api/payment/reward-campaign/claim`. Backend kiểm tra `UNIQUE KEY (user_id, reward_campaign_id)` để đảm bảo idempotent, toàn bộ xử lý chạy trong MySQL Transaction ACID.

### 9.3 Chế độ Bảo trì hệ thống (Maintenance Mode)

Admin quản lý bảo trì qua 2 endpoints:
- `POST /api/admin/maintenance/start` — bật bảo trì (thêm bản ghi vào `system_announcements`)
- `PATCH /api/admin/maintenance/:id/end` — kết thúc bảo trì sớm

Khi bật bảo trì, middleware `checkMaintenance` (đăng ký trước `requireAuth` trên toàn bộ `/api/*`) chặn tất cả request và trả về HTTP 503 kèm payload:
```json
{
  "maintenance": true,
  "title": "...",
  "message": "...",
  "expected_end": "2026-12-01T10:00:00Z"
}
```
Frontend (`App.tsx`) poll `GET /api/system/status` mỗi 45 giây, khi nhận `maintenance: true` thì render toàn màn hình `MaintenancePage.tsx` thay thế ứng dụng. Admin bypass hoàn toàn bằng JWT cookie hợp lệ (middleware giải mã token trước khi kiểm tra bảo trì).

### 9.4 Email Blast diện rộng

Admin gửi email đến toàn bộ người dùng đang hoạt động qua `POST /api/admin/email-blast`. Backend phản hồi ngay **HTTP 202 Accepted** (fire-and-forget), sau đó gửi theo batch 10 email/giây với delay 1 giây giữa các batch để tránh vượt giới hạn Resend API. Mỗi lần gửi được ghi vào `email_blast_logs`. Admin xem nhật ký qua `GET /api/admin/email-blast/logs`.

---

## 10. DANH SÁCH API ADMIN MARKETING

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| **GET** | `/api/admin/packages/with-sale` | 21 gói kèm trạng thái sale runtime (NONE/INCOMING/ACTIVE/EXPIRED) |
| **PATCH** | `/api/admin/packages/:id/sale` | Set hoặc xóa đợt sale% cho gói |
| **GET** | `/api/admin/campaigns/reward` | Danh sách chiến dịch quà tặng |
| **POST** | `/api/admin/campaigns/reward` | Tạo chiến dịch quà tặng mới |
| **PATCH** | `/api/admin/campaigns/reward/:id/toggle` | Bật/tắt chiến dịch |
| **DELETE** | `/api/admin/campaigns/reward/:id` | Xóa chiến dịch |
| **GET** | `/api/admin/system-announcements` | Lịch sử thông báo bảo trì |
| **POST** | `/api/admin/maintenance/start` | Bật bảo trì |
| **PATCH** | `/api/admin/maintenance/:id/end` | Kết thúc bảo trì |
| **GET** | `/api/admin/email-blast/logs` | Nhật ký gửi email diện rộng |
| **POST** | `/api/admin/email-blast` | Gửi email diện rộng (202 Accepted) |
| **GET** | `/api/system/status` | Trạng thái bảo trì (public, 30s cache) |
| **GET** | `/api/payment/reward-campaigns/active` | Chiến dịch quà đang hoạt động (public) |
| **POST** | `/api/payment/reward-campaign/claim` | Nhận quà sự kiện |

---

*Kết thúc tài liệu payment-subscription.md*

- **Môi trường Dev:** Cổng thanh toán giả lập `MOCK` được lưu trữ ở backend cho lập trình viên test nghiệp vụ nội bộ, tuyệt đối không hiển thị tùy chọn Mock trên giao diện người dùng production.
- **Quy chuẩn văn bản giao diện:** Tuyệt đối không dùng các ký tự Unicode lạ (`·`, `—`, `–`) trong JSX hiển thị mà dùng các ký tự chuẩn (`-`, `|`, `:`, `(`, `)`).

