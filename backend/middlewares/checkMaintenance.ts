import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/mysql';
import { RowDataPacket } from 'mysql2';
import jwt from 'jsonwebtoken';

// Cache trạng thái bảo trì trong 30 giây để không query DB mỗi request
let maintenanceCache: { active: boolean; title: string; message: string; estimatedEnd: string | null } | null = null;
let cacheExpiry = 0;

export async function getMaintenanceStatus() {
    const now = Date.now();
    if (maintenanceCache && now < cacheExpiry) {
        return maintenanceCache;
    }

    try {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT title, message, estimated_end
             FROM system_announcements
             WHERE type = 'MAINTENANCE' AND is_maintenance_active = TRUE
             ORDER BY created_at DESC
             LIMIT 1`
        );

        const active = rows.length > 0;
        maintenanceCache = {
            active,
            title: active ? (rows[0].title as string) : '',
            message: active ? (rows[0].message as string) : '',
            estimatedEnd: active && rows[0].estimated_end ? new Date(rows[0].estimated_end).toISOString() : null,
        };
        cacheExpiry = now + 30 * 1000;
        return maintenanceCache;
    } catch (error) {
        // Nếu bảng chưa được tạo hoặc lỗi DB thì trả về không bảo trì để hệ thống hoạt động
        return {
            active: false,
            title: '',
            message: '',
            estimatedEnd: null,
        };
    }
}

export function invalidateMaintenanceCache() {
    cacheExpiry = 0;
    maintenanceCache = null;
}

export const checkMaintenance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const status = await getMaintenanceStatus();
        if (!status.active) {
            return next();
        }

        // Cho phép qua các route đặc biệt: health check, system status, đăng nhập, route quản trị
        const path = req.path;
        const allowedPaths = ['/health', '/api/health', '/api/system/status', '/api/auth/login', '/api/auth/logout'];
        if (allowedPaths.some((p) => path.startsWith(p)) || path.startsWith('/api/admin')) {
            return next();
        }

        // Kiểm tra quyền Admin qua JWT cookie hoặc Authorization header
        try {
            const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
            if (token && process.env.JWT_SECRET) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
                if (decoded && decoded.role === 'ADMIN') {
                    return next();
                }
            }
        } catch {
            // Bỏ qua nếu token hết hạn hoặc không hợp lệ
        }

        return res.status(503).json({
            success: false,
            maintenance: true,
            title: status.title,
            message: status.message,
            estimatedEnd: status.estimatedEnd,
        });
    } catch {
        next(); // Không chặn người dùng nếu truy vấn DB gặp sự cố
    }
};
