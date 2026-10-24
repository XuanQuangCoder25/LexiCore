import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

/**
 * Lấy hoặc khởi tạo instance Socket.io kết nối đến namespace /chat.
 * Sử dụng withCredentials để tự động đính kèm cookie httpOnly (accessToken/token).
 */
export function getChatSocket(): Socket {
  if (!socketInstance) {
    // Nếu có biến môi trường VITE_API_URL thì dùng URL đó, ngược lại dùng relative path qua Vite proxy
    const apiUrl = import.meta.env.VITE_API_URL;
    const socketUrl = apiUrl ? `${apiUrl.replace(/\/+$/, '')}/chat` : '/chat';

    socketInstance = io(socketUrl, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on('connect_error', (err) => {
      // UNAUTHORIZED hoặc FORBIDDEN: chưa đăng nhập hoặc token hết hạn
      if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
        socketInstance?.disconnect();
      }
    });
  }

  return socketInstance;
}

/**
 * Ngắt kết nối socket (dùng khi đăng xuất).
 */
export function disconnectChatSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
