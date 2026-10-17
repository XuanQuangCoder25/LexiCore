import React, { useState } from 'react';
import { Swords, History, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ArenaHub } from './arena/ArenaHub';

export type ArenaTab = 'hub' | 'history' | 'leaderboard';

export function ArenaView() {
  const [activeTab, setActiveTab] = useState<ArenaTab>('hub');

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Swords className="h-8 w-8 text-primary" /> PvP Arena
        </h1>
        <p className="text-muted-foreground mt-1">
          Đấu trường từ vựng trực tiếp theo thời gian thực
        </p>
      </div>

      {/* ── Điều phối Tab: Đấu trường, Lịch sử, Bảng xếp hạng ── */}
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
            onOpenRankModal={() => {
              // Sẽ kích hoạt modal lộ trình rank ở bước kế tiếp
            }}
            onFindMatch={() => {
              // Sẽ kích hoạt animation cánh cửa & tìm trận ở bước kế tiếp
            }}
          />
        </TabsContent>

        {/* Tab 2: Lịch sử đấu (Placeholder cho bước tiếp theo) */}
        <TabsContent value="history" className="mt-6">
          <div className="p-12 text-center border rounded-xl text-muted-foreground">
            Tính năng Lịch sử đấu sẽ được triển khai ở bước kế tiếp.
          </div>
        </TabsContent>

        {/* Tab 3: Bảng xếp hạng (Placeholder cho bước tiếp theo) */}
        <TabsContent value="leaderboard" className="mt-6">
          <div className="p-12 text-center border rounded-xl text-muted-foreground">
            Tính năng Bảng xếp hạng sẽ được triển khai ở bước kế tiếp.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default ArenaView;
