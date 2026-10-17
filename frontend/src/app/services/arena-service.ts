import axios from 'axios';

const api = axios.create({
  baseURL: '/api/arena',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface UserArenaProfile {
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    coverUrl: string | null;
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
  subTier: number | null;
  order: number;
  threshold: number;
  badgeFile: string;
  mascot: string;
  shieldMaterial: string;
  meaning: string;
  color: string;
}

export const arenaService = {
  getMyProfile: async (): Promise<UserArenaProfile> => {
    const res = await api.get('/profile/me');
    return res.data.data;
  },
  getMyMatches: async (params?: { page?: number; limit?: number; filter?: string }) => {
    const res = await api.get('/matches', { params });
    return res.data.data;
  },
  getMatchDetail: async (id: string) => {
    const res = await api.get(`/matches/${id}`);
    return res.data.data;
  },
  getLeaderboard: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get('/leaderboard', { params });
    return res.data.data;
  },
  getRankTiers: async (): Promise<RankTierDetail[]> => {
    const res = await api.get('/ranks');
    return res.data.data;
  },
};
