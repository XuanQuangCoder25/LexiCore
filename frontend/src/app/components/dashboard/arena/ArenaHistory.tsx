import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  Swords,
  Hourglass,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Zap,
  Award,
  Bot,
  BookOpen
} from 'lucide-react';
import {
  arenaService,
  UserArenaProfile,
  getRankBadgeUrl,
} from '../../../services/arena-service';

export interface MatchHistoryItem {
  id: string;
  startedAt: string;
  endedAt: string | null;
  topic: string;
  rankSnapshot: string;
  totalQuestions: number;
  timeLimitSec: number;
  myResult: 'WIN' | 'LOSS' | 'DRAW';
  myCorrect: number;
  myTimeMs: number;
  myPointsChange: number;
  opponent: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    rank: string;
    correct: number;
    timeMs: number;
    pointsChange: number;
  };
}

interface ArenaHistoryProps {
  onFindMatch?: () => void;
  currentUserProfile?: UserArenaProfile | null;
}

const formatRankName = (rank?: string): string => {
  if (!rank) return 'Đồng';
  const map: Record<string, string> = {
    BRONZE: 'Đồng',
    SILVER: 'Bạc',
    GOLD: 'Vàng',
    PLATINUM_1: 'Bạch Kim I',
    PLATINUM_2: 'Bạch Kim II',
    SAPPHIRE_1: 'Lam Ngọc I',
    SAPPHIRE_2: 'Lam Ngọc II',
    EMERALD_1: 'Lục Bảo I',
    EMERALD_2: 'Lục Bảo II',
    DIAMOND_1: 'Kim Cương I',
    DIAMOND_2: 'Kim Cương II',
    MASTER_1: 'Đại Sư I',
    MASTER_2: 'Đại Sư II',
    MASTER_3: 'Đại Sư III',
  };
  return map[rank] || rank;
};

const formatSeconds = (timeMs?: number): string => {
  if (!timeMs || timeMs <= 0) return '0s';
  const totalSec = Math.round(timeMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${mins}`;
};

export const ArenaHistory: React.FC<ArenaHistoryProps> = ({
  onFindMatch,
  currentUserProfile,
}) => {
  const [profile, setProfile] = useState<UserArenaProfile | null>(currentUserProfile || null);
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Lấy profile người dùng nếu chưa được truyền từ prop
  useEffect(() => {
    if (!profile) {
      arenaService.getMyProfile().then((data) => setProfile(data)).catch(() => { });
    }
  }, [profile]);

  // Lấy danh sách lịch sử trận đấu theo phân trang và bộ lọc
  useEffect(() => {
    let isMounted = true;
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const res = await arenaService.getMyMatches({
          page,
          limit: 8,
          filter: resultFilter,
        });
        if (isMounted && res) {
          setMatches(res.matches || []);
          setTotalPages(res.pagination?.totalPages || 1);
          setTotalItems(res.pagination?.totalItems || 0);
        }
      } catch (err) {
        console.error('Lỗi khi tải lịch sử đấu:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMatches();
    return () => {
      isMounted = false;
    };
  }, [page, resultFilter]);

  return (
    <div className="space-y-6">
      {/* ── Thanh công cụ trên cùng: Dropdown chọn chế độ ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        {/* Dropdown chọn chế độ (All mode, PvP, Bot) */}
        <div className="rounded-xl px-4 py-3 bg-card/40 flex items-cente w-full sm:w-auto">
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger className="w-full sm:w-52 bg-background border-border">
              <SelectValue placeholder="Chọn chế độ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chế độ</SelectItem>
              <SelectItem value="pvp">
                <span className="flex items-center gap-2">
                  <Swords className="h-4 w-4 text-primary" />
                  <span>Đấu trường PvP 1v1</span>
                </span>
              </SelectItem>
              <SelectItem value="bot" disabled>
                <span className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span>Đấu với AI Bot (Sắp ra mắt)</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Danh sách các hàng trận đấu (Phong cách Valorant Match History) ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Đang tải lịch sử đấu...</p>
        </div>
      ) : matches.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-dashed">
          <div className="w-16 h-16 rounded-full bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground">
            <Swords className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Chưa có trận đấu nào</h3>
            <p className="text-sm text-muted-foreground">
              {resultFilter !== 'all'
                ? 'Không tìm thấy ván đấu nào phù hợp với bộ lọc.'
                : 'Bạn chưa tham gia trận đấu nào. Hãy bước vào Đấu trường ngay!'}
            </p>
          </div>
          {onFindMatch && (
            <Button onClick={onFindMatch} className="mt-2 font-semibold">
              <Zap className="h-4 w-4 mr-2" /> Tìm trận ngay
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const isWin = m.myResult === 'WIN';
            const isLoss = m.myResult === 'LOSS';
            const isDraw = m.myResult === 'DRAW';

            // Xác định màu nền và viền theo phong cách Valorant (nhạt nhạt, tinh tế)
            let rowBgClass = 'bg-muted/40 border-border hover:bg-muted/60';
            let badgeBgClass = 'text-muted-foreground bg-muted border-border';
            let rpColorClass = 'text-muted-foreground';

            if (isWin) {
              rowBgClass = 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15';
              badgeBgClass = 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30';
              rpColorClass = 'text-emerald-500';
            } else if (isLoss) {
              rowBgClass = 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15';
              badgeBgClass = 'text-rose-500 bg-rose-500/15 border-rose-500/30';
              rpColorClass = 'text-rose-500';
            }

            return (
              <div
                key={m.id}
                className={`relative flex items-center justify-between rounded-lg border transition-all duration-200 overflow-hidden shadow-xs ${rowBgClass}`}
              >
                {/* ── 1. BÊN TRÁI: THÔNG TIN CỦA MÌNH ── */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 pr-2">
                  {/* Avatar ô vuông ngoài cùng bên trái (không bo tròn, chiếm mép hàng) */}
                  <div className="w-16 sm:w-20 h-16 sm:h-20 bg-muted shrink-0 overflow-hidden flex items-center justify-center font-bold text-lg select-none border-r border-border/50">
                    {profile?.user?.avatarUrl ? (
                      <img
                        src={profile.user.avatarUrl}
                        alt="My Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{profile?.user?.fullName?.charAt(0)?.toUpperCase() || 'U'}</span>
                    )}
                  </div>

                  {/* Tên người chơi & Thời gian thi đấu */}
                  <div className="space-y-1 min-w-0 max-w-[110px] sm:max-w-[140px]">
                    <p className="font-bold text-sm sm:text-base truncate" title={profile?.user?.fullName || 'Bạn'}>
                      {profile?.user?.fullName || 'Bạn'}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="truncate">{formatDate(m.startedAt)}</span>
                    </div>
                  </div>

                  {/* Badge Rank + Điểm RP cộng/trừ bên dưới */}
                  <div className="hidden md:flex flex-col items-center justify-center px-2 shrink-0">
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                      <img
                        src={getRankBadgeUrl(m.rankSnapshot)}
                        alt={m.rankSnapshot}
                        className="w-full h-full object-contain drop-shadow-xs"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <span className={`text-xs font-bold mt-0.5 ${rpColorClass}`}>
                      {m.myPointsChange > 0 ? `+${m.myPointsChange}` : m.myPointsChange} RP
                    </span>
                  </div>

                  {/* Điểm số (câu đúng/tổng) & Thời gian trả lời */}
                  <div className="flex flex-col items-end sm:items-start pl-1 sm:pl-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-sm sm:text-base font-bold tracking-tight">
                        {m.myCorrect}/{m.totalQuestions}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Hourglass className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-sm sm:text-base font-bold tracking-tight">
                        {formatSeconds(m.myTimeMs)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── 2. TRUNG TÂM: BANNER KẾT QUẢ VICTORY / DEFEAT / DRAW ── */}
                <div className="shrink-0 px-2 sm:px-4 flex flex-col items-center justify-center z-10">
                  <div className="h-9 sm:h-11 flex items-center justify-center">
                    <img
                      src={`/assets/banners/banner-${isWin ? 'victory' : isLoss ? 'defeat' : 'draw'}.png`}
                      alt={isWin ? 'Victory' : isLoss ? 'Defeat' : 'Draw'}
                      className="h-full object-contain drop-shadow-md select-none"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const fallbackEl = (e.target as HTMLElement).nextElementSibling;
                        if (fallbackEl) (fallbackEl as HTMLElement).style.display = 'inline-block';
                      }}
                    />
                    <div
                      style={{ display: 'none' }}
                      className={`px-3 sm:px-5 py-1 sm:py-1.5 rounded-md border font-black text-xs sm:text-sm tracking-widest uppercase text-center select-none shadow-xs ${badgeBgClass}`}
                    >
                      {isWin && <span>VICTORY</span>}
                      {isLoss && <span>DEFEAT</span>}
                      {isDraw && <span>DRAW</span>}
                    </div>
                  </div>
                </div>

                {/* ── 3. BÊN PHẢI: THÔNG TIN ĐỐI THỦ (ĐỐI XỨNG) ── */}
                <div className="flex items-center justify-end gap-3 sm:gap-4 flex-1 min-w-0 pl-2">
                  {/* Điểm số (câu đúng/tổng) & Thời gian của đối thủ */}
                  <div className="flex flex-col items-start sm:items-end pr-1 sm:pr-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm sm:text-base font-bold tracking-tight">
                        {m.opponent.correct}/{m.totalQuestions}
                      </span>
                      <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm sm:text-base font-bold tracking-tight">
                        {formatSeconds(m.opponent.timeMs)}
                      </span>
                      <Hourglass className="h-3 w-3 text-primary shrink-0" />
                    </div>
                  </div>

                  {/* Badge Rank đối thủ + Điểm RP của đối thủ */}
                  <div className="hidden md:flex flex-col items-center justify-center px-2 shrink-0">
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                      <img
                        src={getRankBadgeUrl(m.opponent.rank)}
                        alt={m.opponent.rank}
                        className="w-full h-full object-contain drop-shadow-xs"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold mt-0.5 text-muted-foreground">
                      {m.opponent.pointsChange > 0 ? `+${m.opponent.pointsChange}` : m.opponent.pointsChange} RP
                    </span>
                  </div>

                  {/* Tên đối thủ */}
                  <div className="space-y-1 min-w-0 max-w-[110px] sm:max-w-[140px] text-right">
                    <p className="font-bold text-sm sm:text-base truncate" title={m.opponent.fullName || 'Đối thủ'}>
                      {m.opponent.fullName || 'Đối thủ'}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <BookOpen className="h-3 w-3 shrink-0" />
                      <span className="truncate">{m.topic}</span>
                    </div>
                  </div>

                  {/* Avatar đối thủ*/}
                  <div className="w-16 sm:w-20 h-16 sm:h-20 bg-muted shrink-0 overflow-hidden flex items-center justify-center font-bold text-lg select-none border-l border-border/50">
                    {m.opponent.avatarUrl ? (
                      <img
                        src={m.opponent.avatarUrl}
                        alt={m.opponent.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{m.opponent.fullName?.charAt(0)?.toUpperCase() || 'E'}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Phân trang (Pagination) ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Tổng cộng <span className="font-semibold text-foreground">{totalItems}</span> ván đấu
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium px-2">
              Trang {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
