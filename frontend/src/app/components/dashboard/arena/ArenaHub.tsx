import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import {
    Swords,
    Flame,
    Trophy,
    Compass,
    Zap,
    Loader2,
    TrendingUp,
    Shield,
    Award,
} from 'lucide-react';
import { arenaService, UserArenaProfile, getRankBadgeUrl } from '../../../services/arena-service';

interface ArenaHubProps {
    onNavigateToLeaderboard?: (rankFilter?: string) => void;
    onOpenRankModal?: () => void;
    onFindMatch?: () => void;
    onProfileLoaded?: (profile: UserArenaProfile) => void;
}

const formatRankName = (rank?: string): string => {
    if (!rank) return 'Bronze';
    const map: Record<string, string> = {
        BRONZE: 'Bronze',
        SILVER: 'Silver',
        GOLD: 'Gold',
        PLATINUM_1: 'Platinum I',
        PLATINUM_2: 'Platinum II',
        SAPPHIRE_1: 'Sapphire I',
        SAPPHIRE_2: 'Sapphire II',
        EMERALD_1: 'Emerald I',
        EMERALD_2: 'Emerald II',
        DIAMOND_1: 'Diamond I',
        DIAMOND_2: 'Diamond II',
        MASTER_1: 'Master I',
        MASTER_2: 'Master II',
        MASTER_3: 'Master III',
    };
    return map[rank] || rank;
};

export const ArenaHub: React.FC<ArenaHubProps> = ({
    onNavigateToLeaderboard,
    onOpenRankModal,
    onFindMatch,
    onProfileLoaded,
}) => {
    const [profile, setProfile] = useState<UserArenaProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchProfile = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await arenaService.getMyProfile();
                if (isMounted) {
                    setProfile(data);
                    if (data) onProfileLoaded?.(data);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err?.message || 'Không thể tải thông tin Đấu trường.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchProfile();
        return () => {
            isMounted = false;
        };
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Đang tải dữ liệu Đấu trường...</p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <Card className="p-8 text-center space-y-4">
                <p className="text-destructive font-medium">{error || 'Không tìm thấy dữ liệu người chơi.'}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    Thử lại
                </Button>
            </Card>
        );
    }

    const { user, arena } = profile;

    return (
        <div className="space-y-6">
            {/* ── Bố cục 2 cột chính ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* ── CỘT TRÁI: Card Player & Thống kê & Nút thao tác ── */}
                <div className="lg:col-span-7">
                    <Card className="overflow-hidden border shadow-sm">
                        {/* Ảnh bìa Cover thu nhỏ */}
                        <div className="w-full h-32 md:h-36 bg-muted relative overflow-hidden">
                            {user.coverUrl ? (
                                <img
                                    src={user.coverUrl}
                                    alt="Cover"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-900" />
                            )}
                        </div>

                        <CardContent className="pt-0 px-6 pb-6 space-y-5">
                            {/* Avatar + Tên người chơi */}
                            <div className="flex items-end gap-4 -mt-10 relative z-10">
                                <div className="w-20 h-20 rounded-full border-4 border-background bg-muted overflow-hidden shrink-0 shadow-md flex items-center justify-center text-2xl font-bold">
                                    {user.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={user.fullName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span>{user.fullName?.charAt(0)?.toUpperCase() || 'U'}</span>
                                    )}
                                </div>
                                <div className="pb-1 min-w-0">
                                    <h2 className="text-xl font-bold truncate">{user.fullName || 'Người chơi'}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="secondary" className="text-xs">
                                            Level {user.level}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {user.coinBalance.toLocaleString()} Xu
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Thông số chiến tích (Win streak, win rate, tổng số ván) */}
                            <div className="grid grid-cols-3 gap-3 pt-2">
                                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                                        <span>Chuỗi thắng</span>
                                    </div>
                                    <p className="text-xl font-bold text-orange-500">
                                        {arena.currentWinStreak}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Kỷ lục: {arena.longestWinStreak}
                                    </p>
                                </div>

                                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                        <span>Tỉ lệ thắng</span>
                                    </div>
                                    <p className="text-xl font-bold text-emerald-500">
                                        {arena.winRate}%
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Hiệu suất
                                    </p>
                                </div>

                                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <Swords className="h-3.5 w-3.5 text-blue-500" />
                                        <span>Số trận</span>
                                    </div>
                                    <p className="text-xl font-bold">
                                        {arena.totalMatches}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {arena.totalWins}W - {arena.totalLosses}L - {arena.totalDraws}D
                                    </p>
                                </div>
                            </div>

                            {/* 2 Buttons: Chọn chế độ & Tìm trận */}
                            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="w-full sm:flex-1 cursor-default justify-center font-medium"
                                >
                                    <Swords className="h-4 w-4 mr-2 text-primary" />
                                    Chế độ: 1v1 PvP
                                </Button>

                                <Button
                                    className="w-full sm:flex-1 justify-center font-semibold"
                                    size="default"
                                    onClick={onFindMatch}
                                >
                                    <Zap className="h-4 w-4 mr-2" />
                                    Tìm trận đấu
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── CỘT PHẢI: Badge Rank & Tiến trình & Xem BXH ── */}
                <div className="lg:col-span-5">
                    <Card className="border shadow-sm">
                        <CardContent className="p-6 text-center space-y-5">

                            {/* Badge Rank - Click để xem lộ trình rank */}
                            <div
                                onClick={onOpenRankModal}
                                className="w-44 h-44 mx-auto cursor-pointer flex items-center justify-center p-2 transition-transform duration-300 hover:scale-110 select-none group"
                                title="Nhấn để xem lộ trình rank"
                            >
                                <img
                                    src={getRankBadgeUrl(arena.rank)}
                                    alt={formatRankName(arena.rank)}
                                    className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                    }}
                                />
                            </div>

                            {/* Tên Rank */}
                            <div className="space-y-1">
                                <h3 className="text-2xl font-extrabold tracking-wide uppercase">
                                    {formatRankName(arena.rank)}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Điểm xếp hạng mùa giải: <span className="font-semibold text-foreground">{arena.leaderboardPoint} LP</span>
                                </p>
                            </div>

                            {/* Thanh tiến trình & Điểm số */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Tiến trình bậc</span>
                                    <span className="font-medium text-foreground">
                                        {arena.rankPoint} / {arena.nextRankThreshold !== null ? `${arena.nextRankThreshold} RP` : 'Tối đa'}
                                    </span>
                                </div>
                                <Progress value={arena.progressPercent} className="h-2.5" />
                                <p className="text-[11px] text-muted-foreground text-right">
                                    {arena.progressPercent}% hoàn thành
                                </p>
                            </div>

                            {/* Nút xem lộ trình & Nút xem BXH */}
                            <div className="space-y-2 pt-2">
                                <Button
                                    variant="outline"
                                    className="w-full justify-center"
                                    onClick={onOpenRankModal}
                                >
                                    <Compass className="h-4 w-4 mr-2" />
                                    Click để xem lộ trình Rank
                                </Button>

                                <Button
                                    variant="outline"
                                    className="w-full justify-center"
                                    onClick={() => onNavigateToLeaderboard?.(arena.rank)}
                                >
                                    <Trophy className="h-4 w-4 mr-2" />
                                    Xem BXH mức rank này
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
};
