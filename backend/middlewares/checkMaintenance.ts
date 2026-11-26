import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/mysql';
import { RowDataPacket } from 'mysql2';
import jwt from 'jsonwebtoken';
import { broadcastSystemEvent, triggerMaintenanceMatchAbort } from '../utils/socketRegistry';

export type MaintenancePhase = 'NONE' | 'SCHEDULED' | 'ACTIVE';

export interface MaintenanceStatus {
    active: boolean;
    scheduled: boolean;
    phase: MaintenancePhase;
    title: string;
    message: string;
    startsAt: string | null;
    estimatedEnd: string | null;
}

// Cache ngắn trạng thái bảo trì (tối đa 30s, không vượt quá thời điểm starts_at nếu đang đếm ngược)
let maintenanceCache: MaintenanceStatus | null = null;
let cacheExpiry = 0;
let scheduledActivationTimer: NodeJS.Timeout | null = null;
let scheduledActivationAtMs = 0;

function emptyMaintenanceStatus(): MaintenanceStatus {
    return {
        active: false,
        scheduled: false,
        phase: 'NONE',
        title: '',
        message: '',
        startsAt: null,
        estimatedEnd: null,
    };
}

export function clearMaintenanceActivationTimer(): void {
    if (scheduledActivationTimer) {
        clearTimeout(scheduledActivationTimer);
        scheduledActivationTimer = null;
    }
    scheduledActivationAtMs = 0;
}

/**
 * Hẹn giờ tự động kích hoạt trạng thái ACTIVE đúng thời điểm starts_at
 * khi Admin chọn bảo trì có báo trước (đếm ngược).
 */
export function scheduleMaintenanceActivation(startsAtMs: number): void {
    const delayMs = startsAtMs - Date.now();
    if (delayMs <= 0) return;

    if (scheduledActivationTimer && scheduledActivationAtMs === startsAtMs) {
        return;
    }

    clearMaintenanceActivationTimer();
    scheduledActivationAtMs = startsAtMs;
    scheduledActivationTimer = setTimeout(async () => {
        scheduledActivationTimer = null;
        scheduledActivationAtMs = 0;
        invalidateMaintenanceCache();

        const current = await getMaintenanceStatus();
        if (current.active) {
            await triggerMaintenanceMatchAbort();
            broadcastSystemEvent('system:maintenance_updated', current);
            console.log('[Maintenance] Đã hết thời gian đếm ngược -> Hệ thống chính thức chuyển sang trạng thái BẢO TRÌ.');
        }
    }, delayMs);
}

export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
    const now = Date.now();
    if (maintenanceCache && now < cacheExpiry) {
        return maintenanceCache;
    }

    try {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT title, message, starts_at, estimated_end
             FROM system_announcements
             WHERE type = 'MAINTENANCE' AND is_maintenance_active = TRUE
             ORDER BY created_at DESC
             LIMIT 1`
        );

        if (rows.length === 0) {
            maintenanceCache = emptyMaintenanceStatus();
            cacheExpiry = now + 30 * 1000;
            return maintenanceCache;
        }

        const row = rows[0]!;
        const startsAtDate = row.starts_at ? new Date(row.starts_at) : null;
        const startsAtMs = startsAtDate ? startsAtDate.getTime() : 0;
        const isScheduled = startsAtMs > now;
        const phase: MaintenancePhase = isScheduled ? 'SCHEDULED' : 'ACTIVE';

        maintenanceCache = {
            active: !isScheduled,
            scheduled: isScheduled,
            phase,
            title: (row.title as string) || '',
            message: (row.message as string) || '',
            startsAt: startsAtDate ? startsAtDate.toISOString() : null,
            estimatedEnd: row.estimated_end ? new Date(row.estimated_end).toISOString() : null,
        };

        // Không cache vượt quá thời điểm đếm ngược kết thúc
        cacheExpiry = isScheduled
            ? Math.min(now + 30 * 1000, startsAtMs)
            : now + 30 * 1000;

        if (isScheduled) {
            scheduleMaintenanceActivation(startsAtMs);
        }

        return maintenanceCache;
    } catch {
        // Nếu bảng chưa được tạo hoặc lỗi DB thì trả về không bảo trì để hệ thống hoạt động
        return emptyMaintenanceStatus();
    }
}

export function invalidateMaintenanceCache(): void {
    cacheExpiry = 0;
    maintenanceCache = null;
}

export async function broadcastCurrentMaintenanceStatus(): Promise<MaintenanceStatus> {
    invalidateMaintenanceCache();
    const status = await getMaintenanceStatus();
    broadcastSystemEvent('system:maintenance_updated', status);
    return status;
}

export const checkMaintenance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const status = await getMaintenanceStatus();
        // Trong pha NONE hoặc SCHEDULED (đang đếm ngược), các API học tập vẫn hoạt động bình thường
        if (!status.active) {
            return next();
        }

        // Cho phép qua các route thiết yếu: health, system/status, auth nhận diện role, webhook SePay, admin
        // Lưu ý: middleware gắn tại /api nên req.path không có prefix /api
        const path = req.path;
        const allowedPaths = [
            '/health',
            '/system/status',
            '/auth/login',
            '/auth/logout',
            '/auth/me',
            '/auth/refresh-token',
            '/payment/sepay/webhook',
        ];
        if (allowedPaths.some((p) => path.startsWith(p)) || path.startsWith('/admin')) {
            return next();
        }

        // Kiểm tra quyền Admin qua accessToken / token cookie hoặc Authorization Bearer header
        try {
            const token =
                req.cookies?.accessToken ||
                req.cookies?.token ||
                (req.headers.authorization?.startsWith('Bearer ')
                    ? req.headers.authorization.split(' ')[1]
                    : undefined);

            if (token && process.env.JWT_SECRET) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET) as { role?: string };
                if (decoded?.role === 'ADMIN') {
                    return next();
                }
            }
        } catch {
            // Bỏ qua nếu token hết hạn hoặc không hợp lệ
        }

        return res.status(503).json({
            success: false,
            maintenance: true,
            phase: status.phase,
            title: status.title,
            message: status.message,
            startsAt: status.startsAt,
            estimatedEnd: status.estimatedEnd,
        });
    } catch {
        next(); // Không chặn người dùng nếu truy vấn DB gặp sự cố
    }
};
