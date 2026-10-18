import { io, Socket } from 'socket.io-client';

export interface ArenaPlayerInfo {
  id: string;
  full_name: string;
  avatar_url: string | null;
  arena_rank: string;
  rank_point: number;
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

class ArenaSocketService {
  private socket: Socket | null = null;
  private isConnecting = false;

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
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('[Arena Socket Client] Connected to server, socketId:', this.socket?.id);
      });

      this.socket.on('connect_error', (err) => {
        console.warn('[Arena Socket Client] Connection error:', err.message);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Arena Socket Client] Disconnected:', reason);
      });
    } else if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
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

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const arenaSocketService = new ArenaSocketService();
