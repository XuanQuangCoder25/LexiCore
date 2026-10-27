import { CommunityTopic, PostType } from '../../database/models/CommunityPost';

export interface CommunityAuthor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  level: number;
  role: string;
}

export interface PostResponse {
  id: string;
  author: CommunityAuthor;
  authorRole: 'USER' | 'CONTENT_CREATOR' | 'ADMIN';
  type: PostType;
  topic: CommunityTopic;
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

export interface CommentResponse {
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

export interface CursorPayload {
  createdAt: Date;
  id: string;
}

export const encodeCursor = (createdAt: Date, id: string): string => {
  return Buffer.from(
    JSON.stringify({ t: createdAt.toISOString(), i: id })
  ).toString('base64');
};

export const decodeCursor = (cursorStr: unknown): CursorPayload | null => {
  if (typeof cursorStr !== 'string' || !cursorStr.trim()) return null;
  try {
    const raw = Buffer.from(cursorStr, 'base64').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.t || !parsed.i) return null;
    const date = new Date(parsed.t);
    if (isNaN(date.getTime())) return null;
    return { createdAt: date, id: String(parsed.i) };
  } catch {
    return null;
  }
};
