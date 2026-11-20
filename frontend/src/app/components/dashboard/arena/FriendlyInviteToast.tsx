import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Swords, Check, X, ShieldAlert } from 'lucide-react';
import {
  arenaSocketService,
  FriendlyInviteReceivedPayload,
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // 1. Khi nhận được lời mời thách đấu
    const handleReceived = (payload: FriendlyInviteReceivedPayload) => {
      console.log('[FriendlyInviteToast] Nhận lời mời từ:', payload);
      setActiveInvite(payload);
      const totalSec = payload.expireInSec || 60;
      setTimeLeft(totalSec);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setActiveInvite(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // 2. Khi người gửi hủy lời mời
    const handleCancelled = (payload: { inviteId: string }) => {
      if (activeInvite && activeInvite.inviteId === payload.inviteId) {
        if (timerRef.current) clearInterval(timerRef.current);
        setActiveInvite(null);
      }
    };

    // 3. Khi trận đấu được tạo thành công sau khi chấp nhận
    const handleMatched = (matchData: MatchedPayload) => {
      if (matchData.matchType === 'FRIENDLY') {
        if (timerRef.current) clearInterval(timerRef.current);
        setActiveInvite(null);
        setIsAccepting(false);
        onNavigateArena?.();
        onAcceptMatched?.(matchData);
      }
    };

    // 4. Lỗi khi chấp nhận (ví dụ lời mời đã hết hạn)
    const handleError = () => {
      setIsAccepting(false);
      setActiveInvite(null);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    arenaSocketService.onFriendlyReceived(handleReceived);
    arenaSocketService.onFriendlyCancelled(handleCancelled);
    arenaSocketService.onFriendlyError(handleError);

    const socket = arenaSocketService.connect();
    socket.on('arena:matched', handleMatched);

    return () => {
      arenaSocketService.offFriendlyReceived(handleReceived);
      arenaSocketService.offFriendlyCancelled(handleCancelled);
      arenaSocketService.offFriendlyError(handleError);
      socket.off('arena:matched', handleMatched);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeInvite, onAcceptMatched, onNavigateArena]);

  const handleAccept = () => {
    if (!activeInvite || isAccepting) return;
    setIsAccepting(true);
    arenaSocketService.friendlyAccept(activeInvite.inviteId);
  };

  const handleDecline = () => {
    if (!activeInvite) return;
    arenaSocketService.friendlyDecline(activeInvite.inviteId);
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveInvite(null);
  };

  if (!activeInvite) return null;

  const totalDuration = activeInvite.expireInSec || 60;
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100));

  return (
    <aside
      aria-label="Thông báo lời mời đấu giao hữu"
      className="fixed top-16 right-4 z-50 w-88 sm:w-96 rounded-xl border border-purple-300/60 dark:border-purple-800/80 bg-card text-card-foreground shadow-2xl backdrop-blur-md overflow-hidden animate-in slide-in-from-right duration-300"
    >
      <div className="p-4 space-y-3">
        {/* Header Toast */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Swords className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-purple-700 dark:text-purple-300">
              Thách Đấu Giao Hữu
            </span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {timeLeft}s
          </span>
        </div>

        {/* Nội dung đối thủ mời */}
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 border-2 border-purple-400 shadow-xs">
            <AvatarImage src={activeInvite.fromUser.avatarUrl || ''} alt={activeInvite.fromUser.fullName} />
            <AvatarFallback className="font-bold bg-purple-100 text-purple-700">
              {activeInvite.fromUser.fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">
              {activeInvite.fromUser.fullName}
            </p>
            <p className="text-xs text-muted-foreground">
              Mời bạn thi đấu giao hữu từ vựng 1v1
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
            className="flex-1 text-xs h-9 font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
            onClick={handleAccept}
            disabled={isAccepting}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {isAccepting ? 'Đang vào...' : 'Chấp nhận'}
          </Button>
        </div>
      </div>

      {/* Thanh tiến trình co dần ở đáy card trong 60 giây */}
      <div className="w-full h-1.5 bg-muted overflow-hidden">
        <div
          className="h-full bg-purple-500 transition-all ease-linear"
          style={{
            width: `${progressPercent}%`,
            transitionDuration: '1000ms',
          }}
        />
      </div>
    </aside>
  );
};
