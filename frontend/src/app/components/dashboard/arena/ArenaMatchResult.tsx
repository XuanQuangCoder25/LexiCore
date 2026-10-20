import React from 'react';
import { Button } from '../../ui/button';
import {
  Swords,
  RotateCcw,
  Home,
  Trophy,
  Star,
  Clock,
  Target,
  BookOpen,
  Check,
  X,
  CheckCircle2,
} from 'lucide-react';
import { getRankBadgeUrl } from '../../../services/arena-service';
import { GameOverPayload, MatchReviewWord, ArenaPlayerInfo } from '../../../services/arena-socket.service';

export interface ArenaMatchResultProps {
  gameOverData: GameOverPayload;
  mePlayerInfo?: ArenaPlayerInfo;
  opponentPlayerInfo?: ArenaPlayerInfo;
  onPlayAgain: () => void;
  onBackToHub: () => void;
}

const RANK_THRESHOLDS: Record<string, number> = {
  BRONZE: 200,
  SILVER: 250,
  GOLD: 300,
  PLATINUM_1: 350,
  PLATINUM_2: 400,
  SAPPHIRE_1: 450,
  SAPPHIRE_2: 500,
  EMERALD_1: 550,
  EMERALD_2: 600,
  DIAMOND_1: 700,
  DIAMOND_2: 800,
  MASTER_1: 900,
  MASTER_2: 1000,
  MASTER_3: Infinity,
};

const formatRank = (rank?: string) => {
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
  return map[rank.toUpperCase().trim()] || rank.replace(/_/g, ' ');
};

const getProgressBarData = (rank?: string, currentRP?: number, delta?: number) => {
  const cleanRank = (rank || 'BRONZE').toUpperCase().trim();
  const threshold = RANK_THRESHOLDS[cleanRank] || 200;
  const rp = typeof currentRP === 'number' && !isNaN(currentRP) ? currentRP : 0;
  const d = typeof delta === 'number' && !isNaN(delta) ? delta : 0;

  if (threshold === Infinity) {
    return {
      basePercent: 100,
      deltaPercent: 0,
      isPositive: true,
      label: `${rp} RP (Tối đa)`,
    };
  }

  if (d >= 0) {
    const oldRP = Math.max(0, rp - d);
    const basePercent = Math.min(100, Math.max(0, (oldRP / threshold) * 100));
    const deltaPercent = Math.min(100 - basePercent, Math.max(0, (d / threshold) * 100));
    return {
      basePercent,
      deltaPercent,
      isPositive: true,
      label: `${rp} / ${threshold} RP`,
    };
  } else {
    const basePercent = Math.min(100, Math.max(0, (rp / threshold) * 100));
    const deltaPercent = Math.min(100 - basePercent, Math.max(0, (Math.abs(d) / threshold) * 100));
    return {
      basePercent,
      deltaPercent,
      isPositive: false,
      label: `${rp} / ${threshold} RP`,
    };
  }
};

const RankProgressBar: React.FC<{
  rank?: string;
  currentRP?: number;
  delta?: number;
}> = ({ rank, currentRP, delta }) => {
  const data = getProgressBarData(rank, currentRP, delta);

  return (
    <div className="space-y-1 w-full">
      <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden flex shadow-inner">
        {data.isPositive ? (
          <>
            <div
              className="h-full bg-primary/80 transition-all duration-500 rounded-l-full"
              style={{ width: `${data.basePercent}%` }}
            />
            <div
              className="h-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse transition-all duration-500"
              style={{ width: `${data.deltaPercent}%` }}
            />
          </>
        ) : (
          <>
            <div
              className="h-full bg-primary/80 transition-all duration-500 rounded-l-full"
              style={{ width: `${data.basePercent}%` }}
            />
            <div
              className="h-full bg-rose-500/50 border-l border-rose-500/80 transition-all duration-500"
              style={{ width: `${data.deltaPercent}%` }}
            />
          </>
        )}
      </div>
      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
        <span className="text-[9px] uppercase tracking-wider">Tiến trình</span>
        <span className="font-mono text-foreground">{data.label}</span>
      </div>
    </div>
  );
};

export const ArenaMatchResult: React.FC<ArenaMatchResultProps> = ({
  gameOverData,
  mePlayerInfo,
  opponentPlayerInfo,
  onPlayAgain,
  onBackToHub,
}) => {
  const { myResult, myStats, opponentStats, words, reason } = gameOverData;

  const isWin = myResult === 'WIN';
  const isLoss = myResult === 'LOSS';
  const isDraw = myResult === 'DRAW';

  // Xác định banner và emblem cho P1 (bản thân)
  const myBannerSrc = isWin
    ? '/assets/banners/banner-victory.png'
    : isLoss
      ? '/assets/banners/banner-defeat.png'
      : '/assets/banners/banner-draw.png';

  const myEmblemSrc = isWin
    ? '/assets/emblems/emblem-victory.png'
    : isLoss
      ? '/assets/emblems/emblem-defeat.png'
      : '/assets/emblems/emblem-draw.png';

  // Xác định banner và emblem cho P2 (đối thủ)
  const oppBannerSrc = isWin
    ? '/assets/banners/banner-defeat.png'
    : isLoss
      ? '/assets/banners/banner-victory.png'
      : '/assets/banners/banner-draw.png';

  const oppEmblemSrc = isWin
    ? '/assets/emblems/emblem-defeat.png'
    : isLoss
      ? '/assets/emblems/emblem-victory.png'
      : '/assets/emblems/emblem-draw.png';

  // Format thời gian từ ms sang mm:ss
  const formatTimeMs = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Tính tỷ lệ chính xác (%)
  const myAccuracy = Math.round((myStats.correct / 25) * 100) || 0;
  const oppAccuracy = Math.round((opponentStats.correct / 25) * 100) || 0;

  // Điểm số trên thang 250
  const myScore = myStats.correct * 10;
  const oppScore = opponentStats.correct * 10;

  // Format hiển thị biến động điểm RP (+25 RP, +0 RP, -20 RP)
  const formatRPDelta = (delta?: number | null) => {
    const num = typeof delta === 'number' && !isNaN(delta) ? delta : 0;
    if (num > 0) return `+${num} RP`;
    if (num < 0) return `${num} RP`;
    return `+0 RP`;
  };

  const getRPBadgeClass = (delta?: number | null) => {
    const num = typeof delta === 'number' && !isNaN(delta) ? delta : 0;
    if (num > 0) return 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30';
    if (num < 0) return 'text-rose-500 bg-rose-500/15 border-rose-500/30';
    return 'text-sky-400 bg-sky-500/15 border-sky-500/30';
  };

  const getEmblemVisualClass = (emblemType: 'VICTORY' | 'DEFEAT' | 'DRAW') => {
    if (emblemType === 'DEFEAT') {
      return 'scale-[1.25] sm:scale-[1.3] md:scale-[1.35]';
    }
    if (emblemType === 'DRAW') {
      return 'scale-[1.15] sm:scale-[1.2] md:scale-[1.25]';
    }
    return 'scale-[1.22] sm:scale-[1.28] md:scale-[1.32]';
  };

  const myEmblemType: 'VICTORY' | 'DEFEAT' | 'DRAW' = isWin ? 'VICTORY' : isLoss ? 'DEFEAT' : 'DRAW';
  const oppEmblemType: 'VICTORY' | 'DEFEAT' | 'DRAW' = !isWin && !isDraw ? 'VICTORY' : isWin ? 'DEFEAT' : 'DRAW';

  // Tính toán delta RP an toàn (fallback -20 khi thua, +25 khi thắng)
  const myRankPointDelta =
    typeof myStats.rankPointDelta === 'number' && !isNaN(myStats.rankPointDelta)
      ? myStats.rankPointDelta
      : isWin
        ? 25
        : isLoss
          ? -20
          : 0;

  const oppRankPointDelta =
    typeof opponentStats.rankPointDelta === 'number' && !isNaN(opponentStats.rankPointDelta)
      ? opponentStats.rankPointDelta
      : isWin
        ? -20
        : isLoss
          ? 25
          : 0;

  // RP hiện tại sau trận
  const myCurrentRP = myStats.newRankPoint ?? mePlayerInfo?.rank_point;
  const myRank = myStats.newRank || mePlayerInfo?.arena_rank || 'BRONZE';

  const oppCurrentRP = opponentStats.newRankPoint ?? opponentPlayerInfo?.rank_point;
  const oppRank = opponentStats.newRank || opponentPlayerInfo?.arena_rank || 'BRONZE';

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 pt-1 sm:pt-2 pb-6 px-3 sm:px-6 animate-in fade-in duration-300 select-none">
      <style>{`
        @keyframes floatSlow {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.03);
          }
        }
        .animate-float-vs {
          animation: floatSlow 3s ease-in-out infinite;
        }
      `}</style>

      {/* ── TIÊU ĐỀ TRẬN ĐẤU & LÝ DO KẾT THÚC ── */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-black tracking-widest uppercase">
          <Swords className="w-3.5 h-3.5" />
          <span>Kết Quả Đấu Trường PvP 1v1</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-foreground">
          {isWin && <span className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">CHIẾN THẮNG VANG DỘI!</span>}
          {isLoss && <span className="text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">THẤT BẠI TIẾC NUỐI!</span>}
          {isDraw && <span className="text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">TRẬN ĐẤU BẤT PHÂN THẮNG BẠI!</span>}
        </h2>
        {reason === 'SURRENDER' && (
          <p className="text-xs text-muted-foreground font-semibold">
            {isWin ? 'Đối thủ đã tuyên bố đầu hàng.' : 'Bạn đã chấp nhận đầu hàng.'}
          </p>
        )}
        {reason === 'TIMEOUT' && (
          <p className="text-xs text-muted-foreground font-semibold">
            Trận đấu đã kết thúc do hết thời gian quy định.
          </p>
        )}
      </div>

      {/* ── BỐ CỤC 3 PHẦN NỬA TRÊN: P1 (TRÁI) ── [EMBLEM VS + NÚT Ở GIỮA] ── P2 (PHẢI) ── */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 -mt-2 sm:-mt-3">
        {/* ── CỘT BÊN TRÁI: PLAYER 1 (BẠN) ── */}
        <div className="flex flex-col items-center relative w-full max-w-[360px]">
          {/* Banner Victory/Defeat ngoạm lấy viền trên Card P1 */}
          <div className="w-[115%] sm:w-[125%] max-w-[440px] sm:max-w-[470px] h-28 sm:h-36 relative -mb-9 sm:-mb-12 z-20 flex items-center justify-center animate-in zoom-in-95 duration-500 pointer-events-none">
            <img
              src={myBannerSrc}
              alt="My result"
              className={`w-full h-full object-contain ${isWin
                ? 'drop-shadow-[0_0_40px_rgba(251,191,36,0.7)]'
                : isLoss
                  ? 'drop-shadow-[0_0_35px_rgba(244,63,94,0.6)]'
                  : 'drop-shadow-[0_0_35px_rgba(56,189,248,0.6)]'
                }`}
            />
          </div>

          {/* Card Thông tin P1 */}
          <div
            className={`w-full rounded-3xl border-2 pt-12 pb-5 px-4 sm:px-5 flex flex-col justify-between min-h-[420px] sm:min-h-[440px] relative transition-transform duration-200 hover:scale-[1.01] shadow-xl z-10 ${isWin
              ? 'border-amber-400/50 bg-card shadow-[0_0_35px_rgba(251,191,36,0.15)]'
              : isLoss
                ? 'border-rose-500/40 bg-card shadow-[0_0_35px_rgba(244,63,94,0.12)]'
                : 'border-sky-500/40 bg-card shadow-[0_0_35px_rgba(56,189,248,0.12)]'
              }`}
          >
            {/* Header Card: Tag P1 & Biến động RP ở góc trên bên phải */}
            <div className="w-full flex items-center justify-between z-10">
              <span className="text-xs font-black uppercase px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
                P1 (Bạn)
              </span>
              <span
                className={`text-xs sm:text-sm font-black font-mono px-3 py-1 rounded-xl border shadow-xs ${getRPBadgeClass(
                  myRankPointDelta
                )}`}
              >
                {formatRPDelta(myRankPointDelta)}
              </span>
            </div>

            {/* EMBLEM VICTORY / DEFEAT / DRAW CHIẾM TRỌN TRUNG TÂM CARD VỚI KÍCH THƯỚC LỚN */}
            <div className="w-full flex-1 flex flex-col items-center justify-center py-4 sm:py-6 relative overflow-visible">
              <img
                src={myEmblemSrc}
                alt="My Emblem"
                className={`h-36 sm:h-44 md:h-48 w-full max-w-[280px] object-contain transition-all duration-300 ${getEmblemVisualClass(
                  myEmblemType
                )} ${isWin
                  ? 'drop-shadow-[0_0_40px_rgba(251,191,36,0.65)]'
                  : isLoss
                    ? 'drop-shadow-[0_0_35px_rgba(244,63,94,0.6)]'
                    : 'drop-shadow-[0_0_35px_rgba(56,189,248,0.6)]'
                  }`}
              />
            </div>

            {/* THANH NGANG BÊN DƯỚI EMBLEM: AVATAR VUÔNG BÊN TRÁI, TÊN & BADGE RANK + TIẾN TRÌNH Ở BÊN PHẢI */}
            <div className="w-full pt-1">
              <div className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-muted/40 border border-border/60 backdrop-blur-xs">
                {/* Avatar hình vuông sát bên trái */}
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-primary/40 bg-muted flex items-center justify-center shadow-xs">
                  {mePlayerInfo?.avatar_url ? (
                    <img
                      src={mePlayerInfo.avatar_url}
                      alt={mePlayerInfo.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-black text-lg text-primary">
                      {mePlayerInfo?.full_name?.charAt(0).toUpperCase() || 'P1'}
                    </span>
                  )}
                </div>

                {/* 2 Hàng kế bên */}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Hàng 1: Tên user & Tên rank */}
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-extrabold text-xs sm:text-sm text-foreground truncate max-w-[140px]">
                      {mePlayerInfo?.full_name || 'Bạn'}
                    </h4>
                    <span className="text-[10px] font-bold text-primary uppercase shrink-0">
                      {formatRank(myRank)}
                    </span>
                  </div>

                  {/* Hàng 2: Badge rank to bằng cả 2 hàng tiến trình và text */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center p-0.5">
                      <img
                        src={getRankBadgeUrl(myRank)}
                        alt="Rank Badge"
                        className="w-full h-full object-contain drop-shadow-md select-none"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <RankProgressBar
                        rank={myRank}
                        currentRP={myCurrentRP}
                        delta={myRankPointDelta}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── KHU VỰC TRUNG TÂM: EMBLEM "VS" + 2 NÚT HÀNH ĐỘNG ── */}
        <div className="flex flex-col items-center justify-center gap-3 py-2 shrink-0 z-20">
          {/* Emblem VS uy lực kèm hiệu ứng lơ lửng */}
          <div className="w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 flex items-center justify-center animate-float-vs">
            <img
              src="/assets/emblems/emblem-vs.png"
              alt="VS"
              className="w-full h-full object-contain drop-shadow-[0_0_35px_rgba(251,191,36,0.7)]"
            />
          </div>

          {/* 2 Nút Hành động */}
          <div className="flex flex-col items-center gap-2.5 w-full min-w-[210px] mt-2 sm:mt-4">
            <Button
              onClick={onPlayAgain}
              size="lg"
              className="w-full px-6 py-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black tracking-wider uppercase shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105 gap-2 text-sm sm:text-base cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>TÌM TRẬN MỚI</span>
            </Button>

            <Button
              onClick={onBackToHub}
              variant="outline"
              size="lg"
              className="w-full px-6 py-5 rounded-2xl border-2 border-border/80 hover:bg-muted/80 text-foreground font-bold tracking-wide transition-all duration-200 hover:scale-105 gap-2 text-sm sm:text-base cursor-pointer"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <span>VỀ SẢNH</span>
            </Button>
          </div>
        </div>

        {/* ── CỘT BÊN PHẢI: PLAYER 2 (ĐỐI THỦ) ── */}
        <div className="flex flex-col items-center relative w-full max-w-[360px]">
          {/* Banner Victory/Defeat trên đỉnh Card P2 */}
          <div className="w-[115%] sm:w-[125%] max-w-[440px] sm:max-w-[470px] h-28 sm:h-36 relative -mb-9 sm:-mb-12 z-20 flex items-center justify-center animate-in zoom-in-95 duration-500 pointer-events-none">
            <img
              src={oppBannerSrc}
              alt="Opponent result"
              className={`w-full h-full object-contain ${!isWin && !isDraw
                ? 'drop-shadow-[0_0_40px_rgba(251,191,36,0.7)]'
                : isWin
                  ? 'drop-shadow-[0_0_35px_rgba(244,63,94,0.6)]'
                  : 'drop-shadow-[0_0_35px_rgba(56,189,248,0.6)]'
                }`}
            />
          </div>

          {/* Card Thông tin P2 */}
          <div
            className={`w-full rounded-3xl border-2 pt-12 pb-5 px-4 sm:px-5 flex flex-col justify-between min-h-[420px] sm:min-h-[440px] relative transition-transform duration-200 hover:scale-[1.01] shadow-xl z-10 ${!isWin && !isDraw
              ? 'border-amber-400/50 bg-card shadow-[0_0_35px_rgba(251,191,36,0.15)]'
              : isWin
                ? 'border-rose-500/40 bg-card shadow-[0_0_35px_rgba(244,63,94,0.12)]'
                : 'border-sky-500/40 bg-card shadow-[0_0_35px_rgba(56,189,248,0.12)]'
              }`}
          >
            {/* Header Card: Tag P2 & Biến động RP đối thủ */}
            <div className="w-full flex items-center justify-between z-10">
              <span className="text-xs font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                P2 (Đối thủ)
              </span>
              <span
                className={`text-xs sm:text-sm font-black font-mono px-3 py-1 rounded-xl border shadow-xs ${getRPBadgeClass(
                  oppRankPointDelta
                )}`}
              >
                {formatRPDelta(oppRankPointDelta)}
              </span>
            </div>

            {/* EMBLEM VICTORY / DEFEAT / DRAW CỦA ĐỐI THỦ Ở TRUNG TÂM CARD VỚI KÍCH THƯỚC LỚN */}
            <div className="w-full flex-1 flex flex-col items-center justify-center py-4 sm:py-6 relative overflow-visible">
              <img
                src={oppEmblemSrc}
                alt="Opponent Emblem"
                className={`h-36 sm:h-44 md:h-48 w-full max-w-[280px] object-contain transition-all duration-300 ${getEmblemVisualClass(
                  oppEmblemType
                )} ${!isWin && !isDraw
                  ? 'drop-shadow-[0_0_40px_rgba(251,191,36,0.65)]'
                  : isWin
                    ? 'drop-shadow-[0_0_35px_rgba(244,63,94,0.6)]'
                    : 'drop-shadow-[0_0_35px_rgba(56,189,248,0.6)]'
                  }`}
              />
            </div>

            {/* THANH NGANG BÊN DƯỚI EMBLEM: AVATAR VUÔNG, TÊN & BADGE RANK + TIẾN TRÌNH ĐỐI THỦ */}
            <div className="w-full pt-1">
              <div className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-muted/40 border border-border/60 backdrop-blur-xs">
                {/* Avatar hình vuông sát bên trái */}
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-amber-500/40 bg-muted flex items-center justify-center shadow-xs">
                  {opponentPlayerInfo?.avatar_url ? (
                    <img
                      src={opponentPlayerInfo.avatar_url}
                      alt={opponentPlayerInfo.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-black text-lg text-amber-500">
                      {opponentPlayerInfo?.full_name?.charAt(0).toUpperCase() || 'P2'}
                    </span>
                  )}
                </div>

                {/* 2 Hàng kế bên */}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Hàng 1: Tên đối thủ & Tên rank */}
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-extrabold text-xs sm:text-sm text-foreground truncate max-w-[140px]">
                      {opponentPlayerInfo?.full_name || 'Đối thủ'}
                    </h4>
                    <span className="text-[10px] font-bold text-amber-500 uppercase shrink-0">
                      {formatRank(oppRank)}
                    </span>
                  </div>

                  {/* Hàng 2: Badge rank to bằng cả 2 hàng tiến trình và text */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center p-0.5">
                      <img
                        src={getRankBadgeUrl(oppRank)}
                        alt="Rank Badge"
                        className="w-full h-full object-contain drop-shadow-md select-none"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <RankProgressBar
                        rank={oppRank}
                        currentRP={oppCurrentRP}
                        delta={oppRankPointDelta}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── NỬA DƯỚI: BẢNG THỐNG KÊ (BÊN TRÁI) ── BẢNG 25 TỪ VỰNG CỦA USER (BÊN PHẢI) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
        {/* ── CỘT TRÁI (BẢNG THỐNG KÊ ĐỐI ĐẦU TRỰC TIẾP): lg:col-span-5 ── */}
        <div className="lg:col-span-5 rounded-3xl border bg-card/70 backdrop-blur-md p-5 sm:p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b pb-3 text-xs font-black uppercase text-foreground">
            <div className="flex items-center gap-2 text-primary">
              <Trophy className="w-4 h-4" />
              <span>Thống Kê Đối Đầu</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-bold">
              <span className="text-primary font-black">P1</span>
              <span>vs</span>
              <span className="text-amber-500 font-black">P2</span>
            </div>
          </div>

          {/* 4 DÒNG THỐNG KÊ ĐỒNG BỘ TUYỆT ĐỐI */}
          <div className="space-y-2.5">
            {/* Dòng 1: Tổng điểm */}
            <div className="grid grid-cols-5 items-center p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-amber-500 text-right pr-2">
                {myScore}
              </div>
              <div className="col-span-3 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-foreground">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span>Tổng Điểm (250)</span>
              </div>
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-amber-500 text-left pl-2">
                {oppScore}
              </div>
            </div>

            {/* Dòng 2: Câu trả lời đúng */}
            <div className="grid grid-cols-5 items-center p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-emerald-500 text-right pr-2">
                {myStats.correct}/25
              </div>
              <div className="col-span-3 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Câu Đúng</span>
              </div>
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-emerald-500 text-left pl-2">
                {opponentStats.correct}/25
              </div>
            </div>

            {/* Dòng 3: Thời gian dùng */}
            <div className="grid grid-cols-5 items-center p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-sky-500 text-right pr-2">
                {formatTimeMs(myStats.timeMs)}
              </div>
              <div className="col-span-3 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-foreground">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Thời Gian</span>
              </div>
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-sky-500 text-left pl-2">
                {formatTimeMs(opponentStats.timeMs)}
              </div>
            </div>

            {/* Dòng 4: Độ chính xác */}
            <div className="grid grid-cols-5 items-center p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-rose-500 text-right pr-2">
                {myAccuracy}%
              </div>
              <div className="col-span-3 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-foreground">
                <Target className="w-4 h-4 text-rose-400" />
                <span>Độ Chính Xác</span>
              </div>
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-rose-500 text-left pl-2">
                {oppAccuracy}%
              </div>
            </div>
          </div>
        </div>

        {/* ── CỘT PHẢI (BẢNG 25 TỪ VỰNG CỦA USER): lg:col-span-7 ── */}
        <div className="lg:col-span-7 rounded-3xl border bg-card/70 backdrop-blur-md p-5 sm:p-6 shadow-lg space-y-3.5">
          {/* Header Bảng từ vựng */}
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-primary font-black uppercase text-xs">
              <BookOpen className="w-4 h-4" />
              <span>Đối Chiếu 25 Từ Vựng Trận Đấu</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-emerald-500 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {myStats.correct} đúng
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-rose-500 flex items-center gap-1">
                <X className="w-3.5 h-3.5" />
                {25 - myStats.correct} sai
              </span>
            </div>
          </div>

          {/* Lưới 2 cột hiển thị 25 từ vựng theo định dạng người dùng yêu cầu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
            {words.map((item: MatchReviewWord) => {
              const isCorrect = item.myCorrect;
              const userAnswer = item.myAnswer?.trim();
              const correctWord = item.word;

              return (
                <div
                  key={item.orderIndex}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors text-xs gap-1.5 border border-border/30"
                  title={item.meaning ? `Nghĩa: ${item.meaning}` : undefined}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                    <span className="text-[11px] font-mono text-muted-foreground shrink-0 w-5">
                      {item.orderIndex}.
                    </span>

                    {isCorrect ? (
                      /* Trường hợp 1: Đúng (Ví dụ: 1. resident <Check> màu xanh) */
                      <div className="flex items-center gap-1 truncate text-emerald-500 font-bold">
                        <span className="truncate">{correctWord}</span>
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      </div>
                    ) : (
                      /* Trường hợp 2: Sai (Ví dụ: 2. evel <X> màu đỏ (evil <Check>) màu xanh) */
                      <div className="flex items-center gap-1 truncate">
                        <span className="text-rose-500 font-semibold truncate">
                          {userAnswer || '—'}
                        </span>
                        <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="text-muted-foreground font-normal shrink-0 flex items-center gap-0.5">
                          (
                          <span className="text-emerald-500 font-bold">{correctWord}</span>
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          )
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Nghĩa tiếng Việt gợi ý mờ ở cuối dòng */}
                  {item.meaning && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[85px] shrink-0 text-right opacity-70">
                      {item.meaning}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
