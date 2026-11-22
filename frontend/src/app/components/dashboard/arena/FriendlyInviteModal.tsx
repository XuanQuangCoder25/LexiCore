import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import {
  Swords,
  Hourglass,
  X,
  AlertCircle,
  Loader2,
  Send,
  CircleDot,
  Copy,
  Check,
  Minimize2,
  Maximize2,
  Info,
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
  currentUserId?: string;
  initialTargetFriend?: { id: string; fullName: string; avatarUrl?: string | null } | null;
  onFriendlyMatched?: (matchedData: MatchedPayload) => void;
}

export const FriendlyInviteModal: React.FC<FriendlyInviteModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  initialTargetFriend,
  onFriendlyMatched,
}) => {
  const { friends, onlineUserIds } = useSocial();
  const [targetInput, setTargetInput] = useState<string>('');
  const [activeInvite, setActiveInvite] = useState<FriendlyInviteSentPayload | null>(null);
  const [waitingCountdown, setWaitingCountdown] = useState<number>(60);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onFriendlyMatchedRef = useRef(onFriendlyMatched);
  onFriendlyMatchedRef.current = onFriendlyMatched;

  // Reset state khi mở/đóng modal
  useEffect(() => {
    if (!isOpen) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setActiveInvite(null);
      setErrorMessage(null);
      setIsSending(false);
      setWaitingCountdown(60);
      setTargetInput('');
      setCopied(false);
      setIsMinimized(false);
    } else {
      if (!activeInvite) {
        setIsMinimized(false);
      }
      if (initialTargetFriend) {
        // Nếu có sẵn thông tin friend được truyền vào từ FriendsPanel
        setTargetInput(initialTargetFriend.id);
      }
    }
  }, [isOpen, initialTargetFriend]);

  // ─── 1. EFFECT SOCKET: Lắng nghe trạng thái lời mời ───
  useEffect(() => {
    if (!isOpen) return;

    // Lời mời đã được gửi đi thành công -> Chuyển sang màn hình chờ
    const handleSent = (payload: FriendlyInviteSentPayload) => {
      console.log('[FriendlyInviteModal] Đã gửi lời mời:', payload);
      setActiveInvite(payload);
      setIsSending(false);
      setErrorMessage(null);
      setWaitingCountdown(payload.expireInSec || 60);
    };

    // Đối thủ từ chối lời mời
    const handleDeclined = (payload: FriendlyInviteDeclinedPayload) => {
      setActiveInvite(null);
      setIsMinimized(false);
      setErrorMessage(payload.message || 'Đối thủ đã từ chối lời mời thách đấu.');
    };

    // Người gửi hoặc server hủy lời mời
    const handleCancelled = () => {
      setActiveInvite(null);
      setIsMinimized(false);
    };

    // Lỗi gửi lời mời (vd: đối thủ offline, không tồn tại...)
    const handleError = (payload: { message: string }) => {
      setIsSending(false);
      setErrorMessage(payload.message || 'Không thể gửi lời mời.');
    };

    // Cả 2 đã khớp trận (Đối thủ chấp nhận lời mời)
    const handleMatched = (matchedData: MatchedPayload) => {
      if (matchedData.matchType === 'FRIENDLY') {
        setActiveInvite(null);
        setIsMinimized(false);
        onCloseRef.current();
        onFriendlyMatchedRef.current?.(matchedData);
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
    };
  }, [isOpen]);

  // ─── 2. EFFECT TIMER: Đếm ngược thời gian chờ đối thủ chấp nhận ───
  useEffect(() => {
    if (!activeInvite) return;

    const interval = setInterval(() => {
      setWaitingCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setActiveInvite(null);
          setIsMinimized(false);
          setErrorMessage('Lời mời đã hết thời gian chờ (60s).');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeInvite]);

  // Gửi lời mời tới User ID
  const handleSendInvite = (targetId?: string) => {
    const val = (targetId || targetInput).trim();
    if (!val) {
      setErrorMessage('Vui lòng nhập mã User ID của người chơi.');
      return;
    }
    setErrorMessage(null);
    setIsSending(true);
    arenaSocketService.friendlyInvite({ targetUserId: val });
  };

  // Người mời tự bấm hủy
  const handleCancelInvite = () => {
    if (activeInvite) {
      arenaSocketService.friendlyCancel(activeInvite.inviteId);
    }
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    const wasMinimized = isMinimized;
    setActiveInvite(null);
    setIsMinimized(false);
    setErrorMessage(null);
    if (wasMinimized) {
      onCloseRef.current();
    }
  };

  // Sao chép User ID của bản thân
  const handleCopyMyId = () => {
    if (!currentUserId) return;
    navigator.clipboard.writeText(currentUserId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const opponentInfo = activeInvite
    ? activeInvite.targetUser || (activeInvite as any).toUser
    : null;

  const isActuallyMinimized = isMinimized && Boolean(activeInvite);

  return (
    <>
      <Dialog
        open={isOpen && !isActuallyMinimized}
        onOpenChange={(open) => {
          if (!open) {
            if (activeInvite) {
              // Click ra ngoài hoặc bấm ESC khi đang chờ -> Thu nhỏ lên góc trên bên phải
              setIsMinimized(true);
            } else {
              setIsMinimized(false);
              onClose();
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-6 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="space-y-1 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Swords className="h-5 w-5" />
              </div>
              Đấu Giao Hữu 1v1
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thi đấu từ vựng vui vẻ cùng bạn bè: không tính điểm xếp hạng (RP) và không đổi thưởng.
            </DialogDescription>
          </DialogHeader>

          {/* ── TRƯỜNG HỢP 1: ĐANG CHỜ ĐỐI THỦ PHẢN HỒI (WAITING STATE) ── */}
          {activeInvite && opponentInfo ? (
            <div className="py-6 space-y-5 text-center">
              {/* Avatar đối thủ đang chờ */}
              <div className="relative inline-block">
                <Avatar className="h-20 w-20 border-4 border-emerald-400 shadow-md mx-auto">
                  <AvatarImage
                    src={opponentInfo.avatarUrl || ''}
                    alt={opponentInfo.fullName}
                  />
                  <AvatarFallback className="font-bold text-lg bg-emerald-100 text-emerald-700">
                    {opponentInfo.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 p-1.5 bg-background rounded-full shadow-xs">
                  <Hourglass className="h-4 w-4 animate-spin text-emerald-500" />
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold">
                  {opponentInfo.fullName}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Đang chờ đối thủ đồng ý lời mời thách đấu...
                </p>
              </div>

              {/* Thanh tiến trình đếm ngược 60s */}
              <div className="space-y-2 max-w-xs mx-auto">
                <div className="flex items-center justify-between text-xs font-semibold tabular-nums text-muted-foreground">
                  <span>Thời gian chờ</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{waitingCountdown}s</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all ease-linear"
                    style={{
                      width: `${Math.max(0, Math.min(100, (waitingCountdown / 60) * 100))}%`,
                      transitionDuration: '1000ms',
                    }}
                  />
                </div>
              </div>

              {/* Hai nút hành động: Thu nhỏ & Hủy lời mời */}
              <div className="pt-2 flex items-center gap-2.5">
                <Button
                  variant="outline"
                  className="flex-1 text-xs h-9 font-semibold text-muted-foreground hover:text-foreground border-border hover:bg-muted"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="h-4 w-4 mr-1.5" />
                  Thu nhỏ
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-xs h-9 font-semibold border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/30"
                  onClick={handleCancelInvite}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Hủy lời mời
                </Button>
              </div>

              {/* Dòng ghi chú thân thiện có icon inline trước chữ Mẹo */}
              <p className="text-[11px] text-muted-foreground text-center pt-1 leading-relaxed">
                <Info className="inline h-3.5 w-3.5 mr-1 text-emerald-600 dark:text-emerald-400 align-[-2px]" />
                Mẹo: Bạn có thể thu nhỏ hoặc click ra ngoài để xem Lịch sử đấu/BXH trong lúc chờ.
              </p>
            </div>
          ) : (
          /* ── TRƯỜNG HỢP 2: FORM NHẬP ID / CHỌN BẠN BÈ ĐỂ MỜI ── */
          <div className="space-y-4 pt-3 overflow-y-auto pr-0.5">
            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Hộp hiển thị User ID của bạn để sao chép đưa bạn bè */}
            {currentUserId && (
              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border bg-muted/40">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground leading-tight">
                    Mã User ID của bạn (gửi cho đối thủ để mời)
                  </p>
                  <p className="text-sm font-mono font-bold truncate text-foreground select-all tracking-tight leading-tight" title={currentUserId}>
                    {currentUserId}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs font-semibold shrink-0 gap-1.5 hover:bg-muted"
                  onClick={handleCopyMyId}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Ô nhập User ID đối thủ */}
            <div className="space-y-1.5">
              <label htmlFor="friendly-target-input" className="text-xs font-semibold text-foreground">
                Nhập mã User ID đối thủ
              </label>
              <div className="flex gap-2">
                <Input
                  id="friendly-target-input"
                  placeholder="Dán mã User ID của đối thủ vào đây..."
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                  className="text-xs sm:text-sm font-mono"
                  disabled={isSending}
                />
                <Button
                  onClick={() => handleSendInvite()}
                  disabled={isSending || !targetInput.trim()}
                  className="font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
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
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Danh sách bạn bè ({friends.length})</span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                  <CircleDot className="h-3 w-3 fill-emerald-500" />
                  {onlineUserIds.size} online
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-lg p-2 pr-1.5 bg-muted/20">
                {friends.length === 0 ? (
                  <p className="text-xs text-center py-6 text-muted-foreground">
                    Bạn chưa có người bạn nào. Hãy dán mã User ID ở trên để thách đấu!
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
                              Lv {friend.level} - {isOnline ? 'Đang online' : 'Ngoại tuyến'}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant={isOnline ? 'default' : 'outline'}
                          className={`h-7 px-2.5 text-xs font-semibold ${
                            isOnline
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
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

    {/* ── CARD THU NHỎ Ở GÓC TRÊN BÊN PHẢI (KHI MINIMIZED) ── */}
    {isActuallyMinimized && opponentInfo && typeof document !== 'undefined' &&
      createPortal(
        <aside
          onClick={() => setIsMinimized(false)}
          className="fixed top-20 right-6 z-[70] w-80 sm:w-88 rounded-2xl border-2 border-emerald-500/40 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden cursor-pointer animate-in slide-in-from-right-8 fade-in duration-300 hover:border-emerald-500 transition-all group select-none"
          role="button"
          tabIndex={0}
          title="Click để phóng to lại cửa sổ chờ"
        >
          <div className="p-3.5 space-y-2.5">
            {/* Header nhỏ: Trạng thái & nút điều khiển */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Swords className="h-4 w-4" />
                <span>Đang chờ thách đấu</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {waitingCountdown}s
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(false);
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Phóng to cửa sổ"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelInvite();
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Hủy lời mời"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Thông tin đối thủ */}
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <Avatar className="h-10 w-10 border-2 border-emerald-400 shadow-xs">
                  <AvatarImage src={opponentInfo.avatarUrl || ''} alt={opponentInfo.fullName} />
                  <AvatarFallback className="font-bold text-xs bg-emerald-100 text-emerald-700">
                    {opponentInfo.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 p-0.5 bg-background rounded-full shadow-xs">
                  <Hourglass className="h-3 w-3 animate-spin text-emerald-500" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {opponentInfo.fullName}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Đang chờ chấp nhận... (Bấm để phóng to)
                </p>
              </div>
            </div>
          </div>

          {/* Thanh tiến trình thời gian co dần ở đáy card */}
          <div className="w-full h-1 bg-muted/60 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all ease-linear"
              style={{
                width: `${Math.max(0, Math.min(100, (waitingCountdown / 60) * 100))}%`,
                transitionDuration: '1000ms',
              }}
            />
          </div>
        </aside>,
        document.body
      )}
  </>
);
};
