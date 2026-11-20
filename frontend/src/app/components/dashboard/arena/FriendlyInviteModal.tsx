import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import {
  Swords,
  Users,
  Search,
  Hourglass,
  X,
  AlertCircle,
  Loader2,
  Send,
  CircleDot,
} from 'lucide-react';
import { useSocial } from '../../../features/social/SocialContext';
import {
  arenaSocketService,
  MatchedPayload,
  FriendlyInviteSentPayload,
  FriendlyInviteDeclinedPayload,
} from '../../../services/arena-socket.service';

interface FriendlyInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetFriend?: { id: string; fullName: string; avatarUrl?: string | null } | null;
  onFriendlyMatched?: (matchedData: MatchedPayload) => void;
}

export const FriendlyInviteModal: React.FC<FriendlyInviteModalProps> = ({
  isOpen,
  onClose,
  initialTargetFriend,
  onFriendlyMatched,
}) => {
  const { friends, onlineUserIds } = useSocial();
  const [targetInput, setTargetInput] = useState<string>('');
  const [activeInvite, setActiveInvite] = useState<FriendlyInviteSentPayload | null>(null);
  const [waitingCountdown, setWaitingCountdown] = useState<number>(60);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state khi mở/đóng modal
  useEffect(() => {
    if (!isOpen) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setActiveInvite(null);
      setErrorMessage(null);
      setIsSending(false);
      setWaitingCountdown(60);
      setTargetInput('');
    } else if (initialTargetFriend) {
      // Nếu có sẵn thông tin friend được truyền vào từ FriendsPanel
      setTargetInput(initialTargetFriend.id);
    }
  }, [isOpen, initialTargetFriend]);

  // Lắng nghe các socket events từ server
  useEffect(() => {
    if (!isOpen) return;

    // 1. Lời mời đã được gửi đi thành công -> Chuyển sang màn hình chờ
    const handleSent = (payload: FriendlyInviteSentPayload) => {
      console.log('[FriendlyInviteModal] Đã gửi lời mời:', payload);
      setActiveInvite(payload);
      setIsSending(false);
      setErrorMessage(null);
      const totalSec = payload.expireInSec || 60;
      setWaitingCountdown(totalSec);

      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = setInterval(() => {
        setWaitingCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            setActiveInvite(null);
            setErrorMessage('Lời mời đã hết thời gian chờ (60s).');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // 2. Đối thủ từ chối lời mời
    const handleDeclined = (payload: FriendlyInviteDeclinedPayload) => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setActiveInvite(null);
      setErrorMessage(payload.message || 'Đối thủ đã từ chối lời mời thách đấu.');
    };

    // 3. Người gửi hoặc server hủy lời mời
    const handleCancelled = () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setActiveInvite(null);
    };

    // 4. Lỗi gửi lời mời (vd: đối thủ offline, không tồn tại...)
    const handleError = (payload: { message: string }) => {
      setIsSending(false);
      setErrorMessage(payload.message || 'Không thể gửi lời mời.');
    };

    // 5. Cả 2 đã khớp trận (Đối thủ chấp nhận lời mời)
    const handleMatched = (matchedData: MatchedPayload) => {
      if (matchedData.matchType === 'FRIENDLY') {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        setActiveInvite(null);
        onClose();
        onFriendlyMatched?.(matchedData);
      }
    };

    arenaSocketService.onFriendlySent(handleSent);
    arenaSocketService.onFriendlyDeclined(handleDeclined);
    arenaSocketService.onFriendlyCancelled(handleCancelled);
    arenaSocketService.onFriendlyError(handleError);

    const socket = arenaSocketService.connect();
    socket.on('arena:matched', handleMatched);

    return () => {
      arenaSocketService.offFriendlySent(handleSent);
      arenaSocketService.offFriendlyDeclined(handleDeclined);
      arenaSocketService.offFriendlyCancelled(handleCancelled);
      arenaSocketService.offFriendlyError(handleError);
      socket.off('arena:matched', handleMatched);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isOpen, onClose, onFriendlyMatched]);

  // Gửi lời mời tới User ID hoặc Username
  const handleSendInvite = (targetIdOrName?: string) => {
    const val = (targetIdOrName || targetInput).trim();
    if (!val) {
      setErrorMessage('Vui lòng nhập ID hoặc Tên tài khoản người chơi.');
      return;
    }
    setErrorMessage(null);
    setIsSending(true);

    // Kiểm tra sơ bộ xem có phải dạng UUID/ID không
    const isLikelyId = /^[0-9a-fA-F-]+$/.test(val);
    if (isLikelyId) {
      arenaSocketService.friendlyInvite({ targetUserId: val });
    } else {
      arenaSocketService.friendlyInvite({ targetUsername: val });
    }
  };

  // Người mời tự bấm hủy
  const handleCancelInvite = () => {
    if (activeInvite) {
      arenaSocketService.friendlyCancel(activeInvite.inviteId);
    }
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setActiveInvite(null);
    setErrorMessage(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && (activeInvite ? handleCancelInvite() : onClose())}>
      <DialogContent className="sm:max-w-md p-6 overflow-hidden">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Swords className="h-5 w-5" />
            </div>
            Đấu Giao Hữu 1v1
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Thi đấu từ vựng vui vẻ cùng bạn bè: không tính điểm xếp hạng (RP) và không đổi thưởng.
          </DialogDescription>
        </DialogHeader>

        {/* ── TRƯỜNG HỢP 1: ĐANG CHỜ ĐỐI THỦ PHẢN HỒI (WAITING STATE) ── */}
        {activeInvite ? (
          <div className="py-6 space-y-6 text-center">
            {/* Avatar đối thủ đang chờ */}
            <div className="relative inline-block">
              <Avatar className="h-20 w-20 border-4 border-purple-400 shadow-md mx-auto">
                <AvatarImage
                  src={activeInvite.targetUser.avatarUrl || ''}
                  alt={activeInvite.targetUser.fullName}
                />
                <AvatarFallback className="font-bold text-lg bg-purple-100 text-purple-700">
                  {activeInvite.targetUser.fullName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 p-1.5 bg-background rounded-full shadow-xs">
                <Hourglass className="h-4 w-4 animate-spin text-purple-500" />
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold">
                {activeInvite.targetUser.fullName}
              </h4>
              <p className="text-xs text-muted-foreground">
                Đang chờ đối thủ đồng ý lời mời thách đấu...
              </p>
            </div>

            {/* Thanh tiến trình đếm ngược 60s */}
            <div className="space-y-2 max-w-xs mx-auto">
              <div className="flex items-center justify-between text-xs font-semibold tabular-nums text-muted-foreground">
                <span>Thời gian chờ</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">{waitingCountdown}s</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all ease-linear"
                  style={{
                    width: `${Math.max(0, Math.min(100, (waitingCountdown / 60) * 100))}%`,
                    transitionDuration: '1000ms',
                  }}
                />
              </div>
            </div>

            {/* Nút Hủy lời mời */}
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/30"
                onClick={handleCancelInvite}
              >
                <X className="h-4 w-4 mr-2" />
                Hủy lời mời
              </Button>
            </div>
          </div>
        ) : (
          /* ── TRƯỜNG HỢP 2: FORM NHẬP ID / CHỌN BẠN BÈ ĐỂ MỜI ── */
          <div className="space-y-5 pt-3">
            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Ô nhập ID hoặc Tên tài khoản */}
            <div className="space-y-2">
              <label htmlFor="friendly-target-input" className="text-xs font-semibold text-foreground">
                Nhập User ID hoặc Tên người chơi
              </label>
              <div className="flex gap-2">
                <Input
                  id="friendly-target-input"
                  placeholder="Ví dụ: John Doe hoặc ID tài khoản..."
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                  className="text-sm"
                  disabled={isSending}
                />
                <Button
                  onClick={() => handleSendInvite()}
                  disabled={isSending || !targetInput.trim()}
                  className="font-semibold bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1.5" />
                      Mời
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Danh sách bạn bè trực tuyến & ngoại tuyến */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Danh sách bạn bè ({friends.length})</span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                  <CircleDot className="h-3 w-3 fill-emerald-500" />
                  {onlineUserIds.size} online
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-muted/20">
                {friends.length === 0 ? (
                  <p className="text-xs text-center py-6 text-muted-foreground">
                    Bạn chưa có người bạn nào. Hãy nhập User ID ở trên để thách đấu!
                  </p>
                ) : (
                  friends.map((friend) => {
                    const isOnline = onlineUserIds.has(friend.id);
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={friend.avatar_url || ''} alt={friend.full_name} />
                              <AvatarFallback className="text-xs font-bold">
                                {friend.full_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${
                                isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{friend.full_name}</p>
                            <span className="text-[10px] text-muted-foreground">
                              Lv {friend.level} · {isOnline ? 'Đang online' : 'Ngoại tuyến'}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant={isOnline ? 'default' : 'outline'}
                          className={`h-7 px-2.5 text-xs font-semibold ${
                            isOnline
                              ? 'bg-purple-600 hover:bg-purple-700 text-white'
                              : 'text-muted-foreground'
                          }`}
                          onClick={() => handleSendInvite(friend.id)}
                          disabled={isSending}
                        >
                          <Swords className="h-3.5 w-3.5 mr-1" />
                          Thách đấu
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
