# CẨM NANG TRIỂN KHAI DỰ ÁN FULLSTACK (VERCEL + RENDER + HOSTINGER DNS)

> **Tài liệu tham khảo chuẩn (Playbook)** dành cho các dự án Web Fullstack (Frontend React/Vite + Backend Node.js/Express + Database Cloud).  
> Giúp triển khai nhanh chóng, chuẩn production, miễn phí hoặc tối ưu chi phí, có HTTPS và Custom Domain riêng.

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

Thay vì thuê VPS (như CloudFly, DigitalOcean) và tự cài đặt Docker/Nginx/SSL phức tạp, mô hình **PaaS (Platform as a Service)** hiện đại tách biệt hai thành phần:

```
                  [ Người Dùng Truy Cập ]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   https://lexicore.site            https://api.lexicore.site
            │                                 │
     (DNS Hostinger)                   (DNS Hostinger)
    Bản ghi A: 76.76.21.21             Bản ghi CNAME: render-url
            │                                 │
            ▼                                 ▼
      [ VERCEL ]                         [ RENDER ]
   (Frontend React/Vite)           (Backend Express/Node.js)
   - Lưu trữ Static Assets         - Xử lý Business Logic / API
   - Rewrite /api -> Render        - Kết nối Database & WebSocket
            │                                 │
            └───────────────┬─────────────────┘
                            ▼
              [ CLOUD MANAGED DATABASES ]
     - MySQL (Aiven) | MongoDB (Atlas) | Redis (Upstash)
```

---

## 2. CHUẨN BỊ MÃ NGUỒN (TRƯỚC KHI DEPLOY)

### A. Phía Frontend (Thư mục `frontend/`)
1. **File `vercel.json` (Tối quan trọng để tránh lỗi CORS và định tuyến SPA):**
   Tạo file `frontend/vercel.json` với nội dung:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://api.yourdomain.site/api/:path*"
       },
       {
         "source": "/socket.io/:path*",
         "destination": "https://api.yourdomain.site/socket.io/:path*"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
   *Tác dụng:* 
   - Browser gọi API tương đối `/api/...`, Vercel tự chuyển tiếp sang backend Render. Trình duyệt xem như cùng một domain, không bao giờ bị lỗi CORS và cookie đăng nhập lưu mượt mà.
   - `/(.*) -> /index.html` giúp React Router không bị lỗi 404 khi người dùng F5 tải lại trang.

2. **File `package.json`:**
   Đảm bảo có script build:
   ```json
   "scripts": {
     "dev": "vite",
     "build": "vite build"
   }
   ```

---

### B. Phía Backend (Thư mục `backend/`)
1. **Cấu hình Cổng (Port) trong `server.ts`:**
   Render sẽ tự cấp cổng ngẫu nhiên qua biến môi trường `process.env.PORT`. Code phải lắng nghe biến này:
   ```typescript
   const PORT = process.env.PORT || 5000;
   server.listen(PORT, () => {
     console.log(`Server is running on port ${PORT}`);
   });
   ```

2. **Cấu hình CORS linh hoạt:**
   Cho phép cả localhost (để dev) và domain production:
   ```typescript
   const allowedOrigins = [
     'http://localhost:5173',
     'http://localhost:3000',
     process.env.CLIENT_URL, // https://yourdomain.site
   ].filter(Boolean);

   app.use(cors({
     origin: (origin, callback) => {
       if (!origin || allowedOrigins.includes(origin)) {
         callback(null, true);
       } else {
         callback(new Error('Blocked by CORS'));
       }
     },
     credentials: true,
   }));
   ```

3. **File `package.json`:**
   Render cần lệnh khởi động production trong mục `scripts`:
   ```json
   "scripts": {
     "start": "tsx server.ts",
     "dev": "tsx watch server.ts"
   }
   ```

---

## 3. CÁC BƯỚC TRIỂN KHAI THỰC TẾ

### BƯỚC 1: TRIỂN KHAI BACKEND LÊN RENDER
1. Đăng nhập [render.com](https://render.com) bằng GitHub.
2. Bấm **New +** -> Chọn **Web Service**.
3. Chọn Repository GitHub của bạn.
4. Điền các thông số cơ bản:
   - **Name:** Tên dịch vụ (ví dụ: `lexicore-backend`).
   - **Region:** Singapore (gần Việt Nam nhất, độ trễ thấp).
   - **Branch:** `main`.
   - **Root Directory:** `backend` (nếu repo chứa cả FE và BE).
   - **Runtime:** `Node`.
   - **Build Command:** `npm install` (hoặc để trống nếu dùng `tsx`).
   - **Start Command:** `npm start`.
   - **Instance Type:** `Free`.
5. **Khai báo Environment Variables:**
   Sao chép toàn bộ các khóa từ file `.env` vào mục Environment Variables của Render:
   - `NODE_ENV` = `production`
   - `PORT` = `5000` (Render tự map vào cổng public)
   - `CLIENT_URL` = `https://yourdomain.site`
   - `MYSQL_URI` / `DATABASE_URL` (Từ Aiven)
   - `MONGODB_URI` (Từ MongoDB Atlas)
   - `REDIS_URL` (Từ Upstash)
   - `JWT_SECRET`, API Keys, v.v.
6. Bấm **Create Web Service**. Chờ 2 - 3 phút để Render build và deploy.
7. Khi thành công, copy link Render mặc định (ví dụ: `https://lexicore-backend-xxxx.onrender.com`) để kiểm tra trên trình duyệt.

---

### BƯỚC 2: TRIỂN KHAI FRONTEND LÊN VERCEL
1. Đăng nhập [vercel.com](https://vercel.com) bằng GitHub.
2. Bấm **Add New...** -> Chọn **Project**.
3. Chọn Repository GitHub tương ứng.
4. Cấu hình Project:
   - **Framework Preset:** Chọn **Vite**.
   - **Root Directory:** Bấm **Edit** -> Chọn thư mục `frontend`.
   - **Build Command:** `npm run build` (Mặc định).
   - **Output Directory:** `dist` (Mặc định).
   - **Environment Variables:** Không bắt buộc nếu đã cấu hình proxy qua `vercel.json`.
5. Bấm **Deploy**. Chờ khoảng 1 phút là website đã live trên tên miền tạm của Vercel (`*.vercel.app`).

---

### BƯỚC 3: CẤU HÌNH TÊN MIỀN TẠI HOSTINGER (DNS MANAGEMENT)
1. Đăng nhập vào trang quản trị **Hostinger** -> Vào mục **Domains** -> Chọn tên miền của bạn (ví dụ: `lexicore.site`).
2. Vào tab **DNS / Nameservers**.
3. Thêm/Sửa **3 bản ghi DNS** cốt lõi:

| Type (Loại) | Name (Host) | Points to (Giá trị đích) | TTL | Ý nghĩa |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | 3600 (hoặc Auto) | Trỏ domain chính về Vercel |
| **CNAME** | `www` | `cname.vercel-dns.com` | 3600 | Trỏ tiền tố www về Vercel |
| **CNAME** | `api` | `lexicore-backend-xxxx.onrender.com` | 3600 | Trỏ subdomain `api` về Render |

*(Lưu ý: Mục CNAME của `api` chỉ điền tên miền Render, bỏ `https://` và dấu `/` ở cuối)*

---

### BƯỚC 4: LIÊN KẾT CUSTOM DOMAIN TRÊN VERCEL & RENDER

1. **Trên Vercel:**
   - Vào Project -> **Settings** -> **Domains**.
   - Nhập `yourdomain.site` -> Bấm **Add**.
   - Vercel sẽ tự động kiểm tra bản ghi A và CNAME, cấp chứng chỉ SSL (HTTPS) trong 5 - 15 phút.

2. **Trên Render:**
   - Vào Web Service -> **Settings** -> Cuộn tới **Custom Domains**.
   - Bấm **Add Custom Domain** -> Nhập `api.yourdomain.site` -> Bấm **Save**.
   - Render sẽ tự động xác minh bản ghi CNAME và cấp chứng chỉ SSL cho API.

---

## 4. QUY TRÌNH LÀM VIỆC SAU KHI ĐÃ DEPLOY (WORKFLOW)

### 1. Khi Lập Trình Ở Máy Local:
- Bạn mở terminal chạy:
  - Frontend: `cd frontend; npm run dev` -> Chạy trên `http://localhost:5173`.
  - Backend: `cd backend; npm run dev` -> Chạy trên `http://localhost:5000`.
- **Mọi chỉnh sửa code trên máy bạn KHÔNG ảnh hưởng gì đến website thật đang chạy.** Bạn có thể thoải mái code, test tính năng mới.

### 2. Khi Đẩy Code Lên Production:
- Khi đã hoàn thành một tính năng và test cẩn thận ở local:
  ```bash
  git add .
  git commit -m "feat: cap nhat tinh nang thanh toan"
  git push origin main
  ```
- **Cơ chế tự động kích hoạt:**
  - Vercel nhận diện commit mới -> Tự động kéo code `frontend` về build -> Cập nhật web thật ngay lập tức mà không gián đoạn người dùng (Zero Downtime).
  - Render nhận diện commit mới -> Tự động kéo code `backend` về restart -> Cập nhật API thật.

### 3. Về CI/CD (GitHub Actions) và Docker:
- **Render và Vercel không phụ thuộc vào Docker hay GitHub Actions:** Chúng kết nối trực tiếp thông qua GitHub Webhook độc lập.
- File `docker-compose.yml` và `Dockerfile` trong dự án: Có thể giữ lại để phục vụ việc chạy full môi trường ở local hoặc sau này muốn chuyển sang VPS riêng.
- File `.github/workflows/deploy.yml` cũ (SSH vào CloudFly VPS):
  - Do dự án đã chuyển hẳn sang Vercel + Render, file này không còn nhiệm vụ nữa. Nếu không có VPS hoạt động, GitHub Actions sẽ báo lỗi đỏ. Bạn có thể xóa hoặc đổi đuôi file thành `deploy.yml.disabled`.

---

## 5. CÁC "BẪY" THƯỜNG GẶP & CÁCH KHẮC PHỤC

1. **Render Free Tier "Ngủ đông" (Cold Start):**
   - Với gói miễn phí của Render, nếu không có request trong vòng 15 phút, server sẽ tạm dừng (sleep). Request đầu tiên sau đó sẽ mất khoảng 40 - 50 giây để khởi động lại.
   - *Cách giải quyết:* Dùng các dịch vụ cron job miễn phí (như UptimeRobot, cron-job.org) ping vào endpoint `https://api.yourdomain.site/` mỗi 10 phút một lần để giữ server luôn thức.

2. **Lỗi 404 khi F5 trang trên Vercel:**
   - Do React là Single Page Application (SPA), đường dẫn URL do React Router quản lý.
   - *Cách giải quyết:* Luôn đảm bảo có rule rewrite `"source": "/(.*)", "destination": "/index.html"` trong `vercel.json`.

3. **Lỗi Cookie không gửi kèm:**
   - Khi frontend gọi API sang subdomain khác domain, trình duyệt chặn cookie bên thứ ba.
   - Nhờ có proxy rewrite trong `vercel.json`, request từ `https://lexicore.site/api/...` được trình duyệt xem là cùng origin, cookie session/JWT được lưu và gửi tự động 100%.

