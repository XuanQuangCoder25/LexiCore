import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Loader2,
  TrendingUp,
  Flame,
  UserCheck
} from 'lucide-react';
import { arenaService, UserArenaProfile, getRankBadgeUrl, optimizeAvatarUrl } from '../../../services/arena-service';

export interface LeaderboardPlayer {
  rankPosition: number;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  arenaRank: string;
  arenaHighestRank: string;
  leaderboardPoint: number;
  rankPoint: number;
  currentWinStreak: number;
  longestWinStreak: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalMatches: number;
  winRate: number;
}

export interface MyRankInfo {
  rankPosition: number;
  leaderboardPoint: number;
  rankPoint: number;
  arenaRank: string;
  totalWins: number;
  winRate: number;
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

export const ArenaLeaderboard: React.FC = () => {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [myRank, setMyRank] = useState<MyRankInfo | null>(null);
  const [profile, setProfile] = useState<UserArenaProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        // Lấy top 50 người có LP cao nhất
        const data = await arenaService.getLeaderboard({ page: 1, limit: 50 });
        if (isMounted && data) {
          setPlayers(data.players || []);
          if (data.myRank) {
            setMyRank(data.myRank);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải bảng xếp hạng Arena:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLeaderboard();
    arenaService.getMyProfile().then((data) => {
      if (isMounted && data) setProfile(data);
    }).catch(() => { });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Banner tóm tắt thứ hạng ── */}
      {myRank && (
        <Card className="border bg-gradient-to-r from-primary/10 via-card to-background shadow-sm gap-0">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {/* Avatar người chơi */}
              <Avatar className="w-13 h-13 rounded-2xl border-2 border-primary/20 shadow-xs shrink-0 overflow-hidden">
                {profile?.user?.avatarUrl && (
                  <AvatarImage src={optimizeAvatarUrl(profile.user.avatarUrl, 160)} alt={profile.user.fullName} className="object-cover" />
                )}
                <AvatarFallback className="bg-primary/15 text-primary font-bold text-base">
                  {profile?.user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-0.5">
                {/* Dòng 1: Tên người chơi */}
                <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-tight">
                  {profile?.user?.fullName || 'Vị trí của bạn'}
                </p>

                {/* Dòng 2: Thứ hạng + Badge Rank */}
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl sm:text-3xl font-black text-primary drop-shadow-xs">
                    #{myRank.rankPosition}
                  </span>
                  <img
                    src={getRankBadgeUrl(myRank.arenaRank)}
                    alt={formatRankName(myRank.arenaRank)}
                    title={formatRankName(myRank.arenaRank)}
                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-sm select-none hover:scale-110 transition-transform duration-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Điểm LP</p>
                <p className="font-bold text-foreground">{myRank.leaderboardPoint.toLocaleString()} LP</p>
              </div>
              <div className="border-l pl-6">
                <p className="text-xs text-muted-foreground">Trận thắng</p>
                <p className="font-bold text-foreground">{myRank.totalWins} ván</p>
              </div>
              <div className="border-l pl-6">
                <p className="text-xs text-muted-foreground">Tỉ lệ thắng</p>
                <p className="font-bold text-foreground">{myRank.winRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Bảng xếp hạng Top 50 ── */}
      <Card className="shadow-sm border gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:px-6 sm:py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-card">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span>Bảng xếp hạng Đấu Trường</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Top 50 chiến binh từ vựng có điểm mùa giải (LP) cao nhất
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="h-4 w-4 text-orange-500" />
            <span>Cập nhật liên tục sau mỗi ván đấu</span>
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Đang tải bảng xếp hạng...</p>
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <Trophy className="h-10 w-10 mx-auto opacity-30" />
              <p className="font-medium">Chưa có dữ liệu xếp hạng</p>
              <p className="text-xs">Hãy tham gia đấu trường để ghi tên mình lên bảng vàng!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5 hover:bg-primary/5">
                  <TableHead className="w-16 sm:w-20 text-center font-bold">Hạng</TableHead>
                  <TableHead className="font-bold">Chiến binh</TableHead>
                  <TableHead className="font-bold hidden sm:table-cell">Bậc Rank</TableHead>
                  <TableHead className="text-center font-bold hidden md:table-cell">Thành tích</TableHead>
                  <TableHead className="text-right pr-6 sm:pr-8 font-bold">Điểm mùa giải</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => {
                  const rank = player.rankPosition;
                  let rankBadge = null;

                  if (rank === 1) {
                    rankBadge = <Crown className="w-6 h-6 text-yellow-500 mx-auto drop-shadow-sm" />;
                  } else if (rank === 2) {
                    rankBadge = <Medal className="w-5 h-5 text-slate-400 mx-auto" />;
                  } else if (rank === 3) {
                    rankBadge = <Medal className="w-5 h-5 text-amber-600 mx-auto" />;
                  } else {
                    rankBadge = <span className="font-semibold text-muted-foreground">{rank}</span>;
                  }

                  return (
                    <TableRow key={player.userId} className="hover:bg-muted/50 transition-colors">
                      {/* Cột 1: Thứ hạng */}
                      <TableCell className="text-center align-middle font-bold">
                        {rankBadge}
                      </TableCell>

                      {/* Cột 2: Avatar + Tên người chơi */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border shadow-xs">
                            {player.avatarUrl && (
                              <AvatarImage src={optimizeAvatarUrl(player.avatarUrl, 100)} alt={player.fullName} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {player.fullName?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate max-w-[150px] sm:max-w-[220px]">
                              {player.fullName}
                            </p>
                            <span className="text-[11px] text-muted-foreground sm:hidden">
                              {formatRankName(player.arenaRank)}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Cột 3: Bậc Rank (Badge + Tên) */}
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                            <img
                              src={getRankBadgeUrl(player.arenaRank)}
                              alt={formatRankName(player.arenaRank)}
                              className="w-full h-full object-contain drop-shadow-xs"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <span className="font-semibold text-xs text-foreground">
                            {formatRankName(player.arenaRank)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Cột 4: Thành tích (Thắng / Winrate) */}
                      <TableCell className="text-center hidden md:table-cell">
                        <div className="text-xs">
                          <span className="font-semibold text-foreground">{player.totalWins} thắng</span>
                          <span className="text-muted-foreground"> ({player.winRate}%)</span>
                        </div>
                      </TableCell>

                      {/* Cột 5: Điểm LP mùa giải */}
                      <TableCell className="text-right pr-6 sm:pr-8">
                        <span className="font-extrabold text-sm sm:text-base text-primary">
                          {player.leaderboardPoint.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground ml-1">LP</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
