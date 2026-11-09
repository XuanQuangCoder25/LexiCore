import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../config/mysql';
import { AppError } from '../../errors/AppError';
import {
    getAllPackages,
    getPackageById,
    createPaymentOrder,
    updateOrderStatus,
    creditWalletAfterPurchase,
    getUserOrders,
    getUserTransactions,
    getUserSubscription,
    activateSubscription,
    updateSubscriptionSettings,
    getVndBalance,
    topupWalletVnd,
    deductWalletVnd,
    hasUsedTrial,
    markTrialUsed,
    CreditPackage,
} from './payment.repository';

// ============================================================
// Helpers
// ============================================================

export function calcFinalPrice(pkg: CreditPackage): number {
    if (pkg.sale_percent > 0 && pkg.sale_ends_at) {
        const now = new Date();
        const saleEnd = new Date(pkg.sale_ends_at);
        if (now < saleEnd) {
            return Math.round(pkg.price_vnd * (1 - pkg.sale_percent / 100));
        }
    }
    return pkg.price_vnd;
}

function sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    Object.keys(obj).sort().forEach(key => { sorted[key] = obj[key]; });
    return sorted;
}

function toQueryString(obj: Record<string, string>): string {
    return new URLSearchParams(obj).toString();
}

// ============================================================
// Packages
// ============================================================

export const getPackages = async () => {
    const packages = await getAllPackages();
    return {
        subscription:   packages.filter(p => p.package_type === 'SUBSCRIPTION'),
        coin_packs:     packages.filter(p => p.package_type === 'COIN_PACK'),
        diamond_packs:  packages.filter(p => p.package_type === 'DIAMOND_PACK'),
        bundles:        packages.filter(p => p.package_type === 'BUNDLE'),
    };
};

// ============================================================
// My Subscription (dashboard)
// ============================================================

export const getMySubscription = async (userId: string) => {
    const [sub, vndBalance] = await Promise.all([
        getUserSubscription(userId),
        getVndBalance(userId),
    ]);

    // Lấy coin/diamond balance từ wallets
    const [walletRows] = await (pool as any).execute(
        `SELECT coin_balance, diamond_balance FROM wallets WHERE user_id = ?`,
        [userId]
    );
    const wallet = walletRows[0] ?? { coin_balance: 0, diamond_balance: 0 };

    return {
        tier:              sub ? sub.tier : 'FREE',
        startedAt:         sub ? sub.started_at : null,
        expiresAt:         sub ? sub.expires_at : null,
        autoRenew:         sub ? sub.auto_renew : false,
        emailReminder:     sub ? sub.email_reminder : true,
        coinBalance:       Number(wallet.coin_balance),
        diamondBalance:    Number(wallet.diamond_balance),
        walletBalanceVnd:  vndBalance,
    };
};

// ============================================================
// My Transactions (dashboard)
// ============================================================

export const getMyTransactions = async (userId: string) => {
    return getUserTransactions(userId, 30);
};

// ============================================================
// Patch subscription settings (auto_renew, email_reminder)
// ============================================================

export const patchSubscriptionSettings = async (
    userId: string,
    body: { auto_renew?: boolean; email_reminder?: boolean }
) => {
    await updateSubscriptionSettings(userId, body.auto_renew, body.email_reminder);
    return { success: true };
};

// ============================================================
// Wallet Pay (mua gói bằng Ví LexiCore)
// ============================================================

export const payWithWallet = async (userId: string, packageId: string) => {
    const pkg = await getPackageById(packageId);
    if (!pkg) throw new AppError('Goi khong ton tai', 404);

    // Gói trial
    if (pkg.is_trial) {
        return activateTrialPlan(userId, pkg);
    }

    const finalPrice = calcFinalPrice(pkg);
    if (finalPrice === 0) throw new AppError('Logic gia sai', 400);

    const conn = await (pool as any).getConnection();
    try {
        await conn.beginTransaction();

        // Trừ tiền ví
        const ok = await deductWalletVnd(conn, userId, finalPrice);
        if (!ok) throw new AppError('So du Vi LexiCore khong du', 400);

        // Tạo đơn thanh toán
        const orderId = uuidv4();
        await conn.execute(
            `INSERT INTO payment_orders (id, user_id, package_id, amount_vnd, gateway, status, gateway_txn_id)
             VALUES (?, ?, ?, ?, 'WALLET', 'SUCCESS', ?)`,
            [orderId, userId, packageId, finalPrice, `WALLET_${orderId.slice(0, 8).toUpperCase()}`]
        );

        // Cộng coin/diamond (nếu là topup pack)
        if (pkg.coin_amount > 0 || pkg.diamond_amount > 0) {
            await creditWalletAfterPurchase(conn, userId, pkg.coin_amount, pkg.diamond_amount);
        }

        // Kích hoạt subscription (nếu là gói hội viên)
        if (pkg.package_type === 'SUBSCRIPTION' && pkg.tier && pkg.duration_days) {
            await activateSubscription(conn, userId, packageId, pkg.tier as any, pkg.duration_days);
        }

        await conn.commit();
        return {
            success: true,
            orderId,
            message: 'Thanh toan thanh cong qua Vi LexiCore!',
            coinEarned:    pkg.coin_amount,
            diamondEarned: pkg.diamond_amount,
            amountVnd:     finalPrice,
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// ============================================================
// Activate Trial
// ============================================================

export const activateTrialPlan = async (userId: string, pkg: CreditPackage) => {
    const alreadyUsed = await hasUsedTrial(userId);
    if (alreadyUsed) throw new AppError('Ban da su dung goi dung thu roi', 400);
    if (!pkg.duration_days) throw new AppError('Goi dung thu cau hinh sai', 500);

    const conn = await (pool as any).getConnection();
    try {
        await conn.beginTransaction();

        // Tạo đơn với amount = 0
        const orderId = uuidv4();
        await conn.execute(
            `INSERT INTO payment_orders (id, user_id, package_id, amount_vnd, gateway, status, gateway_txn_id)
             VALUES (?, ?, ?, 0, 'MOCK', 'SUCCESS', ?)`,
            [orderId, userId, pkg.id, `TRIAL_${orderId.slice(0, 8).toUpperCase()}`]
        );

        await activateSubscription(conn, userId, pkg.id, pkg.tier as any ?? 'PRO', pkg.duration_days);
        await markTrialUsed(conn, userId);

        await conn.commit();
        return {
            success: true,
            orderId,
            message: 'Kich hoat goi dung thu thanh cong! Chuc ban hoc tot.',
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// ============================================================
// Mock Payment (demo/test)
// ============================================================

export const initMockPayment = async (userId: string, packageId: string) => {
    const pkg = await getPackageById(packageId);
    if (!pkg) throw new AppError('Goi khong ton tai', 404);

    const finalPrice = calcFinalPrice(pkg);
    const orderId = await createPaymentOrder(userId, packageId, finalPrice, 'MOCK');

    return {
        orderId,
        packageName: pkg.name,
        amountVnd: finalPrice,
        gateway: 'MOCK',
        payUrl: `/api/payment/mock/confirm?orderId=${orderId}`,
    };
};

export const confirmMockPayment = async (userId: string, orderId: string) => {
    const [rows] = await (pool as any).execute(
        `SELECT po.*, cp.coin_amount, cp.diamond_amount, cp.package_type, cp.duration_days, cp.tier, cp.is_trial
         FROM payment_orders po
         JOIN credit_packages cp ON po.package_id = cp.id
         WHERE po.id = ? AND po.user_id = ? AND po.status = 'PENDING'`,
        [orderId, userId]
    );

    if (!rows || rows.length === 0) {
        throw new AppError('Don hang khong ton tai hoac da duoc xu ly', 404);
    }

    const order = rows[0] as any;
    const conn = await (pool as any).getConnection();

    try {
        await conn.beginTransaction();

        await creditWalletAfterPurchase(conn, userId, order.coin_amount, order.diamond_amount);

        if (order.package_type === 'SUBSCRIPTION' && order.tier && order.duration_days) {
            await activateSubscription(conn, userId, order.package_id, order.tier, order.duration_days);
        }

        const mockTxnId = `MOCK_${uuidv4().slice(0, 8).toUpperCase()}`;
        await conn.execute(
            `UPDATE payment_orders SET status = 'SUCCESS', gateway_txn_id = ?, updated_at = NOW() WHERE id = ?`,
            [mockTxnId, orderId]
        );

        await conn.commit();
        return {
            success: true,
            message: 'Thanh toan thanh cong!',
            coinEarned:    order.coin_amount,
            diamondEarned: order.diamond_amount,
            txnId:         mockTxnId,
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// ============================================================
// VNPay Integration
// ============================================================

export const initVNPayPayment = async (userId: string, packageId: string, ipAddr: string) => {
    const pkg = await getPackageById(packageId);
    if (!pkg) throw new AppError('Goi khong ton tai', 404);

    const tmnCode   = process.env.VNPAY_TMN_CODE   || 'SANDBOX';
    const secretKey = process.env.VNPAY_HASH_SECRET || 'SANDBOX_SECRET';
    const vnpUrl    = process.env.VNPAY_URL         || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = process.env.VNPAY_RETURN_URL  || 'http://localhost:5000/api/payment/vnpay/return';

    const finalPrice = calcFinalPrice(pkg);
    const orderId    = await createPaymentOrder(userId, packageId, finalPrice, 'VNPAY');

    const date       = new Date();
    const createDate = date.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);

    const params: Record<string, string> = {
        vnp_Version:   '2.1.0',
        vnp_Command:   'pay',
        vnp_TmnCode:   tmnCode,
        vnp_Locale:    'vn',
        vnp_CurrCode:  'VND',
        vnp_TxnRef:    orderId.slice(0, 8),
        vnp_OrderInfo: `Thanh toan LexiCore: ${pkg.name}`,
        vnp_OrderType: 'other',
        vnp_Amount:    String(finalPrice * 100),
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr:    ipAddr,
        vnp_CreateDate: createDate,
    };

    const sortedParams = sortObject(params);
    const signData     = toQueryString(sortedParams);
    const hmac         = crypto.createHmac('sha512', secretKey);
    const signed       = hmac.update(signData).digest('hex');

    sortedParams['vnp_SecureHash'] = signed;
    const payUrl = `${vnpUrl}?${toQueryString(sortedParams)}`;

    return { orderId, payUrl, amountVnd: finalPrice };
};

export const handleVNPayReturn = async (query: Record<string, string>) => {
    const secretKey  = process.env.VNPAY_HASH_SECRET || 'SANDBOX_SECRET';
    const secureHash = query['vnp_SecureHash'];

    const params = { ...query };
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];
    const sortedParams = sortObject(params);
    const signData     = toQueryString(sortedParams);
    const hmac         = crypto.createHmac('sha512', secretKey);
    const signed       = hmac.update(signData).digest('hex');

    if (signed !== secureHash) throw new AppError('Chu ky khong hop le', 400);

    const responseCode  = query['vnp_ResponseCode'];
    const txnRef        = query['vnp_TxnRef'];
    const transactionNo = query['vnp_TransactionNo'];

    const [rows] = await (pool as any).execute(
        `SELECT po.*, cp.coin_amount, cp.diamond_amount, cp.package_type, cp.duration_days, cp.tier
         FROM payment_orders po
         JOIN credit_packages cp ON po.package_id = cp.id
         WHERE po.id LIKE ? AND po.status = 'PENDING'`,
        [`${txnRef}%`]
    );

    if (!rows || rows.length === 0) return { success: false, message: 'Don hang khong tim thay' };

    const order = rows[0] as any;

    if (responseCode === '00') {
        const conn = await (pool as any).getConnection();
        try {
            await conn.beginTransaction();
            await creditWalletAfterPurchase(conn, order.user_id, order.coin_amount, order.diamond_amount);
            if (order.package_type === 'SUBSCRIPTION' && order.tier && order.duration_days) {
                await activateSubscription(conn, order.user_id, order.package_id, order.tier, order.duration_days);
            }
            await conn.execute(
                `UPDATE payment_orders SET status = 'SUCCESS', gateway_txn_id = ?, updated_at = NOW() WHERE id = ?`,
                [transactionNo, order.id]
            );
            await conn.commit();
            return { success: true, message: 'Thanh toan thanh cong!', coinEarned: order.coin_amount, diamondEarned: order.diamond_amount };
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    } else {
        await updateOrderStatus(order.id, 'FAILED', transactionNo, { responseCode });
        return { success: false, message: 'Thanh toan that bai hoac bi huy' };
    }
};

// ============================================================
// Orders
// ============================================================

export const getMyOrders = async (userId: string) => {
    return getUserOrders(userId, 20);
};
