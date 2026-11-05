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
    CreditPackage,
} from './payment.repository';

// Lấy tất cả gói, nhóm theo type
export const getPackages = async () => {
    const packages = await getAllPackages();

    const grouped = {
        subscription: packages.filter(p => p.package_type === 'SUBSCRIPTION'),
        coin_packs: packages.filter(p => p.package_type === 'COIN_PACK'),
        diamond_packs: packages.filter(p => p.package_type === 'DIAMOND_PACK'),
        bundles: packages.filter(p => p.package_type === 'BUNDLE'),
    };

    return grouped;
};

// Tính giá sau giảm giá
function calcFinalPrice(pkg: CreditPackage): number {
    if (pkg.sale_percent > 0 && pkg.sale_ends_at) {
        const now = new Date();
        const saleEnd = new Date(pkg.sale_ends_at);
        if (now < saleEnd) {
            return Math.round(pkg.price_vnd * (1 - pkg.sale_percent / 100));
        }
    }
    return pkg.price_vnd;
}

// Khởi tạo thanh toán Mock (để demo)
export const initMockPayment = async (userId: string, packageId: string) => {
    const pkg = await getPackageById(packageId);
    if (!pkg) throw new AppError('Gói không tồn tại', 404);

    const finalPrice = calcFinalPrice(pkg);
    const orderId = await createPaymentOrder(userId, packageId, finalPrice, 'MOCK');

    return {
        orderId,
        packageName: pkg.name,
        amountVnd: finalPrice,
        gateway: 'MOCK',
        // Mock: redirect URL giả lập
        payUrl: `/api/payment/mock/confirm?orderId=${orderId}`,
    };
};

// Xác nhận thanh toán Mock (auto thành công)
export const confirmMockPayment = async (userId: string, orderId: string) => {
    // Tìm đơn hàng
    const [rows] = await (pool as any).execute(
        `SELECT po.*, cp.coin_amount, cp.diamond_amount, cp.package_type, cp.duration_days
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

        // Cộng coin/diamond vào ví
        await creditWalletAfterPurchase(conn, userId, order.coin_amount, order.diamond_amount);

        // Nếu là subscription, có thể lưu thêm thông tin subscription (future work)
        // For now: chỉ cộng coin/diamond

        // Cập nhật trạng thái đơn
        const mockTxnId = `MOCK_${uuidv4().slice(0, 8).toUpperCase()}`;
        await conn.execute(
            `UPDATE payment_orders 
             SET status = 'SUCCESS', gateway_txn_id = ?, updated_at = NOW()
             WHERE id = ?`,
            [mockTxnId, orderId]
        );

        // Ghi billing transaction
        const txnId = uuidv4();
        await conn.execute(
            `INSERT INTO billing_transactions (id, user_id, amount, transaction_type, metadata)
             VALUES (?, ?, ?, 'BUY_ITEM', ?)`,
            [
                txnId, userId,
                order.coin_amount + order.diamond_amount * 10, // quy đổi tạm
                JSON.stringify({ order_id: orderId, gateway: 'MOCK', package_id: order.package_id })
            ]
        );

        await conn.commit();

        return {
            success: true,
            message: 'Thanh toán thành công!',
            coinEarned: order.coin_amount,
            diamondEarned: order.diamond_amount,
            txnId: mockTxnId,
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// ===== VNPay Integration =====
// Tham khảo: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html

function sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    Object.keys(obj).sort().forEach(key => {
        sorted[key] = obj[key];
    });
    return sorted;
}

function toQueryString(obj: Record<string, string>): string {
    return new URLSearchParams(obj).toString();
}

export const initVNPayPayment = async (
    userId: string,
    packageId: string,
    ipAddr: string
) => {
    const pkg = await getPackageById(packageId);
    if (!pkg) throw new AppError('Gói không tồn tại', 404);

    const tmnCode = process.env.VNPAY_TMN_CODE || 'SANDBOX';
    const secretKey = process.env.VNPAY_HASH_SECRET || 'SANDBOX_SECRET';
    const vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/payment/vnpay/return';

    const finalPrice = calcFinalPrice(pkg);
    const orderId = await createPaymentOrder(userId, packageId, finalPrice, 'VNPAY');

    const date = new Date();
    const createDate = date.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);

    const params: Record<string, string> = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: tmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderId.slice(0, 8), // Max 8 chars cho sandbox
        vnp_OrderInfo: `Thanh toan LexiCore: ${pkg.name}`,
        vnp_OrderType: 'other',
        vnp_Amount: String(finalPrice * 100), // VNPay nhân 100
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
    };

    const sortedParams = sortObject(params);
    const signData = toQueryString(sortedParams);
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(signData).digest('hex');

    sortedParams['vnp_SecureHash'] = signed;
    const payUrl = `${vnpUrl}?${toQueryString(sortedParams)}`;

    return { orderId, payUrl, amountVnd: finalPrice };
};

// Xử lý VNPay callback return
export const handleVNPayReturn = async (query: Record<string, string>) => {
    const secretKey = process.env.VNPAY_HASH_SECRET || 'SANDBOX_SECRET';
    const secureHash = query['vnp_SecureHash'];

    // Xác minh chữ ký
    const params = { ...query };
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];
    const sortedParams = sortObject(params);
    const signData = toQueryString(sortedParams);
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(signData).digest('hex');

    if (signed !== secureHash) {
        throw new AppError('Chữ ký không hợp lệ', 400);
    }

    const responseCode = query['vnp_ResponseCode'];
    const txnRef = query['vnp_TxnRef'];
    const transactionNo = query['vnp_TransactionNo'];

    // Tìm order bằng txnRef (8 ký tự đầu của orderId)
    const [rows] = await (pool as any).execute(
        `SELECT po.*, cp.coin_amount, cp.diamond_amount
         FROM payment_orders po
         JOIN credit_packages cp ON po.package_id = cp.id
         WHERE po.id LIKE ? AND po.status = 'PENDING'`,
        [`${txnRef}%`]
    );

    if (!rows || rows.length === 0) {
        return { success: false, message: 'Đơn hàng không tìm thấy' };
    }

    const order = rows[0] as any;

    if (responseCode === '00') {
        // Thanh toán thành công
        const conn = await (pool as any).getConnection();
        try {
            await conn.beginTransaction();
            await creditWalletAfterPurchase(conn, order.user_id, order.coin_amount, order.diamond_amount);
            await conn.execute(
                `UPDATE payment_orders SET status = 'SUCCESS', gateway_txn_id = ?, updated_at = NOW() WHERE id = ?`,
                [transactionNo, order.id]
            );
            await conn.commit();
            return { success: true, message: 'Thanh toán thành công!', coinEarned: order.coin_amount, diamondEarned: order.diamond_amount };
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    } else {
        await updateOrderStatus(order.id, 'FAILED', transactionNo, { responseCode });
        return { success: false, message: 'Thanh toán thất bại hoặc bị huỷ' };
    }
};

// Lấy lịch sử thanh toán của user
export const getMyOrders = async (userId: string) => {
    return getUserOrders(userId, 20);
};