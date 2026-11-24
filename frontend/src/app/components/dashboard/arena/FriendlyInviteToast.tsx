import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Swords, Check, X } from 'lucide-react';
import {
  arenaSocketService,
  FriendlyInviteReceivedPayload,
  FriendlyInviteDeclinedPayload,
  MatchedPayload,
} from '../../../services/arena-socket.service';

interface FriendlyInviteToastProps {
  onAcceptMatched?: (matchData: MatchedPayload) => void;
  onNavigateArena?: () => void;
}

export const FriendlyInviteToast: React.FC<FriendlyInviteToastProps> = ({
  onAcceptMatched,
  onNavigateArena,
}) => {
  const [activeInvite, setActiveInvite] = useState<FriendlyInviteReceivedPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isAccepting, setIsAccepting] = useState<boolean>(false);

  // Sử dụng Ref để tránh re-subscribe Socket khi callbacks từ cha thay đổi
  const onAcceptMatchedRef = useRef(onAcceptMatched);
  onAcceptMatchedRef.current = onAcceptMatched;
  const onNavigateArenaRef = useRef(onNavigateArena);
  onNavigateArenaRef.current = onNavigateArena;
  const activeInviteRef = useRef(activeInvite);
  activeInviteRef.current = activeInvite;
  const isAcceptingRef = useRef(isAccepting);
  isAcceptingRef.current = isAccepting;

  // ─── 1. EFFECT SOCKET: Lắng nghe lời mời thách đấu (Chỉ gắn listener 1 lần) ───
  useEffect(() => {
    const handleReceived = (payload: FriendlyInviteReceivedPayload) => {
      console.log('[FriendlyInviteToast] Nhận lời mời từ:', payload);
      setActiveInvite(payload);
      setTimeLeft(payload.expireInSec || 60);
      setIsAccepting(false);
    };

    const handleCancelled = (payload: { inviteId: string }) => {
      if (activeInviteRef.current && activeInviteRef.current.inviteId === payload.inviteId) {
        console.log('[FriendlyInviteToast] Lời mời đã bị người gửi hủy:', payload.inviteId);
        setActiveInvite(null);
        setIsAccepting(false);
      }
    };

    const handleDeclined = (payload: FriendlyInviteDeclinedPayload) => {
      if (activeInviteRef.current && activeInviteRef.current.inviteId === payload.inviteId) {
        setActiveInvite(null);
        setIsAccepting(false);
      }
    };

    const handleMatched = (matchData: MatchedPayload) => {
      if (matchData.matchType === 'FRIENDLY') {
        console.log('[FriendlyInviteToast] Đấu giao hữu đã ghép trận:', matchData);
        setActiveInvite(null);
        setIsAccepting(false);
        onNavigateArenaRef.current?.();
        onAcceptMatchedRef.current?.(matchData);
      }
    };

    const handleError = () => {
      if (isAcceptingRef.current) {
        setIsAccepting(false);
        setActiveInvite(null);
      }
    };

    arenaSocketService.onFriendlyReceived(handleReceived);
    arenaSocketService.onFriendlyCancelled(handleCancelled);
    arenaSocketService.onFriendlyDeclined(handleDeclined);
    arenaSocketService.onFriendlyError(handleError);

    const socket = arenaSocketService.connect();
    socket.on('arena:matched', handleMatched);

    return () => {
      arenaSocketService.offFriendlyReceived(handleReceived);
      arenaSocketService.offFriendlyCancelled(handleCancelled);
      arenaSocketService.offFriendlyDeclined(handleDeclined);
      arenaSocketService.offFriendlyError(handleError);
      socket.off('arena:matched', handleMatched);
    };
  }, []);

  // ─── 2. EFFECT TIMER: Đếm ngược 60 giây và co thanh tiến trình ───
  useEffect(() => {
    if (!activeInvite) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setActiveInvite(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeInvite]);

  const handleAccept = () => {
    if (!activeInvite || isAccepting) return;
    setIsAccepting(true);
    arenaSocketService.friendlyAccept(activeInvite.inviteId);
  };

  const handleDecline = () => {
    if (!activeInvite) return;
    arenaSocketService.friendlyDecline(activeInvite.inviteId);
    setActiveInvite(null);
  };

  if (!activeInvite) return null;

  const totalDuration = activeInvite.expireInSec || 60;
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100));

  return (
    <aside
      aria-label="Thông báo lời mời đấu giao hữu"
      className="fixed top-16 right-4 z-50 w-88 sm:w-96 rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 bg-card text-card-foreground shadow-2xl backdrop-blur-md overflow-hidden animate-in slide-in-from-right duration-300"
    >
      <div className="p-4 space-y-3">
        {/* Header Toast */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Swords className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-emerald-700 dark:text-emerald-300">
              {activeInvite.isRematch ? 'Thách Đấu Lại (Giao Hữu)' : 'Thách Đấu Giao Hữu'}
            </span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {timeLeft}s
          </span>
        </div>

        {/* Nội dung đối thủ mời */}
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 border-2 border-emerald-400 shadow-xs">
            <AvatarImage src={activeInvite.fromUser.avatarUrl || ''} alt={activeInvite.fromUser.fullName} />
            <AvatarFallback className="font-bold bg-emerald-100 text-emerald-700">
              {activeInvite.fromUser.fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">
              {activeInvite.fromUser.fullName}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeInvite.isRematch
                ? 'Mời bạn đấu lại trận giao hữu từ vựng 1v1'
                : 'Mời bạn thi đấu giao hữu từ vựng 1v1'}
            </p>
          </div>
        </div>

        {/* Hai nút hành động: Chấp nhận & Từ chối */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-9 font-medium"
            onClick={handleDecline}
            disabled={isAccepting}
          >
            <X className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            Từ chối
          </Button>

          <Button
            size="sm"
            className="flex-1 text-xs h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            onClick={handleAccept}
            disabled={isAccepting}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {isAccepting ? 'Đang vào...' : 'Chấp nhận'}
          </Button>
        </div>
      </div>

      {/* Thanh tiến trình co dần ở đáy card trong 60 giây */}
      <div className="w-full h-1.5 bg-muted/60 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all ease-linear"
          style={{
            width: `${progressPercent}%`,
            transitionDuration: '1000ms',
          }}
        />
      </div>
    </aside>
  );
};
