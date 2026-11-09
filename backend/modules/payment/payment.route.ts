import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import {
    listPackages,
    mySubscription,
    patchSubscription,
    myTransactions,
    walletPay,
    activateTrial,
    initMock,
    confirmMock,
    initVNPay,
    vnpayReturn,
    myOrders,
} from './payment.controller';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────
// Lấy danh sách gói (không cần đăng nhập để xem giá)
router.get('/packages', listPackages);

// VNPay callback không cần auth (gateway gọi trực tiếp)
router.get('/vnpay/return', vnpayReturn);

// ─── Protected ───────────────────────────────────────────────────────────────
router.use(requireAuth);

// Trạng thái hội viên & cài đặt
router.get('/my-subscription', mySubscription);
router.patch('/my-subscription', patchSubscription);

// Lịch sử giao dịch (format cho TransactionTable)
router.get('/my-transactions', myTransactions);

// Thanh toán qua Ví LexiCore
router.post('/wallet/pay', walletPay);

// Dùng thử
router.post('/trial/activate', activateTrial);

// Mock payment (demo/test)
router.post('/mock/init', initMock);
router.post('/mock/confirm', confirmMock);
router.get('/mock/confirm', confirmMock); // redirect từ mock

// VNPay
router.post('/vnpay/init', initVNPay);

// Lịch sử đơn thô (admin/debug)
router.get('/orders', myOrders);

export default router;
