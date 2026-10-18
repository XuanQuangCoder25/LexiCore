import React, { useRef, useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
    Award,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Lock,
    Sparkles,
    HelpCircle,
} from 'lucide-react';
import { arenaService, RankTierDetail } from '../../../services/arena-service';

export interface ArenaRankModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentRank?: string;
    highestRank?: string;
}

// 14 cấp bậc rank chuẩn của LexiCore PvP Arena
const FALLBACK_RANK_TIERS: RankTierDetail[] = [
    {
        rank: 'BRONZE',
        name: 'Bronze',
        subTier: null,
        order: 0,
        threshold: 200,
        badgeFile: 'rank-bronze.png',
        mascot: 'Chiến Binh Spartan',
        shieldMaterial: 'Đồng đỏ nguyên khối',
        meaning: 'Tinh thần chiến binh sơ khởi',
        color: '#cd7f32',
    },
    {
        rank: 'SILVER',
        name: 'Silver',
        subTier: null,
        order: 1,
        threshold: 250,
        badgeFile: 'rank-silver.png',
        mascot: 'Đại Bàng Bạc',
        shieldMaterial: 'Bạc 925 & bạch kim phay xước',
        meaning: 'Tầm nhìn sắc bén và sự nhanh nhạy',
        color: '#c0c0c0',
    },
    {
        rank: 'GOLD',
        name: 'Gold',
        subTier: null,
        order: 2,
        threshold: 300,
        badgeFile: 'rank-gold.png',
        mascot: 'Bò Tót Vàng',
        shieldMaterial: 'Vàng ròng 24k cơ bắp nguyên khối',
        meaning: 'Sức mạnh kiên định và vững chãi',
        color: '#ffd700',
    },
    {
        rank: 'PLATINUM_1',
        name: 'Platinum I',
        subTier: 1,
        order: 3,
        threshold: 350,
        badgeFile: 'rank-platinum-1.png',
        mascot: 'Sói Đầu Đàn',
        shieldMaterial: 'Bạch kim + vi mạch neon cyan',
        meaning: 'Bản lĩnh thủ lĩnh và sắc lạnh',
        color: '#00e5ff',
    },
    {
        rank: 'PLATINUM_2',
        name: 'Platinum II',
        subTier: 2,
        order: 4,
        threshold: 400,
        badgeFile: 'rank-platinum-2.png',
        mascot: 'Sói Đầu Đàn Hào Quang',
        shieldMaterial: 'Bạch kim + 2 rãnh neon cyan',
        meaning: 'Bản lĩnh thủ lĩnh tối thượng',
        color: '#00f0ff',
    },
    {
        rank: 'SAPPHIRE_1',
        name: 'Sapphire I',
        subTier: 1,
        order: 5,
        threshold: 450,
        badgeFile: 'rank-sapphire-1.png',
        mascot: 'Báo Săn Lam Ngọc',
        shieldMaterial: 'Tinh thể Sapphire xanh hoàng gia',
        meaning: 'Tốc độ phản xạ thần tốc',
        color: '#0f52ba',
    },
    {
        rank: 'SAPPHIRE_2',
        name: 'Sapphire II',
        subTier: 2,
        order: 6,
        threshold: 500,
        badgeFile: 'rank-sapphire-2.png',
        mascot: 'Hổ Xanh Lam Ngọc',
        shieldMaterial: 'Tinh thể Sapphire gầm vang',
        meaning: 'Uy lực bộc phá mãnh liệt',
        color: '#0047ab',
    },
    {
        rank: 'EMERALD_1',
        name: 'Emerald I',
        subTier: 1,
        order: 7,
        threshold: 550,
        badgeFile: 'rank-emerald-1.png',
        mascot: 'Sư Tử Hoàng Gia',
        shieldMaterial: 'Ngọc Lục Bảo + vương miện vàng',
        meaning: 'Chúa sơn lâm làm chủ đấu trường',
        color: '#50c878',
    },
    {
        rank: 'EMERALD_2',
        name: 'Emerald II',
        subTier: 2,
        order: 8,
        threshold: 600,
        badgeFile: 'rank-emerald-2.png',
        mascot: 'Bảo Tượng Hoàng Gia',
        shieldMaterial: 'Ngọc Lục Bảo + đôi ngà ngọc',
        meaning: 'Trí tuệ uyên bác, ký ức siêu phàm',
        color: '#00a86b',
    },
    {
        rank: 'DIAMOND_1',
        name: 'Diamond I',
        subTier: 1,
        order: 9,
        threshold: 700,
        badgeFile: 'rank-diamond-1.png',
        mascot: 'Kỳ Lân Pegasus Pha Lê',
        shieldMaterial: 'Kim cương giác cắt tinh khiết',
        meaning: 'Sự thuần khiết và thanh cao',
        color: '#b9f2ff',
    },
    {
        rank: 'DIAMOND_2',
        name: 'Diamond II',
        subTier: 2,
        order: 10,
        threshold: 800,
        badgeFile: 'rank-diamond-2.png',
        mascot: 'Phượng Hoàng Pha Lê',
        shieldMaterial: 'Kim cương tán sắc cầu vồng',
        meaning: 'Sự hoàn mỹ và hào quang rực rỡ',
        color: '#40e0d0',
    },
    {
        rank: 'MASTER_1',
        name: 'Master I',
        subTier: 1,
        order: 11,
        threshold: 900,
        badgeFile: 'rank-master-1.png',
        mascot: 'Đại Pháp Sư Vũ Trụ',
        shieldMaterial: 'Hắc diện thạch & Vàng thần thoại',
        meaning: 'Làm chủ ma pháp ngôn từ',
        color: '#9d00ff',
    },
    {
        rank: 'MASTER_2',
        name: 'Master II',
        subTier: 2,
        order: 12,
        threshold: 1000,
        badgeFile: 'rank-master-2.png',
        mascot: 'Thần Long Phương Đông',
        shieldMaterial: 'Rồng châu Á uốn lượn ngậm ngọc',
        meaning: 'Trí tuệ thần thánh và trường tồn',
        color: '#ff0055',
    },
    {
        rank: 'MASTER_3',
        name: 'Master III',
        subTier: 3,
        order: 13,
        threshold: Infinity,
        badgeFile: 'rank-master-3.png',
        mascot: 'Hắc Long Phương Tây',
        shieldMaterial: 'Rồng khổng lồ sải cánh thở lửa',
        meaning: 'Đỉnh cao tối thượng của PvP Arena',
        color: '#ff2a2a',
    },
];

export const ArenaRankModal: React.FC<ArenaRankModalProps> = ({
    isOpen,
    onClose,
    currentRank = 'BRONZE',
    highestRank,
}) => {
    const [tiers, setTiers] = useState<RankTierDetail[]>(FALLBACK_RANK_TIERS);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const currentCardRef = useRef<HTMLDivElement>(null);

    // Lấy danh sách Rank Tiers từ backend nếu có
    useEffect(() => {
        if (isOpen) {
            arenaService
                .getRankTiers()
                .then((data) => {
                    if (Array.isArray(data) && data.length > 0) {
                        setTiers(data);
                    }
                })
                .catch(() => {
                    // Dùng FALLBACK_RANK_TIERS nếu backend chưa phản hồi
                });
        }
    }, [isOpen]);

    // Tìm thứ tự (order) của rank hiện tại & rank cao nhất
    const currentOrder =
        tiers.find((t) => t.rank === currentRank)?.order ?? 0;
    const effectiveHighest = highestRank || currentRank;
    const highestOrder =
        tiers.find((t) => t.rank === effectiveHighest)?.order ?? currentOrder;

    // Tự động cuộn đến rank hiện tại khi mở modal
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                if (currentCardRef.current && scrollContainerRef.current) {
                    const container = scrollContainerRef.current;
                    const card = currentCardRef.current;
                    const scrollLeft =
                        card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2;
                    container.scrollTo({
                        left: Math.max(0, scrollLeft),
                        behavior: 'smooth',
                    });
                }
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen, currentRank]);

    // Hỗ trợ lướt touchpad dọc hoặc lăn chuột chuyển thành cuộn ngang
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (scrollContainerRef.current) {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                scrollContainerRef.current.scrollLeft += e.deltaY;
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl sm:max-w-4xl w-[92vw] p-0 flex flex-col gap-0 overflow-hidden bg-background/95 backdrop-blur-md border shadow-2xl">
                {/* Header Modal - Cố định phía trên */}
                <div className="shrink-0 p-6 pb-4 border-b">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-amber-400" />
                            <span>Lộ Trình Bậc Rank PvP Arena</span>
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Chinh phục 14 cấp bậc đấu trường từ Đồng lên đến Đại Sư Tối Thượng. Tích lũy Rank Point (RP) qua từng ván thắng để thăng hạng!
                    </p>
                </div>

                {/* Khung giữa: Scroll ngang CHỈ trong khu vực chứa các Rank Cards */}
                <div className="w-full min-w-0 overflow-hidden p-6">
                    <div
                        ref={scrollContainerRef}
                        onWheel={handleWheel}
                        className="w-full overflow-x-auto flex items-stretch gap-5 pb-4 select-none scroll-smooth [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-muted/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50"
                        style={{ scrollbarWidth: 'thin' }}
                    >
                        {tiers.map((tier) => {
                            const isCurrent = tier.rank === currentRank;
                            const hasReached = tier.order <= highestOrder;
                            const isLocked = !hasReached && !isCurrent;

                            return (
                                <div
                                    key={tier.rank}
                                    ref={isCurrent ? currentCardRef : null}
                                    style={{ scrollSnapAlign: 'center' }}
                                    className={`w-[240px] min-w-[240px] shrink-0 rounded-2xl p-5 flex flex-col items-center text-center justify-between transition-all duration-300 relative
                                    ${isCurrent ? 'border-2 border-amber-400/90 bg-card shadow-[0_0_25px_rgba(251,191,36,0.25)] animate-[pulse_3s_ease-in-out_infinite]'
                                            : hasReached
                                                ? 'border border-border/80 bg-card hover:border-primary/40'
                                                : 'border border-dashed border-border/50 bg-muted/20 opacity-40 grayscale hover:opacity-60'
                                        }`}
                                >
                                    {/* Nhãn "HIỆN TẠI" phía trên badge (border vàng kim, chữ và viền tỏa sáng nhẹ) */}
                                    <div className="h-7 flex items-center justify-center">
                                        {isCurrent ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider text-amber-400 border border-amber-400 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.45)]">
                                                <Sparkles className="h-3 w-3 animate-spin" />
                                                HIỆN TẠI
                                            </span>
                                        ) : hasReached ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-bold">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Đã từng đạt
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                                                <Lock className="h-3 w-3 opacity-60" />
                                                Chưa mở khóa
                                            </span>
                                        )}
                                    </div>

                                    {/* Khung Badge Rank (Không tự ý code ảnh giả, chừa chỗ placeholder cho asset sau này) */}
                                    <div className="my-4 relative">
                                        <div
                                            className={`
                        w-28 h-28 rounded-2xl flex flex-col items-center justify-center p-2 text-center text-xs
                        ${isCurrent
                                                    ? 'border-2 border-dashed border-amber-400/60 bg-amber-400/5'
                                                    : hasReached
                                                        ? 'border-2 border-dashed border-primary/30 bg-primary/5'
                                                        : 'border-2 border-dashed border-muted-foreground/30 bg-muted/30'
                                                }
                      `}
                                        >
                                            {isLocked ? (
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className="text-4xl font-black text-muted-foreground/40 mb-1">?</span>
                                                    <span className="font-mono text-[9px] text-muted-foreground/60">
                                                        [Asset: {tier.badgeFile}]
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center">
                                                    <Award
                                                        className={`h-10 w-10 mb-1 ${isCurrent ? 'text-amber-400' : 'text-primary opacity-70'
                                                            }`}
                                                    />
                                                    <span className="font-mono text-[9px] text-muted-foreground">
                                                        [Asset: {tier.badgeFile}]
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Thông tin: Tên Rank & Điểm yêu cầu */}
                                    <div className="space-y-1.5 w-full pt-1">
                                        <h4
                                            className={`font-black text-base tracking-wide uppercase truncate ${isCurrent ? 'text-amber-400' : 'text-foreground'
                                                }`}
                                            title={tier.name}
                                        >
                                            {tier.name}
                                        </h4>

                                        {/* Mức điểm yêu cầu */}
                                        <div className="px-3 py-1.5 rounded-lg bg-muted/50 border text-xs font-semibold">
                                            {tier.threshold === Infinity ? (
                                                <span className="text-amber-500 font-extrabold">Bậc Tối Thượng</span>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    Thăng bậc: <span className="font-bold text-foreground">{tier.threshold} RP</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Ý nghĩa rank / Linh vật */}
                                        <p className="text-[11px] text-muted-foreground line-clamp-1 italic pt-1">
                                            {tier.mascot}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Modal: Cố định phía dưới */}
                <div className="shrink-0 px-6 py-4 bg-muted/40 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary" />
                        <span>Thắng: <strong className="text-foreground">+25 RP</strong>   Thua: <strong className="text-foreground">-20 RP</strong>   Hòa: <strong className="text-foreground">0 RP</strong></span>
                    </div>
                    <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
                        Đóng
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
