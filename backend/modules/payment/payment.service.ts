import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../config/mysql';
import { AppError } from '../../errors/AppError';
import {
    getAllPackages,
    getPackageById,
    createPaymentOrder,
    generateUniqueOrderCode,
    setOrderCode,
    getOrderStatus,
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
    getInvoiceByOrderId,
    cancelPendingOrdersOfUser,
    CreditPackage,
} from './payment.repository';
import { getActiveCampaigns } from './campaign.repository';
export { claimCampaignGift, claimRewardCampaign, getActiveRewardCampaigns } from './campaign.service';
import { sendSubscriptionSuccessEmail } from '../email/email.service';

// ============================================================
// Helpers
// ============================================================

export function calcFinalPrice(pkg: CreditPackage): number {
    if (pkg.sale_percent > 0 && pkg.sale_ends_at) {
        const now = new Date();
        const saleStart = pkg.sale_starts_at ? new Date(pkg.sale_starts_at) : new Date(0);
        const saleEnd = new Date(pkg.sale_ends_at);
        if (now >= saleStart && now < saleEnd) {
            return Math.round(pkg.price_vnd * (1 - pkg.sale_percent / 100));
        }
    }
    return pkg.price_vnd;
}

// ============================================================
// Packages (Tự động tích hợp Campaign Free Trial và lọc Trial đã dùng)
// ============================================================

export const getPackages = async (userId?: string) => {
    let activeCampaigns: any[] = [];
    try {
        activeCampaigns = await getActiveCampaigns();
    } catch (err) {
        console.error('[Campaign] Chưa thể tải active campaigns (vui lòng kiểm tra migration bảng subscription_campaigns):', err);
    }
    const packages = await getAllPackages();
    let subscriptions = packages.filter(p => p.package_type === 'SUBSCRIPTION');

    // Nếu user đã từng dùng trial, ẩn gói trial chào mừng mặc định đi
    if (userId) {
        const usedTrial = await hasUsedTrial(userId);
        if (usedTrial) {
            subscriptions = subscriptions.filter(p => !p.is_trial);
        }
    }

    // Nếu có chiến dịch tặng Trial đang hoạt động, chèn vào đầu danh sách
    if (activeCampaigns.length > 0) {
        const camp = activeCampaigns[0];
        const campaignPkg: CreditPackage = {
            id: `campaign-${camp.id}`,
            name: camp.name,
            slug: `campaign-${camp.id}`,
            package_type: 'SUBSCRIPTION',
            tier: camp.tier,
            price_vnd: 0,
            price_usd: 0,
            coin_amount: 0,
            diamond_amount: 0,
            duration_days: camp.duration_days,
            sale_percent: 0,
            sale_ends_at: null,
            features: [
                `Trải nghiệm đầy đủ đặc quyền gói ${camp.tier}`,
                `Thời hạn quà tặng ${camp.duration_days} ngày`,
                'Sự kiện giới hạn dành cho tất cả thành viên',
            ],
            display_order: 0, // Đứng đầu tiên
            is_active: true,
            is_trial: true,
            campaign_id: camp.id,
        };

        subscriptions.unshift(campaignPkg);
    }

    return {
        subscription:   subscriptions,
        coin_packs:     packages.filter(p => p.package_type === 'COIN_PACK'),
        diamond_packs:  packages.filter(p => p.package_type === 'DIAMOND_PACK'),
        bundles:        packages.filter(p => p.package_type === 'BUNDLE'),
    };
};

// ============================================================
// My Subscription (dashboard)
// ============================================================

export const getMySubscription = async (userId: string) => {
    const [sub, vndBalance, trialUsed] = await Promise.all([
        getUserSubscription(userId),
        getVndBalance(userId),
        hasUsedTrial(userId),
    ]);

    // Lấy coin/diamond balance từ wallets
    const [walletRows] = await (pool as any).execute(
        `SELECT coin_balance, diamond_balance FROM wallets WHERE user_id = ?`,
        [userId]
    );
    const wallet = walletRows[0] ?? { coin_balance: 0, diamond_balance: 0 };

    return {
        tier:              sub ? sub.tier : 'FREE',
        packageId:         sub ? (sub as any).package_id : null,
        durationDays:      sub ? (sub as any).duration_days : null,
        startedAt:         sub ? sub.started_at : null,
        expiresAt:         sub ? sub.expires_at : null,
        autoRenew:         sub ? sub.auto_renew : false,
        emailReminder:     sub ? sub.email_reminder : true,
        coinBalance:       Number(wallet.coin_balance),
        diamondBalance:    Number(wallet.diamond_balance),
        walletBalanceVnd:  vndBalance,
        hasUsedTrial:      trialUsed,
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
    // Nếu người dùng muốn BẬT tự động gia hạn, kiểm tra điều kiện gói hợp lệ
    if (body.auto_renew === true) {
        const sub = await getUserSubscription(userId);
        if (!sub) {
            throw new AppError('Bạn chưa đăng ký gói hội viên nào để bật tự động gia hạn', 400);
        }
        if (sub.tier === 'TRIAL') {
            throw new AppError('Gói dùng thử không áp dụng tính năng tự động gia hạn', 400);
        }
        // Kiểm tra thông tin gói cước trong credit_packages
        const pkg = await getPackageById((sub as any).package_id);
        if (pkg && (pkg.is_trial || pkg.price_vnd <= 0)) {
            throw new AppError('Gói dùng thử hoặc gói sự kiện miễn phí không áp dụng tính năng tự động gia hạn', 400);
        }
    }

    await updateSubscriptionSettings(userId, body.auto_renew, body.email_reminder);
    return { success: true };
};

// ============================================================
// Wallet Pay (mua gói bằng Ví LexiCore)
// ============================================================

export const payWithWallet = async (userId: string, packageId: string) => {
    const pkg = await getPackageById(packageId);
    if (!pkg) throw new AppError('Gói không tồn tại', 404);

    // Gói trial
    if (pkg.is_trial) {
        return activateTrialPlan(userId, pkg);
    }

    const finalPrice = calcFinalPrice(pkg);
    if (finalPrice === 0) throw new AppError('Giá trị gói thanh toán không hợp lệ', 400);

    const conn = await (pool as any).getConnection();
    try {
        await conn.beginTransaction();

        // Trừ tiền ví
        const ok = await deductWalletVnd(conn, userId, finalPrice);
        if (!ok) throw new AppError('Số dư Ví LexiCore không đủ để thanh toán', 400);

        // Tạo đơn thanh toán
        const orderId = uuidv4();
        const [orderResult] = await conn.execute(
            `INSERT INTO payment_orders (id, user_id, package_id, amount_vnd, gateway, status, gateway_txn_id)
             VALUES (?, ?, ?, ?, 'WALLET', 'SUCCESS', ?)`,
            [orderId, userId, packageId, finalPrice, `WALLET_${orderId.slice(0, 8).toUpperCase()}`]
        ) as any;
        const orderCode = `LC${orderResult.insertId}`;
        await conn.execute(
            `UPDATE payment_orders SET payment_reference = ? WHERE id = ?`,
            [orderCode, orderId]
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
            message: 'Thanh toán thành công qua Ví LexiCore!',
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
    if (alreadyUsed) throw new AppError('Bạn đã sử dụng gói dùng thử rồi', 400);
    if (!pkg.duration_days) throw new AppError('Gói dùng thử cấu hình chưa chính xác', 500);

    const conn = await (pool as any).getConnection();
    try {
        await conn.beginTransaction();

        // Tạo đơn với amount = 0
        const orderId = uuidv4();
        const [trialOrderResult] = await conn.execute(
            `INSERT INTO payment_orders (id, user_id, package_id, amount_vnd, gateway, status, gateway_txn_id)
             VALUES (?, ?, ?, 0, 'MOCK', 'SUCCESS', ?)`,
            [orderId, userId, pkg.id, `TRIAL_${orderId.slice(0, 8).toUpperCase()}`]
        ) as any;
        const trialOrderCode = `LC${trialOrderResult.insertId}`;
        await conn.execute(
            `UPDATE payment_orders SET payment_reference = ? WHERE id = ?`,
            [trialOrderCode, orderId]
        );

        await activateSubscription(conn, userId, pkg.id, pkg.tier as any ?? 'PRO', pkg.duration_days);
        await markTrialUsed(conn, userId);

        await conn.commit();
        return {
            success: true,
            orderId,
            message: 'Kích hoạt gói dùng thử thành công! Chúc bạn học tốt.',
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
    if (!pkg) throw new AppError('Gói không tồn tại', 404);

    // Tự động hủy các đơn PENDING cũ của user trước khi tạo đơn mới
    await cancelPendingOrdersOfUser(userId);

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
        throw new AppError('Đơn hàng không tồn tại hoặc đã được xử lý', 404);
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
            message: 'Thanh toán thành công!',
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

    // Tự động hủy các đơn PENDING cũ của user trước khi tạo đơn mới
    await cancelPendingOrdersOfUser(userId);

    // Tạo đơn trước, sau đó sinh order code duy nhất
    const orderId = await createPaymentOrder(userId, packageId, finalPrice, 'SEPAY');

    // Sinh order_code ngẫu nhiên, đảm bảo không trùng (ví dụ: LC583421)
    const orderCode = await generateUniqueOrderCode();
    await setOrderCode(orderId, orderCode);

    const bankCode    = process.env.SEPAY_BANK_CODE   || 'BIDV';
    const accNumber   = process.env.SEPAY_ACC_NUMBER  || '0000000000';
    const accName     = process.env.SEPAY_ACC_NAME    || 'LEXICORE';
    // BIDV yêu cầu dùng số tài khoản ảo (VA) thay vì số TK thật
    const qrAcc       = process.env.SEPAY_VA_NUMBER   || accNumber;

    // Dùng vietqr.app (cùng chuẩn mà SePay dashboard dùng), VA cho BIDV
    const qrUrl = `https://vietqr.app/img?bank=${bankCode}&acc=${qrAcc}&amount=${finalPrice}&des=${orderCode}&template=compact`;

    return {
        orderId,
        orderCode,
        amountVnd: finalPrice,
        bankCode,
        accountNumber: accNumber,
        accountName:   accName,
        qrUrl,
    };
};

export const initWalletTopup = async (userId: string, amountVnd: number) => {
    if (!amountVnd || isNaN(amountVnd) || amountVnd < 10000) {
        throw new AppError('Số tiền nạp tối thiểu là 10.000 VNĐ', 400);
    }
    if (amountVnd > 50000000) {
        throw new AppError('Số tiền nạp tối đa mỗi lần là 50.000.000 VNĐ', 400);
    }

    // Tự động hủy các đơn PENDING cũ của user trước khi tạo đơn nạp mới
    await cancelPendingOrdersOfUser(userId);

    // Đảm bảo gói ảo pkg_wallet_topup tồn tại trong database
    const [existing] = await (pool as any).execute(
        `SELECT id FROM credit_packages WHERE slug = 'wallet-topup' OR id = 'pkg_wallet_topup' LIMIT 1`
    );
    let packageId = 'pkg_wallet_topup';
    if (!existing || existing.length === 0) {
        await (pool as any).execute(
            `INSERT INTO credit_packages (id, slug, name, package_type, price_vnd, price_usd, coin_amount, diamond_amount, display_order, is_trial, features, is_active)
             VALUES ('pkg_wallet_topup', 'wallet-topup', 'Nạp tiền Ví LexiCore', 'BUNDLE', 0, 0, 0, 0, 999, FALSE, '["Nạp tiền vào số dư Ví LexiCore"]', TRUE)`
        );
    } else {
        packageId = existing[0].id;
    }

    // Tạo đơn thanh toán, sau đó sinh order code duy nhất
    const orderId = await createPaymentOrder(userId, packageId, amountVnd, 'SEPAY');

    const orderCode = await generateUniqueOrderCode();
    await setOrderCode(orderId, orderCode);

    const bankCode    = process.env.SEPAY_BANK_CODE   || 'BIDV';
    const accNumber   = process.env.SEPAY_ACC_NUMBER  || '0000000000';
    const accName     = process.env.SEPAY_ACC_NAME    || 'LEXICORE';
    // BIDV yêu cầu dùng số tài khoản ảo (VA) thay vì số TK thật
    const qrAcc       = process.env.SEPAY_VA_NUMBER   || accNumber;

    // Dùng vietqr.app — cùng chuẩn mà SePay dashboard dùng, hỗ trợ VA cho BIDV
    const qrUrl = `https://vietqr.app/img?bank=${bankCode}&acc=${qrAcc}&amount=${amountVnd}&des=${orderCode}&template=compact`;

    return {
        orderId,
        orderCode,
        amountVnd,
        bankCode,
        accountNumber: accNumber,
        accountName:   accName,
        qrUrl,
        packageName: 'Nạp tiền Ví LexiCore',
        isWalletTopup: true,
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
    // Log toàn bộ payload để debug (sẽ xoá sau khi xác nhận hoạt động đúng)
    console.log('[SePay Webhook] Nhận webhook. Header Authorization:', authorizationHeader || '(không có)');
    console.log('[SePay Webhook] Payload:', JSON.stringify(payload));

    // 1. Kiểm tra API Key nếu cấu hình trong .env
    const configuredApiKey = process.env.SEPAY_API_KEY;
    if (configuredApiKey) {
        const rawToken = authorizationHeader || '';
        const token = rawToken.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '').trim();
        console.log('[SePay Webhook] API Key nhận được:', token ? token.slice(0, 8) + '...' : '(trống)');
        console.log('[SePay Webhook] API Key cấu hình:', configuredApiKey ? configuredApiKey.slice(0, 8) + '...' : '(chưa cấu hình)');
        if (token !== configuredApiKey) {
            console.error('[SePay Webhook] Xác thực thất bại! Key không khớp.');
            throw new AppError('Xác thực SePay webhook thất bại: API Key không hợp lệ', 401);
        }
        console.log('[SePay Webhook] Xác thực API Key thành công.');
    } else {
        console.warn('[SePay Webhook] CANH BAO: SEPAY_API_KEY chua duoc cau hinh, bo qua kiem tra xac thuc!');
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
    if (matchRef && !matchRef.startsWith('LC') && /^\d+$/.test(matchRef)) {
        matchRef = `LC${matchRef}`;
    }
    if (!matchRef && payload.content) {
        const match = payload.content.match(/LC\d+/i);
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

        const isWalletTopup =
            order.package_id === 'pkg_wallet_topup' ||
            order.slug === 'wallet-topup' ||
            (order.package_name && String(order.package_name).includes('Ví LexiCore'));

        if (isWalletTopup) {
            // Nạp tiền thẳng vào số dư Ví LexiCore (vnd_balance)
            await topupWalletVnd(conn, order.user_id, Number(order.amount_vnd));
            console.log(`[SePay Webhook] Đã nạp thành công ${order.amount_vnd} VNĐ vào Ví LexiCore của user ${order.user_id}`);
        } else {
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
        }

        // Tạo thông báo in-app
        const notifId = uuidv4();
        const notifTitle = isWalletTopup ? 'Nạp tiền ví thành công' : 'Thanh toán thành công';
        const notifBody = isWalletTopup
            ? `Bạn đã nạp thành công ${Number(order.amount_vnd).toLocaleString('vi-VN')} VNĐ vào Ví LexiCore!`
            : `Giao dịch thanh toán gói ${order.package_name} qua chuyển khoản đã hoàn tất thành công!`;

        await conn.execute(
            `INSERT INTO notifications (id, user_id, type, title, body)
             VALUES (?, ?, 'payment', ?, ?)`,
            [notifId, order.user_id, notifTitle, notifBody]
        );

        await conn.commit();
        console.log(`[SePay Webhook] Kích hoạt thành công đơn hàng ${order.id} (${matchRef})!`);

        // Gửi email biên lai tự động nếu là gói SUBSCRIPTION và user có email
        if (order.package_type === 'SUBSCRIPTION' && order.user_email) {
            const expiresAtDate = new Date(Date.now() + (Number(order.duration_days) || 30) * 86400 * 1000).toISOString();
            sendSubscriptionSuccessEmail({
                toEmail: order.user_email,
                fullName: order.user_full_name || 'Học viên',
                packageName: order.package_name || 'Hội viên LexiCore',
                orderCode: matchRef,
                amountVnd: Number(order.amount_vnd),
                durationDays: Number(order.duration_days) || 30,
                expiresAt: expiresAtDate,
            }).catch(err => {
                console.error('[SePay Webhook] Lỗi gửi email biên lai:', err);
            });
        }

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
// Kiểm tra trạng thái đơn hàng (dùng cho polling ở frontend)
// ============================================================

export const checkOrderStatus = async (userId: string, orderId: string) => {
    const result = await getOrderStatus(orderId);
    if (!result) throw new AppError('Đơn hàng không tồn tại', 404);
    return result;
};

// ============================================================
// Orders
// ============================================================

export const getMyOrders = async (userId: string) => {
    return getUserOrders(userId, 20);
};

// ============================================================
// Invoice (Hóa đơn điện tử)
// ============================================================

export const getInvoiceData = async (userId: string, orderId: string) => {
    const invoice = await getInvoiceByOrderId(orderId);
    if (!invoice) {
        throw new AppError('Hóa đơn không tồn tại', 404);
    }
    return {
        invoiceNumber: `Invoice_${invoice.payment_reference || invoice.order_id.slice(0, 8).toUpperCase()}`,
        orderId: invoice.order_id,
        orderCode: invoice.payment_reference || `LC${invoice.order_id.slice(0, 6).toUpperCase()}`,
        date: new Date(invoice.created_at).toLocaleString('vi-VN'),
        amountVnd: Number(invoice.amount_vnd),
        status: invoice.status === 'SUCCESS' ? 'PAID' : invoice.status,
        paymentMethod: invoice.gateway === 'WALLET' ? 'Ví LexiCore' : 'Chuyển khoản VietQR (SePay)',
        seller: {
            companyName: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ LEXICORE',
            taxCode: '52300055_52300054',
            address: 'LexiCore Tower, phường Tân Hưng, TP. HCM',
            email: 'support@lexicore.site',
            hotline: '52300055 52300044',
            website: 'https://lexicore.site',
        },
        customer: {
            name: invoice.customer_name || 'Học viên LexiCore',
            email: invoice.customer_email || 'hocvien@lexicore.site',
        },
        item: {
            name: invoice.package_name || 'Nạp tiền Ví LexiCore',
            quantity: 1,
            unitPriceVnd: Number(invoice.amount_vnd),
            totalVnd: Number(invoice.amount_vnd),
        },
    };
};
