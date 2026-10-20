/**
 * tokenStore.ts
 *
 * Lu tru accessToken trong MEMORY (bien JS module, khong phai localStorage/cookie).
 * - XSS khong the doc duoc (khong co trong DOM)
 * - Mat khi F5 → App.tsx se tu goi /refresh-token de cap lai
 * - Duoc gui qua Authorization: Bearer <token> header
 * - Socket.IO duoc cap token moi moi khi refresh
 *
 * Pattern nay la chuan cua cac doanh nghiep lon (Auth0, Google, Facebook, v.v.)
 */

type OnTokenChangeCallback = (token: string | null) => void;

class TokenStore {
    private accessToken: string | null = null;
    private listeners: OnTokenChangeCallback[] = [];

    /** Lay accessToken hien tai tu bo nho */
    getToken(): string | null {
        return this.accessToken;
    }

    /** Cap nhat accessToken moi vao bo nho va thong bao cho cac subscriber */
    setToken(token: string | null): void {
        this.accessToken = token;
        this.listeners.forEach((cb) => cb(token));
    }

    /** Dang ky callback khi token thay doi (vi du: Socket service can cap nhat auth) */
    onTokenChange(cb: OnTokenChangeCallback): () => void {
        this.listeners.push(cb);
        // Tra ve ham huy dang ky
        return () => {
            this.listeners = this.listeners.filter((l) => l !== cb);
        };
    }

    /** Xoa token (logout) */
    clear(): void {
        this.setToken(null);
    }
}

/** Singleton dung chung toan app */
export const tokenStore = new TokenStore();
