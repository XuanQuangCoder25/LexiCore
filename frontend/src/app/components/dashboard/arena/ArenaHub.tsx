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
    Loader2,
    TrendingUp,
    Gamepad2,
    Users,
    Sword,
    Zap,
} from 'lucide-react';
import { arenaService, UserArenaProfile, getRankBadgeUrl } from '../../../services/arena-service';
import { ArenaRankChangeEffect, RankChangeData } from './ArenaRankChangeEffect';
import { getNameGradientClass, getEliteAvatarFrameClass } from '../../../utils/vipStyling';

interface ArenaHubProps {
    onNavigateToLeaderboard?: (rankFilter?: string) => void;
    onOpenRankModal?: () => void;
    onFindMatch?: (matchType?: 'RANK' | 'NORMAL') => void;
    onOpenFriendlyInvite?: () => void;
    onProfileLoaded?: (profile: UserArenaProfile) => void;
    rankChangeData?: RankChangeData | null;
    onRankChangeAnimationComplete?: () => void;
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

const RANK_ORDER_MAP: Record<string, number> = {
    BRONZE: 0,
    SILVER: 1,
    GOLD: 2,
    PLATINUM_1: 3,
    PLATINUM_2: 4,
    SAPPHIRE_1: 5,
    SAPPHIRE_2: 6,
    EMERALD_1: 7,
    EMERALD_2: 8,
    DIAMOND_1: 9,
    DIAMOND_2: 10,
    MASTER_1: 11,
    MASTER_2: 12,
    MASTER_3: 13,
};

const getRankOrderVal = (rank?: string | null): number => {
    if (!rank) return 0;
    return RANK_ORDER_MAP[rank.toUpperCase().trim()] ?? 0;
};

const ORDERED_RANKS = [
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM_1',
    'PLATINUM_2',
    'SAPPHIRE_1',
    'SAPPHIRE_2',
    'EMERALD_1',
    'EMERALD_2',
    'DIAMOND_1',
    'DIAMOND_2',
    'MASTER_1',
    'MASTER_2',
    'MASTER_3',
];

export const ArenaHub: React.FC<ArenaHubProps> = ({
    onNavigateToLeaderboard,
    onOpenRankModal,
    onFindMatch,
    onOpenFriendlyInvite,
    onProfileLoaded,
    rankChangeData,
    onRankChangeAnimationComplete,
}) => {
    const [profile, setProfile] = useState<UserArenaProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isAnimatingRankChange, setIsAnimatingRankChange] = useState<boolean>(false);
    const [detectedRankChange, setDetectedRankChange] = useState<RankChangeData | null>(null);
    const [testRankChange, setTestRankChange] = useState<RankChangeData | null>(null);
    const [previewRank, setPreviewRank] = useState<string | null>(null);

    const activeRankChangeData = detectedRankChange || rankChangeData || testRankChange;

    let isAdmin = Boolean(
        profile?.user?.role?.toLowerCase() === 'admin' ||
        Boolean((import.meta as any)?.env?.DEV)
    );
    if (!isAdmin) {
        try {
            const rawUser = localStorage.getItem('user');
            if (rawUser) {
                const u = JSON.parse(rawUser);
                if (u?.role?.toLowerCase() === 'admin') {
                    isAdmin = true;
                }
            }
        } catch {
            // ignore
        }
    }

    const handleAnimationComplete = () => {
        setIsAnimatingRankChange(false);
        if (profile) {
            const storageKey = `arena_hub_base_rank_${profile.user.id}`;
            localStorage.setItem(storageKey, profile.arena.rank);
        }
        setDetectedRankChange(null);
        setTestRankChange(null);
        onRankChangeAnimationComplete?.();
    };

    const handleBadgeClick = (e: React.MouseEvent) => {
        // Phím tắt tiện ích chỉ dành riêng cho Admin (Shift: Thăng rank, Alt: Hạ rank, Ctrl: Reset rank)
        if (!isAdmin || (!e.shiftKey && !e.altKey && !e.ctrlKey)) {
            onOpenRankModal?.();
            return;
        }

        // Ctrl + Click: Reset preview về rank gốc của tài khoản
        if (e.ctrlKey) {
            setPreviewRank(null);
            return;
        }

        const currentRankForClick = previewRank || profile?.arena?.rank || 'BRONZE';
        const currentIndex = ORDERED_RANKS.indexOf(currentRankForClick.toUpperCase().trim());

        // Shift + Click: Thăng tuần tự lên rank kế tiếp (tối đa Master III)
        if (e.shiftKey) {
            if (currentIndex >= 0 && currentIndex < ORDERED_RANKS.length - 1) {
                const nextRank = ORDERED_RANKS[currentIndex + 1];
                setTestRankChange({
                    oldRank: currentRankForClick,
                    newRank: nextRank,
                    isPromoted: true,
                    isDemoted: false,
                });
                setPreviewRank(nextRank);
                setIsAnimatingRankChange(true);
            }
            return;
        }

        // Alt + Click: Hạ tuần tự về rank liền trước (tối thiểu Bronze)
        if (e.altKey) {
            if (currentIndex > 0) {
                const prevRank = ORDERED_RANKS[currentIndex - 1];
                setTestRankChange({
                    oldRank: currentRankForClick,
                    newRank: prevRank,
                    isPromoted: false,
                    isDemoted: true,
                });
                setPreviewRank(prevRank);
                setIsAnimatingRankChange(true);
            }
            return;
        }
    };

    useEffect(() => {
        let isMounted = true;
        const fetchProfile = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await arenaService.getMyProfile();
                if (isMounted) {
                    setProfile(data);
                    if (data) {
                        onProfileLoaded?.(data);

                        // Phát hiện thăng rank / hạ rank bằng cách so sánh với rank lúc rời Hub
                        const currentRank = data.arena.rank;
                        const storageKey = `arena_hub_base_rank_${data.user.id}`;
                        const lastSeenRank = localStorage.getItem(storageKey);

                        if (!lastSeenRank) {
                            // Lần đầu tiên vào Hub: ghi nhận mốc xuất phát
                            localStorage.setItem(storageKey, currentRank);
                        } else if (lastSeenRank !== currentRank) {
                            const oldOrder = getRankOrderVal(lastSeenRank);
                            const newOrder = getRankOrderVal(currentRank);
                            if (oldOrder !== newOrder) {
                                setDetectedRankChange({
                                    oldRank: lastSeenRank,
                                    newRank: currentRank,
                                    isPromoted: newOrder > oldOrder,
                                    isDemoted: newOrder < oldOrder,
                                });
                                setIsAnimatingRankChange(true);
                            } else {
                                localStorage.setItem(storageKey, currentRank);
                            }
                        } else if (rankChangeData) {
                            // Dự phòng trường hợp rankChangeData được truyền trực tiếp từ ArenaView
                            setDetectedRankChange(rankChangeData);
                            setIsAnimatingRankChange(true);
                        }
                    }
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
    const quota = profile.dailyQuota;
    const tier = quota?.tier || 'FREE';
    const isFree = tier === 'FREE';
    const remainingRankMatches = quota?.rankMatches?.remaining ?? 10;
    const limitRankMatches = quota?.rankMatches?.limit ?? 10;
    const isFreeOutOfRank = isFree && remainingRankMatches === 0;
    const remainingDoubleRewards = quota?.doubleRewards?.remaining ?? 0;
    const limitDoubleRewards = quota?.doubleRewards?.limit ?? 0;

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
                            {/* Avatar + Tên người chơi & Chỉ số Quota / Đặc quyền hàng ngày */}
                            <div className="flex items-end justify-between gap-3 -mt-10 relative z-10">
                                {/* Bên trái: Avatar + Tên + Level */}
                                <div className="flex items-end gap-3 sm:gap-4 min-w-0">
                                    <div className={`w-20 h-20 rounded-full border-4 border-background bg-muted overflow-hidden shrink-0 shadow-md flex items-center justify-center text-2xl font-bold ${getEliteAvatarFrameClass(tier)}`}>
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
                                        <h2 className={`text-xl font-bold truncate ${getNameGradientClass(tier)}`}>{user.fullName || 'Người chơi'}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="text-xs">
                                                Level {user.level}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Bên phải: Hộp chỉ số Quota / Đặc quyền trong ngày */}
                                <div className="pb-1 shrink-0 text-right">
                                    {isFree ? (
                                        <div className="flex flex-col items-end gap-0.5">
                                            <div
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors shadow-2xs ${isFreeOutOfRank
                                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                                    : 'bg-purple-500/10 border-purple-500/25 text-purple-600 dark:text-purple-400'
                                                    }`}
                                                title={`Gói Miễn Phí: Tối đa ${limitRankMatches} trận đấu Rank mỗi ngày`}
                                            >
                                                <Swords className="w-3.5 h-3.5 shrink-0" />
                                                <span>Rank hôm nay: {remainingRankMatches}/{limitRankMatches}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground pr-1 font-medium">
                                                {isFreeOutOfRank ? 'Đã hết lượt đấu Rank' : `Còn ${remainingRankMatches} trận đấu Rank`}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-end gap-0.5">
                                            <div
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-2xs border ${remainingDoubleRewards === 0
                                                    ? 'bg-muted/60 border-border/60 text-muted-foreground'
                                                    : 'border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-600 dark:text-amber-400'
                                                    }`}
                                                title={`Gói ${tier}: Nhân đôi Coin & EXP cho ${limitDoubleRewards} trận mỗi ngày`}
                                            >
                                                <Zap className={`w-3.5 h-3.5 shrink-0 ${remainingDoubleRewards === 0 ? 'text-muted-foreground' : 'text-amber-500'}`} />
                                                <span>x2 Thưởng: Còn {remainingDoubleRewards}/{limitDoubleRewards} trận</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground pr-1 font-medium">
                                                Đấu Rank không giới hạn
                                            </span>
                                        </div>
                                    )}
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
                                    <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-3">
                                        <span className="text-amber-400">Win: {arena.totalWins}</span>
                                        <span className="text-red-400">Lose: {arena.totalLosses} </span>
                                        <span className="text-gray-400">Draw: {arena.totalDraws}</span>
                                    </p>
                                </div>
                            </div>

                            {/* 4 Buttons chế độ đấu (2 hàng x 2 cột) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                {/* 1. Đấu Thường (Không trừ điểm rank, nhận Coin & EXP) */}
                                <Button
                                    variant="outline"
                                    className="h-11 justify-center font-semibold border-sky-300/80 hover:bg-sky-50 dark:hover:bg-sky-950/30 text-sky-700 dark:text-sky-300 transition-all hover:scale-[1.01]"
                                    onClick={() => onFindMatch?.('NORMAL')}
                                >
                                    <Gamepad2 className="h-4 w-4 mr-2 text-sky-500" />
                                    Đấu Thường
                                </Button>

                                {/* 2. Đấu Xếp Hạng (Màu tím Lavender quý phái, leo rank tính RP/LP) */}
                                <Button
                                    disabled={isFreeOutOfRank}
                                    className={`h-11 justify-center font-bold text-white shadow-sm transition-all hover:scale-[1.01] ${isFreeOutOfRank
                                        ? 'bg-muted text-muted-foreground opacity-60 cursor-not-allowed border'
                                        : 'bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 hover:from-purple-700 hover:to-violet-700'
                                        }`}
                                    onClick={() => {
                                        if (isFreeOutOfRank) return;
                                        onFindMatch?.('RANK');
                                    }}
                                    title={isFreeOutOfRank ? 'Bạn đã dùng hết 10 lượt đấu Rank hôm nay.' : undefined}
                                >
                                    <Swords className="h-4 w-4 mr-2" />
                                    {isFreeOutOfRank ? 'Hết Lượt Đấu Rank' : 'Đấu Xếp Hạng'}
                                </Button>

                                {/* 3. Đấu Giao Hữu (Màu xanh lá hòa bình, 0 Coin/EXP, không đổi RP) */}
                                <Button
                                    variant="outline"
                                    className="h-11 justify-center font-semibold border-emerald-400/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 transition-all hover:scale-[1.01]"
                                    onClick={onOpenFriendlyInvite}
                                >
                                    <Users className="h-4 w-4 mr-2 text-emerald-500" />
                                    Đấu Giao Hữu
                                </Button>

                                {/* 4. Sắp Ra Mắt (Chế độ thứ 4) */}
                                <Button
                                    variant="outline"
                                    disabled
                                    className="h-11 justify-center font-medium opacity-60 border-dashed border-muted-foreground/40 cursor-not-allowed"
                                >
                                    <Sword className="h-4 w-4 mr-2 text-muted-foreground" />
                                    Sắp Ra Mắt
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── CỘT PHẢI: Badge Rank & Tiến trình & Xem BXH ── */}
                <div className="lg:col-span-5">
                    <Card className="border shadow-sm">
                        <CardContent className="p-6 text-center space-y-5">

                            {/* NẾU ĐANG CHẠY ANIMATION THĂNG/HẠ RANK THÌ HIỆN EFFECT DIỄN HOẠT */}
                            {isAnimatingRankChange && activeRankChangeData ? (
                                <ArenaRankChangeEffect
                                    changeData={activeRankChangeData}
                                    onComplete={handleAnimationComplete}
                                    formatRankName={formatRankName}
                                />
                            ) : (
                                <>
                                    {/* Badge Rank - Click để xem lộ trình rank (Admin: Shift+Click / Alt+Click để test) */}
                                    {(() => {
                                        const displayedRank = previewRank || arena.rank;
                                        return (
                                            <>
                                                <div
                                                    onClick={handleBadgeClick}
                                                    className="w-44 h-44 mx-auto cursor-pointer flex items-center justify-center p-2 transition-transform duration-300 hover:scale-110 select-none group"
                                                    title={
                                                        isAdmin
                                                            ? `Bậc hiện tại: ${formatRankName(displayedRank)} (Shift+Click: Thăng bậc, Alt+Click: Hạ bậc, Ctrl+Click: Về rank gốc, Click: Lộ trình rank)`
                                                            : "Nhấn để xem lộ trình rank"
                                                    }
                                                >
                                                    <img
                                                        src={getRankBadgeUrl(displayedRank)}
                                                        alt={formatRankName(displayedRank)}
                                                        className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-105"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>

                                                {/* Tên Rank */}
                                                <div className="space-y-1">
                                                    <h3 className="text-2xl font-extrabold tracking-wide uppercase">
                                                        {formatRankName(displayedRank)}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        Điểm xếp hạng mùa giải: <span className="font-semibold text-foreground">{arena.leaderboardPoint} LP</span>
                                                    </p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </>
                            )}

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
