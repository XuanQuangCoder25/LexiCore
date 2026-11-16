import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/mysql';
import { RowDataPacket } from 'mysql2';
import jwt from 'jsonwebtoken';

// Cache trang thai bao tri trong 30 giay de khong query DB moi request
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
        // Neu bang chua duoc tao hoac loi DB thi tra ve khong bao tri de he thong hoat dong
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

        // Cho phep qua cac route dac biet: health check, system status, dang nhap, route quan tri
        const path = req.path;
        const allowedPaths = ['/health', '/api/health', '/api/system/status', '/api/auth/login', '/api/auth/logout'];
        if (allowedPaths.some((p) => path.startsWith(p)) || path.startsWith('/api/admin')) {
            return next();
        }

        // Kiem tra quyen Admin qua JWT cookie hoac Authorization header
        try {
            const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
            if (token && process.env.JWT_SECRET) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
                if (decoded && decoded.role === 'ADMIN') {
                    return next();
                }
            }
        } catch {
            // Bo qua neu token het han hoac khong hop le
        }

        return res.status(503).json({
            success: false,
            maintenance: true,
            title: status.title,
            message: status.message,
            estimatedEnd: status.estimatedEnd,
        });
    } catch {
        next();
    }
};
