import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { tokenStore } from './tokenStore';

export interface ArenaPlayerInfo {
  id: string;
  full_name: string;
  avatar_url: string | null;
  arena_rank: string;
  rank_point: number;
  leaderboard_point?: number;
  arena_current_win_streak: number;
}

export interface MatchedPayload {
  roomId: string;
  me: ArenaPlayerInfo;
  opponent: ArenaPlayerInfo;
  questions: any[];
  totalQuestions: number;
  timeLimitSec: number;
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
  result: 'P1_WIN' | 'P2_WIN' | 'DRAW';
  winnerId: string | null;
  reason: 'ALL_COMPLETED' | 'TIMEOUT' | 'SURRENDER';
  myResult: 'WIN' | 'LOSS' | 'DRAW';
  myStats: GameOverPlayerStats;
  opponentStats: GameOverPlayerStats;
  words: MatchReviewWord[];
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
      this.socket = io({
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

  public findMatch(): void {
    const s = this.connect();
    s.emit('arena:find_match');
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
