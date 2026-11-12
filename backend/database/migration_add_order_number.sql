-- Them cot order_number vao bang payment_orders
-- Chay file nay tren DataGrip sau khi da chay migration_subscription.sql

ALTER TABLE payment_orders
    ADD COLUMN order_number INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ADD UNIQUE KEY uq_order_number (order_number);

-- Kiem tra ket qua
SELECT COLUMN_NAME, COLUMN_TYPE, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_NAME = 'payment_orders'
  AND COLUMN_NAME = 'order_number';

