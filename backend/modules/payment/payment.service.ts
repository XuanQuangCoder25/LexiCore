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
    getOrderByReference,
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
// SePay Integration (VietQR + Webhook)
// ============================================================

export const initSepayPayment = async (userId: string, packageId: string) => {
    const pkg = await getPackageById(packageId);
    if (!pkg) throw new AppError('Gói không tồn tại', 404);

    const finalPrice = calcFinalPrice(pkg);
    if (finalPrice <= 0) {
        throw new AppError('Gói miễn phí không cần thanh toán qua ngân hàng', 400);
    }

    // Sinh mã tham chiếu ngắn gọn, duy nhất: LC + 6 số ngẫu nhiên (ví dụ: LC582914)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    const paymentReference = `LC${randomSuffix}`;

    const orderId = await createPaymentOrder(
        userId,
        packageId,
        finalPrice,
        'SEPAY',
        paymentReference
    );

    const bankCode = process.env.SEPAY_BANK_CODE || 'MB';
    const accNumber = process.env.SEPAY_ACC_NUMBER || '0000000000';
    const accName = process.env.SEPAY_ACC_NAME || 'LEXICORE';

    // Tạo URL ảnh VietQR chuẩn quét được trên 100% app ngân hàng VN qua SePay VietQR engine
    const qrUrl = `https://qr.sepay.vn/img?bank=${encodeURIComponent(bankCode)}&acc=${encodeURIComponent(accNumber)}&template=compact&amount=${finalPrice}&des=${encodeURIComponent(paymentReference)}`;

    return {
        orderId,
        paymentReference,
        amountVnd: finalPrice,
        bankCode,
        accountNumber: accNumber,
        accountName: accName,
        qrUrl,
    };
};

export interface SepayWebhookPayload {
    id: number;
    gateway: string;
    transactionDate: string;
    accountNumber: string;
    code: string | null;
    content: string;
    transferType: 'in' | 'out';
    transferAmount: number;
    accumulated: number;
    subAccount: string | null;
    referenceCode: string;
    description: string;
}

export const handleSepayWebhook = async (
    payload: SepayWebhookPayload,
    authorizationHeader?: string
) => {
    // 1. Kiểm tra API Key nếu cấu hình trong .env
    const configuredApiKey = process.env.SEPAY_API_KEY;
    if (configuredApiKey) {
        const token = authorizationHeader?.replace(/^Apikey\s+/i, '').trim();
        if (token !== configuredApiKey) {
            throw new AppError('Xác thực SePay webhook thất bại: API Key không hợp lệ', 401);
        }
    }

    // Chỉ xử lý giao dịch tiền vào (transferType = 'in')
    if (payload.transferType && payload.transferType !== 'in') {
        return { success: true, message: 'Bỏ qua giao dịch tiền ra' };
    }

    // 2. Hỗ trợ test webhook từ SePay Dashboard (khi admin bấm "Test Webhook" hoặc "Gửi thử")
    if (
        payload.id === 0 ||
        payload.code === 'TEST' ||
        payload.referenceCode === 'TEST123456' ||
        (payload.content && payload.content.toLowerCase().includes('test'))
    ) {
        console.log('[SePay Webhook] Nhận được tín hiệu Test Webhook từ SePay Dashboard. Trả về 200 OK.');
        return { success: true, message: 'Test webhook thành công!' };
    }

    // 3. Bóc tách paymentReference từ code hoặc content
    let matchRef = payload.code ? payload.code.trim().toUpperCase() : null;
    if (matchRef && !matchRef.startsWith('LC') && /^\d{6}$/.test(matchRef)) {
        matchRef = `LC${matchRef}`;
    }
    if (!matchRef && payload.content) {
        const match = payload.content.match(/LC\d{6}/i);
        if (match) {
            matchRef = match[0].toUpperCase();
        }
    }

    if (!matchRef) {
        console.warn('[SePay Webhook] Không tìm thấy mã tham chiếu trong nội dung:', payload.content);
        return { success: false, message: 'Không tìm thấy mã tham chiếu' };
    }

    // 3. Tìm order trong database
    const order = await getOrderByReference(matchRef);
    if (!order) {
        console.warn(`[SePay Webhook] Không tìm thấy đơn hàng với mã tham chiếu: ${matchRef}`);
        return { success: false, message: 'Đơn hàng không tồn tại' };
    }

    // 4. Idempotency Check: Nếu đơn đã thành công trước đó thì return success ngay (tránh kích hoạt 2 lần)
    if (order.status === 'SUCCESS') {
        console.log(`[SePay Webhook] Đơn hàng ${order.id} (${matchRef}) đã được xử lý trước đó.`);
        return { success: true, message: 'Đơn hàng đã được xử lý' };
    }

    // 5. Kiểm tra số tiền chuyển có khớp hoặc đủ với giá trị đơn hàng
    if (Number(payload.transferAmount) < Number(order.amount_vnd)) {
        console.warn(
            `[SePay Webhook] Số tiền không đủ: chuyển ${payload.transferAmount}, yêu cầu ${order.amount_vnd}`
        );
        return { success: false, message: 'Số tiền thanh toán chưa đủ' };
    }

    // 6. ACID Transaction xử lý kích hoạt gói hoặc cộng coin/diamond
    const conn = await (pool as any).getConnection();
    try {
        await conn.beginTransaction();

        const gatewayTxnId = payload.referenceCode || String(payload.id);
        await conn.execute(
            `UPDATE payment_orders 
             SET status = 'SUCCESS', 
                 gateway = 'SEPAY',
                 gateway_txn_id = ?, 
                 gateway_response = ?,
                 updated_at = NOW() 
             WHERE id = ?`,
            [gatewayTxnId, JSON.stringify(payload), order.id]
        );

        // Kích hoạt subscription nếu là gói SUBSCRIPTION
        if (order.package_type === 'SUBSCRIPTION' && order.tier && order.duration_days) {
            await activateSubscription(
                conn,
                order.user_id,
                order.package_id,
                order.tier,
                order.duration_days
            );
        }

        // Cộng coin / diamond nếu là topup pack
        if (order.coin_amount > 0 || order.diamond_amount > 0) {
            await creditWalletAfterPurchase(
                conn,
                order.user_id,
                order.coin_amount,
                order.diamond_amount
            );
        }

        // Tạo thông báo in-app
        const notifId = uuidv4();
        await conn.execute(
            `INSERT INTO notifications (id, user_id, type, title, body)
             VALUES (?, ?, 'payment', 'Thanh toán thành công', ?)`,
            [
                notifId,
                order.user_id,
                `Giao dịch thanh toán gói ${order.package_name} qua chuyển khoản đã hoàn tất thành công!`,
            ]
        );

        await conn.commit();
        console.log(`[SePay Webhook] ✅ Kích hoạt thành công đơn hàng ${order.id} (${matchRef})!`);

        return {
            success: true,
            message: 'Kích hoạt đơn hàng thành công',
            orderId: order.id,
            coinEarned: order.coin_amount,
            diamondEarned: order.diamond_amount,
        };
    } catch (err) {
        await conn.rollback();
        console.error('[SePay Webhook] Lỗi khi xử lý transaction:', err);
        throw err;
    } finally {
        conn.release();
    }
};

// ============================================================
// Orders
// ============================================================

export const getMyOrders = async (userId: string) => {
    return getUserOrders(userId, 20);
};
