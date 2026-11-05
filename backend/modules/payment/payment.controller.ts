import { Request, Response, NextFunction } from 'express';
import {
    getPackages,
    initMockPayment,
    confirmMockPayment,
    initVNPayPayment,
    handleVNPayReturn,
    getMyOrders,
} from './payment.service';

// GET /api/payment/packages
// Lấy danh sách tất cả gói (grouped theo type)
export const listPackages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await getPackages();
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

// POST /api/payment/mock/init
// Khởi tạo thanh toán Mock (để demo/test)
export const initMock = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id as string;
        const { packageId } = req.body as { packageId: string };

        if (!packageId) {
            res.status(400).json({ success: false, message: 'packageId là bắt buộc' });
            return;
        }

        const result = await initMockPayment(userId, packageId);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// POST /api/payment/mock/confirm
// Xác nhận thanh toán Mock (auto thành công)
export const confirmMock = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id as string;
        const orderId = (req.query.orderId || req.body.orderId) as string;

        if (!orderId) {
            res.status(400).json({ success: false, message: 'orderId là bắt buộc' });
            return;
        }

        const result = await confirmMockPayment(userId, orderId);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// POST /api/payment/vnpay/init
// Khởi tạo thanh toán VNPay, trả về payUrl
export const initVNPay = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id as string;
        const { packageId } = req.body as { packageId: string };
        const ipAddr =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            req.socket.remoteAddress ||
            '127.0.0.1';

        if (!packageId) {
            res.status(400).json({ success: false, message: 'packageId là bắt buộc' });
            return;
        }

        const result = await initVNPayPayment(userId, packageId, ipAddr);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// GET /api/payment/vnpay/return
// VNPay callback sau khi người dùng hoàn tất thanh toán
export const vnpayReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = req.query as Record<string, string>;
        const result = await handleVNPayReturn(query);

        // Redirect frontend dựa theo kết quả
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        if (result.success) {
            res.redirect(`${clientUrl}/?payment=success&coin=${result.coinEarned}&diamond=${result.diamondEarned}`);
        } else {
            res.redirect(`${clientUrl}/?payment=failed`);
        }
    } catch (err) {
        next(err);
    }
};

// GET /api/payment/orders
// Lịch sử đơn của user đang đăng nhập
export const myOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id as string;
        const orders = await getMyOrders(userId);
        res.json({ success: true, data: orders });
    } catch (err) {
        next(err);
    }
};

