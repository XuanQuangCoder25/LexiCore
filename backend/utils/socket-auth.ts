import { Socket } from 'socket.io';

/**
 * Trích xuất JWT từ handshake của Socket.IO theo thứ tự ưu tiên:
 * 1. handshake.auth.token (client truyền qua option `auth`)
 * 2. Cookie httpOnly (accessToken | token) khi client bật withCredentials
 * 3. Header Authorization: Bearer <token>
 * 4. handshake.query.token (fallback)
 */
export function extractTokenFromHandshake(socket: Socket): string | null {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
        return authToken.startsWith('Bearer ') ? authToken.slice(7).trim() : authToken.trim();
    }

    const rawCookie = socket.handshake.headers.cookie;
    if (rawCookie) {
        const cookies: Record<string, string> = {};
        rawCookie.split(';').forEach((item) => {
            const parts = item.trim().split('=');
            const key = parts[0];
            const val = parts.slice(1).join('=');
            if (key) {
                try {
                    cookies[key] = decodeURIComponent(val);
                } catch {
                    cookies[key] = val;
                }
            }
        });
        if (cookies['accessToken']) return cookies['accessToken'];
        if (cookies['token']) return cookies['token'];
    }

    const authHeader = socket.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        if (token.length > 0) return token;
    }

    const queryToken = socket.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim().length > 0) {
        return queryToken.trim();
    }

    return null;
}
