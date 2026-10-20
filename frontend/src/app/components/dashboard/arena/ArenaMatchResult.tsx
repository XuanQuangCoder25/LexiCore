import React from 'react';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import {
  Swords,
  RotateCcw,
  Home,
  Trophy,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Sparkles,
  BookOpen,
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

export const ArenaMatchResult: React.FC<ArenaMatchResultProps> = ({
  gameOverData,
  mePlayerInfo,
  opponentPlayerInfo,
  onPlayAgain,
  onBackToHub,
}) => {
  const { result, myResult, myStats, opponentStats, words, reason } = gameOverData;

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

  // Format rank name
  const formatRank = (rank?: string) => {
    if (!rank) return 'Bronze';
    return rank.replace(/_/g, ' ');
  };

  // Format thời gian từ ms sang mm:ss hoặc giây
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

  // Helper lấy class kích thước và scale để cân bằng thị giác cho Victory, Defeat, Draw
  const getEmblemVisualClass = (emblemType: 'VICTORY' | 'DEFEAT' | 'DRAW') => {
    if (emblemType === 'DEFEAT') {
      // Defeat có hình khối khiên đá thuôn hẹp, scale ~1.28x - 1.3x và nhấc nhẹ lên để không đè vào chữ
      return 'scale-[1.2] sm:scale-[1.25] xl:scale-[1.3] -translate-y-1.5';
    }
    if (emblemType === 'DRAW') {
      // Draw có hình khiên tròn bắt chéo kiếm, scale ~1.14x để cân bằng thị giác
      return 'scale-[1.08] sm:scale-[1.12] xl:scale-[1.15] -translate-y-1';
    }
    // VICTORY: Cánh thiên thần xòe rộng phủ kín khung hình
    return 'scale-[1.2] sm:scale-[1.25] xl:scale-[1.3] -translate-y-1.5';
  };

  const myEmblemType: 'VICTORY' | 'DEFEAT' | 'DRAW' = isWin ? 'VICTORY' : isLoss ? 'DEFEAT' : 'DRAW';
  const oppEmblemType: 'VICTORY' | 'DEFEAT' | 'DRAW' = !isWin && !isDraw ? 'VICTORY' : isWin ? 'DEFEAT' : 'DRAW';

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 py-6 px-3 sm:px-6 animate-in fade-in duration-300 select-none">
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

      {/* ── BỐ CỤC 3 PHẦN: P1 (TRÁI) ── [EMBLEM VS + NÚT HÀNH ĐỘNG Ở GIỮA] ── P2 (PHẢI) ── */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 pt-6">
        {/* ── CỘT BÊN TRÁI: PLAYER 1 (BẠN) ── */}
        <div className="flex flex-col items-center relative w-full max-w-[360px]">
          {/* Banner Victory/Defeat cực lớn ngoạm lấy viền trên Card P1 */}
          <div className="w-[115%] sm:w-[125%] max-w-[440px] sm:max-w-[470px] h-28 sm:h-36 relative -mb-9 sm:-mb-12 z-20 flex items-center justify-center animate-in zoom-in-95 duration-500 pointer-events-none">
            <img
              src={myBannerSrc}
              alt={myResult}
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
            className={`w-full rounded-3xl border-2 pt-11 pb-6 px-5 flex flex-col items-center justify-between min-h-[360px] relative transition-transform duration-200 hover:scale-[1.01] shadow-xl z-10 ${isWin
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
                  myStats.rankPointDelta
                )}`}
              >
                {formatRPDelta(myStats.rankPointDelta)}
              </span>
            </div>

            {/* Avatar & Huy hiệu Rank P1 */}
            <div className="my-2 relative flex flex-col items-center">
              <Avatar className="w-24 h-24 rounded-2xl border-2 border-primary/60 shadow-lg overflow-hidden">
                {mePlayerInfo?.avatar_url && (
                  <AvatarImage src={mePlayerInfo.avatar_url} alt={mePlayerInfo.full_name} className="object-cover" />
                )}
                <AvatarFallback className="bg-primary/15 text-primary font-black text-2xl">
                  {mePlayerInfo?.full_name?.charAt(0).toUpperCase() || 'P1'}
                </AvatarFallback>
              </Avatar>

              <div className="w-14 h-14 -mt-5 relative z-10">
                <img
                  src={getRankBadgeUrl(myStats.newRank || mePlayerInfo?.arena_rank || 'BRONZE')}
                  alt="Rank"
                  className="w-full h-full object-contain drop-shadow-md select-none"
                />
              </div>
            </div>

            {/* Tên & Cấp bậc Rank */}
            <div className="space-y-0.5 text-center">
              <h3 className="font-black text-lg text-foreground truncate max-w-[220px]">
                {mePlayerInfo?.full_name || 'Bạn'}
              </h3>
              <p className="text-xs font-extrabold text-primary uppercase tracking-wider">
                {formatRank(myStats.newRank || mePlayerInfo?.arena_rank)}
              </p>
            </div>
          </div>
        </div>

        {/* ── KHU VỰC TRUNG TÂM: EMBLEM "VS" LỚN HƠN + 2 NÚT HÀNH ĐỘNG DỜI XUỐNG DƯỚI ── */}
        <div className="flex flex-col items-center justify-center gap-2 py-2 shrink-0 z-20">
          {/* Emblem VS to uy lực kèm hiệu ứng lơ lửng và hào quang sáng */}
          <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44 flex items-center justify-center animate-float-vs">
            <img
              src="/assets/emblems/emblem-vs.png"
              alt="VS"
              className="w-full h-full object-contain drop-shadow-[0_0_35px_rgba(251,191,36,0.7)]"
            />
          </div>

          {/* 2 Nút Hành động dời xuống dưới một xíu tạo không gian thoáng cho Emblem VS */}
          <div className="flex flex-col items-center gap-2.5 w-full min-w-[210px] mt-2 sm:mt-4">
            {/* Nút 1: Tìm trận mới (Đấu lại) */}
            <Button
              onClick={onPlayAgain}
              size="lg"
              className="w-full px-6 py-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black tracking-wider uppercase shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105 gap-2 text-sm sm:text-base cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>TÌM TRẬN MỚI</span>
            </Button>

            {/* Nút 2: Về Sảnh Đấu Trường */}
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
          {/* Banner Victory/Defeat cực lớn trên đỉnh Card P2 */}
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
            className={`w-full rounded-3xl border-2 pt-11 pb-6 px-5 flex flex-col items-center justify-between min-h-[360px] relative transition-transform duration-200 hover:scale-[1.01] shadow-xl z-10 ${!isWin && !isDraw
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
                  opponentStats.rankPointDelta
                )}`}
              >
                {formatRPDelta(opponentStats.rankPointDelta)}
              </span>
            </div>

            {/* Avatar & Huy hiệu Rank P2 */}
            <div className="my-2 relative flex flex-col items-center">
              <Avatar className="w-24 h-24 rounded-2xl border-2 border-amber-500/60 shadow-lg overflow-hidden">
                {opponentPlayerInfo?.avatar_url && (
                  <AvatarImage src={opponentPlayerInfo.avatar_url} alt={opponentPlayerInfo.full_name} className="object-cover" />
                )}
                <AvatarFallback className="bg-amber-500/15 text-amber-500 font-black text-2xl">
                  {opponentPlayerInfo?.full_name?.charAt(0).toUpperCase() || 'P2'}
                </AvatarFallback>
              </Avatar>

              <div className="w-14 h-14 -mt-5 relative z-10">
                <img
                  src={getRankBadgeUrl(opponentStats.newRank || opponentPlayerInfo?.arena_rank || 'BRONZE')}
                  alt="Rank"
                  className="w-full h-full object-contain drop-shadow-md select-none"
                />
              </div>
            </div>

            {/* Tên & Cấp bậc Rank P2 */}
            <div className="space-y-0.5 text-center">
              <h3 className="font-black text-lg text-foreground truncate max-w-[220px]">
                {opponentPlayerInfo?.full_name || 'Đối thủ'}
              </h3>
              <p className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">
                {formatRank(opponentStats.newRank || opponentPlayerInfo?.arena_rank)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KHU VỰC THỐNG KÊ CHI TIẾT KÈM 2 EMBLEM SIÊU TO Ở 2 BÊN ── */}
      <div className="w-full flex items-center justify-center gap-4 sm:gap-6 lg:gap-10 pt-4">
        {/* Emblem cực lớn của P1 bên trái bảng thống kê */}
        <div className="hidden md:flex flex-col items-center justify-center shrink-0 w-44 lg:w-56 xl:w-64 overflow-visible transition-transform duration-300 hover:scale-105">
          <img
            src={myEmblemSrc}
            alt="My Emblem"
            className={`w-36 h-36 sm:w-44 sm:h-44 lg:w-52 lg:h-52 xl:w-60 xl:h-60 object-contain transition-all duration-300 ${getEmblemVisualClass(
              myEmblemType
            )} ${isWin
              ? 'drop-shadow-[0_0_45px_rgba(251,191,36,0.65)]'
              : isLoss
                ? 'drop-shadow-[0_0_40px_rgba(244,63,94,0.6)]'
                : 'drop-shadow-[0_0_40px_rgba(56,189,248,0.6)]'
              }`}
          />
          <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground mt-5 sm:mt-6 relative z-10">
            {isWin ? 'VICTORY' : isLoss ? 'DEFEAT' : 'DRAW'}
          </span>
        </div>

        {/* Bảng Thống Kê Đối Đầu Trực Tiếp ở Giữa */}
        <div className="flex-1 max-w-2xl rounded-3xl border bg-card/70 backdrop-blur-md p-5 sm:p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b pb-3 text-xs font-black uppercase text-foreground">
            <div className="flex items-center gap-2 text-primary">
              <Trophy className="w-4 h-4" />
              <span>Thống Kê Đối Đầu Trực Tiếp</span>
            </div>
            <div className="flex items-center gap-6 text-[11px] text-muted-foreground font-bold">
              <span className="text-primary font-black">P1 (Bạn)</span>
              <span>vs</span>
              <span className="text-amber-500 font-black">P2 (Đối thủ)</span>
            </div>
          </div>

          {/* 4 DÒNG THỐNG KÊ ĐỒNG BỘ TUYỆT ĐỐI CHIỀU CAO VÀ CỠ CHỮ */}
          <div className="space-y-2.5">
            {/* Dòng 1: Tổng điểm */}
            <div className="grid grid-cols-5 items-center p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-amber-500 text-right pr-3">
                {myScore}
              </div>
              <div className="col-span-3 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-foreground">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span>Tổng Điểm (250)</span>
              </div>
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-amber-500 text-left pl-3">
                {oppScore}
              </div>
            </div>

            {/* Dòng 2: Câu trả lời đúng */}
            <div className="grid grid-cols-5 items-center p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-emerald-500 text-right pr-3">
                {myStats.correct}/25
              </div>
              <div className="col-span-3 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Câu Trả Lời Đúng</span>
              </div>
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-emerald-500 text-left pl-3">
                {opponentStats.correct}/25
              </div>
            </div>

            {/* Dòng 3: Thời gian dùng */}
            <div className="grid grid-cols-5 items-center p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-sky-500 text-right pr-3">
                {formatTimeMs(myStats.timeMs)}
              </div>
              <div className="col-span-3 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-foreground">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Thời Gian Dùng</span>
              </div>
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-sky-500 text-left pl-3">
                {formatTimeMs(opponentStats.timeMs)}
              </div>
            </div>

            {/* Dòng 4: Độ chính xác */}
            <div className="grid grid-cols-5 items-center p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-rose-500 text-right pr-3">
                {myAccuracy}%
              </div>
              <div className="col-span-3 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-foreground">
                <Target className="w-4 h-4 text-rose-400" />
                <span>Độ Chính Xác</span>
              </div>
              <div className="col-span-1 text-base sm:text-lg font-black font-mono text-rose-500 text-left pl-3">
                {oppAccuracy}%
              </div>
            </div>
          </div>
        </div>

        {/* Emblem lớn của P2 bên phải bảng thống kê */}
        <div className="hidden md:flex flex-col items-center justify-center shrink-0 w-44 lg:w-56 xl:w-64 overflow-visible transition-transform duration-300 hover:scale-105">
          <img
            src={oppEmblemSrc}
            alt="Opponent Emblem"
            className={`w-36 h-36 sm:w-44 sm:h-44 lg:w-52 lg:h-52 xl:w-60 xl:h-60 object-contain transition-all duration-300 ${getEmblemVisualClass(
              oppEmblemType
            )} ${!isWin && !isDraw
              ? 'drop-shadow-[0_0_45px_rgba(251,191,36,0.65)]'
              : isWin
                ? 'drop-shadow-[0_0_40px_rgba(244,63,94,0.6)]'
                : 'drop-shadow-[0_0_40px_rgba(56,189,248,0.6)]'
              }`}
          />
          <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground mt-5 sm:mt-6 relative z-10">
            {!isWin && !isDraw ? 'VICTORY' : isWin ? 'DEFEAT' : 'DRAW'}
          </span>
        </div>
      </div>

      {/* ── DANH SÁCH 25 TỪ VỰNG TRONG TRẬN (MATCH WORD REVIEW) ── */}
      <div className="w-full space-y-4 pt-6 border-t border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-black uppercase text-foreground">
              Bảng Đối Chiếu 25 Từ Vựng Trận Đấu
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Cuộn xuống để xem chi tiết đáp án và thời gian của cả 2 bên
          </span>
        </div>

        {/* Danh sách từng từ vựng */}
        <div className="space-y-3">
          {words.map((item: MatchReviewWord) => {
            const myAnsCorrect = item.myCorrect;
            const oppAnsCorrect = item.opponentCorrect;

            return (
              <div
                key={item.orderIndex}
                className="rounded-2xl border bg-card/80 p-4 transition-all duration-200 hover:border-primary/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Thông tin từ vựng tiếng Anh & Nghĩa tiếng Việt */}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-7 h-7 rounded-lg bg-muted text-xs font-black font-mono flex items-center justify-center text-muted-foreground">
                      #{item.orderIndex}
                    </span>
                    <span className="font-black text-base text-foreground tracking-wide uppercase">
                      {item.word}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {item.wordType}
                    </span>
                    {item.topic && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {item.topic}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-muted-foreground pl-9">
                    Nghĩa: <strong className="text-foreground">{item.meaning}</strong>
                  </p>

                  {item.example && (
                    <p className="text-[11px] text-muted-foreground/75 italic pl-9">
                      Ví dụ: &quot;{item.example}&quot;
                    </p>
                  )}
                </div>

                {/* Kết quả trả lời của P1 và P2 */}
                <div className="flex items-center gap-3 sm:gap-6 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40 w-full md:w-auto justify-between md:justify-end">
                  {/* P1 Result */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-primary">P1 (Bạn)</div>
                      <div className="text-xs font-mono font-extrabold truncate max-w-[110px]">
                        {item.myAnswer || '—'}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {(item.myTimeMs / 1000).toFixed(1)}s
                      </div>
                    </div>
                    {myAnsCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-8 w-px bg-border/60" />

                  {/* P2 Result */}
                  <div className="flex items-center gap-2">
                    {oppAnsCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <div className="text-left">
                      <div className="text-[11px] font-bold text-amber-500">P2 (Đối thủ)</div>
                      <div className="text-xs font-mono font-extrabold truncate max-w-[110px]">
                        {item.opponentAnswer || '—'}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {(item.opponentTimeMs / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
