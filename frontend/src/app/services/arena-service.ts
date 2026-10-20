import httpClient from './httpClient';

const api = httpClient;

export interface UserArenaProfile {
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    role?: string;
    level: number;
    exp: number;
    coinBalance: number;
    diamondBalance: number;
  };
  arena: {
    rank: string;
    highestRank: string;
    rankPoint: number;
    leaderboardPoint: number;
    nextRankThreshold: number | null;
    progressPercent: number;
    currentWinStreak: number;
    longestWinStreak: number;
    totalWins: number;
    totalLosses: number;
    totalDraws: number;
    totalMatches: number;
    winRate: number;
    rankOrder: number;
  };
  recentMatches: any[];
}

export interface RankTierDetail {
  rank: string;
  name: string;
  order: number;
  threshold: number;
  badgeFile: string;
  mascot: string;
  meaning: string;
  color: string;
}

export const arenaService = {
  getMyProfile: async (): Promise<UserArenaProfile> => {
    const res = await api.get('/api/arena/profile/me');
    return res.data.data;
  },
  getMyMatches: async (params?: { page?: number; limit?: number; filter?: string }) => {
    const res = await api.get('/api/arena/matches', { params });
    return res.data.data;
  },
  getMatchDetail: async (id: string) => {
    const res = await api.get(`/api/arena/matches/${id}`);
    return res.data.data;
  },
  getLeaderboard: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get('/api/arena/leaderboard', { params });
    return res.data.data;
  },
  getRankTiers: async (): Promise<RankTierDetail[]> => {
    const res = await api.get('/api/arena/ranks');
    return res.data.data;
  },
};

export const getRankBadgeUrl = (rank?: string): string => {
  if (!rank) return '/assets/ranks/rank-bronze.png';
  const cleanRank = rank.toUpperCase().trim();
  const slug = cleanRank.toLowerCase().replace(/_/g, '-');
  return `/assets/ranks/rank-${slug}.png`;
};
