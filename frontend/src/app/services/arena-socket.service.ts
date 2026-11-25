import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { tokenStore } from './tokenStore';
import { getSocketServerUrl } from './socket-config';

export interface ArenaPlayerInfo {
  id: string;
  full_name: string;
  avatar_url: string | null;
  tier?: 'FREE' | 'STARTER' | 'PRO' | 'ELITE';
  arena_rank: string;
  rank_point: number;
  leaderboard_point?: number;
  arena_current_win_streak: number;
}

export interface MatchedPayload {
  roomId: string;
  matchType?: 'RANK' | 'NORMAL' | 'FRIENDLY';
  topic?: string;
  me: ArenaPlayerInfo;
  opponent: ArenaPlayerInfo;
  questions: any[];
  totalQuestions: number;
  timeLimitSec: number;
}

export interface FriendlyInviteReceivedPayload {
  inviteId: string;
  isRematch?: boolean;
  fromUser: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    rank: string;
  };
  expireInSec: number;
}

export interface FriendlyInviteSentPayload {
  inviteId: string;
  isRematch?: boolean;
  targetUser: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  toUser?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  expireInSec: number;
}

export interface FriendlyInviteDeclinedPayload {
  inviteId: string;
  declinedByUserId?: string;
  message: string;
}

export interface FriendlyInviteCancelledPayload {
  inviteId: string;
  message?: string;
}

export interface GameOverPlayerStats {
  id: string;
  correct: number;
  timeMs: number;
  rankPointDelta: number;
  leaderboardPointDelta: number;
  newRank: string;
  newRankPoint: number;
  newLeaderboardPoint: number;
  winStreak: number;
  isPromoted?: boolean;
  isDemoted?: boolean;
  promotionDetails?: any;
  demotionDetails?: any;
  wasDoubleReward?: boolean;
  earnedCoins?: number;
  earnedExp?: number;
}

export interface MatchReviewWord {
  orderIndex: number;
  wordId: string;
  word: string;
  meaning: string;
  topic: string;
  level: string;
  wordType: string;
  example?: string;
  myAnswer: string | null;
  myCorrect: boolean;
  myTimeMs: number;
  opponentAnswer: string | null;
  opponentCorrect: boolean;
  opponentTimeMs: number;
}

export interface GameOverPayload {
  roomId: string;
  matchType?: 'RANK' | 'NORMAL' | 'FRIENDLY';
  result: 'P1_WIN' | 'P2_WIN' | 'DRAW';
  winnerId: string | null;
  reason: 'ALL_COMPLETED' | 'TIMEOUT' | 'SURRENDER';
  myResult: 'WIN' | 'LOSS' | 'DRAW';
  myStats: GameOverPlayerStats;
  opponentStats: GameOverPlayerStats;
  words: MatchReviewWord[];
  wasDoubleReward?: boolean;
}

class ArenaSocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private unsubscribeTokenChange: (() => void) | null = null;

  public connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (!this.socket) {
      const socketBase = getSocketServerUrl();
      console.log(`[Arena Socket Client] Connecting to: ${socketBase || 'same-origin (proxy)'}`);

      this.socket = io(socketBase || undefined, {
        path: '/socket.io',
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        // Truyen accessToken qua auth option (socket middleware doc Bearer token)
        auth: { token: tokenStore.getToken() ?? '' },
      });

      this.socket.on('connect', () => {
        console.log('[Arena Socket Client] Connected, socketId:', this.socket?.id);
      });

      this.socket.on('connect_error', (err) => {
        console.warn('[Arena Socket Client] Connection error:', err.message);
        if (err.message?.toLowerCase().includes('unauthorized') || err.message?.includes('401')) {
          this._refreshAndReconnect();
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Arena Socket Client] Disconnected:', reason);
      });

      // Lang nghe khi token duoc cap nhat (sau khi refresh) → cap nhat auth socket
      this.unsubscribeTokenChange = tokenStore.onTokenChange((newToken) => {
        if (this.socket && newToken) {
          (this.socket.auth as Record<string, string>).token = newToken;
        }
      });
    } else if (!this.socket.connected) {
      // Cap nhat token moi nhat truoc khi reconnect
      (this.socket.auth as Record<string, string>).token = tokenStore.getToken() ?? '';
      this.socket.connect();
    }

    return this.socket;
  }

  /** Refresh accessToken roi reconnect socket voi token moi */
  private async _refreshAndReconnect() {
    try {
      const res = await axios.post<{ accessToken?: string; token?: string }>(
        '/api/auth/refresh-token',
        {},
        { withCredentials: true }
      );
      const newToken = res.data?.accessToken || res.data?.token;
      if (newToken) {
        tokenStore.setToken(newToken);   // cap nhat memory store + thong bao listeners
        if (this.socket) {
          (this.socket.auth as Record<string, string>).token = newToken;
        }
      }
      console.log('[Arena Socket Client] Token refreshed, reconnecting...');
      this.socket?.connect();
    } catch {
      console.warn('[Arena Socket Client] Token refresh failed, redirecting to login');
      tokenStore.clear();
      window.location.href = '/login';
    }
  }


  public getSocket(): Socket | null {
    return this.socket;
  }

  public isConnected(): boolean {
    return !!this.socket?.connected;
  }

  public findMatch(matchType: 'RANK' | 'NORMAL' = 'RANK'): void {
    const s = this.connect();
    s.emit('arena:find_match', { matchType });
  }

  public friendlyInvite(data: { targetUserId?: string; targetUsername?: string; isRematch?: boolean }): void {
    const s = this.connect();
    s.emit('arena:friendly_invite', data);
  }

  public friendlyCancel(inviteId: string): void {
    if (this.socket) {
      this.socket.emit('arena:friendly_cancel', { inviteId });
    }
  }

  public friendlyDecline(inviteId: string): void {
    if (this.socket) {
      this.socket.emit('arena:friendly_decline', { inviteId });
    }
  }

  public friendlyAccept(inviteId: string): void {
    if (this.socket) {
      this.socket.emit('arena:friendly_accept', { inviteId });
    }
  }

  public onFriendlyReceived(cb: (payload: FriendlyInviteReceivedPayload) => void): void {
    const s = this.connect();
    s.on('arena:friendly_received', cb);
  }

  public offFriendlyReceived(cb: (payload: FriendlyInviteReceivedPayload) => void): void {
    if (this.socket) {
      this.socket.off('arena:friendly_received', cb);
    }
  }

  public onFriendlySent(cb: (payload: FriendlyInviteSentPayload) => void): void {
    const s = this.connect();
    s.on('arena:friendly_sent', cb);
  }

  public offFriendlySent(cb: (payload: FriendlyInviteSentPayload) => void): void {
    if (this.socket) {
      this.socket.off('arena:friendly_sent', cb);
    }
  }

  public onFriendlyDeclined(cb: (payload: FriendlyInviteDeclinedPayload) => void): void {
    const s = this.connect();
    s.on('arena:friendly_declined', cb);
  }

  public offFriendlyDeclined(cb: (payload: FriendlyInviteDeclinedPayload) => void): void {
    if (this.socket) {
      this.socket.off('arena:friendly_declined', cb);
    }
  }

  public onFriendlyCancelled(cb: (payload: FriendlyInviteCancelledPayload) => void): void {
    const s = this.connect();
    s.on('arena:friendly_cancelled', cb);
  }

  public offFriendlyCancelled(cb: (payload: FriendlyInviteCancelledPayload) => void): void {
    if (this.socket) {
      this.socket.off('arena:friendly_cancelled', cb);
    }
  }

  public onFriendlyError(cb: (payload: { message: string }) => void): void {
    const s = this.connect();
    s.on('arena:friendly_error', cb);
  }

  public offFriendlyError(cb: (payload: { message: string }) => void): void {
    if (this.socket) {
      this.socket.off('arena:friendly_error', cb);
    }
  }

  public cancelMatch(): void {
    if (this.socket) {
      this.socket.emit('arena:cancel_match');
    }
  }

  public ready(roomId: string): void {
    if (this.socket && roomId) {
      this.socket.emit('arena:ready', { roomId });
    }
  }

  public submitAnswer(roomId: string, questionIndex: number, answer: string, timeMs: number): void {
    if (this.socket && roomId) {
      this.socket.emit('arena:submit_answer', { roomId, questionIndex, answer, timeMs });
    }
  }

  public surrender(roomId: string): void {
    if (this.socket && roomId) {
      this.socket.emit('arena:surrender', { roomId });
    }
  }

  public leaveRoom(roomId?: string): void {
    if (this.socket) {
      this.socket.emit('arena:leave_room', { roomId });
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const arenaSocketService = new ArenaSocketService();
