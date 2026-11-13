# QUY TẮC & QUY ƯỚC PHÁT TRIỂN (DEV CONVENTIONS)

> Tài liệu này là **bộ quy tắc bất biến** áp dụng cho toàn bộ quá trình phát triển LexiCore.
> Mọi thành viên và AI assistant đều phải tuân thủ khi viết code, SQL, comment hoặc string.

---

## 1. NGÔN NGỮ & KÝ TỰ

| Quy tắc | Đúng | Sai |
|---|---|---|
| Viết tiếng Việt **có dấu** trong comment, string, thông báo | `// Kiểm tra số dư ví` | `// Kiem tra so du vi` |
| **Không dùng emoji hoặc ký tự đặc biệt** ngoài bàn phím trong JSX, SQL, backend | `'Thanh toán thành công'` | `'✅ Thanh toán thành công'` |
| Tên biến, hàm, bảng DB dùng tiếng Anh theo quy ước đặt tên chuẩn | `wallet_balance`, `updateStreak` | — |

---

## 2. TAILWIND CSS v4

```
❌ Không dùng (v3 syntax):     bg-opacity-40    text-opacity-50    border-opacity-20
✅ Dùng thay thế (v4 syntax):  bg-black/40       text-white/50       border-white/20
```

Dự án dùng **TailwindCSS v4**. Cú pháp `*-opacity-*` không còn được hỗ trợ.

---

## 3. DATABASE & MIGRATION

- **Tuyệt đối KHÔNG** tự động chạy migration hoặc tạo bảng bằng code/script.
- Mọi thay đổi DDL (CREATE TABLE, ALTER TABLE, ADD INDEX, seed data) chỉ được viết vào file `backend/database/schema.sql` để **người dùng tự xem xét và thực thi trên DataGrip**.
- Nếu cần migration bổ sung, tạo file `migration_<mô_tả>.sql` riêng và hướng dẫn chạy thủ công.

---

## 4. GIAO DỊCH TÀI CHÍNH (ACID)

Mọi thao tác liên quan đến số dư (Coin, Diamond, VND, subscription) **bắt buộc** dùng:

```ts
const conn = await pool.getConnection();
try {
    await conn.beginTransaction();
    // ... SELECT ... FOR UPDATE (row-level locking)
    // ... UPDATE wallets
    // ... INSERT payment_orders
    await conn.commit();
} catch (err) {
    await conn.rollback();
    throw err;
} finally {
    conn.release();
}
```

Không được dùng `pool.execute()` trực tiếp cho các thao tác tài chính.

---

## 5. CLOUDINARY URL

Hàm `optimizeImageUrl(url, options)` chỉ hoạt động với URL chứa `res.cloudinary.com` và `/upload/`.
URL bên ngoài Cloudinary được trả về **nguyên bản** mà không transform.

Cú pháp transform chuẩn:
```
https://res.cloudinary.com/.../upload/w_128,h_128,c_fill,q_auto,f_auto/...
```

Luôn gọi hàm này khi render ảnh từ Cloudinary để tránh vỡ nét và giảm băng thông.

---

## 6. TRẠNG THÁI `is_equipped` (AVATAR / COVER)

**Không tạo cột `is_equipped` trong database.**

Trạng thái trang bị được xác định bằng SQL join:

```sql
CASE WHEN i.type = 'AVATAR'      AND u.avatar_url = i.image_url THEN 1
     WHEN i.type = 'COVER_PHOTO' AND u.cover_url  = i.image_url THEN 1
     ELSE 0
END AS is_equipped
```

---

## 7. SHADOWING — CHỈ NHẬN PHỤ ĐỀ THỦ CÔNG

Phụ đề ASR (tự động) bị chặn tại `checkManualSub()`.

Điều kiện nhận diện phụ đề thủ công:
```ts
t.kind !== 'asr' && (!t.vssId || !t.vssId.startsWith('a.'))
```

Ảnh thumbnail video Shadowing lấy trực tiếp từ YouTube (không cần API key):
```
https://img.youtube.com/vi/{youtubeId}/maxresdefault.jpg
```

---

## 8. GOALS — TỰ ĐỘNG KHỞI TẠO

Khi user gọi `GET /api/gamification/daily-goals`, nếu chưa có dữ liệu ngày/tuần hiện tại,
hệ thống **tự động khởi tạo** từ các `daily_goal_definitions` đang kích hoạt (`is_active = true`).

---

## 9. SOFT DELETE

Dùng cột `is_active = false` thay vì xóa cứng (hard delete) cho:
- `items` (vật phẩm cửa hàng)
- `daily_goal_definitions`, `achievement_definitions`

Lý do: bảo toàn lịch sử túi đồ, tiến độ thành tựu của người dùng.

---

## 10. SEPAY WEBHOOK — IDEMPOTENCY

Webhook SePay có thể gửi trùng lặp. Trước khi xử lý thanh toán, kiểm tra:
```sql
SELECT id FROM payment_orders WHERE payment_reference = ? AND status = 'PENDING'
```
Nếu không tìm thấy đơn PENDING → bỏ qua hoặc cộng vào ví như nạp tiền thủ công.

---

## 11. SOCKET.IO — TRÁNH TIMEOUT QUA VERCEL PROXY

Vercel Edge có giới hạn timeout cho WebSocket Upgrade.
Cấu hình bắt buộc phía client:

```ts
socket = io({ transports: ['websocket'], upgrade: false });
```

Cấu hình server (`server.ts`):
```ts
pingInterval: 25000,
pingTimeout:  60000,
```

