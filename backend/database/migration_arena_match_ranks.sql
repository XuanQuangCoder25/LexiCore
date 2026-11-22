-- Migration: Thêm snapshot rank của từng người chơi lúc thi đấu vào arena_matches
-- Điều này đảm bảo lịch sử đấu hiển thị chính xác rank của từng người chơi tại thời điểm trận đấu diễn ra,
-- không bị ảnh hưởng khi người chơi tăng/giảm rank trong tương lai.

ALTER TABLE arena_matches
  ADD COLUMN p1_rank VARCHAR(30) NULL AFTER match_type,
  ADD COLUMN p2_rank VARCHAR(30) NULL AFTER p1_rank;

-- Backfill dữ liệu cho các ván đấu cũ:
UPDATE arena_matches m
JOIN wallets w1 ON m.player1_id = w1.user_id
JOIN wallets w2 ON m.player2_id = w2.user_id
SET m.p1_rank = w1.arena_rank,
    m.p2_rank = w2.arena_rank
WHERE m.p1_rank IS NULL OR m.p2_rank IS NULL;

-- Với tài khoản Thomas Muller trước khi lên Bạch Kim (các trận trước 22/11/2026 20:00):
UPDATE arena_matches m
JOIN users u ON m.player1_id = u.id
SET m.p1_rank = 'GOLD'
WHERE u.full_name = 'Thomas Muller' AND m.started_at < '2026-11-22 20:00:00';

UPDATE arena_matches m
JOIN users u ON m.player2_id = u.id
SET m.p2_rank = 'GOLD'
WHERE u.full_name = 'Thomas Muller' AND m.started_at < '2026-11-22 20:00:00';
