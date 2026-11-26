import { Router } from 'express';
import { requireAuth, optionalAuth } from '../../middlewares/requireAuth';
import {
    listPackages,
    mySubscription,
    patchSubscription,
    myTransactions,
    walletPay,
    walletTopup,
    activateTrial,
    initMock,
    confirmMock,
    initSepay,
    sepayWebhook,
    myOrders,
    orderStatus,
    cancelOrder,
    claimCampaign,
    getInvoice,
    listActiveRewardCampaigns,
    claimReward,
    listPaymentAnnouncements,
} from './payment.controller';

const router = Router();

// --- Public ------------------------------------------------------------------
// Lấy danh sách gói (hỗ trợ optionalAuth để tự động ẩn gói trial nếu user đã từng dùng)
router.get('/packages', optionalAuth, listPackages);

// Lấy các thông báo động hiển thị trong Tab Thông tin của SubscriptionModal
router.get('/announcements', listPaymentAnnouncements);

// Lấy các chiến dịch quà tặng đang diễn ra (hỗ trợ optionalAuth để gắn trạng thái đã nhận)
router.get('/reward-campaigns/active', optionalAuth, listActiveRewardCampaigns);

// SePay webhook nhận callback biến động số dư từ ngân hàng (server-to-server)
router.post('/sepay/webhook', sepayWebhook);

// --- Protected ---------------------------------------------------------------
router.use(requireAuth);

// Trạng thái hội viên & cài đặt
router.get('/my-subscription', mySubscription);
router.patch('/my-subscription', patchSubscription);

// Lịch sử giao dịch (format cho TransactionTable)
router.get('/my-transactions', myTransactions);

// Thanh toán qua SePay (VietQR)
router.post('/sepay/init', initSepay);

// Thanh toán qua Ví LexiCore
router.post('/wallet/pay', walletPay);

// Nạp tiền vào Ví LexiCore qua VietQR (SePay)
router.post('/wallet/topup', walletTopup);

// Dùng thử
router.post('/trial/activate', activateTrial);

// Mock payment (demo/test)
router.post('/mock/init', initMock);
router.post('/mock/confirm', confirmMock);
router.get('/mock/confirm', confirmMock); // redirect từ mock

// Lịch sử đơn thô (admin/debug)
router.get('/orders', myOrders);

// Trạng thái đơn hàng (frontend polling sau khi hiển thị QR)
router.get('/order-status/:orderId', orderStatus);

// Huỷ đơn PENDING do user chủ động yêu cầu
router.delete('/order/:orderId', cancelOrder);

// Nhận quà gói sự kiện từ chiến dịch của Admin
router.post('/campaign/claim', claimCampaign);

// Nhận quà tặng Coin / Diamond / Item từ chiến dịch của Admin
router.post('/reward-campaign/claim', claimReward);

// Chi tiết hóa đơn điện tử
router.get('/invoice/:orderId', getInvoice);

export default router;
