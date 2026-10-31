import axios from 'axios';

const api = axios.create({
  baseURL: '/api/community',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const COMMUNITY_TOPICS_LIST = [
  { id: 'all', label: 'Tất cả chủ đề', icon: 'Globe' },
  { id: 'ielts', label: 'Luyện thi IELTS', icon: 'Trophy' },
  { id: 'grammar', label: 'Ngữ pháp & Đặt câu', icon: 'Sparkles' },
  { id: 'vocabulary', label: 'Từ vựng & Flashcards', icon: 'Brain' },
  { id: 'speaking', label: 'Phát âm & Speaking', icon: 'Mic' },
  { id: 'homework', label: 'Hỏi đáp bài tập', icon: 'HelpCircle' },
  { id: 'general', label: 'Thảo luận chung', icon: 'MessageSquare' },
] as const;

export type TopicId = (typeof COMMUNITY_TOPICS_LIST)[number]['id'];

export interface CommunityAuthor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  level: number;
  role: string;
}

export interface PostItem {
  id: string;
  author: CommunityAuthor;
  authorRole: 'USER' | 'CONTENT_CREATOR' | 'ADMIN';
  type: 'discussion' | 'shared_flashcard' | 'course_milestone' | 'creator_announcement' | 'poll';
  topic: string;
  title: string;
  content: string;
  tags: string[];
  referenceId?: string;
  referenceMeta?: {
    title?: string;
    thumbnail?: string;
    cardCount?: number;
    courseId?: string;
    level?: string;
    sampleCards?: Array<{ front: string; back: string }>;
  };
  pollOptions?: Array<{
    text: string;
    votesCount: number;
    hasVoted: boolean;
  }>;
  isPinned: boolean;
  isSolved: boolean;
  isLiked: boolean;
  stats: {
    likesCount: number;
    commentsCount: number;
    clonesCount: number;
    viewsCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CommentItem {
  id: string;
  postId: string;
  parentId: string | null;
  author: CommunityAuthor;
  replyToUser: CommunityAuthor | null;
  content: string;
  likesCount: number;
  repliesCount: number;
  isCreatorVerified: boolean;
  isBestAnswer: boolean;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedResponse {
  pinnedPosts: PostItem[];
  posts: PostItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CommentsPageResponse {
  comments: CommentItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface RepliesPageResponse {
  replies: CommentItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const getCommunityErrorMessage = (error: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại.'): string => {
  const message = (error as any)?.response?.data?.message;
  return typeof message === 'string' && message ? message : fallback;
};

export const communityService = {
  getFeed: async (params?: {
    tab?: 'all' | 'friends' | 'unanswered';
    topic?: string;
    cursor?: string | null;
    limit?: number;
  }): Promise<FeedResponse> => {
    const res = await api.get('/posts', {
      params: {
        tab: params?.tab,
        topic: params?.topic && params.topic !== 'all' ? params.topic : undefined,
        cursor: params?.cursor || undefined,
        limit: params?.limit || 10,
      },
    });
    return res.data?.data ?? { pinnedPosts: [], posts: [], nextCursor: null, hasMore: false };
  },

  getPost: async (id: string): Promise<PostItem> => {
    const res = await api.get(`/posts/${id}`);
    return res.data?.data;
  },

  createPost: async (data: {
    title: string;
    content: string;
    topic: string;
    type?: string;
    tags?: string[];
    pollOptions?: string[];
  }): Promise<PostItem> => {
    const res = await api.post('/posts', data);
    return res.data?.data;
  },

  deletePost: async (id: string): Promise<void> => {
    await api.delete(`/posts/${id}`);
  },

  togglePinPost: async (id: string): Promise<{ isPinned: boolean }> => {
    const res = await api.patch(`/posts/${id}/pin`);
    return res.data?.data;
  },

  votePoll: async (id: string, optionIndex: number): Promise<PostItem> => {
    const res = await api.post(`/posts/${id}/vote`, { optionIndex });
    return res.data?.data;
  },

  markBestAnswer: async (
    postId: string,
    commentId: string
  ): Promise<{ success: boolean; isSolved: boolean; isBestAnswer: boolean }> => {
    const res = await api.post(`/posts/${postId}/comments/${commentId}/best-answer`);
    return res.data?.data;
  },

  toggleLikePost: async (id: string): Promise<{ added: boolean; targetLikes: number }> => {
    const res = await api.post(`/posts/${id}/like`);
    return res.data?.data;
  },

  getComments: async (
    postId: string,
    cursor?: string | null,
    limit = 10
  ): Promise<CommentsPageResponse> => {
    const res = await api.get(`/posts/${postId}/comments`, {
      params: { cursor: cursor || undefined, limit },
    });
    return res.data?.data ?? { comments: [], nextCursor: null, hasMore: false };
  },

  getReplies: async (
    commentId: string,
    cursor?: string | null,
    limit = 10
  ): Promise<RepliesPageResponse> => {
    const res = await api.get(`/comments/${commentId}/replies`, {
      params: { cursor: cursor || undefined, limit },
    });
    return res.data?.data ?? { replies: [], nextCursor: null, hasMore: false };
  },

  createComment: async (
    postId: string,
    data: { content: string; parentId?: string; replyToUserId?: string }
  ): Promise<CommentItem> => {
    const res = await api.post(`/posts/${postId}/comments`, data);
    return res.data?.data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete(`/comments/${commentId}`);
  },

  toggleLikeComment: async (commentId: string): Promise<{ added: boolean; targetLikes: number }> => {
    const res = await api.post(`/comments/${commentId}/like`);
    return res.data?.data;
  },

  shareFlashcardDeck: async (data: {
    deckId: string;
    topic?: string;
    caption?: string;
  }): Promise<PostItem> => {
    const res = await api.post('/share-deck', data);
    return res.data?.data;
  },

  cloneDeck: async (
    postId: string
  ): Promise<{ newDeckId: string; title: string; cardCount: number; clonesCount: number }> => {
    const res = await api.post(`/posts/${postId}/clone-deck`);
    return res.data?.data;
  },

  shareCourseMilestone: async (data: {
    courseId: string;
    caption?: string;
  }): Promise<PostItem> => {
    const res = await api.post('/milestone', data);
    return res.data?.data;
  },

  getTrending: async (): Promise<Array<{ tag: string; count: number }>> => {
    const res = await api.get('/trending');
    return res.data?.data ?? [];
  },
};
