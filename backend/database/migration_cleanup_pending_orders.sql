-- ============================================================
-- Housekeeping: Chuyển các đơn hàng PENDING cũ thành CANCELLED
-- Chạy trên DataGrip để dọn dẹp bảng payment_orders
-- ============================================================

-- 1. Đánh dấu tất cả đơn hàng PENDING cũ thành CANCELLED
UPDATE payment_orders
SET status = 'CANCELLED', updated_at = NOW()
WHERE status = 'PENDING';

-- 2. Xóa các đơn CANCELLED quá 7 ngày (nếu muốn dọn sạch dung lượng)
DELETE FROM payment_orders
WHERE status = 'CANCELLED' AND created_at < NOW() - INTERVAL 7 DAY;

-- 3. Kiểm tra lại phân bố trạng thái đơn hàng
SELECT status, COUNT(*) AS total_orders
FROM payment_orders
GROUP BY status;
