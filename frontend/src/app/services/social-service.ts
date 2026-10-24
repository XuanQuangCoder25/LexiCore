import axios from 'axios';

const api = axios.create({
  baseURL: '/api/social',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------- Types
export type Relationship = 'none' | 'friends' | 'request_sent' | 'request_received' | 'blocked';

export interface SocialUserBrief {
  id: string;
  full_name: string;
  avatar_url: string | null;
  level?: number;
}

export interface SearchResultUser extends SocialUserBrief {
  level: number;
  relationship: Relationship;
  request_id: string | null;
}

export interface FriendItem {
  id: string;
  full_name: string;
  avatar_url: string | null;
  level: number;
  current_streak: number;
  arena_rank: string;
  friendship_id: string;
  friends_since: string;
}

export interface FriendRequestItem {
  request_id: string;
  created_at: string;
  user: SocialUserBrief & { level: number };
}

export interface SocialSummary {
  pending_requests: number;
  unread_messages: number;
}

export interface ConversationItem {
  id: string;
  last_message_at: string | null;
  unread_count: number;
  friend: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  last_message: {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
  } | null;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  clientId?: string;
}

export interface MessagesPage {
  messages: MessageItem[];
  next_cursor: string | null;
  has_more: boolean;
}

// Lấy thông báo lỗi thân thiện từ response của backend
export const getSocialErrorMessage = (error: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại.'): string => {
  const message = (error as any)?.response?.data?.message;
  return typeof message === 'string' && message ? message : fallback;
};

// ---------------------------------------------------------------- Service
export const socialService = {
  getSummary: async (): Promise<SocialSummary> => {
    const res = await api.get('/summary');
    return res.data?.data ?? { pending_requests: 0, unread_messages: 0 };
  },

  searchUsers: async (q: string): Promise<SearchResultUser[]> => {
    const res = await api.get('/users/search', { params: { q } });
    return res.data?.data ?? [];
  },

  getFriends: async (): Promise<FriendItem[]> => {
    const res = await api.get('/friends');
    return res.data?.data ?? [];
  },

  getRequests: async (direction: 'received' | 'sent'): Promise<FriendRequestItem[]> => {
    const res = await api.get('/friends/requests', { params: { direction } });
    return res.data?.data ?? [];
  },

  sendFriendRequest: async (receiverId: string): Promise<{ request_id: string; status: 'pending' | 'accepted' }> => {
    const res = await api.post('/friends/requests', { receiverId });
    return res.data?.data;
  },

  acceptRequest: async (requestId: string): Promise<void> => {
    await api.post(`/friends/requests/${requestId}/accept`);
  },

  rejectRequest: async (requestId: string): Promise<void> => {
    await api.post(`/friends/requests/${requestId}/reject`);
  },

  cancelRequest: async (requestId: string): Promise<void> => {
    await api.delete(`/friends/requests/${requestId}`);
  },

  removeFriend: async (userId: string): Promise<void> => {
    await api.delete(`/friends/${userId}`);
  },

  blockUser: async (userId: string): Promise<void> => {
    await api.post(`/blocks/${userId}`);
  },

  unblockUser: async (userId: string): Promise<void> => {
    await api.delete(`/blocks/${userId}`);
  },

  getConversations: async (): Promise<ConversationItem[]> => {
    const res = await api.get('/conversations');
    return res.data?.data ?? [];
  },

  getOrCreateConversation: async (friendId: string): Promise<{ id: string; last_message_at: string | null; friend: SocialUserBrief }> => {
    const res = await api.post('/conversations', { friendId });
    return res.data?.data;
  },

  getMessages: async (conversationId: string, cursor?: string | null, limit: number = 30): Promise<MessagesPage> => {
    const res = await api.get(`/conversations/${conversationId}/messages`, {
      params: { cursor: cursor || undefined, limit },
    });
    return res.data?.data ?? { messages: [], next_cursor: null, has_more: false };
  },

  sendMessage: async (conversationId: string, content: string): Promise<MessageItem> => {
    const res = await api.post(`/conversations/${conversationId}/messages`, { content });
    return res.data?.data;
  },

  markConversationRead: async (conversationId: string): Promise<{ marked_read: number }> => {
    const res = await api.post(`/conversations/${conversationId}/read`);
    return res.data?.data ?? { marked_read: 0 };
  },
};
