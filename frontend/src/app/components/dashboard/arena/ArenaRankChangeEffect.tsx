import React, { useState, useEffect } from 'react';
import { getRankBadgeUrl } from '../../../services/arena-service';
import { Sparkles, ArrowUpCircle, ArrowDownCircle, CheckCircle } from 'lucide-react';

export interface RankChangeData {
  oldRank: string;
  newRank: string;
  isPromoted: boolean;
  isDemoted: boolean;
}

export interface ArenaRankChangeEffectProps {
  changeData: RankChangeData;
  onComplete: () => void;
  formatRankName: (rank?: string) => string;
}

export const ArenaRankChangeEffect: React.FC<ArenaRankChangeEffectProps> = ({
  changeData,
  onComplete,
  formatRankName,
}) => {
  const { oldRank, newRank, isPromoted, isDemoted } = changeData;
  const isUp = isPromoted;

  // Giai đoạn của Animation:
  // 0: 'init'       (0s - 0.2s)
  // 1: 'charging'   (0.2s - 1.4s): Badge cũ rung lắc tích tụ năng lượng / mất năng lượng
  // 2: 'burst'      (1.4s - 2.0s): Badge cũ nổ tung / chìm xuống, sóng xung kích tỏa ra
  // 3: 'assembling' (2.0s - 3.2s): Các luồng tinh thể hội tụ, badge mới lao tới đập slam
  // 4: 'settled'    (3.2s - 5.0s): Badge mới ổn định hào quang, chữ rank mới lấp lánh
  const [phase, setPhase] = useState<'init' | 'charging' | 'burst' | 'assembling' | 'settled'>('init');

  useEffect(() => {
    // Timeline điều phối các giai đoạn
    const t1 = setTimeout(() => setPhase('charging'), 150);
    const t2 = setTimeout(() => setPhase('burst'), 1400);
    const t3 = setTimeout(() => setPhase('assembling'), 2000);
    const t4 = setTimeout(() => setPhase('settled'), 3200);
    const t5 = setTimeout(() => {
      onComplete();
    }, 5500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  const oldBadgeUrl = getRankBadgeUrl(oldRank);
  const newBadgeUrl = getRankBadgeUrl(newRank);

  return (
    <div className="relative w-full flex flex-col items-center justify-center py-2 select-none overflow-visible">
      <style>{`
        @keyframes rankShake {
          0% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-2px, 2px) rotate(-1deg); }
          40% { transform: translate(2px, -1px) rotate(1.5deg); }
          60% { transform: translate(-2px, -2px) rotate(-1deg); }
          80% { transform: translate(2px, 2px) rotate(1deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }

        @keyframes energyConvergeTopLeft {
          0% { transform: translate(-80px, -80px) scale(0.2); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.8; }
        }

        @keyframes energyConvergeTopRight {
          0% { transform: translate(80px, -80px) scale(0.2); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.8; }
        }

        @keyframes energyConvergeBottomLeft {
          0% { transform: translate(-80px, 80px) scale(0.2); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.8; }
        }

        @keyframes energyConvergeBottomRight {
          0% { transform: translate(80px, 80px) scale(0.2); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.8; }
        }

        @keyframes slamIn {
          0% {
            transform: scale(0.2) rotate(-15deg);
            opacity: 0;
            filter: brightness(3) drop-shadow(0 0 50px rgba(251, 191, 36, 1));
          }
          70% {
            transform: scale(1.22) rotate(2deg);
            opacity: 1;
            filter: brightness(2) drop-shadow(0 0 40px rgba(251, 191, 36, 0.9));
          }
          85% {
            transform: scale(0.96) rotate(-1deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: brightness(1) drop-shadow(0 12px 28px rgba(0, 0, 0, 0.45));
          }
        }

        @keyframes floatGentle {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-6px) scale(1.02); }
        }

        @keyframes magicRuneSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes shimmerText {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .animate-rank-shake {
          animation: rankShake 0.12s infinite;
        }

        .animate-slam-in {
          animation: slamIn 0.85s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .animate-float-gentle {
          animation: floatGentle 3s ease-in-out infinite;
        }

        .animate-rune-spin {
          animation: magicRuneSpin 8s linear infinite;
        }

        .shimmer-gold-text {
          background: linear-gradient(90deg, #f59e0b 0%, #fef08a 50%, #f59e0b 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmerText 2.5s infinite linear;
        }
      `}</style>

      {/* ── TAG THÔNG BÁO TRÊN ĐẦU: THĂNG BẬC HOẶC HẠ BẬC ── */}
      <div className="mb-2 transition-all duration-500 transform">
        {isUp ? (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 border border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.4)] animate-in zoom-in-75 duration-300">
            <ArrowUpCircle className="w-4 h-4 text-amber-400 animate-bounce" />
            <span className="text-xs font-black tracking-widest uppercase text-amber-300">
              THĂNG BẬC RANK!
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-in zoom-in-75 duration-300">
            <ArrowDownCircle className="w-4 h-4 text-rose-400 animate-bounce" />
            <span className="text-xs font-black tracking-widest uppercase text-rose-300">
              HẠ BẬC RANK
            </span>
          </div>
        )}
      </div>

      {/* ── KHU VỰC DIỄN HOẠT BADGE (ARENA BADGE STAGE) ── */}
      <div className="w-52 h-52 relative flex items-center justify-center overflow-visible">
        {/* 1. VÒNG HÀO QUANG RUNIC MA THUẬT PHÍA SAU (KHI THĂNG RANK) */}
        {isUp && (
          <div
            className={`absolute inset-0 -m-6 rounded-full pointer-events-none transition-opacity duration-700 flex items-center justify-center ${phase === 'burst' || phase === 'assembling' || phase === 'settled'
              ? 'opacity-100 scale-100'
              : 'opacity-40 scale-90'
              }`}
          >
            {/* Vòng quay hào quang conic */}
            <div className="w-full h-full rounded-full animate-rune-spin border-2 border-dashed border-amber-400/40 opacity-70" />
            {/* Vầng sáng vàng kim trung tâm */}
            <div className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-amber-500/20 via-yellow-400/30 to-transparent blur-xl pointer-events-none" />
          </div>
        )}

        {/* 2. SÓNG XUNG KÍCH BÙNG NỔ (SHOCKWAVE RING) KHI NỔ BADGE */}
        {phase === 'burst' && isUp && (
          <div className="absolute w-28 h-28 rounded-full border-4 border-amber-300/80 animate-ping pointer-events-none z-30" />
        )}

        {/* 3. 4 LUỒNG TINH THỂ NĂNG LƯỢNG HỘI TỤ (ASSEMBLY ENERGY SHARDS) */}
        {phase === 'assembling' && isUp && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
            {/* Shard 1: Top-Left */}
            <div
              className="absolute w-12 h-1.5 bg-gradient-to-r from-transparent via-amber-300 to-white rounded-full blur-[0.5px]"
              style={{
                top: '50%',
                left: '50%',
                animation: 'energyConvergeTopLeft 0.5s ease-out forwards',
              }}
            />
            {/* Shard 2: Top-Right */}
            <div
              className="absolute w-12 h-1.5 bg-gradient-to-r from-transparent via-amber-300 to-white rounded-full blur-[0.5px]"
              style={{
                top: '50%',
                left: '50%',
                animation: 'energyConvergeTopRight 0.5s ease-out forwards',
              }}
            />
            {/* Shard 3: Bottom-Left */}
            <div
              className="absolute w-12 h-1.5 bg-gradient-to-r from-transparent via-amber-300 to-white rounded-full blur-[0.5px]"
              style={{
                top: '50%',
                left: '50%',
                animation: 'energyConvergeBottomLeft 0.5s ease-out forwards',
              }}
            />
            {/* Shard 4: Bottom-Right */}
            <div
              className="absolute w-12 h-1.5 bg-gradient-to-r from-transparent via-amber-300 to-white rounded-full blur-[0.5px]"
              style={{
                top: '50%',
                left: '50%',
                animation: 'energyConvergeBottomRight 0.5s ease-out forwards',
              }}
            />
          </div>
        )}

        {/* 4. BADGE CŨ (GIAI ĐOẠN CHARGING VÀ BURST) */}
        {(phase === 'init' || phase === 'charging' || phase === 'burst') && (
          <div
            className={`w-44 h-44 absolute inset-0 m-auto flex items-center justify-center transition-all duration-300 ${phase === 'charging'
              ? isUp
                ? 'animate-rank-shake brightness-150 drop-shadow-[0_0_35px_rgba(251,191,36,0.8)] scale-105'
                : 'animate-rank-shake grayscale contrast-125 brightness-75 scale-95'
              : ''
              } ${phase === 'burst'
                ? isUp
                  ? 'scale-[1.45] opacity-0 blur-md duration-300'
                  : 'translate-y-8 opacity-0 scale-75 duration-500'
                : 'opacity-100'
              }`}
          >
            <img
              src={oldBadgeUrl}
              alt={formatRankName(oldRank)}
              className="w-full h-full object-contain select-none pointer-events-none"
            />
          </div>
        )}

        {/* 5. BADGE MỚI (GIAI ĐOẠN ASSEMBLING VÀ SETTLED) */}
        {(phase === 'assembling' || phase === 'settled') && (
          <div
            className={`w-44 h-44 absolute inset-0 m-auto flex items-center justify-center z-20 ${phase === 'assembling'
              ? isUp
                ? 'animate-slam-in'
                : 'animate-in fade-in zoom-in-75 duration-700'
              : 'animate-float-gentle'
              }`}
          >
            <img
              src={newBadgeUrl}
              alt={formatRankName(newRank)}
              className={`w-full h-full object-contain select-none transition-all duration-500 ${isUp
                ? 'drop-shadow-[0_0_35px_rgba(251,191,36,0.7)]'
                : 'drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]'
                }`}
            />
          </div>
        )}
      </div>

      {/* ── THÔNG TIN TÊN RANK VÀ CHUYỂN ĐỔI BẬC ── */}
      <div className="space-y-1 text-center mt-3 relative z-20">
        {/* Tên Rank cũ mờ dần -> Tên Rank mới bừng sáng */}
        {phase === 'init' || phase === 'charging' ? (
          <div className="animate-in fade-in duration-200">
            <h3 className="text-xl font-extrabold uppercase text-muted-foreground tracking-wide line-through opacity-70">
              {formatRankName(oldRank)}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isUp ? 'Đang chuyển hóa bậc rank...' : 'Đang điều chỉnh bậc rank...'}
            </p>
          </div>
        ) : (
          <div className="animate-in zoom-in-95 duration-500">
            <h3
              className={`text-2xl font-black uppercase tracking-wider ${isUp ? 'shimmer-gold-text drop-shadow' : 'text-foreground font-bold'
                }`}
            >
              {formatRankName(newRank)}
            </h3>
            <p className="text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1.5">
              <span>{formatRankName(oldRank)}</span>
              <span className="text-primary font-bold">→</span>
              <span className={isUp ? 'text-amber-400 font-extrabold' : 'text-rose-400 font-extrabold'}>
                {formatRankName(newRank)}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
