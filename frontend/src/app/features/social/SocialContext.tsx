import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { toast } from "sonner";
import {
  socialService,
  getSocialErrorMessage,
  FriendItem,
  FriendRequestItem,
  SocialSummary,
  ConversationItem,
  MessageItem,
  SocialUserBrief,
} from "../../services/social-service";
import { getChatSocket } from "./chat-socket";

const SUMMARY_POLL_MS = 30_000;

interface SocialContextValue {
  currentUserId: string | null;
  friends: FriendItem[];
  receivedRequests: FriendRequestItem[];
  sentRequests: FriendRequestItem[];
  summary: SocialSummary;
  loading: boolean;
  onlineUserIds: Set<string>;

  // Chat state
  conversations: ConversationItem[];
  activeConversationId: string | null;
  activeFriend: SocialUserBrief | null;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  openChatWithFriend: (friend: SocialUserBrief) => Promise<string | null>;
  selectConversation: (conv: ConversationItem) => void;
  refreshConversations: () => Promise<void>;

  refreshAll: () => Promise<void>;
  refreshFriends: () => Promise<void>;
  refreshRequests: () => Promise<void>;
  refreshSummary: () => Promise<void>;

  // Các action tự hiển thị toast; trả về true nếu thành công
  sendFriendRequest: (userId: string) => Promise<boolean>;
  acceptRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string) => Promise<boolean>;
  cancelRequest: (requestId: string) => Promise<boolean>;
  removeFriend: (userId: string) => Promise<boolean>;
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
}

const SocialContext = createContext<SocialContextValue | null>(null);

export function SocialProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequestItem[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequestItem[]>([]);
  const [summary, setSummary] = useState<SocialSummary>({ pending_requests: 0, unread_messages: 0 });
  const [loading, setLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());

  // Chat states
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeFriend, setActiveFriend] = useState<SocialUserBrief | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const mountedRef = useRef(true);
  const activeConversationIdRef = useRef<string | null>(null);
  const isChatOpenRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Lấy thông tin người dùng hiện tại (id)
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.id && mountedRef.current) {
          setCurrentUserId(data.id);
        }
      })
      .catch(() => {});
  }, []);

  const refreshSummary = useCallback(async () => {
    try {
      const data = await socialService.getSummary();
      if (mountedRef.current) setSummary(data);
    } catch {
      // Bỏ qua: chưa đăng nhập hoặc mạng chập chờn
    }
  }, []);

  const refreshFriends = useCallback(async () => {
    try {
      const data = await socialService.getFriends();
      if (mountedRef.current) setFriends(data);
    } catch {
      // giữ nguyên danh sách hiện tại
    }
  }, []);

  const refreshRequests = useCallback(async () => {
    try {
      const [received, sent] = await Promise.all([
        socialService.getRequests("received"),
        socialService.getRequests("sent"),
      ]);
      if (mountedRef.current) {
        setReceivedRequests(received);
        setSentRequests(sent);
      }
    } catch {
      // giữ nguyên danh sách hiện tại
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const data = await socialService.getConversations();
      if (mountedRef.current) setConversations(data);
    } catch {
      // giữ nguyên
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshFriends(), refreshRequests(), refreshSummary(), refreshConversations()]);
    if (mountedRef.current) setLoading(false);
  }, [refreshFriends, refreshRequests, refreshSummary, refreshConversations]);

  // Tải lần đầu + cập nhật badge định kỳ / khi quay lại tab
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshSummary, SUMMARY_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshSummary();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshAll, refreshSummary]);

  // WebSocket /chat integration
  useEffect(() => {
    const socket = getChatSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const handlePresenceSnapshot = (data: { online_user_ids: string[] }) => {
      if (mountedRef.current && Array.isArray(data?.online_user_ids)) {
        setOnlineUserIds(new Set(data.online_user_ids));
      }
    };

    const handlePresence = (data: { user_id: string; online: boolean }) => {
      if (!mountedRef.current || !data?.user_id) return;
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (data.online) next.add(data.user_id);
        else next.delete(data.user_id);
        return next;
      });
    };

    const handleFriendRequestReceived = (data: {
      request_id: string;
      from: { id: string; full_name: string; avatar_url: string | null };
    }) => {
      toast.info(`${data?.from?.full_name || "Một người dùng"} đã gửi lời mời kết bạn!`);
      refreshRequests();
      refreshSummary();
    };

    const handleFriendRequestAccepted = (data: {
      request_id: string;
      user: { id: string; full_name: string; avatar_url: string | null };
    }) => {
      toast.success(`${data?.user?.full_name || "Người dùng"} đã chấp nhận lời mời kết bạn!`);
      refreshFriends();
      refreshSummary();
    };

    const handleFriendsChanged = () => {
      refreshFriends();
      refreshRequests();
      refreshSummary();
    };

    const handleReceiveMessage = (data: { message: MessageItem }) => {
      const msg = data?.message;
      if (!msg) return;

      const isCurrentActive =
        activeConversationIdRef.current === msg.conversation_id && isChatOpenRef.current;

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversation_id);
        if (idx === -1) {
          refreshConversations();
          return prev;
        }
        const conv = prev[idx];
        const updated: ConversationItem = {
          ...conv,
          last_message_at: msg.created_at,
          last_message: {
            id: msg.id,
            sender_id: msg.sender_id,
            content: msg.content,
            created_at: msg.created_at,
            is_read: msg.is_read,
          },
          unread_count: isCurrentActive
            ? 0
            : msg.sender_id !== currentUserIdRef.current
            ? conv.unread_count + 1
            : conv.unread_count,
        };
        const nextList = [...prev];
        nextList.splice(idx, 1);
        return [updated, ...nextList];
      });

      // Nếu tin nhắn gửi từ người khác và không đang mở xem cuộc trò chuyện đó
      if (msg.sender_id !== currentUserIdRef.current && !isCurrentActive) {
        setSummary((prev) => ({
          ...prev,
          unread_messages: (prev.unread_messages || 0) + 1,
        }));
      }
    };

    const handleMessagesRead = (data: {
      conversation_id: string;
      reader_id: string;
      count: number;
    }) => {
      if (data.reader_id === currentUserIdRef.current) {
        setConversations((prev) =>
          prev.map((c) => (c.id === data.conversation_id ? { ...c, unread_count: 0 } : c))
        );
        refreshSummary();
      }
    };

    socket.on("presence_snapshot", handlePresenceSnapshot);
    socket.on("presence", handlePresence);
    socket.on("friend_request_received", handleFriendRequestReceived);
    socket.on("friend_request_accepted", handleFriendRequestAccepted);
    socket.on("friend_request_rejected", handleFriendsChanged);
    socket.on("friend_request_canceled", handleFriendsChanged);
    socket.on("friend_removed", handleFriendsChanged);
    socket.on("friends_changed", handleFriendsChanged);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("presence_snapshot", handlePresenceSnapshot);
      socket.off("presence", handlePresence);
      socket.off("friend_request_received", handleFriendRequestReceived);
      socket.off("friend_request_accepted", handleFriendRequestAccepted);
      socket.off("friend_request_rejected", handleFriendsChanged);
      socket.off("friend_request_canceled", handleFriendsChanged);
      socket.off("friend_removed", handleFriendsChanged);
      socket.off("friends_changed", handleFriendsChanged);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("messages_read", handleMessagesRead);
    };
  }, [refreshFriends, refreshRequests, refreshSummary, refreshConversations]);

  // Bọc action: gọi API -> toast -> refresh dữ liệu liên quan
  const perform = useCallback(
    async (
      call: () => Promise<unknown>,
      successMessage: string | ((result: any) => string),
      refresh: Array<() => Promise<void>>
    ): Promise<boolean> => {
      try {
        const result = await call();
        toast.success(typeof successMessage === "function" ? successMessage(result) : successMessage);
        await Promise.all(refresh.map((fn) => fn()));
        return true;
      } catch (error) {
        toast.error(getSocialErrorMessage(error));
        return false;
      }
    },
    []
  );

  const sendFriendRequest = useCallback(
    (userId: string) =>
      perform(
        () => socialService.sendFriendRequest(userId),
        (r) => (r?.status === "accepted" ? "Hai bạn đã trở thành bạn bè!" : "Đã gửi lời mời kết bạn."),
        [refreshRequests, refreshFriends, refreshSummary]
      ),
    [perform, refreshRequests, refreshFriends, refreshSummary]
  );

  const acceptRequest = useCallback(
    (requestId: string) =>
      perform(() => socialService.acceptRequest(requestId), "Đã chấp nhận lời mời kết bạn.", [
        refreshRequests,
        refreshFriends,
        refreshSummary,
      ]),
    [perform, refreshRequests, refreshFriends, refreshSummary]
  );

  const rejectRequest = useCallback(
    (requestId: string) =>
      perform(() => socialService.rejectRequest(requestId), "Đã từ chối lời mời kết bạn.", [
        refreshRequests,
        refreshSummary,
      ]),
    [perform, refreshRequests, refreshSummary]
  );

  const cancelRequest = useCallback(
    (requestId: string) =>
      perform(() => socialService.cancelRequest(requestId), "Đã hủy lời mời kết bạn.", [refreshRequests]),
    [perform, refreshRequests]
  );

  const removeFriend = useCallback(
    (userId: string) =>
      perform(() => socialService.removeFriend(userId), "Đã hủy kết bạn.", [refreshFriends, refreshSummary]),
    [perform, refreshFriends, refreshSummary]
  );

  const blockUser = useCallback(
    (userId: string) =>
      perform(() => socialService.blockUser(userId), "Đã chặn người dùng.", [
        refreshFriends,
        refreshRequests,
        refreshSummary,
      ]),
    [perform, refreshFriends, refreshRequests, refreshSummary]
  );

  const unblockUser = useCallback(
    (userId: string) => perform(() => socialService.unblockUser(userId), "Đã bỏ chặn người dùng.", []),
    [perform]
  );

  // Mở chat với 1 bạn bè (tạo hoặc lấy cuộc trò chuyện có sẵn)
  const openChatWithFriend = useCallback(
    async (friend: SocialUserBrief): Promise<string | null> => {
      try {
        const conv = await socialService.getOrCreateConversation(friend.id);
        setActiveConversationId(conv.id);
        setActiveFriend(conv.friend || friend);
        setIsChatOpen(true);

        // Đánh dấu đã đọc
        socialService.markConversationRead(conv.id).catch(() => {});
        const socket = getChatSocket();
        if (socket.connected) {
          socket.emit("mark_read", { conversationId: conv.id });
        }

        await refreshConversations();
        refreshSummary();
        return conv.id;
      } catch (err) {
        toast.error(getSocialErrorMessage(err, "Không thể mở cuộc trò chuyện với người này."));
        return null;
      }
    },
    [refreshConversations, refreshSummary]
  );

  // Chọn 1 cuộc trò chuyện từ danh sách
  const selectConversation = useCallback(
    (conv: ConversationItem) => {
      setActiveConversationId(conv.id);
      setActiveFriend(conv.friend);
      setIsChatOpen(true);

      if (conv.unread_count > 0) {
        socialService.markConversationRead(conv.id).catch(() => {});
        const socket = getChatSocket();
        if (socket.connected) {
          socket.emit("mark_read", { conversationId: conv.id });
        }
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
        );
        refreshSummary();
      }
    },
    [refreshSummary]
  );

  const value = useMemo<SocialContextValue>(
    () => ({
      currentUserId,
      friends,
      receivedRequests,
      sentRequests,
      summary,
      loading,
      onlineUserIds,
      conversations,
      activeConversationId,
      activeFriend,
      isChatOpen,
      setIsChatOpen,
      openChatWithFriend,
      selectConversation,
      refreshConversations,
      refreshAll,
      refreshFriends,
      refreshRequests,
      refreshSummary,
      sendFriendRequest,
      acceptRequest,
      rejectRequest,
      cancelRequest,
      removeFriend,
      blockUser,
      unblockUser,
    }),
    [
      currentUserId,
      friends,
      receivedRequests,
      sentRequests,
      summary,
      loading,
      onlineUserIds,
      conversations,
      activeConversationId,
      activeFriend,
      isChatOpen,
      setIsChatOpen,
      openChatWithFriend,
      selectConversation,
      refreshConversations,
      refreshAll,
      refreshFriends,
      refreshRequests,
      refreshSummary,
      sendFriendRequest,
      acceptRequest,
      rejectRequest,
      cancelRequest,
      removeFriend,
      blockUser,
      unblockUser,
    ]
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial(): SocialContextValue {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial phải được dùng bên trong <SocialProvider>");
  return ctx;
}
