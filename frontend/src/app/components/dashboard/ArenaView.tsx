import React, { useState, useRef, useEffect } from 'react';
import { Swords, History, Trophy, BarChart2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ArenaHub } from './arena/ArenaHub';
import { ArenaHistory } from './arena/ArenaHistory';
import { ArenaLeaderboard } from './arena/ArenaLeaderboard';
import { ArenaRadarStats } from './arena/ArenaRadarStats';
import { ArenaRankModal } from './arena/ArenaRankModal';
import { ArenaMatchmakingModal } from './arena/ArenaMatchmaking';
import { FriendlyInviteModal } from './arena/FriendlyInviteModal';
import { ArenaGateTransition, ArenaGateHandle } from './arena/ArenaGateTransition';
import { ArenaGameplay } from './arena/ArenaGameplay';
import { ArenaMatchResult } from './arena/ArenaMatchResult';
import { UserArenaProfile } from '../../services/arena-service';
import { MatchedPayload, GameOverPayload, arenaSocketService } from '../../services/arena-socket.service';
import { RankChangeData } from './arena/ArenaRankChangeEffect';

export type ArenaTab = 'hub' | 'history' | 'leaderboard' | 'analytics';

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

export interface ArenaViewProps {
  initialPendingMatch?: MatchedPayload | null;
  onClearPendingMatch?: () => void;
}

export function ArenaView({ initialPendingMatch, onClearPendingMatch }: ArenaViewProps = {}) {
  const [activeTab, setActiveTab] = useState<ArenaTab>('hub');
  const [activeScreen, setActiveScreen] = useState<'lobby' | 'gameplay' | 'result'>('lobby');
  const [isRankModalOpen, setIsRankModalOpen] = useState<boolean>(false);
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState<boolean>(false);
  const [matchType, setMatchType] = useState<'RANK' | 'NORMAL' | 'FRIENDLY'>('RANK');
  const [isFriendlyModalOpen, setIsFriendlyModalOpen] = useState<boolean>(false);
  const [targetFriendForInvite, setTargetFriendForInvite] = useState<{ id: string; fullName: string; avatarUrl?: string | null } | null>(null);
  const [friendlyMatchedData, setFriendlyMatchedData] = useState<MatchedPayload | null>(initialPendingMatch || null);
  const [profile, setProfile] = useState<UserArenaProfile | null>(null);
  const [activeMatchData, setActiveMatchData] = useState<MatchedPayload | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverPayload | null>(null);
  const [pendingRankChange, setPendingRankChange] = useState<RankChangeData | null>(null);

  // Ref điều khiển hoạt cảnh Cánh Cửa Đấu Trường (2 cánh đá gate-left & gate-right)
  const gateRef = useRef<ArenaGateHandle>(null);
  const handledMatchRoomIdRef = useRef<string | null>(null);

  const openFriendlyMatchedLobby = (matchedData: MatchedPayload) => {
    if (!matchedData?.roomId) return;
    if (handledMatchRoomIdRef.current === matchedData.roomId) return;
    handledMatchRoomIdRef.current = matchedData.roomId;

    setMatchType('FRIENDLY');
    setIsFriendlyModalOpen(false);
    setFriendlyMatchedData(matchedData);

    gateRef.current?.triggerGateTransition({
      onMiddle: () => {
        setActiveScreen('lobby');
        setGameOverData(null);
        setActiveMatchData(null);
        setPendingRankChange(null);
        setIsMatchmakingOpen(true);
      },
    });
  };

  // Xử lý khi có trận đấu chờ (ví dụ P2 vừa chấp nhận lời mời đấu giao hữu từ bất kỳ trang nào)
  useEffect(() => {
    if (initialPendingMatch) {
      openFriendlyMatchedLobby(initialPendingMatch);
      onClearPendingMatch?.();
    }
  }, [initialPendingMatch, onClearPendingMatch]);

  // Lắng nghe socket event 'arena:matched' trực tiếp nếu người chơi đang ở ngay trong ArenaView
  useEffect(() => {
    const socket = arenaSocketService.connect();
    const handleDirectMatched = (matchedData: MatchedPayload) => {
      if (matchedData.matchType === 'FRIENDLY') {
        console.log('[ArenaView] Nhận sự kiện matched giao hữu trực tiếp:', matchedData);
        openFriendlyMatchedLobby(matchedData);
      }
    };

    socket.on('arena:matched', handleDirectMatched);
    return () => {
      socket.off('arena:matched', handleDirectMatched);
    };
  }, []);

  // Lắng nghe sự kiện thách đấu trực tiếp từ FriendsPanel hoặc Chat
  useEffect(() => {
    const handleChallengeUser = (e: any) => {
      const friend = e.detail;
      if (friend) {
        setTargetFriendForInvite({
          id: friend.id,
          fullName: friend.full_name || friend.fullName,
          avatarUrl: friend.avatar_url || friend.avatarUrl,
        });
        setIsFriendlyModalOpen(true);
      }
    };
    window.addEventListener('arena:challenge_user', handleChallengeUser);
    return () => {
      window.removeEventListener('arena:challenge_user', handleChallengeUser);
    };
  }, []);

  /**
   * KÍCH HOẠT LẦN 1: Bấm "TÌM TRẬN ĐẤU" (Đấu Xếp Hạng hoặc Đấu Thường)
   * Cửa đóng sầm lại -> Chuyển sang màn hình Searching ngầm bên dưới -> Cửa mở toang ra
   */
  const handleStartFindMatch = (mode: 'RANK' | 'NORMAL' = 'RANK') => {
    setMatchType(mode);
    setFriendlyMatchedData(null);
    gateRef.current?.triggerGateTransition({
      onMiddle: () => {
        setIsMatchmakingOpen(true);
      },
    });
  };

  /**
   * KHI ĐẤU GIAO HỮU KHỚP TRẬN THÀNH CÔNG
   */
  const handleFriendlyMatched = (matchedData: MatchedPayload) => {
    openFriendlyMatchedLobby(matchedData);
  };

  /**
   * KÍCH HOẠT LẦN 2: CẢ 2 ĐÃ SẴN SÀNG (READY)
   * Cửa đóng sầm lại -> Đếm ngược 3, 2, 1, CHIẾN! trên phiến đá -> Cửa mở toang ra vào Gameplay
   */
  const handleMatchReady = (matchData: MatchedPayload) => {
    gateRef.current?.triggerMatchStartCountdown({
      onClosed: () => {
        // Cửa đã khép kín: đóng modal ghép trận và chuẩn bị giao diện Gameplay
        setIsMatchmakingOpen(false);
        setFriendlyMatchedData(null);
        setActiveMatchData(matchData);
        setActiveScreen('gameplay');
      },
      onComplete: () => {
        console.log('[Arena] Trận đấu chính thức bắt đầu!');
      },
    });
  };

  /**
   * KHI TRẬN ĐẤU KẾT THÚC (ARENA GAME OVER)
   * Hiển thị bảng tổng kết kết quả, biến động Elo RP và danh sách 25 từ
   * Đồng thời phát hiện thăng rank hoặc hạ rank (chỉ áp dụng ở Đấu Xếp Hạng)
   */
  const handleGameOver = (data: GameOverPayload) => {
    const resolvedType = activeMatchData?.matchType || data.matchType || matchType;
    setMatchType(resolvedType);
    setGameOverData({ ...data, matchType: resolvedType });
    setActiveScreen('result');

    if (resolvedType !== 'RANK') {
      setPendingRankChange(null);
      return;
    }

    // Xác định xem trận đấu này có làm thay đổi rank (thăng rank hoặc hạ rank) của người chơi không
    const myStats = data.myStats;
    const oldRank =
      activeMatchData?.me?.arena_rank ||
      profile?.arena?.rank ||
      myStats.promotionDetails?.oldRank ||
      myStats.demotionDetails?.oldRank;
    const newRank = myStats.newRank;

    const isPromoted = Boolean(
      myStats.isPromoted ||
        (oldRank && newRank && getRankOrderVal(newRank) > getRankOrderVal(oldRank))
    );
    const isDemoted = Boolean(
      myStats.isDemoted ||
        (oldRank && newRank && getRankOrderVal(newRank) < getRankOrderVal(oldRank))
    );

    if (oldRank && newRank && oldRank !== newRank && (isPromoted || isDemoted)) {
      setPendingRankChange({
        oldRank,
        newRank,
        isPromoted,
        isDemoted,
      });
    } else {
      setPendingRankChange(null);
    }
  };

  /**
   * KÍCH HOẠT LẦN 4: BẤM "TÌM TRẬN MỚI" TỪ MÀN HÌNH KẾT QUẢ (RANK / NORMAL)
   * Cửa đóng sầm lại -> Thoát màn hình kết quả và mở modal tìm trận đúng chế độ vừa đấu -> Cửa mở toang ra
   */
  const handlePlayAgain = () => {
    const prevMode = activeMatchData?.matchType || gameOverData?.matchType || matchType;
    const nextQueueMode: 'RANK' | 'NORMAL' = prevMode === 'NORMAL' ? 'NORMAL' : 'RANK';

    gateRef.current?.triggerGateTransition({
      onMiddle: () => {
        setMatchType(nextQueueMode);
        setFriendlyMatchedData(null);
        setActiveScreen('lobby');
        setGameOverData(null);
        setActiveMatchData(null);
        setPendingRankChange(null);
        setIsMatchmakingOpen(true);
      },
    });
  };

  /**
   * Về sảnh Hub Đấu Trường từ màn hình kết quả
   */
  const handleBackToHub = () => {
    setActiveScreen('lobby');
    setGameOverData(null);
    setActiveMatchData(null);
    setActiveTab('hub');
  };

  /**
   * Rời khỏi trận đấu (Quay về Sảnh Lobby)
   */
  const handleExitMatch = () => {
    if (activeMatchData?.roomId) {
      arenaSocketService.leaveRoom(activeMatchData.roomId);
    }
    setActiveScreen('lobby');
    setActiveMatchData(null);
    setGameOverData(null);
  };

  return (
    <div className="space-y-6">
      {/* ── HIỆU ỨNG CÁNH CỬA ĐẤU TRƯỜNG (GATE TRANSITIONS) ── */}
      <ArenaGateTransition ref={gateRef} />

      {activeScreen === 'result' && gameOverData ? (
        /* ── MÀN HÌNH KẾT THÚC VÁN ĐẤU (FE-7: MATCH RESULT) ── */
        <ArenaMatchResult
          gameOverData={gameOverData}
          matchType={activeMatchData?.matchType || gameOverData.matchType || matchType}
          mePlayerInfo={activeMatchData?.me}
          opponentPlayerInfo={activeMatchData?.opponent}
          onPlayAgain={handlePlayAgain}
          onBackToHub={handleBackToHub}
        />
      ) : activeScreen === 'gameplay' ? (
        /* ── MÀN HÌNH GAMEPLAY ĐẤU TRƯỜNG (FE-6) ── */
        <ArenaGameplay
          matchData={activeMatchData}
          onExitMatch={handleExitMatch}
          onGameOver={handleGameOver}
          onFinishMatch={() => {
            console.log('[Arena] Hết giờ thi đấu');
          }}
        />
      ) : (
        /* ── SẢNH CHỜ ĐẤU TRƯỜNG (LOBBY: HUB, HISTORY, LEADERBOARD) ── */
        <>
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Swords className="h-8 w-8 text-primary" /> PvP Arena
            </h1>
            <p className="text-muted-foreground mt-1">
              Đấu trường từ vựng trực tiếp theo thời gian thực
            </p>
          </div>

          {/* Điều phối Tab: Đấu trường, Lịch sử, Bảng xếp hạng */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as ArenaTab)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 h-auto sm:h-10 sm:inline-flex sm:w-fit bg-muted/70 p-1 gap-1">
              <TabsTrigger value="hub" className="flex items-center gap-2 px-3 sm:px-4 text-xs md:text-sm">
                <Swords className="h-4 w-4 shrink-0" />
                <span>Đấu Trường</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 px-3 sm:px-4 text-xs md:text-sm">
                <History className="h-4 w-4 shrink-0" />
                <span>Lịch sử đấu</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex items-center gap-2 px-3 sm:px-4 text-xs md:text-sm">
                <Trophy className="h-4 w-4 shrink-0" />
                <span>Bảng xếp hạng</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2 px-3 sm:px-4 text-xs md:text-sm">
                <BarChart2 className="h-4 w-4 shrink-0" />
                <span>Năng lực</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Đấu Trường (Hub) */}
            <TabsContent value="hub" className="mt-6">
              <ArenaHub
                onNavigateToLeaderboard={(_rank) => setActiveTab('leaderboard')}
                onOpenRankModal={() => setIsRankModalOpen(true)}
                onProfileLoaded={(p) => setProfile(p)}
                onFindMatch={handleStartFindMatch}
                onOpenFriendlyInvite={() => {
                  setTargetFriendForInvite(null);
                  setIsFriendlyModalOpen(true);
                }}
                rankChangeData={pendingRankChange}
                onRankChangeAnimationComplete={() => setPendingRankChange(null)}
              />
            </TabsContent>

            {/* Tab 2: Lịch sử đấu */}
            <TabsContent value="history" className="mt-6">
              <ArenaHistory onNavigateToHub={() => setActiveTab('hub')} />
            </TabsContent>

            {/* Tab 3: Bảng xếp hạng (Top 50) */}
            <TabsContent value="leaderboard" className="mt-6">
              <ArenaLeaderboard />
            </TabsContent>

            {/* Tab 4: Phân Tích Năng Lực (Pro Analytics Tracker) */}
            <TabsContent value="analytics" className="mt-6">
              <ArenaRadarStats />
            </TabsContent>
          </Tabs>

          {/* Modal Lộ trình Rank (14 cấp bậc, scroll ngang) */}
          <ArenaRankModal
            isOpen={isRankModalOpen}
            onClose={() => setIsRankModalOpen(false)}
            currentRank={profile?.arena?.rank}
            highestRank={profile?.arena?.highestRank}
          />

          {/* Modal Mời Đấu Giao Hữu */}
          <FriendlyInviteModal
            isOpen={isFriendlyModalOpen}
            onClose={() => {
              setIsFriendlyModalOpen(false);
              setTargetFriendForInvite(null);
            }}
            currentUserId={profile?.user?.id}
            initialTargetFriend={targetFriendForInvite}
            onFriendlyMatched={handleFriendlyMatched}
          />

          {/* Màn hình Ghép trận Matchmaking */}
          <ArenaMatchmakingModal
            isOpen={isMatchmakingOpen}
            onClose={() => {
              setIsMatchmakingOpen(false);
              setFriendlyMatchedData(null);
            }}
            currentUserProfile={profile}
            matchType={matchType}
            initialMatchedData={friendlyMatchedData}
            onMatchReady={handleMatchReady}
          />
        </>
      )}
    </div>
  );
}

export default ArenaView;
