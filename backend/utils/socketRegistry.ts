import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;
let maintenanceAbortHandler: (() => Promise<void>) | null = null;

/**
 * Lưu tham chiếu SocketIOServer dùng chung toàn Backend
 * để các module (marketing, checkMaintenance) phát broadcast tức thì.
 */
export function registerSocketServer(io: SocketIOServer): void {
    ioInstance = io;
}

export function getSocketServer(): SocketIOServer | null {
    return ioInstance;
}

/**
 * Phát sự kiện hệ thống đồng bộ tới cả namespace mặc định (`/`) và `/chat`
 * vì mọi người dùng đăng nhập đều duy trì kết nối `/chat` toàn cục.
 */
export function broadcastSystemEvent(event: string, payload: unknown): void {
    if (!ioInstance) return;
    ioInstance.emit(event, payload);
    ioInstance.of('/chat').emit(event, payload);
}

/**
 * Đăng ký callback dọn dẹp / hủy an toàn các phòng Arena khi bảo trì chính thức bắt đầu.
 */
export function registerMaintenanceAbortHandler(handler: () => Promise<void>): void {
    maintenanceAbortHandler = handler;
}

export async function triggerMaintenanceMatchAbort(): Promise<void> {
    if (!maintenanceAbortHandler) return;
    try {
        await maintenanceAbortHandler();
    } catch (err) {
        console.error('[Maintenance] Lỗi khi hủy an toàn các phòng Arena:', err);
    }
}
