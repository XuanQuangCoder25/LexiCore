import React, { useState, useEffect, useRef } from 'react';
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
  XCircle,
  CircleDollarSign,
  Zap,
  Gift,
  ArrowRight,
  Info,
  Gamepad2,
  Users,
  Hourglass,
  AlertCircle,
} from 'lucide-react';
import { getRankBadgeUrl } from '../../../services/arena-service';
import {
  GameOverPayload,
  MatchReviewWord,
  ArenaPlayerInfo,
  arenaSocketService,
  FriendlyInviteReceivedPayload,
  FriendlyInviteSentPayload,
  FriendlyInviteDeclinedPayload,
  FriendlyInviteCancelledPayload,
  MatchedPayload,
} from '../../../services/arena-socket.service';

export interface ArenaMatchResultProps {
  gameOverData: GameOverPayload;
  matchType?: 'RANK' | 'NORMAL' | 'FRIENDLY';
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

// So sánh từng ký tự người dùng gõ với từ đúng để gạch chân chính xác ký tự sai (ví dụ evel thì gạch chân e thứ 2)
const renderMismatchCharacters = (userAnswer: string, correctWord: string) => {
  const target = (correctWord || '').toLowerCase();
  const chars = (userAnswer || '').split('');

  return (
    <span className="inline-flex items-center tracking-wide">
      {chars.map((char, idx) => {
        const isWrongChar = idx >= target.length || char.toLowerCase() !== target[idx];
        return (
          <span
            key={idx}
            className={
              isWrongChar
                ? 'underline underline-offset-4 decoration-rose-500 decoration-[2.5px] font-black text-rose-500'
                : 'text-rose-400 font-bold'
            }
          >
            {char}
          </span>
        );
      })}
    </span>
  );
};

export const ArenaMatchResult: React.FC<ArenaMatchResultProps> = ({
  gameOverData,
  matchType,
  mePlayerInfo,
  opponentPlayerInfo,
  onPlayAgain,
  onBackToHub,
}) => {
  const { myResult, myStats, opponentStats, words, reason } = gameOverData;
  const resolvedMatchType = gameOverData.matchType || matchType || 'RANK';
  const isRankMatch = resolvedMatchType === 'RANK';
  const isNormalMatch = resolvedMatchType === 'NORMAL';
  const isFriendlyMatch = resolvedMatchType === 'FRIENDLY';
  const opponentId = opponentPlayerInfo?.id || opponentStats?.id;

  const [wordFilter, setWordFilter] = useState<'ALL' | 'INCORRECT' | 'CORRECT'>('ALL');

  // State phục vụ Đấu lại trong chế độ Đấu Giao Hữu
  const [outgoingInvite, setOutgoingInvite] = useState<{ inviteId: string; expireInSec: number } | null>(null);
  const [outgoingCountdown, setOutgoingCountdown] = useState<number>(60);
  const [incomingInvite, setIncomingInvite] = useState<{ inviteId: string; expireInSec: number } | null>(null);
  const [incomingCountdown, setIncomingCountdown] = useState<number>(60);
  const [isSendingInvite, setIsSendingInvite] = useState<boolean>(false);
  const [isAcceptingRematch, setIsAcceptingRematch] = useState<boolean>(false);
  const [rematchNotice, setRematchNotice] = useState<{ type: 'error' | 'info'; message: string } | null>(null);

  const outgoingInviteRef = useRef(outgoingInvite);
  outgoingInviteRef.current = outgoingInvite;
  const incomingInviteRef = useRef(incomingInvite);
  incomingInviteRef.current = incomingInvite;
  const isSendingInviteRef = useRef(isSendingInvite);
  isSendingInviteRef.current = isSendingInvite;
  const isAcceptingRematchRef = useRef(isAcceptingRematch);
  isAcceptingRematchRef.current = isAcceptingRematch;
  const hasMatchedRef = useRef<boolean>(false);

  // Tự động làm mới số dư ví trên Navbar toàn cục khi xem kết quả trận đấu
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.coin_balance !== undefined) {
          window.dispatchEvent(
            new CustomEvent('wallet-balance-change', {
              detail: { coinBalance: data.coin_balance },
            })
          );
        }
      })
      .catch(() => { });
  }, []);

  // Lắng nghe sự kiện Socket cho lời mời Đấu Lại (chỉ dùng ở chế độ FRIENDLY)
  useEffect(() => {
    if (!isFriendlyMatch || !opponentId) return;

    const handleSent = (payload: FriendlyInviteSentPayload) => {
      const targetId = payload.targetUser?.id || payload.toUser?.id;
      if (targetId === opponentId) {
        setOutgoingInvite({
          inviteId: payload.inviteId,
          expireInSec: payload.expireInSec || 60,
        });
        setOutgoingCountdown(payload.expireInSec || 60);
        setIsSendingInvite(false);
        setRematchNotice(null);
      }
    };

    const handleReceived = (payload: FriendlyInviteReceivedPayload) => {
      if (payload.fromUser?.id === opponentId) {
        setIncomingInvite({
          inviteId: payload.inviteId,
          expireInSec: payload.expireInSec || 60,
        });
        setIncomingCountdown(payload.expireInSec || 60);
        setIsAcceptingRematch(false);
        setRematchNotice(null);
      }
    };

    const handleDeclined = (payload: FriendlyInviteDeclinedPayload) => {
      if (outgoingInviteRef.current && outgoingInviteRef.current.inviteId === payload.inviteId) {
        setOutgoingInvite(null);
        setRematchNotice({
          type: 'info',
          message: payload.message || 'Đối thủ đã từ chối lời mời đấu lại.',
        });
      }
      if (incomingInviteRef.current && incomingInviteRef.current.inviteId === payload.inviteId) {
        setIncomingInvite(null);
        setIsAcceptingRematch(false);
      }
    };

    const handleCancelled = (payload: FriendlyInviteCancelledPayload) => {
      if (outgoingInviteRef.current && outgoingInviteRef.current.inviteId === payload.inviteId) {
        setOutgoingInvite(null);
      }
      if (incomingInviteRef.current && incomingInviteRef.current.inviteId === payload.inviteId) {
        setIncomingInvite(null);
        setIsAcceptingRematch(false);
        setRematchNotice({
          type: 'info',
          message: payload.message || 'Đối thủ đã hủy lời mời đấu lại.',
        });
      }
    };

    const handleError = (payload: { message: string }) => {
      if (isSendingInviteRef.current || isAcceptingRematchRef.current) {
        if (isAcceptingRematchRef.current && incomingInviteRef.current) {
          setIncomingInvite(null);
        }
        setIsSendingInvite(false);
        setIsAcceptingRematch(false);
        setRematchNotice({
          type: 'error',
          message: payload.message || 'Không thể gửi lời mời đấu lại.',
        });
      }
    };

    const handleMatched = (matchData: MatchedPayload) => {
      if (matchData.matchType === 'FRIENDLY') {
        hasMatchedRef.current = true;
        outgoingInviteRef.current = null;
        incomingInviteRef.current = null;
        setOutgoingInvite(null);
        setIncomingInvite(null);
        setIsSendingInvite(false);
        setIsAcceptingRematch(false);
        setRematchNotice(null);
      }
    };

    arenaSocketService.onFriendlySent(handleSent);
    arenaSocketService.onFriendlyReceived(handleReceived);
    arenaSocketService.onFriendlyDeclined(handleDeclined);
    arenaSocketService.onFriendlyCancelled(handleCancelled);
    arenaSocketService.onFriendlyError(handleError);

    const socket = arenaSocketService.connect();
    socket.on('arena:matched', handleMatched);

    return () => {
      arenaSocketService.offFriendlySent(handleSent);
      arenaSocketService.offFriendlyReceived(handleReceived);
      arenaSocketService.offFriendlyDeclined(handleDeclined);
      arenaSocketService.offFriendlyCancelled(handleCancelled);
      arenaSocketService.offFriendlyError(handleError);
      socket.off('arena:matched', handleMatched);
    };
  }, [isFriendlyMatch, opponentId]);

  // Đếm ngược 60s khi đang chờ đối thủ phản hồi lời mời Đấu Lại
  useEffect(() => {
    if (!outgoingInvite) return;

    const interval = setInterval(() => {
      setOutgoingCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setOutgoingInvite(null);
          setRematchNotice({
            type: 'info',
            message: 'Lời mời đấu lại đã hết thời gian chờ (60s).',
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [outgoingInvite]);

  // Đếm ngược 60s cho lời mời Đấu Lại đến từ đối thủ
  useEffect(() => {
    if (!incomingInvite) return;

    const interval = setInterval(() => {
      setIncomingCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIncomingInvite(null);
          setIsAcceptingRematch(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingInvite]);

  // Hủy lời mời đang chờ nếu rời khỏi màn hình Kết quả (chưa ghép trận)
  useEffect(() => {
    return () => {
      if (!hasMatchedRef.current && outgoingInviteRef.current) {
        arenaSocketService.friendlyCancel(outgoingInviteRef.current.inviteId);
      }
    };
  }, []);

  const handleSendRematchInvite = () => {
    if (!opponentId || isSendingInvite) return;
    setRematchNotice(null);
    setIsSendingInvite(true);
    arenaSocketService.friendlyInvite({ targetUserId: opponentId, isRematch: true });
  };

  const handleCancelRematch = () => {
    if (outgoingInvite) {
      arenaSocketService.friendlyCancel(outgoingInvite.inviteId);
    }
    outgoingInviteRef.current = null;
    setOutgoingInvite(null);
    setRematchNotice(null);
  };

  const handleAcceptRematch = () => {
    if (!incomingInvite || isAcceptingRematch) return;
    setRematchNotice(null);
    setIsAcceptingRematch(true);
    arenaSocketService.friendlyAccept(incomingInvite.inviteId);
  };

  const handleDeclineRematch = () => {
    if (!incomingInvite) return;
    arenaSocketService.friendlyDecline(incomingInvite.inviteId);
    setIncomingInvite(null);
  };

  const handleBackToHubSafe = () => {
    if (!hasMatchedRef.current && outgoingInviteRef.current) {
      arenaSocketService.friendlyCancel(outgoingInviteRef.current.inviteId);
      outgoingInviteRef.current = null;
      setOutgoingInvite(null);
    }
    onBackToHub();
  };

  const isWin = myResult === 'WIN';
  const isLoss = myResult === 'LOSS';
  const isDraw = myResult === 'DRAW';

  // Nhận diện trạng thái x2 thưởng từ gói cước
  const isDouble = Boolean(gameOverData.wasDoubleReward || myStats.wasDoubleReward);
  const earnedCoins =
    typeof myStats.earnedCoins === 'number'
      ? myStats.earnedCoins
      : isWin
        ? isDouble ? 100 : 50
        : isLoss
          ? isDouble ? 20 : 10
          : isDouble ? 40 : 20;

  const earnedExp =
    typeof myStats.earnedExp === 'number'
      ? myStats.earnedExp
      : isWin
        ? isDouble ? 200 : 100
        : isLoss
          ? isDouble ? 60 : 30
          : isDouble ? 100 : 50;

  const incorrectWordsCount = words.filter((w) => !w.myCorrect).length;
  const correctWordsCount = words.filter((w) => w.myCorrect).length;

  const filteredWords = words.filter((item) => {
    if (wordFilter === 'INCORRECT') return !item.myCorrect;
    if (wordFilter === 'CORRECT') return item.myCorrect;
    return true;
  });

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

  // Tính toán delta RP (chỉ trận Rank mới biến động điểm RP)
  const myRankPointDelta = !isRankMatch
    ? 0
    : typeof myStats.rankPointDelta === 'number' && !isNaN(myStats.rankPointDelta)
      ? myStats.rankPointDelta
      : isWin
        ? 25
        : isLoss
          ? -20
          : 0;

  const oppRankPointDelta = !isRankMatch
    ? 0
    : typeof opponentStats.rankPointDelta === 'number' && !isNaN(opponentStats.rankPointDelta)
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
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-black tracking-widest uppercase ${
            isFriendlyMatch
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : isNormalMatch
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                : 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400'
          }`}
        >
          {isFriendlyMatch ? (
            <>
              <Users className="w-3.5 h-3.5" />
              <span>Kết Quả Đấu Giao Hữu 1v1</span>
            </>
          ) : isNormalMatch ? (
            <>
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Kết Quả Đấu Thường 1v1</span>
            </>
          ) : (
            <>
              <Swords className="w-3.5 h-3.5" />
              <span>Kết Quả Đấu Xếp Hạng 1v1</span>
            </>
          )}
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
              {isRankMatch ? (
                <span
                  className={`text-xs sm:text-sm font-black font-mono px-3 py-1 rounded-xl border shadow-xs ${getRPBadgeClass(
                    myRankPointDelta
                  )}`}
                >
                  {formatRPDelta(myRankPointDelta)}
                </span>
              ) : (
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border shadow-xs ${
                    isFriendlyMatch
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30'
                  }`}
                >
                  Không tính RP
                </span>
              )}
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
          <div className="flex flex-col items-center gap-2.5 w-full min-w-[225px] max-w-[260px] mt-2 sm:mt-4">
            {/* Thông báo trạng thái lời mời Đấu lại (nếu có) */}
            {isFriendlyMatch && rematchNotice && (
              <div
                className={`w-full px-3 py-2 rounded-xl border text-[11px] font-medium flex items-center gap-1.5 text-left ${
                  rematchNotice.type === 'error'
                    ? 'bg-destructive/10 border-destructive/25 text-destructive'
                    : 'bg-muted/70 border-border text-muted-foreground'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="leading-snug">{rematchNotice.message}</span>
              </div>
            )}

            {isFriendlyMatch ? (
              incomingInvite ? (
                <>
                  {/* Đối thủ vừa gửi lời mời đấu lại -> Nút Chấp nhận nổi bật */}
                  <Button
                    onClick={handleAcceptRematch}
                    disabled={isAcceptingRematch}
                    size="lg"
                    className="w-full px-5 py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black tracking-wide uppercase shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-105 gap-2 text-xs sm:text-sm cursor-pointer animate-pulse"
                  >
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span>
                      {isAcceptingRematch
                        ? 'ĐANG VÀO TRẬN...'
                        : `CHẤP NHẬN ĐẤU LẠI (${incomingCountdown}s)`}
                    </span>
                  </Button>
                  <Button
                    onClick={handleDeclineRematch}
                    disabled={isAcceptingRematch}
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border border-rose-300/80 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    <span>Từ chối lời mời</span>
                  </Button>
                </>
              ) : outgoingInvite ? (
                <>
                  {/* Người chơi vừa bấm Đấu lại -> Đang chờ đối thủ phản hồi */}
                  <Button
                    disabled
                    size="lg"
                    className="w-full px-5 py-5 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold tracking-wide uppercase gap-2 text-xs sm:text-sm opacity-100"
                  >
                    <Hourglass className="w-4 h-4 animate-spin shrink-0" />
                    <span>ĐANG CHỜ ĐỐI THỦ ({outgoingCountdown}s)</span>
                  </Button>
                  <Button
                    onClick={handleCancelRematch}
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border border-rose-300/80 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    <span>Hủy lời mời</span>
                  </Button>
                </>
              ) : (
                /* Nút ĐẤU LẠI mặc định cho Đấu Giao Hữu (Màu xanh lá hòa bình giống Hub) */
                <Button
                  onClick={handleSendRematchInvite}
                  disabled={isSendingInvite || !opponentId}
                  size="lg"
                  className="w-full px-6 py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black tracking-wider uppercase shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:scale-105 gap-2 text-sm sm:text-base cursor-pointer"
                >
                  {isSendingInvite ? (
                    <Hourglass className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                  <span>{isSendingInvite ? 'ĐANG GỬI...' : 'ĐẤU LẠI'}</span>
                </Button>
              )
            ) : isNormalMatch ? (
              /* Nút TÌM TRẬN MỚI cho Đấu Thường (Màu xanh da trời sky giống Hub) */
              <Button
                onClick={onPlayAgain}
                size="lg"
                className="w-full px-6 py-5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-black tracking-wider uppercase shadow-lg shadow-sky-500/25 transition-all duration-200 hover:scale-105 gap-2 text-sm sm:text-base cursor-pointer"
              >
                <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>TÌM TRẬN MỚI</span>
              </Button>
            ) : (
              /* Nút TÌM TRẬN MỚI cho Đấu Xếp Hạng (Màu tím lavender giống Hub) */
              <Button
                onClick={onPlayAgain}
                size="lg"
                className="w-full px-6 py-5 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 hover:from-purple-700 hover:to-violet-700 text-white font-black tracking-wider uppercase shadow-lg shadow-purple-600/25 transition-all duration-200 hover:scale-105 gap-2 text-sm sm:text-base cursor-pointer"
              >
                <Swords className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>TÌM TRẬN MỚI</span>
              </Button>
            )}

            <Button
              onClick={handleBackToHubSafe}
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
              {isRankMatch ? (
                <span
                  className={`text-xs sm:text-sm font-black font-mono px-3 py-1 rounded-xl border shadow-xs ${getRPBadgeClass(
                    oppRankPointDelta
                  )}`}
                >
                  {formatRPDelta(oppRankPointDelta)}
                </span>
              ) : (
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border shadow-xs ${
                    isFriendlyMatch
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30'
                  }`}
                >
                  Không tính RP
                </span>
              )}
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

      {/* ── NỬA DƯỚI: BẢNG THỐNG KÊ & THƯỞNG (BÊN TRÁI) ── BẢNG 25 TỪ VỰNG DẠNG THẺ (BÊN PHẢI) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
        {/* ── CỘT TRÁI: lg:col-span-5 GỒM 2 CARD LIÊN HOÀN (THỐNG KÊ ĐỐI ĐẦU + PHẦN THƯỞNG TRẬN ĐẤU) ── */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* CARD 1: THỐNG KÊ ĐỐI ĐẦU */}
          <div className="rounded-3xl border bg-card/70 backdrop-blur-md p-5 sm:p-6 shadow-lg space-y-4">
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

          {/* CARD 2: PHẦN THƯỞNG TRẬN ĐẤU (COINS & EXP + BADGE X2) */}
          <div className="rounded-3xl border bg-card/70 backdrop-blur-md p-5 sm:p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-primary font-black uppercase text-xs">
                <Gift className="w-4 h-4" />
                <span>Phần Thưởng Trận Đấu</span>
              </div>
              {isDouble && (
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-500 text-[10px] font-black uppercase tracking-wider shadow-xs animate-pulse">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>x2 Thưởng Hội Viên</span>
                </div>
              )}
            </div>

            {/* 2 BOX PHẦN THƯỞNG: COIN & EXP */}
            <div className="grid grid-cols-2 gap-3">
              {/* Box Coin (chuẩn màu emerald và icon CircleDollarSign như trên Header) */}
              <div className="relative rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center gap-3 overflow-hidden shadow-xs">
                {isDouble && (
                  <span className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded-md bg-emerald-600 text-[9px] font-black text-white leading-none uppercase">
                    x2
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <CircleDollarSign className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    LexiCoin
                  </p>
                  <p className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    +{earnedCoins.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Box EXP */}
              <div className="relative rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 flex items-center gap-3 overflow-hidden shadow-xs">
                {isDouble && (
                  <span className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded-md bg-indigo-500 text-[9px] font-black text-white leading-none uppercase">
                    x2
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <Zap className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Kinh Nghiệm
                  </p>
                  <p className="text-lg sm:text-xl font-black font-mono text-indigo-400">
                    +{earnedExp.toLocaleString()} EXP
                  </p>
                </div>
              </div>
            </div>

            {/* Chú thích trạng thái phần thưởng */}
            <div className="pt-1">
              {isDouble ? (
                <p className="text-[11px] text-muted-foreground/85 font-medium flex items-center justify-center gap-1.5 bg-muted/30 px-2.5 py-1.5 rounded-xl border border-border/30">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>Đã áp dụng nhân đôi x2 Coin & EXP từ quyền lợi gói hội viên của bạn.</span>
                </p>
              ) : earnedCoins === 0 && earnedExp === 0 ? (
                <p className="text-[11px] text-muted-foreground/85 font-medium flex items-center justify-center gap-1.5 bg-muted/30 px-2.5 py-1.5 rounded-xl border border-border/30">
                  <Info className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>Trận giao hữu không áp dụng cộng thưởng Coin & EXP.</span>
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground/85 font-medium flex items-center justify-center gap-1.5 bg-muted/30 px-2.5 py-1.5 rounded-xl border border-border/30">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>Phần thưởng Coin & EXP đã được ghi nhận.</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── CỘT PHẢI (BẢNG 25 TỪ VỰNG DẠNG THẺ THOÁNG ĐÃNG KÈM TAB LỌC): lg:col-span-7 ── */}
        <div className="lg:col-span-7 rounded-3xl border bg-card/70 backdrop-blur-md p-5 sm:p-6 shadow-lg space-y-4">
          {/* Header Bảng từ vựng */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b pb-3">
            <div className="flex items-center gap-2 text-primary font-black uppercase text-xs">
              <BookOpen className="w-4 h-4" />
              <span>Đối Chiếu 25 Từ Vựng Trận Đấu</span>
            </div>

            {/* Bộ lọc nhanh: Tất cả / Câu sai / Câu đúng */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/50 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setWordFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${wordFilter === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Tất cả ({words.length})
              </button>
              <button
                type="button"
                onClick={() => setWordFilter('INCORRECT')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${wordFilter === 'INCORRECT'
                  ? 'bg-rose-500 text-white shadow-xs font-black'
                  : 'text-rose-500 hover:bg-rose-500/10'
                  }`}
              >
                <X className="w-3 h-3" />
                <span>Câu sai ({incorrectWordsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setWordFilter('CORRECT')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${wordFilter === 'CORRECT'
                  ? 'bg-emerald-500 text-white shadow-xs font-black'
                  : 'text-emerald-500 hover:bg-emerald-500/10'
                  }`}
              >
                <Check className="w-3 h-3" />
                <span>Câu đúng ({correctWordsCount})</span>
              </button>
            </div>
          </div>

          {/* Danh sách từ vựng dạng 1 cột rộng rãi, chữ hiển thị đầy đủ không bị cắt ba chấm */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1.5 [scrollbar-width:thin]">
            {filteredWords.length === 0 ? (
              <div className="text-center py-10 space-y-2 bg-muted/20 rounded-2xl border border-dashed border-border/60 px-4">
                {wordFilter === 'CORRECT' ? (
                  <>
                    <Info className="w-7 h-7 text-muted-foreground mx-auto" />
                    <p className="text-xs font-bold text-muted-foreground">
                      Chưa có câu trả lời đúng nào trong trận này.
                    </p>
                  </>
                ) : wordFilter === 'INCORRECT' ? (
                  <>
                    <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-foreground">
                      Tuyệt vời! Bạn không làm sai câu nào trong trận này.
                    </p>
                  </>
                ) : (
                  <>
                    <Info className="w-7 h-7 text-muted-foreground mx-auto" />
                    <p className="text-xs font-bold text-muted-foreground">
                      Không có dữ liệu câu hỏi trong trận này.
                    </p>
                  </>
                )}
              </div>
            ) : (
              filteredWords.map((item: MatchReviewWord) => {
                const isCorrect = item.myCorrect;
                const userAnswer = item.myAnswer?.trim();
                const correctWord = item.word;
                const isUnanswered = !isCorrect && !userAnswer;

                return (
                  <div
                    key={item.orderIndex}
                    className={`p-3.5 rounded-2xl border transition-all text-xs space-y-2 ${isCorrect
                      ? 'bg-emerald-500/[0.04] border-emerald-500/25 hover:border-emerald-500/45'
                      : isUnanswered
                        ? 'bg-muted/20 border-border/70 hover:border-border'
                        : 'bg-rose-500/[0.04] border-rose-500/25 hover:border-rose-500/45'
                      }`}
                  >
                    {/* Hàng 1: Thứ tự + Đáp án + Loại từ + Thời gian */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono font-bold text-muted-foreground shrink-0">
                          #{item.orderIndex < 10 ? `0${item.orderIndex}` : item.orderIndex}
                        </span>

                        {isCorrect ? (
                          <div className="flex items-center gap-1.5 font-black text-sm text-emerald-500">
                            <span>{correctWord}</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          </div>
                        ) : isUnanswered ? (
                          /* Trường hợp Chưa trả lời / Bỏ qua: Nhãn trung tính, không gạch ngang, không icon X */
                          <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm">
                            <span className="text-muted-foreground font-semibold bg-muted px-2.5 py-0.5 rounded-md border border-border/60">
                              Chưa trả lời
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-emerald-500 font-black flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              {correctWord}
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            </span>
                          </div>
                        ) : (
                          /* Trường hợp Trả lời SAI: Gạch chân chính xác các ký tự gõ sai -> Từ đúng màu xanh */
                          <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm">
                            <span className="flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-md">
                              <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              {renderMismatchCharacters(userAnswer, correctWord)}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-emerald-500 font-black flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              {correctWord}
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.wordType && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-muted/80 text-muted-foreground border border-border/50">
                            {item.wordType}
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {(item.myTimeMs / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>

                    {/* Hàng 2: Nghĩa tiếng Việt trọn vẹn, thuần ký tự bàn phím, không có chấm tròn */}
                    {item.meaning && (
                      <p className="text-xs sm:text-sm font-semibold text-foreground/90 leading-relaxed pl-1">
                        {item.meaning}
                      </p>
                    )}

                    {/* Hàng 3: Câu ví dụ ngữ cảnh thuần chữ với tiền tố Ex: */}
                    {item.example && (
                      <p className="text-[11px] sm:text-xs text-muted-foreground italic leading-relaxed pl-1 line-clamp-3">
                        <span className="font-bold not-italic text-muted-foreground/90 mr-1">Ex:</span>"{item.example}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
