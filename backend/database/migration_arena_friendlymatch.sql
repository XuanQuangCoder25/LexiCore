-- Them cot match_type vao bang arena_matches de phan biet Rank, Dau Thuong va Giao Huu
ALTER TABLE arena_matches
  ADD COLUMN match_type ENUM('RANK', 'NORMAL', 'FRIENDLY') NOT NULL DEFAULT 'RANK'
  AFTER rank_snapshot;

-- Kiem tra ket qua
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_NAME = 'arena_matches' AND COLUMN_NAME = 'match_type';
