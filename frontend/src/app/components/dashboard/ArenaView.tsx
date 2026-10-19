import React, { useState, useRef } from 'react';
import { Swords, History, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ArenaHub } from './arena/ArenaHub';
import { ArenaHistory } from './arena/ArenaHistory';
import { ArenaLeaderboard } from './arena/ArenaLeaderboard';
import { ArenaRankModal } from './arena/ArenaRankModal';
import { ArenaMatchmakingModal } from './arena/ArenaMatchmakingModal';
import { ArenaGateTransition, ArenaGateHandle } from './arena/ArenaGateTransition';
import { ArenaGameplay } from './arena/ArenaGameplay';
import { UserArenaProfile } from '../../services/arena-service';
import { MatchedPayload } from '../../services/arena-socket.service';

export type ArenaTab = 'hub' | 'history' | 'leaderboard';

export function ArenaView() {
  const [activeTab, setActiveTab] = useState<ArenaTab>('hub');
  const [activeScreen, setActiveScreen] = useState<'lobby' | 'gameplay'>('lobby');
  const [isRankModalOpen, setIsRankModalOpen] = useState<boolean>(false);
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserArenaProfile | null>(null);
  const [activeMatchData, setActiveMatchData] = useState<MatchedPayload | null>(null);

  // Ref điều khiển hoạt cảnh Cánh Cửa Đấu Trường (2 cánh đá gate-left & gate-right)
  const gateRef = useRef<ArenaGateHandle>(null);

  /**
   * KÍCH HOẠT LẦN 1: Bấm "TÌM TRẬN ĐẤU"
   * Cửa đóng sầm lại -> Chuyển sang màn hình Searching ngầm bên dưới -> Cửa mở toang ra
   */
  const handleStartFindMatch = () => {
    gateRef.current?.triggerGateTransition({
      onMiddle: () => {
        setIsMatchmakingOpen(true);
      },
    });
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
        setActiveMatchData(matchData);
        setActiveScreen('gameplay');
      },
      onComplete: () => {
        console.log('[Arena] Trận đấu chính thức bắt đầu!');
      },
    });
  };

  /**
   * Rời khỏi trận đấu (Quay về Sảnh Lobby)
   */
  const handleExitMatch = () => {
    setActiveScreen('lobby');
    setActiveMatchData(null);
  };

  return (
    <div className="space-y-6">
      {/* ── HIỆU ỨNG CÁNH CỬA ĐẤU TRƯỜNG (GATE TRANSITIONS) ── */}
      <ArenaGateTransition ref={gateRef} />

      {activeScreen === 'gameplay' ? (
        /* ── MÀN HÌNH GAMEPLAY ĐẤU TRƯỜNG (FE-6) ── */
        <ArenaGameplay
          matchData={activeMatchData}
          onExitMatch={handleExitMatch}
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
            <TabsList className="grid grid-cols-3 w-full max-w-md bg-muted/70 p-1">
              <TabsTrigger value="hub" className="flex items-center gap-2 text-xs md:text-sm">
                <Swords className="h-4 w-4" />
                <span>Đấu Trường</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 text-xs md:text-sm">
                <History className="h-4 w-4" />
                <span>Lịch sử đấu</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex items-center gap-2 text-xs md:text-sm">
                <Trophy className="h-4 w-4" />
                <span>Bảng xếp hạng</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Đấu Trường (Hub) */}
            <TabsContent value="hub" className="mt-6">
              <ArenaHub
                onNavigateToLeaderboard={(_rank) => setActiveTab('leaderboard')}
                onOpenRankModal={() => setIsRankModalOpen(true)}
                onProfileLoaded={(p) => setProfile(p)}
                onFindMatch={handleStartFindMatch}
              />
            </TabsContent>

            {/* Tab 2: Lịch sử đấu */}
            <TabsContent value="history" className="mt-6">
              <ArenaHistory onFindMatch={handleStartFindMatch} />
            </TabsContent>

            {/* Tab 3: Bảng xếp hạng (Top 50) */}
            <TabsContent value="leaderboard" className="mt-6">
              <ArenaLeaderboard />
            </TabsContent>
          </Tabs>

          {/* Modal Lộ trình Rank (14 cấp bậc, scroll ngang) */}
          <ArenaRankModal
            isOpen={isRankModalOpen}
            onClose={() => setIsRankModalOpen(false)}
            currentRank={profile?.arena?.rank}
            highestRank={profile?.arena?.highestRank}
          />

          {/* Màn hình Ghép trận Matchmaking */}
          <ArenaMatchmakingModal
            isOpen={isMatchmakingOpen}
            onClose={() => setIsMatchmakingOpen(false)}
            currentUserProfile={profile}
            onMatchReady={handleMatchReady}
          />
        </>
      )}
    </div>
  );
}

export default ArenaView;
