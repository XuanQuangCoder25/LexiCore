/**
 * socket-config.ts
 *
 * Tiện ích xác định URL máy chủ Socket.IO cho mọi môi trường:
 * - Production: Kết nối trực tiếp tới backend Render (https://api.lexicore.site)
 *   thay vì đi qua Vercel rewrites (Vercel Serverless / Edge Network không hỗ trợ WebSocket upgrade).
 * - Development (Localhost): Sử dụng URL rỗng để đi qua Vite dev proxy (có ws: true).
 */

export function getSocketServerUrl(): string {
  // 1. Ưu tiên biến môi trường được cấu hình trực tiếp (VITE_SOCKET_URL hoặc VITE_API_URL)
  const envUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Tự động nhận diện môi trường Production dựa trên hostname trình duyệt
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // Kiểm tra domain chính thức của LexiCore
    if (hostname === 'lexicore.site' || hostname.endsWith('.lexicore.site')) {
      return 'https://api.lexicore.site';
    }
  }

  // 3. Môi trường Localhost / Dev: Trả về rỗng để Socket.IO dùng relative path qua Vite dev proxy
  return '';
}
