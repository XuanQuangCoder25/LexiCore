import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Loader2,
  MessageCircle,
  MessageSquareDashed,
  Search,
  Send,
  Sparkles,
  Swords,
  Users,
  X,
  Eye,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useSocial } from "../../features/social/SocialContext";
import { getChatSocket } from "../../features/social/chat-socket";
import { getInitials, formatRelativeTime } from "../../features/social/utils";
import { PostDetailDialog } from "../../features/community/PostDetailDialog";
import {
  socialService,
  getSocialErrorMessage,
  MessageItem,
  ConversationItem,
  SocialUserBrief,
} from "../../services/social-service";

interface ChatDialogProps {
  open: boolean;
  onClose: () => void;
  onChallenge: () => void;
}

// Định dạng giờ hiển thị cho bong bóng tin nhắn (HH:mm)
function formatMessageTime(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

// Định dạng ngày nhóm tin nhắn
function formatMessageDateLabel(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Hôm nay";

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Hôm qua";

  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export function ChatDialog({ open, onClose, onChallenge }: ChatDialogProps) {
  const {
    currentUserId,
    conversations,
    activeConversationId,
    activeFriend,
    onlineUserIds,
    friends,
    selectConversation,
    openChatWithFriend,
    refreshConversations,
    refreshSummary,
  } = useSocial();

  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const isNearBottomRef = useRef(true);

  // Xem chi tiết bài viết cộng đồng khi bấm từ tin nhắn
  const [viewingPostId, setViewingPostId] = useState<string | null>(null);

  const handleNavigateToCommunity = (targetPostId?: string) => {
    setViewingPostId(null);
    onClose();
    window.dispatchEvent(
      new CustomEvent("navigate-tab", { detail: { tab: "community", postId: targetPostId } })
    );
  };

  // Khi có active conversation -> ẩn mobile list
  useEffect(() => {
    if (activeConversationId) {
      setShowMobileList(false);
    }
  }, [activeConversationId]);

  // Tải tin nhắn khi mở cuộc trò chuyện
  useEffect(() => {
    if (!open || !activeConversationId) {
      setMessages([]);
      setNextCursor(null);
      setHasMore(false);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    socialService
      .getMessages(activeConversationId, null, 30)
      .then((data) => {
        if (!isMounted) return;
        setMessages(data.messages || []);
        setNextCursor(data.next_cursor);
        setHasMore(data.has_more);
        // Cuộn xuống đáy sau khi render
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
        }, 50);
      })
      .catch((err) => {
        if (isMounted) toast.error(getSocialErrorMessage(err, "Không thể tải tin nhắn."));
      })
      .finally(() => {
        if (isMounted) setLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, activeConversationId]);

  // Lắng nghe realtime sự kiện cho cuộc trò chuyện hiện tại
  useEffect(() => {
    if (!open || !activeConversationId) return;
    const socket = getChatSocket(currentUserId || undefined);

    const handleReceiveMessage = (payload: { message: MessageItem }) => {
      const msg = payload?.message;
      if (!msg || msg.conversation_id !== activeConversationId) return;

      setMessages((prev) => {
        // 1. Tránh trùng nếu đã có tin nhắn với ID thật này
        if (prev.some((m) => m.id === msg.id)) {
          return prev;
        }

        // 2. Thay thế tin nhắn lạc quan (optimistic) của chính mình
        const optIndex = prev.findIndex(
          (m) =>
            (msg.clientId && (m.clientId === msg.clientId || m.id === msg.clientId)) ||
            (m.sender_id === msg.sender_id &&
              typeof m.id === "string" &&
              m.id.startsWith("client-") &&
              m.content === msg.content)
        );

        if (optIndex !== -1) {
          const next = [...prev];
          next[optIndex] = msg;
          return next;
        }

        return [...prev, msg];
      });

      // Nếu tin từ đối phương và đang mở chat: đánh dấu đã đọc
      if (msg.sender_id !== currentUserId) {
        socket.emit("mark_read", { conversationId: activeConversationId });
        socialService.markConversationRead(activeConversationId).catch(() => {});
        refreshSummary();
      }

      // Cuộn xuống nếu người dùng đang ở đáy
      if (isNearBottomRef.current || msg.sender_id === currentUserId) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 60);
      }
    };

    const handleTyping = (payload: {
      conversation_id: string;
      user_id: string;
      is_typing: boolean;
    }) => {
      if (payload.conversation_id !== activeConversationId || payload.user_id === currentUserId) return;

      if (payload.is_typing) {
        setPeerIsTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          setPeerIsTyping(false);
        }, 3000);
      } else {
        setPeerIsTyping(false);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      }
    };

    const handleMessagesRead = (payload: {
      conversation_id: string;
      reader_id: string;
      read_at: string;
    }) => {
      if (payload.conversation_id !== activeConversationId) return;
      if (payload.reader_id !== currentUserId) {
        // Đối phương đã đọc các tin nhắn của mình
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === currentUserId && !m.is_read
              ? { ...m, is_read: true, read_at: payload.read_at }
              : m
          )
        );
      }
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("typing", handleTyping);
      socket.off("messages_read", handleMessagesRead);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [open, activeConversationId, currentUserId, refreshSummary]);

  // Tải tin nhắn cũ hơn (cursor pagination)
  const handleLoadOlder = async () => {
    if (!activeConversationId || !nextCursor || loadingOlder) return;
    setLoadingOlder(true);

    try {
      const scrollEl = scrollContainerRef.current;
      const prevScrollHeight = scrollEl?.scrollHeight || 0;

      const data = await socialService.getMessages(activeConversationId, nextCursor, 30);
      setMessages((prev) => [...data.messages, ...prev]);
      setNextCursor(data.next_cursor);
      setHasMore(data.has_more);

      // Giữ vị trí cuộn không bị nhảy
      requestAnimationFrame(() => {
        if (scrollEl) {
          const newScrollHeight = scrollEl.scrollHeight;
          scrollEl.scrollTop = newScrollHeight - prevScrollHeight;
        }
      });
    } catch (err) {
      toast.error(getSocialErrorMessage(err, "Không thể tải tin nhắn cũ."));
    } finally {
      setLoadingOlder(false);
    }
  };

  // Phát tín hiệu typing khi người dùng gõ
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (!activeConversationId) return;
    const socket = getChatSocket(currentUserId || undefined);
    const now = Date.now();

    if (now - lastTypingEmitRef.current > 500) {
      lastTypingEmitRef.current = now;
      socket.emit("typing", { conversationId: activeConversationId, isTyping: true });
    }
  };

  // Gửi tin nhắn
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = inputValue.trim();
    if (!content || !activeConversationId || isSending) return;

    if (content.length > 2000) {
      toast.error("Tin nhắn vượt quá giới hạn 2000 ký tự.");
      return;
    }

    setIsSending(true);
    setInputValue("");

    // Dừng typing indicator
    const socket = getChatSocket(currentUserId || undefined);
    socket.emit("typing", { conversationId: activeConversationId, isTyping: false });

    const tempClientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const tempMessage: MessageItem = {
      id: tempClientId,
      conversation_id: activeConversationId,
      sender_id: currentUserId || "",
      content,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
      clientId: tempClientId,
    };

    // Optimistic UI: hiển thị ngay vào danh sách
    setMessages((prev) => [...prev, tempMessage]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 30);

    try {
      if (socket.connected) {
        socket.emit(
          "send_message",
          {
            conversationId: activeConversationId,
            content,
            clientId: tempClientId,
          },
          (ack: any) => {
            if (ack?.ok && ack.message) {
              setMessages((prev) => {
                const realId = ack.message.id;
                let foundTemp = false;
                const updated = prev.map((m) => {
                  if (m.clientId === tempClientId || m.id === tempClientId) {
                    foundTemp = true;
                    return ack.message;
                  }
                  return m;
                });

                if (!foundTemp && !updated.some((m) => m.id === realId)) {
                  updated.push(ack.message);
                }

                return updated.filter(
                  (m) =>
                    !(typeof m.id === "string" && m.id === tempClientId && updated.some((x) => x.id === realId))
                );
              });
              refreshConversations();
            } else {
              toast.error(ack?.error || "Không thể gửi tin nhắn.");
              setMessages((prev) => prev.filter((m) => m.clientId !== tempClientId && m.id !== tempClientId));
            }
            setIsSending(false);
          }
        );
      } else {
        // Fallback REST API nếu socket bị mất kết nối
        const realMsg = await socialService.sendMessage(activeConversationId, content);
        setMessages((prev) => {
          const realId = realMsg.id;
          let foundTemp = false;
          const updated = prev.map((m) => {
            if (m.clientId === tempClientId || m.id === tempClientId) {
              foundTemp = true;
              return realMsg;
            }
            return m;
          });

          if (!foundTemp && !updated.some((m) => m.id === realId)) {
            updated.push(realMsg);
          }

          return updated.filter(
            (m) =>
              !(typeof m.id === "string" && m.id === tempClientId && updated.some((x) => x.id === realId))
          );
        });
        refreshConversations();
        setIsSending(false);
      }
    } catch (err) {
      toast.error(getSocialErrorMessage(err, "Không thể gửi tin nhắn."));
      setMessages((prev) => prev.filter((m) => m.clientId !== tempClientId));
      setIsSending(false);
    }
  };

  // Kiểm tra xem người dùng có đang ở gần đáy không
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceToBottom < 80;
  };

  // Lọc danh sách cuộc trò chuyện theo ô tìm kiếm
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.friend.full_name.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  // Bạn bè đang online (dùng để hiển thị quick bar)
  const onlineFriends = useMemo(() => {
    return friends.filter((f) => onlineUserIds.has(f.id));
  }, [friends, onlineUserIds]);

  const isFriendOnline = activeFriend ? onlineUserIds.has(activeFriend.id) : false;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        hideClose
        className="w-[96vw] sm:w-[92vw] sm:max-w-4xl md:max-w-5xl h-[86vh] max-h-[740px] p-0 flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Tin nhắn trực tiếp</DialogTitle>
          <DialogDescription>Trò chuyện realtime và trao đổi học tập với bạn bè</DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 h-full min-h-0 overflow-hidden">
          {/* ======================= CỘT TRÁI: DANH SÁCH CUỘC TRÒ CHUYỆN ======================= */}
          <div
            className={`w-full sm:w-72 md:w-80 border-r border-border flex flex-col shrink-0 bg-background/50 ${
              !showMobileList ? "hidden sm:flex" : "flex"
            }`}
          >
            {/* Header danh sách */}
            <div className="p-4 border-b border-border/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base">Tin nhắn</h3>
              </div>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium">
                {conversations.length}
              </Badge>
            </div>

            {/* Ô tìm kiếm hội thoại */}
            <div className="p-3 border-b border-border/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bạn bè hoặc tin nhắn..."
                  className="pl-9 h-9 text-sm bg-muted/40 rounded-lg"
                />
              </div>
            </div>

            {/* Quick bar: Bạn bè đang Online */}
            {onlineFriends.length > 0 && (
              <div className="px-3 py-2 border-b border-border/50">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Đang hoạt động ({onlineFriends.length})
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {onlineFriends.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => openChatWithFriend(f)}
                      className="flex flex-col items-center shrink-0 group focus:outline-none"
                      title={f.full_name}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-emerald-500/80 transition-transform group-hover:scale-105">
                          <AvatarImage src={f.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {getInitials(f.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background shadow-xs" />
                      </div>
                      <span className="text-[11px] truncate max-w-[56px] text-muted-foreground mt-1 group-hover:text-foreground">
                        {f.full_name.split(" ").pop()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Danh sách cuộc trò chuyện */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                  <MessageSquareDashed className="h-10 w-10 stroke-1 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-medium">Chưa có cuộc trò chuyện nào</p>
                  <p className="text-xs text-muted-foreground/80 mt-1 max-w-[200px]">
                    Hãy bắt đầu nhắn tin với bạn bè từ danh sách bạn bè!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {filteredConversations.map((conv) => {
                    const isOnline = onlineUserIds.has(conv.friend.id);
                    const isSelected = activeConversationId === conv.id;
                    const hasUnread = conv.unread_count > 0;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => selectConversation(conv)}
                        className={`p-3 flex items-start gap-3 cursor-pointer transition-colors relative ${
                          isSelected
                            ? "bg-primary/10 hover:bg-primary/15"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <Avatar className="h-11 w-11">
                            <AvatarImage src={conv.friend.avatar_url || ""} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                              {getInitials(conv.friend.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background shadow-xs" />
                          )}
                        </div>

                        {/* Nội dung tóm tắt */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-sm truncate ${
                                hasUnread ? "font-bold text-foreground" : "font-medium"
                              }`}
                            >
                              {conv.friend.full_name}
                            </span>
                            {conv.last_message_at && (
                              <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                                {formatRelativeTime(conv.last_message_at)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <p
                              className={`text-xs truncate ${
                                hasUnread
                                  ? "font-semibold text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {conv.last_message ? (
                                <>
                                  {conv.last_message.sender_id === currentUserId && (
                                    <span className="text-muted-foreground font-normal">Bạn: </span>
                                  )}
                                  {conv.last_message.content}
                                </>
                              ) : (
                                <span className="italic">Chưa có tin nhắn</span>
                              )}
                            </p>

                            {hasUnread && (
                              <Badge
                                variant="default"
                                className="h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground ml-2 shrink-0 flex items-center justify-center animate-pulse"
                              >
                                {conv.unread_count > 99 ? "99+" : conv.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ======================= CỘT PHẢI: KHUNG TRÒ CHUYỆN CHI TIẾT ======================= */}
          <div
            className={`flex-1 flex flex-col min-w-0 bg-background ${
              showMobileList ? "hidden sm:flex" : "flex"
            }`}
          >
            {activeConversationId && activeFriend ? (
              <>
                {/* Header cuộc trò chuyện */}
                <div className="h-16 px-4 border-b border-border flex items-center justify-between gap-3 shrink-0 bg-card/80 backdrop-blur-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Nút quay lại danh sách trên mobile */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:hidden shrink-0 -ml-1 text-muted-foreground"
                      onClick={() => setShowMobileList(true)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10 border border-border/60">
                        <AvatarImage src={activeFriend.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                          {getInitials(activeFriend.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      {isFriendOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background shadow-xs" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm truncate text-foreground">
                          {activeFriend.full_name}
                        </h4>
                        {activeFriend.level && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
                            Lv.{activeFriend.level}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isFriendOnline ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Đang hoạt động</span>
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                            <span className="text-[11px] text-muted-foreground">Ngoại tuyến</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nút hành động nhanh: Thách đấu PvP Arena & Đóng */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onClose();
                        onChallenge();
                      }}
                      className="h-8.5 px-3 text-xs font-semibold border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-600 shadow-2xs whitespace-nowrap"
                    >
                      <Swords className="h-3.5 w-3.5 mr-1.5 text-rose-500" />
                      Thách đấu
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8.5 w-8.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={onClose}
                      title="Đóng hộp thoại"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Khu vực lịch sử tin nhắn */}
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {/* Nút tải thêm tin nhắn cũ */}
                  {hasMore && (
                    <div className="flex justify-center pt-1 pb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loadingOlder}
                        onClick={handleLoadOlder}
                        className="text-xs text-muted-foreground hover:text-foreground h-7"
                      >
                        {loadingOlder ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Đang tải tin cũ...
                          </>
                        ) : (
                          "Tải thêm tin nhắn cũ"
                        )}
                      </Button>
                    </div>
                  )}

                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center h-48 space-y-2">
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">Đang tải cuộc trò chuyện...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <Sparkles className="h-7 w-7 text-primary" />
                      </div>
                      <p className="font-semibold text-foreground text-sm">
                        Bắt đầu trò chuyện với {activeFriend.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        Gửi lời chào hoặc trao đổi về bài học để cùng nhau tiến bộ nhé!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.sender_id === currentUserId;
                      const prevMsg = messages[idx - 1];
                      const showDateHeader =
                        !prevMsg ||
                        new Date(msg.created_at).toDateString() !==
                          new Date(prevMsg.created_at).toDateString();

                      return (
                        <React.Fragment key={msg.id || msg.clientId || idx}>
                          {showDateHeader && (
                            <div className="flex justify-center my-3">
                              <span className="text-[11px] font-medium bg-muted/80 text-muted-foreground px-2.5 py-0.5 rounded-full shadow-2xs">
                                {formatMessageDateLabel(msg.created_at)}
                              </span>
                            </div>
                          )}

                          <div
                            className={`flex flex-col ${
                              isMe ? "items-end" : "items-start"
                            }`}
                          >
                            <div
                              className={`max-w-[78%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed shadow-xs break-words ${
                                isMe
                                  ? "bg-indigo-600 text-white rounded-br-xs font-normal"
                                  : "bg-muted/80 text-foreground border border-border/40 rounded-bl-xs"
                              }`}
                            >
                              {(() => {
                                const matchPost = msg.content.match(/\[COMMUNITY_POST:([a-zA-Z0-9_-]+)\]/);
                                if (!matchPost) {
                                  return msg.content;
                                }

                                const targetPostId = matchPost[1];
                                const textWithoutMarker = msg.content
                                  .replace(/\[COMMUNITY_POST:([a-zA-Z0-9_-]+)\]/g, "")
                                  .trim();

                                return (
                                  <div className="space-y-2">
                                    {textWithoutMarker && (
                                      <p className="whitespace-pre-wrap">{textWithoutMarker}</p>
                                    )}
                                    <div
                                      onClick={() => setViewingPostId(targetPostId)}
                                      className={`rounded-xl p-3 border transition-all cursor-pointer ${
                                        isMe
                                          ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                                          : "bg-card hover:bg-card/90 border-border text-foreground shadow-2xs"
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-1 opacity-90">
                                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                                        <span>Bài viết Cộng đồng LexiCore</span>
                                      </div>
                                      <p className="text-xs opacity-90">
                                        Bạn bè đã chia sẻ bài thảo luận này với bạn.
                                      </p>
                                      <Button
                                        size="sm"
                                        className={`w-full mt-2 h-7 text-xs font-semibold gap-1.5 shadow-xs ${
                                          isMe
                                            ? "bg-white text-indigo-700 hover:bg-white/90"
                                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewingPostId(targetPostId);
                                        }}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Xem bài viết ngay</span>
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Thời gian & Trạng thái đã xem */}
                            <div
                              className={`flex items-center gap-1 mt-1 text-[10px] text-muted-foreground px-1 ${
                                isMe ? "justify-end" : "justify-start"
                              }`}
                            >
                              <span>{formatMessageTime(msg.created_at)}</span>
                              {isMe && (
                                <>
                                  {typeof msg.id === "string" && msg.id.startsWith("client-") ? (
                                    <Clock className="h-2.5 w-2.5 text-muted-foreground/70" />
                                  ) : msg.is_read ? (
                                    <span className="flex items-center text-primary font-medium">
                                      <CheckCheck className="h-3 w-3 inline mr-0.5" />
                                      Đã xem
                                    </span>
                                  ) : (
                                    <Check className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}

                  {/* Typing Indicator */}
                  {peerIsTyping && (
                    <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-200">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={activeFriend.avatar_url || ""} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(activeFriend.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-2xl rounded-bl-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:0.4s]" />
                      </div>
                      <span className="text-[11px] text-muted-foreground italic">
                        {activeFriend.full_name.split(" ").pop()} đang soạn tin...
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Form nhập và gửi tin nhắn */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 sm:p-4 border-t border-border bg-card/80 backdrop-blur-sm flex items-center gap-2.5 shrink-0"
                >
                  <div className="relative flex-1">
                    <Input
                      value={inputValue}
                      onChange={handleInputChange}
                      placeholder="Nhập tin nhắn..."
                      maxLength={2000}
                      autoFocus
                      disabled={isSending}
                      className="pr-14 text-sm h-11 rounded-xl bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-2xs"
                    />
                    {inputValue.length > 1800 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                        {inputValue.length}/2000
                      </span>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="icon"
                    disabled={!inputValue.trim() || isSending}
                    className="h-11 w-11 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-transform shrink-0 shadow-xs"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </>
            ) : (
              /* Trạng thái chưa chọn cuộc trò chuyện nào */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-1">
                  Hộp thoại Nhắn tin Trực tiếp
                </h3>
                <p className="text-sm max-w-sm text-muted-foreground">
                  Chọn một cuộc trò chuyện từ danh sách bên trái hoặc nhắn tin cho bất kỳ bạn bè nào để bắt đầu trao đổi.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal xem chi tiết bài viết khi bấm từ tin nhắn */}
        <PostDetailDialog
          postId={viewingPostId}
          open={!!viewingPostId}
          onClose={() => setViewingPostId(null)}
          onNavigateToCommunity={handleNavigateToCommunity}
        />
      </DialogContent>
    </Dialog>
  );
}
