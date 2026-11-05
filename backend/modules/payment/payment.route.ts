import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import {
    listPackages,
    initMock,
    confirmMock,
    initVNPay,
    vnpayReturn,
    myOrders,
} from './payment.controller';

const router = Router();

// Public: Lấy danh sách gói (không cần đăng nhập để xem giá)
router.get('/packages', listPackages);

// VNPay callback không cần auth (gateway gọi vào)
router.get('/vnpay/return', vnpayReturn);

// Các route cần đăng nhập
router.use(requireAuth);

// Mock payment (demo/test)
router.post('/mock/init', initMock);
router.post('/mock/confirm', confirmMock);
router.get('/mock/confirm', confirmMock); // Hỗ trợ cả GET (redirect từ mock)

// VNPay
router.post('/vnpay/init', initVNPay);

// Lịch sử đơn
router.get('/orders', myOrders);

export default router;

