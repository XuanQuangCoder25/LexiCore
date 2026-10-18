import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import {
  Hourglass,
  X,
  CheckCircle2,
  AlertCircle,
  Swords,
  Loader2,
  Bot,
} from 'lucide-react';
import { UserArenaProfile, getRankBadgeUrl } from '../../../services/arena-service';
import { arenaSocketService, MatchedPayload, ArenaPlayerInfo } from '../../../services/arena-socket.service';

export interface ArenaMatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: UserArenaProfile | null;
  onMatchReady?: (matchData: MatchedPayload) => void;
}

type MatchmakingStage = 'SEARCHING' | 'MATCHED' | 'STARTING';

export const ArenaMatchmakingModal: React.FC<ArenaMatchmakingModalProps> = ({
  isOpen,
  onClose,
  currentUserProfile,
  onMatchReady,
}) => {
  const [stage, setStage] = useState<MatchmakingStage>('SEARCHING');
  const [searchSeconds, setSearchSeconds] = useState<number>(0);
  const [matchedData, setMatchedData] = useState<MatchedPayload | null>(null);
  const [p1Ready, setP1Ready] = useState<boolean>(false);
  const [p2Ready, setP2Ready] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Định dạng thời gian đếm giây mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format rank name
  const formatRankName = (rank?: string): string => {
    if (!rank) return 'Bronze';
    return rank.replace(/_/g, ' ');
  };

  // Khởi tạo luồng tìm kiếm và kết nối Socket
  useEffect(() => {
    if (!isOpen) {
      // Reset state khi modal đóng
      setStage('SEARCHING');
      setSearchSeconds(0);
      setMatchedData(null);
      setP1Ready(false);
      setP2Ready(false);
      setCountdown(null);
      setErrorMessage(null);
      if (timerRef.current) clearInterval(timerRef.current);
      if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);
      return;
    }

    // Bắt đầu đếm giây tìm kiếm
    setSearchSeconds(0);
    timerRef.current = setInterval(() => {
      setSearchSeconds((prev) => prev + 1);
    }, 1000);

    // Kết nối Socket và gửi yêu cầu tìm trận
    const socket = arenaSocketService.connect();

    // 1. Khi đang trong hàng đợi
    const handleSearching = () => {
      setStage('SEARCHING');
    };

    // 2. Khi tìm thấy đối thủ
    const handleMatched = (data: MatchedPayload) => {
      console.log('[Matchmaking UI] Ghép trận thành công:', data);
      setMatchedData(data);
      setStage('MATCHED');
      setP1Ready(false);
      setP2Ready(false);
    };

    // 3. Khi có người chơi bấm sẵn sàng
    const handlePlayerReady = ({ userId }: { roomId: string; userId: string }) => {
      if (matchedData) {
        if (userId === matchedData.me.id) {
          setP1Ready(true);
        } else {
          setP2Ready(true);
        }
      }
    };

    // 4. Khi server phát event đếm ngược
    const handleCountdown = ({ count }: { count: number }) => {
      setCountdown(count);
      setStage('STARTING');
      if (count <= 1 && matchedData && onMatchReady) {
        setTimeout(() => {
          onMatchReady(matchedData);
        }, 1200);
      }
    };

    // 5. Khi trận đấu bị hủy hoặc lỗi
    const handleMatchCancelled = () => {
      onClose();
    };

    const handleMatchError = ({ message }: { message: string }) => {
      setErrorMessage(message);
    };

    socket.on('arena:searching', handleSearching);
    socket.on('arena:matched', handleMatched);
    socket.on('arena:player_ready', handlePlayerReady);
    socket.on('arena:countdown', handleCountdown);
    socket.on('arena:match_cancelled', handleMatchCancelled);
    socket.on('arena:match_error', handleMatchError);

    // Bắn event tìm trận thật lên server
    arenaSocketService.findMatch();

    return () => {
      socket.off('arena:searching', handleSearching);
      socket.off('arena:matched', handleMatched);
      socket.off('arena:player_ready', handlePlayerReady);
      socket.off('arena:countdown', handleCountdown);
      socket.off('arena:match_cancelled', handleMatchCancelled);
      socket.off('arena:match_error', handleMatchError);
      if (timerRef.current) clearInterval(timerRef.current);
      if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);
    };
  }, [isOpen]);

  // Hủy tìm trận
  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);
    arenaSocketService.cancelMatch();
    onClose();
  };

  // Người chơi bấm Sẵn sàng
  const handleReady = () => {
    if (!matchedData || p1Ready) return;
    setP1Ready(true);

    if (isMockMode) {
      // Giả lập bot cũng ready sau 1 giây
      setTimeout(() => {
        setP2Ready(true);
        setCountdown(3);
        setStage('STARTING');
      }, 1000);
    } else {
      arenaSocketService.ready(matchedData.roomId);
    }
  };

  // Chế độ Test Mock Solo (Giả lập đối thủ sau 2.5s)
  const triggerMockMatch = () => {
    setIsMockMode(true);
    setErrorMessage(null);
    mockTimeoutRef.current = setTimeout(() => {
      const mockOpponent: ArenaPlayerInfo = {
        id: 'bot-lexi-ai',
        full_name: 'LexiBot Master (AI)',
        avatar_url: null,
        arena_rank: 'DIAMOND_1',
        rank_point: 750,
        arena_current_win_streak: 5,
      };

      const mockPayload: MatchedPayload = {
        roomId: 'mock-room-1234',
        me: {
          id: currentUserProfile?.user?.id || 'me',
          full_name: currentUserProfile?.user?.fullName || 'Bạn',
          avatar_url: currentUserProfile?.user?.avatarUrl || null,
          arena_rank: currentUserProfile?.arena?.rank || 'BRONZE',
          rank_point: currentUserProfile?.arena?.rankPoint || 0,
          arena_current_win_streak: currentUserProfile?.arena?.currentWinStreak || 0,
        },
        opponent: mockOpponent,
        questions: [],
        totalQuestions: 25,
        timeLimitSec: 360,
      };

      setMatchedData(mockPayload);
      setStage('MATCHED');
    }, 2500);
  };

  if (!isOpen) return null;

  const myName = currentUserProfile?.user?.fullName || 'Bạn';
  const myRank = currentUserProfile?.arena?.rank || 'BRONZE';
  const myAvatar = currentUserProfile?.user?.avatarUrl;
  const myLP = currentUserProfile?.arena?.leaderboardPoint || 0;

  const opponent = matchedData?.opponent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/90 backdrop-blur-xl animate-in fade-in duration-300 select-none">
      {/* Background Decorator ánh sáng */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-4xl flex flex-col items-center justify-between min-h-[580px] py-6 z-10">
        {/* ── HEADER ── */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-black tracking-widest uppercase">
            <Swords className="w-3.5 h-3.5" />
            <span>Đấu Trường PvP 1v1</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-foreground drop-shadow-sm">
            {stage === 'SEARCHING' && 'ĐANG TÌM KIẾM ĐỐI THỦ'}
            {stage === 'MATCHED' && 'ĐÃ TÌM THẤY ĐỐI THỦ!'}
            {stage === 'STARTING' && 'CHUẨN BỊ BƯỚC VÀO TRẬN ĐẤU!'}
          </h2>

          <p className="text-xs text-muted-foreground font-medium">
            {stage === 'SEARCHING' && 'Hệ thống đang quét các chiến binh có cùng đẳng cấp Elo...'}
            {stage === 'MATCHED' && 'Cả hai người chơi cần bấm Sẵn sàng để mở cửa Đấu trường.'}
            {stage === 'STARTING' && `Trận đấu sẽ bắt đầu sau: ${countdown || 3} giây`}
          </p>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div className="px-4 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── KHU VỰC TRUNG TÂM: CARD P1 - VS - CARD P2 ── */}
        <div className="w-full flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10 my-6">
          {/* ── 1. CARD PLAYER 1 ── */}
          <div className="w-64 sm:w-72 rounded-2xl border-2 border-primary/50 bg-card shadow-[0_0_30px_rgba(var(--primary),0.15)] p-5 flex flex-col items-center text-center justify-between min-h-[360px] relative transition-transform duration-200 hover:scale-105">
            <div className="w-full flex items-center justify-between text-[11px] font-bold text-muted-foreground">
              <span className="text-primary font-black uppercase">P1 (Bạn)</span>
              <span>{myLP} LP</span>
            </div>

            {/* Avatar & Badge */}
            <div className="my-2 relative flex flex-col items-center">
              <Avatar className="w-24 h-24 rounded-2xl border-2 border-primary/60 shadow-md overflow-hidden">
                {myAvatar && <AvatarImage src={myAvatar} alt={myName} className="object-cover" />}
                <AvatarFallback className="bg-primary/15 text-primary font-black text-2xl">
                  {myName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Huy hiệu Rank P1 */}
              <div className="w-14 h-14 -mt-5 relative z-10">
                <img
                  src={getRankBadgeUrl(myRank)}
                  alt={myRank}
                  className="w-full h-full object-contain drop-shadow-md select-none"
                />
              </div>
            </div>

            {/* Tên & Rank */}
            <div className="space-y-0.5">
              <h3 className="font-extrabold text-base text-foreground truncate max-w-[200px]" title={myName}>
                {myName}
              </h3>
              <p className="text-xs font-bold text-primary uppercase tracking-wide">
                {formatRankName(myRank)}
              </p>
            </div>

            {/* Trạng thái / Nút Sẵn sàng */}
            <div className="w-full pt-3">
              {stage === 'SEARCHING' ? (
                <div className="py-2 px-3 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <span>SẴN SÀNG TÌM TRẬN</span>
                </div>
              ) : p1Ready ? (
                <div className="py-2.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ĐÃ SẴN SÀNG!</span>
                </div>
              ) : (
                <Button
                  onClick={handleReady}
                  size="default"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black tracking-wider uppercase shadow-lg shadow-emerald-600/30 animate-pulse"
                >
                  SẴN SÀNG
                </Button>
              )}
            </div>
          </div>

          {/* ── 2. TRUNG TÂM: EMBLEM VS & THỜI GIAN ── */}
          <div className="flex flex-col items-center justify-center px-2 z-10 space-y-3">
            {/* Emblem VS */}
            <div className="w-20 sm:w-28 relative flex items-center justify-center">
              <img
                src="/assets/emblems/emblem-vs.png"
                alt="VS"
                className="w-full object-contain drop-shadow-[0_0_20px_rgba(255,200,0,0.45)] select-none animate-pulse"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = (e.target as HTMLElement).nextElementSibling;
                  if (fallback) (fallback as HTMLElement).style.display = 'block';
                }}
              />
              <span
                style={{ display: 'none' }}
                className="text-4xl sm:text-5xl font-black italic text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]"
              >
                VS
              </span>
            </div>

            {/* Đồng hồ đếm thời gian tìm trận hoặc countdown */}
            {stage === 'SEARCHING' && (
              <div className="flex flex-col items-center space-y-1">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border text-xs font-mono font-bold text-foreground">
                  <Hourglass className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span>Đã tìm: {formatTime(searchSeconds)}</span>
                </div>
              </div>
            )}

            {stage === 'MATCHED' && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Chờ xác nhận</span>
              </div>
            )}

            {stage === 'STARTING' && countdown !== null && (
              <div className="text-4xl font-black text-primary animate-ping">
                {countdown}
              </div>
            )}
          </div>

          {/* ── 3. CARD PLAYER 2 ── */}
          {stage === 'SEARCHING' ? (
            /* Card P2: Ẩn danh khi chưa ghép được (Spinner loading, không hiện dấu ?) */
            <div className="w-64 sm:w-72 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/15 p-5 flex flex-col items-center text-center justify-between min-h-[360px] relative">
              <div className="w-full flex items-center justify-between text-[11px] font-bold text-muted-foreground/60">
                <span>P2 (Đối thủ)</span>
                <span>??? LP</span>
              </div>

              {/* Avatar spinner loading khi chưa ghép được */}
              <div className="my-6 relative flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center relative overflow-hidden shadow-inner">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              </div>

              {/* Chờ ghép */}
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-muted-foreground animate-pulse">
                  Đang tìm đối thủ...
                </h3>
                <p className="text-[11px] text-muted-foreground/60 italic">
                  Chờ ghép người chơi
                </p>
              </div>

              <div className="w-full pt-3">
                <div className="py-2 px-3 rounded-xl bg-muted/40 border text-xs font-medium text-muted-foreground flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-ping" />
                  <span>Đang dò tìm...</span>
                </div>
              </div>
            </div>
          ) : (
            /* Card P2: Flip-In Animation khi đã tìm thấy đối thủ (Hover phóng to mượt, không mờ) */
            <div
              style={{
                animation: 'flipIn 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards',
              }}
              className="w-64 sm:w-72"
            >
              <div className="w-full rounded-2xl border-2 border-amber-500/50 bg-card shadow-[0_0_30px_rgba(245,158,11,0.15)] p-5 flex flex-col items-center text-center justify-between min-h-[360px] relative transition-transform duration-200 hover:scale-105">
                <div className="w-full flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span className="text-amber-500 font-black uppercase">P2 (Đối thủ)</span>
                  <span>{opponent?.rank_point || 0} LP</span>
                </div>

                {/* Avatar & Badge Đối thủ */}
                <div className="my-2 relative flex flex-col items-center">
                  <Avatar className="w-24 h-24 rounded-2xl border-2 border-amber-500/60 shadow-md overflow-hidden">
                    {opponent?.avatar_url && (
                      <AvatarImage src={opponent.avatar_url} alt={opponent.full_name} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-amber-500/15 text-amber-500 font-black text-2xl">
                      {opponent?.full_name?.charAt(0).toUpperCase() || 'E'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Huy hiệu Rank P2 */}
                  <div className="w-14 h-14 -mt-5 relative z-10">
                    <img
                      src={getRankBadgeUrl(opponent?.arena_rank || 'BRONZE')}
                      alt={opponent?.arena_rank}
                      className="w-full h-full object-contain drop-shadow-md select-none"
                    />
                  </div>
                </div>

                {/* Tên & Rank */}
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-base text-foreground truncate max-w-[200px]" title={opponent?.full_name}>
                    {opponent?.full_name || 'Đối thủ'}
                  </h3>
                  <p className="text-xs font-bold text-amber-500 uppercase tracking-wide">
                    {formatRankName(opponent?.arena_rank)}
                  </p>
                </div>

                {/* Trạng thái của P2 */}
                <div className="w-full pt-3">
                  {p2Ready ? (
                    <div className="py-2.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ĐỐI THỦ ĐÃ SẴN SÀNG!</span>
                    </div>
                  ) : (
                    <div className="py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400 flex items-center justify-center gap-2">
                      <Hourglass className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang chờ đối thủ...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── FOOTER: NÚT HỦY TÌM TRẬN & TOOL TEST MOCK ── */}
        <div className="flex flex-col items-center gap-3 w-full max-w-md pt-2">
          {stage === 'SEARCHING' && (
            <Button
              onClick={handleCancel}
              variant="outline"
              size="default"
              className="w-full sm:w-auto px-8 border-rose-500/40 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500 font-bold rounded-xl transition-all"
            >
              <X className="w-4 h-4 mr-1.5" />
              HỦY TÌM TRẬN
            </Button>
          )}

          {/* Dev Test Tool: Ghép với Bot AI (Solo test) */}
          {stage === 'SEARCHING' && !isMockMode && (
            <button
              onClick={triggerMockMatch}
              type="button"
              className="text-[11px] text-muted-foreground/60 hover:text-primary transition-colors flex items-center gap-1 mt-1 font-mono cursor-pointer"
              title="Test giả lập ghép ngay với Bot AI mà không cần mở 2 tài khoản"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>[Dev Test: Thử ghép ngay với Bot AI]</span>
            </button>
          )}
        </div>
      </div>

      {/* Style nhúng keyframes flipIn 3D */}
      <style>{`
        @keyframes flipIn {
          0% {
            transform: perspective(800px) rotateY(90deg);
            opacity: 0;
          }
          70% {
            transform: perspective(800px) rotateY(-6deg);
            opacity: 1;
          }
          100% {
            transform: perspective(800px) rotateY(0deg);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
