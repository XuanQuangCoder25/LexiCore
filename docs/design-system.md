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

* Bảng màu web, Logo, Typography, quy chuẩn Icon

---
