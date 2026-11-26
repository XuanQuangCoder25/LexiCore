# HỆ THỐNG THIẾT KẾ GIAO DIỆN (LEXICORE DESIGN SYSTEM)

Tài liệu này là chuẩn thiết kế thống nhất toàn dự án **LexiCore** cho cả **Light Mode (mặc định)** lẫn **Dark / Toàn màn hình ("Midnight Aurora")**, kế thừa trực tiếp từ bảng màu của linh vật cá voi và thiết kế trang [NotFoundPage.tsx](../frontend/src/app/components/global/NotFoundPage.tsx). Mọi trang hoặc module xây dựng về sau đều tuân thủ hệ thống màu, kính mờ (glassmorphism), chuyển động và quy chuẩn dưới đây.

---

## 1. Nhận diện thương hiệu & Tài nguyên hình ảnh (Brand Assets)

### 1.1 Logo linh vật Cá voi (Biểu tượng chính thức)
- **Đường dẫn chuẩn:** `/assets/logo_whale.png` (Favicon: `/assets/favicon_whale.png`).
- **Tránh dùng asset cũ:** Không sử dụng `/logo.svg` hay `/wordmark.svg` (các asset tinh thể/chữ của mẫu cũ) ở trang mới, sidebar hoặc trang trạng thái; luôn ưu tiên **linh vật cá voi** kèm quầng sáng cyan dịu (`drop-shadow-[0_0_12px_rgba(34,211,238,0.35)]`).
- **Quy tắc tiết chế:** Nếu cá voi đã đóng vai trò điểm nhấn ở trung tâm khung hình (như trang 404), không lặp lại thêm cụm logo phụ ở góc trên bên trái.

### 1.2 Bảng màu gốc ("Bioluminescent Whale Palette")
Toàn bộ hệ màu Light và Dark của LexiCore đều xoay quanh 4 sắc độ gốc rút ra từ cá voi và ánh sáng cực quang:

| Vai trò màu | Tên gọi | Mã Hex / Tailwind gốc |
|---|---|---|
| Primary Glow | **Bioluminescent Cyan** | `#22d3ee` (`cyan-400`), `#67e8f9` (`cyan-300`), `#06b6d4` (`cyan-500`) |
| Deep Accent | **Deep Ocean Teal** | `#0891b2` (`cyan-600`), `#0e7490` (`cyan-700`) |
| Bridge Gradient | **Aurora Sky** | `#7dd3fc` (`sky-300`), `#0ea5e9` (`sky-500`) |
| Secondary Contrast | **Soft Lavender / Violet** | `#a78bfa` (`violet-400`), `#c4b5fd` (`violet-300`), `#8b5cf6` (`violet-500`), `#7c3aed` (`violet-600`) |
| Deep Base / Ink | **Midnight Navy** | `#050b16` / `#040814` (làm nền cho Dark Mode, làm màu chữ tiêu đề cho Light Mode) |

### 1.3 Kho ảnh nền toàn màn hình (`frontend/public/`)
- `maintenance.jpg` — nền mạch kỹ thuật số tối xanh navy dành cho [MaintenancePage.tsx](../frontend/src/app/components/global/MaintenancePage.tsx).
- `not-found-bg.jpg` — nền cực quang đại dương kết hợp đường chòm sao cyan–tím dành cho [NotFoundPage.tsx](../frontend/src/app/components/global/NotFoundPage.tsx).

---

## 2. Hệ màu Chủ đạo: Light Mode ("Daylight Aurora")

Đây là **bộ màu mặc định** của LexiCore trên Dashboard và các màn hình ứng dụng nền sáng — chuyển thể trực tiếp cặp **Cyan → Sky → Lavender** của trang 404 sang nền sáng để giữ đúng tinh thần thị giác nhưng vẫn đảm bảo độ tương phản sắc nét khi đọc lâu:

| Thành phần | Giá trị / Tailwind Class | Ghi chú sử dụng |
|---|---|---|
| **Nền trang** | `bg-[#f6fafe]` hoặc `linear-gradient(135deg, #f3fdff 0%, #f5f8ff 52%, #f7f4ff 100%)` | Trắng ánh sương ngọc – tím cực nhẹ, dịu mắt |
| **Card / Panel** | `bg-white/90 backdrop-blur-xl` (`rgba(255, 255, 255, 0.90)`) | Kính sáng sạch trên nền Aurora dịu |
| **Viền & Bóng Card** | `border border-cyan-500/20` (`rgba(6, 182, 212, 0.20)`), `shadow-[0_12px_36px_rgba(8,145,178,0.08)]` | Ánh viền ngọc mảnh thay cho viền xám phẳng |
| **Tiêu đề lớn (Heading)** | `#050b16` (**Midnight Navy**) hoặc gradient nhấn `from-[#050b16] via-cyan-800 to-violet-700` | Đồng bộ độ sâu của nền tối 404 thành màu mực chính |
| **Chữ nội dung (Body)** | `text-slate-700` (`#334155`) / `text-slate-800` (`#1e293b`) | Rõ ràng, dễ đọc cho nội dung học tập dài |
| **Chữ phụ / Muted** | `text-slate-500` (`#64748b`) | Nhãn phụ, chú thích thời gian |
| **Màu nhấn & Link** | `text-cyan-600` (`#0891b2`), hover `text-cyan-700`; nhấn phụ `text-violet-600` (`#7c3aed`) | Đường link, tab đang chọn, icon nhấn |
| **Nút chính (Primary CTA)** | `bg-gradient-to-r from-cyan-500 via-sky-500 to-violet-500 text-white font-semibold shadow-[0_8px_24px_rgba(6,182,212,0.25)] hover:brightness-105` | Chuyển sắc `Cyan → Sky → Violet` tương phản cao trên nền sáng |
| **Nút / Pill mềm (Soft Aurora)** | `bg-gradient-to-r from-cyan-200 via-sky-200 to-violet-200 text-[#050b16] font-semibold` | Dùng cho CTA nhẹ, thẻ nổi bật hoặc banner không muốn quá gắt |
| **Nút phụ (Secondary CTA)** | `bg-white/90 hover:bg-cyan-50/70 text-[#050b16] border border-cyan-500/25 hover:border-cyan-500/55` | Hài hòa với viền kính |
| **Badge / Pill thông tin** | `bg-cyan-50 border border-cyan-200/80 text-cyan-800` (hoặc `bg-violet-50 border-violet-200 text-violet-800`) | Hiển thị tag trạng thái, đường dẫn, quota |
| **Banner cảnh báo tạm (Vàng)** | `bg-amber-50 border border-amber-200 text-amber-900` (icon `text-amber-600`) | Dùng trên nền trắng/sáng như form [LoginPage.tsx](../frontend/src/app/features/auth/LoginPage.tsx) |

---

## 3. Hệ màu Dark & Toàn Màn Hình ("Midnight Aurora")

Áp dụng cho **Dark Mode** và các trang toàn màn hình độc lập ([NotFoundPage.tsx](../frontend/src/app/components/global/NotFoundPage.tsx), [MaintenancePage.tsx](../frontend/src/app/components/global/MaintenancePage.tsx), Splash/Onboarding, Error Page):

| Thành phần | Giá trị / Tailwind Class | Mục đích |
|---|---|---|
| **Nền gốc trang** | `#050b16` / `#040814` (**Midnight Navy**) | Tạo chiều sâu đại dương / vũ trụ |
| **Phủ ảnh nền (Vignette)** | `bg-gradient-to-b from-[#040814]/25 via-transparent to-[#040814]/60` | Tăng độ dịu mép trên/dưới mà không làm tối sầm ảnh |
| **Card kính mờ trung tâm** | `bg-zinc-950/65 backdrop-blur-xl` (hoặc `bg-zinc-950/75 backdrop-blur-md`) | Tách bạch nội dung khỏi nền, vẫn cho ánh sáng xuyên nhẹ |
| **Viền & Bóng Card** | `border-cyan-400/20`, `shadow-[0_24px_80px_rgba(0,0,0,0.72),0_0_50px_rgba(34,211,238,0.08)]` | Ánh viền công nghệ mảnh và mềm |
| **Hào quang đỉnh Card** | `bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-violet-500/20 blur-3xl` | Điểm sáng tập trung vào trung tâm |
| **Tiêu đề lớn** | `#FFFFFF` hoặc gradient chữ `from-white via-cyan-100 to-cyan-400/70` | Độ tương phản cao, sắc nét |
| **Chữ mô tả / Chữ phụ** | `text-slate-300/90` (`#cbd5e1`) / chân thẻ `text-slate-400` (`11px–12px`) | Dễ đọc trên nền kính tối |
| **Nút chính (Primary CTA)** | `bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 text-slate-950 font-semibold shadow-[0_8px_28px_rgba(34,211,238,0.28)] hover:brightness-110 active:scale-[0.98] rounded-xl` | Nổi bật rõ trên nền tối `#050b16` |
| **Nút phụ (Secondary Glass)** | `bg-zinc-900/85 hover:bg-zinc-800/90 text-white border border-slate-700/80 hover:border-cyan-400/50 rounded-xl` | Cân bằng thị giác cạnh nút chính |
| **Badge / Pill thông tin** | `rounded-full px-3.5 py-1.5 bg-slate-900/90 border border-slate-700/70 text-xs text-cyan-300/90 font-mono` | Đường dẫn URL, trạng thái hệ thống |
| **Cảnh báo bảo trì** | `bg-amber-500/10 border-amber-500/20..30 text-amber-400` | Biểu tượng, mốc thời gian dự kiến |

### Quy tắc xử lý Ảnh nền & Lớp phủ (Bắt buộc)
- **Bố cục ảnh nền:** Khi vẽ ảnh nền mới (tỉ lệ 16:9), **chừa ~50% khoảng tối yên tĩnh ở vùng giữa**, đẩy các chi tiết sáng (cực quang, mạch điện tử, chòm sao, hạt sáng) ra **hai mép trái – phải**.
- **Không làm mờ/tối quá mức lớp nền:** Tuyệt đối **không** đặt `filter blur-[2px]` hay `backdrop-blur-md bg-black/75` lên toàn màn hình chứa ảnh nền (lỗi này từng làm ảnh `maintenance.jpg` bị biến thành nền đen mờ mất chi tiết). Hiệu ứng `backdrop-blur` **chỉ áp dụng lên thẻ card trung tâm**.

---

## 4. Chuyển động & Hiệu ứng lơ lửng (Motion & Micro-Animations)

Ưu tiên các chuyển động chậm, mượt (`ease-in-out`, biên độ nhỏ) gợi cảm giác trôi nhẹ không trọng lực:

| Tên Animation | Thời lượng | Chuyển động | Ứng dụng |
|---|---|---|---|
| `lexiFloatWhale` | `4.8s ease-in-out infinite` | `translateY(0 → -14px)` kèm nghiêng nhẹ `rotate(-2deg → 2deg)` | Huy hiệu cá voi trung tâm |
| `lexiFloatSlow` | `6s ease-in-out infinite` | `translateY(0 → -8px)` | Khung kính trung tâm trôi nhẹ trong không gian |
| `lexiOrbitSpin` | `18s linear infinite` | `rotate(0deg → 360deg)` | Vòng quỹ đạo nét đứt `border-dashed border-cyan-400/35` quanh cá voi |
| `lexiPulseHalo` | `4.8s ease-in-out infinite` | `opacity: 0.45 → 0.85`, `scale: 0.95 → 1.06` | Quầng sáng mờ phía sau linh vật |

---

## 5. Màu sắc gói Hội viên & Nhận diện VIP (`vipStyling.ts`)

Định nghĩa thống nhất trong [vipStyling.ts](../frontend/src/app/utils/vipStyling.ts) và [AppSidebar.tsx](../frontend/src/app/components/AppSidebar.tsx):
- **FREE:** Trung tính (`bg-muted text-muted-foreground border-border`).
- **STARTER:** Xanh ngọc lục bảo (`from-emerald-500 to-emerald-600`).
- **PRO (Ocean Sapphire):** Chữ gradient `from-sky-400 via-blue-500 to-indigo-600`, viền avatar `ring-2 ring-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.45)]`.
- **ELITE (Royal Gold):** Chữ gradient `from-amber-400 via-yellow-400 to-amber-600`, viền avatar `ring-2 ring-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.55)]`, nổi bật dòng bảng xếp hạng `bg-amber-500/5 hover:bg-amber-500/10`.

---

## 6. Typography, Bo góc & Quy chuẩn Icon

- **Font hệ thống:** `'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (cấu hình trong [tokens.css](../frontend/src/styles/tokens.css) và [AuthLayout.module.css](../frontend/src/app/features/auth/AuthLayout.module.css)); dùng `font-mono` cho đồng hồ đếm ngược, đường dẫn URL hoặc mã đơn (`LC{n}`).
- **Bo góc (Border Radius):**
  - Pill / Badge / Switcher: `rounded-full` (`100px`).
  - Nút bấm & Ô nhập liệu: `rounded-xl` (`12px`).
  - Thẻ nội dung & Dialog: `rounded-2xl` (`16px`) cho Dashboard; `rounded-3xl` (`24px`) cho Card trung tâm toàn màn hình.
- **Quy chuẩn Icon:** Dùng thống nhất bộ **Lucide React** (`lucide-react`), kích thước `h-4 w-4` trong nút/banner, `h-7 w-7` đến `h-8 w-8` trong badge tiêu điểm; tránh chèn icon trang trí thuần túy (như `Sparkles`) cạnh văn bản phụ khi khối trung tâm đã đủ điểm nhấn thị giác.

---
