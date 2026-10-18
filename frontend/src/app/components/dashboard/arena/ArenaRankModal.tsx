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
    Crosshair,
    Radio,
    Lock,
    Unlock,
    Sparkles,
} from 'lucide-react';
import { arenaService, RankTierDetail, getRankBadgeUrl } from '../../../services/arena-service';

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
        name: 'BRONZE',
        order: 0,
        threshold: 200,
        badgeFile: 'rank-bronze.png',
        mascot: 'Chiến Binh Spartan',
        meaning: 'Tinh thần chiến binh sơ khởi, dũng cảm bước vào đấu trường.',
        color: '#cd7f32',
    },
    {
        rank: 'SILVER',
        name: 'SILVER',
        order: 1,
        threshold: 250,
        badgeFile: 'rank-silver.png',
        mascot: 'Đại Bàng Bạc',
        meaning: 'Tầm nhìn sắc bén, sự nhanh nhạy và đôi cánh vươn cao.',
        color: '#c0c0c0',
    },
    {
        rank: 'GOLD',
        name: 'GOLD',
        order: 2,
        threshold: 300,
        badgeFile: 'rank-gold.png',
        mascot: 'Bò Tót Vàng',
        meaning: 'Sức mạnh kiên định, sự vững chãi và năng lượng hừng hực.',
        color: '#ffd700',
    },
    {
        rank: 'PLATINUM_1',
        name: 'PLATINUM I',
        order: 3,
        threshold: 350,
        badgeFile: 'rank-platinum-1.png',
        mascot: 'Sói Đầu Đàn',
        meaning: 'Bản lĩnh thủ lĩnh, sắc lạnh và tư duy chiến thuật đỉnh cao.',
        color: '#00e5ff',
    },
    {
        rank: 'PLATINUM_2',
        name: 'PLATINUM II',
        order: 4,
        threshold: 400,
        badgeFile: 'rank-platinum-2.png',
        mascot: 'Sói Đầu Đàn Hào Quang',
        meaning: 'Bản lĩnh thủ lĩnh tối thượng, chuẩn bị bứt phá lên hàng bảo thạch.',
        color: '#00f0ff',
    },
    {
        rank: 'SAPPHIRE_1',
        name: 'SAPPHIRE I',
        order: 5,
        threshold: 450,
        badgeFile: 'rank-sapphire-1.png',
        mascot: 'Báo Săn Lam Ngọc',
        meaning: 'Tốc độ phản xạ thần tốc, dứt khoát trong từng câu hỏi.',
        color: '#0f52ba',
    },
    {
        rank: 'SAPPHIRE_2',
        name: 'SAPPHIRE II',
        order: 6,
        threshold: 500,
        badgeFile: 'rank-sapphire-2.png',
        mascot: 'Hổ Xanh Lam Ngọc',
        meaning: 'Uy lực bộc phá mãnh liệt, áp đảo đấu trường.',
        color: '#0047ab',
    },
    {
        rank: 'EMERALD_1',
        name: 'EMERALD I',
        order: 7,
        threshold: 550,
        badgeFile: 'rank-emerald-1.png',
        mascot: 'Sư Tử Hoàng Gia',
        meaning: 'Chúa sơn lâm làm chủ đấu trường, phong thái vương giả.',
        color: '#50c878',
    },
    {
        rank: 'EMERALD_2',
        name: 'EMERALD II',
        order: 8,
        threshold: 600,
        badgeFile: 'rank-emerald-2.png',
        mascot: 'Bảo Tượng Hoàng Gia',
        meaning: 'Trí tuệ uyên bác, ký ức siêu phàm ("An Elephant Never Forgets").',
        color: '#00a86b',
    },
    {
        rank: 'DIAMOND_1',
        name: 'DIAMOND I',
        order: 9,
        threshold: 700,
        badgeFile: 'rank-diamond-1.png',
        mascot: 'Kỳ Lân Pegasus Pha Lê',
        meaning: 'Sự thuần khiết, thanh cao và khí phách kiêu hãnh.',
        color: '#b9f2ff',
    },
    {
        rank: 'DIAMOND_2',
        name: 'DIAMOND II',
        order: 10,
        threshold: 800,
        badgeFile: 'rank-diamond-2.png',
        mascot: 'Phượng Hoàng Pha Lê',
        meaning: 'Sự hoàn mỹ, bất tử và hào quang tỏa sáng rực rỡ.',
        color: '#40e0d0',
    },
    {
        rank: 'MASTER_1',
        name: 'MASTER I',
        order: 11,
        threshold: 900,
        badgeFile: 'rank-master-1.png',
        mascot: 'Đại Pháp Sư Vũ Trụ',
        meaning: 'Đỉnh cao tri thức nhân loại, làm chủ ma pháp ngôn từ.',
        color: '#9d00ff',
    },
    {
        rank: 'MASTER_2',
        name: 'MASTER II',
        order: 12,
        threshold: 1000,
        badgeFile: 'rank-master-2.png',
        mascot: 'Thần Long Phương Đông',
        meaning: 'Linh khí trời đất, trí tuệ thần thánh và sự trường tồn.',
        color: '#ff0055',
    },
    {
        rank: 'MASTER_3',
        name: 'MASTER III',
        order: 13,
        threshold: Infinity,
        badgeFile: 'rank-master-3.png',
        mascot: 'Hắc Long Phương Tây',
        meaning: 'Đỉnh cao tối thượng của PvP Arena, biểu tượng kẻ bất bại!',
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
                            Roadmap Bậc Rank PvP Arena
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
                                    style={{
                                        scrollSnapAlign: 'center',
                                        borderColor: isCurrent ? tier.color : (hasReached ? `${tier.color}60` : undefined),
                                        boxShadow: isCurrent ? `0 0 25px ${tier.color}90, inset 0 0 15px ${tier.color}25` : undefined,
                                    }}
                                    className={`w-[240px] min-w-[240px] shrink-0 rounded-2xl p-5 flex flex-col items-center text-center justify-between transition-all duration-300 relative
                                    ${isCurrent
                                            ? 'border-2 bg-card animate-[pulse_3s_ease-in-out_infinite]'
                                            : hasReached
                                                ? 'border bg-card hover:border-opacity-100'
                                                : 'border border-dashed border-border/50 bg-muted/20 opacity-40 grayscale hover:opacity-60'
                                        }`}
                                >
                                    {/* Nhãn "HIỆN TẠI" phía trên badge (border vàng kim, chữ và viền tỏa sáng nhẹ) */}
                                    <div className="h-7 flex items-center justify-center">
                                        {isCurrent ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[12px] font-black uppercase tracking-wider text-amber-400 border border-amber-400 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.45)]">
                                                <Crosshair className="h-3 w-3 animate-spin" />
                                                HIỆN TẠI
                                            </span>
                                        ) : hasReached ? (
                                            <span className="inline-flex items-center gap-1 text-[12px] text-emerald-300 font-bold">
                                                <Unlock className="h-3.5 w-3.5" />
                                                Đã mở
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                                                <Lock className="h-3 w-3 opacity-60" />
                                                Chưa mở khóa
                                            </span>
                                        )}
                                    </div>

                                    {/* Badge Rank */}
                                    <div className="my-3 relative w-32 h-32 flex items-center justify-center transition-transform duration-300 hover:scale-110 select-none">
                                        <img
                                            src={getRankBadgeUrl(tier.rank)}
                                            alt={tier.name}
                                            className={`w-full h-full object-contain transition-all duration-300 ${isLocked
                                                    ? 'grayscale-[75%] opacity-40'
                                                    : 'drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)]'
                                                }`}
                                        />
                                        {isLocked && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="p-2 rounded-full bg-background/80 backdrop-blur-xs border shadow-sm">
                                                    <Lock className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Thông tin: Tên Rank & Điểm yêu cầu */}
                                    <div className="space-y-1.5 w-full pt-1">
                                        <h4
                                            className="font-black text-base tracking-wide uppercase truncate drop-shadow-xs"
                                            style={{ color: tier.color }}
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
