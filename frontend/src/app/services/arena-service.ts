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

export const formatRankName = (rank?: string): string => {
  if (!rank) return 'Đồng';
  const map: Record<string, string> = {
    BRONZE: 'Đồng',
    SILVER: 'Bạc',
    GOLD: 'Vàng',
    PLATINUM_1: 'Bạch Kim I',
    PLATINUM_2: 'Bạch Kim II',
    SAPPHIRE_1: 'Lam Ngọc I',
    SAPPHIRE_2: 'Lam Ngọc II',
    EMERALD_1: 'Lục Bảo I',
    EMERALD_2: 'Lục Bảo II',
    DIAMOND_1: 'Kim Cương I',
    DIAMOND_2: 'Kim Cương II',
    MASTER_1: 'Đại Sư I',
    MASTER_2: 'Đại Sư II',
    MASTER_3: 'Đại Sư III',
  };
  return map[rank] || rank;
};

/**
 * Tối ưu URL hình ảnh từ Cloudinary:
 * Thu nhỏ kích thước đúng với khung hiển thị (tránh hiện tượng Moiré/vỡ nét khi co từ ảnh gốc lớn)
 * và tự động tối ưu định dạng (q_auto, f_auto) giúp tải nhanh hơn hàng chục lần.
 * Hỗ trợ tỉ lệ 1:1 (avatar) hoặc 16:9 (ảnh cover bộ sưu tập) hoặc kích thước tuỳ chỉnh.
 */
export const optimizeImageUrl = (
  url?: string | null,
  options?: { width?: number; height?: number; aspectRatio?: '1:1' | '16:9' | 'auto' } | number
): string | undefined => {
  if (!url) return undefined;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/') || url.includes('/upload/w_')) {
    return url;
  }

  if (typeof options === 'number') {
    return url.replace('/upload/', `/upload/w_${options},h_${options},c_fill,q_auto,f_auto/`);
  }

  const width = options?.width || 200;
  let height = options?.height;

  if (!height) {
    if (options?.aspectRatio === '16:9') {
      height = Math.round((width * 9) / 16);
    } else {
      height = width; // mặc định 1:1
    }
  }

  return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill,q_auto,f_auto/`);
};

export const optimizeAvatarUrl = (url?: string | null, size = 200): string | undefined => {
  return optimizeImageUrl(url, size);
};



