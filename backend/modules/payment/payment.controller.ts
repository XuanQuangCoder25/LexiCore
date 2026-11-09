import { Request, Response, NextFunction } from 'express';
import {
    getPackages,
    getMySubscription,
    getMyTransactions,
    patchSubscriptionSettings,
    payWithWallet,
    activateTrialPlan,
    initMockPayment,
    confirmMockPayment,
    initVNPayPayment,
    handleVNPayReturn,
    getMyOrders,
} from './payment.service';
import { getPackageById } from './payment.repository';

// ─── Packages ─────────────────────────────────────────────────────────────────

// GET /api/payment/packages
export const listPackages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await getPackages();
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

// ─── My Subscription ──────────────────────────────────────────────────────────

// GET /api/payment/my-subscription
export const mySubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id as string;
        const data   = await getMySubscription(userId);
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

// PATCH /api/payment/my-subscription
export const patchSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id as string;
        const { auto_renew, email_reminder } = req.body as {
            auto_renew?: boolean;
            email_reminder?: boolean;
        };
        const data = await patchSubscriptionSettings(userId, { auto_renew, email_reminder });
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

// ─── My Transactions ─────────────────────────────────────────────────────────

// GET /api/payment/my-transactions
export const myTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id as string;
        const data   = await getMyTransactions(userId);
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

// ─── Wallet Pay ──────────────────────────────────────────────────────────────

// POST /api/payment/wallet/pay
export const walletPay = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId    = (req as any).user.id as string;
        const { packageId } = req.body as { packageId: string };
        if (!packageId) {
            res.status(400).json({ success: false, message: 'packageId la bat buoc' });
            return;
        }
        const data = await payWithWallet(userId, packageId);
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

// ─── Trial ───────────────────────────────────────────────────────────────────

// POST /api/payment/trial/activate
export const activateTrial = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id as string;
        // Tìm gói trial trong DB
        const { packageId } = req.body as { packageId?: string };
        if (!packageId) {
            res.status(400).json({ success: false, message: 'packageId la bat buoc' });
            return;
        }
        const pkg = await getPackageById(packageId);
        if (!pkg || !pkg.is_trial) {
            res.status(404).json({ success: false, message: 'Goi dung thu khong ton tai' });
            return;
        }
        const data = await activateTrialPlan(userId, pkg);
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

// ─── Mock Payment ─────────────────────────────────────────────────────────────

// POST /api/payment/mock/init
export const initMock = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId    = (req as any).user.id as string;
        const { packageId } = req.body as { packageId: string };
        if (!packageId) {
            res.status(400).json({ success: false, message: 'packageId la bat buoc' });
            return;
        }
        const result = await initMockPayment(userId, packageId);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

// POST /api/payment/mock/confirm
export const confirmMock = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId  = (req as any).user.id as string;
        const orderId = (req.query.orderId || req.body.orderId) as string;
        if (!orderId) {
            res.status(400).json({ success: false, message: 'orderId la bat buoc' });
            return;
        }
        const result = await confirmMockPayment(userId, orderId);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

// ─── VNPay ───────────────────────────────────────────────────────────────────

// POST /api/payment/vnpay/init
export const initVNPay = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id as string;
        const { packageId } = req.body as { packageId: string };
        const ipAddr =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            req.socket.remoteAddress ||
            '127.0.0.1';
        if (!packageId) {
            res.status(400).json({ success: false, message: 'packageId la bat buoc' });
            return;
        }
        const result = await initVNPayPayment(userId, packageId, ipAddr);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

// GET /api/payment/vnpay/return
export const vnpayReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query  = req.query as Record<string, string>;
        const result = await handleVNPayReturn(query);
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        if (result.success) {
            res.redirect(`${clientUrl}/?payment=success&coin=${result.coinEarned}&diamond=${result.diamondEarned}`);
        } else {
            res.redirect(`${clientUrl}/?payment=failed`);
        }
    } catch (err) { next(err); }
};

// ─── Orders ──────────────────────────────────────────────────────────────────

// GET /api/payment/orders
export const myOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id as string;
        const orders = await getMyOrders(userId);
        res.json({ success: true, data: orders });
    } catch (err) { next(err); }
};
