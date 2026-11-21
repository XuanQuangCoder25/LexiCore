-- ====================================================================
-- Script SQL dọn dẹp toàn bộ dữ liệu Arena Words & Lịch sử ván đấu cũ
-- Sử dụng khi muốn xóa bỏ toàn bộ dữ liệu mock test để nạp từ vựng thật
-- ====================================================================

-- 1. Xóa các bản ghi chi tiết câu hỏi trong các ván đấu cũ (nếu có)
DELETE FROM arena_match_words;

-- 2. Xóa các ván đấu PvP cũ (nếu muốn reset sạch lịch sử test)
DELETE FROM arena_matches;

-- 3. Xóa toàn bộ từ vựng Arena cũ trong kho dữ liệu
DELETE FROM arena_words;

-- Xác nhận kiểm tra số dòng còn lại
SELECT COUNT(*) AS remaining_words FROM arena_words;
SELECT COUNT(*) AS remaining_matches FROM arena_matches;
