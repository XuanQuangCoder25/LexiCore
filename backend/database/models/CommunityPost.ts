import mongoose, { Schema, Document, Types } from 'mongoose';

export type PostType =
  | 'discussion'
  | 'shared_flashcard'
  | 'course_milestone'
  | 'creator_announcement'
  | 'poll';

export const COMMUNITY_TOPICS = [
  'ielts',
  'grammar',
  'vocabulary',
  'speaking',
  'homework',
  'general',
] as const;

export type CommunityTopic = (typeof COMMUNITY_TOPICS)[number];

export interface ICommunityPost extends Document {
  _id: Types.ObjectId;
  authorId: string; // MySQL UUID
  authorRole: 'USER' | 'CONTENT_CREATOR' | 'ADMIN';
  type: PostType;
  topic: CommunityTopic;
  title: string;
  content: string;
  tags?: string[];
  referenceId?: Types.ObjectId;
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
    votes: string[]; // userIds
  }>;
  isPinned: boolean;
  isSolved: boolean;
  isDeleted: boolean;
  stats: {
    likesCount: number;
    commentsCount: number;
    clonesCount: number;
    viewsCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CommunityPostSchema = new Schema<ICommunityPost>(
  {
    authorId: { type: String, required: true },
    authorRole: {
      type: String,
      enum: ['USER', 'CONTENT_CREATOR', 'ADMIN'],
      default: 'USER',
    },
    type: {
      type: String,
      enum: [
        'discussion',
        'shared_flashcard',
        'course_milestone',
        'creator_announcement',
        'poll',
      ],
      default: 'discussion',
    },
    topic: {
      type: String,
      enum: COMMUNITY_TOPICS,
      default: 'general',
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    tags: [{ type: String, trim: true, lowercase: true }],
    referenceId: { type: Schema.Types.ObjectId },
    referenceMeta: {
      title: { type: String },
      thumbnail: { type: String },
      cardCount: { type: Number },
      courseId: { type: String },
      level: { type: String },
      sampleCards: [
        {
          front: { type: String },
          back: { type: String },
        },
      ],
    },
    pollOptions: [
      {
        text: { type: String, required: true },
        votes: [{ type: String }],
      },
    ],
    isPinned: { type: Boolean, default: false },
    isSolved: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    stats: {
      likesCount: { type: Number, default: 0 },
      commentsCount: { type: Number, default: 0 },
      clonesCount: { type: Number, default: 0 },
      viewsCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Indexes cho Cursor Pagination và tìm kiếm hiệu năng cao O(log N + limit)
CommunityPostSchema.index({ isDeleted: 1, createdAt: -1, _id: -1 });
CommunityPostSchema.index({ isDeleted: 1, topic: 1, createdAt: -1, _id: -1 });
CommunityPostSchema.index({ isDeleted: 1, authorId: 1, createdAt: -1, _id: -1 });
CommunityPostSchema.index({ isDeleted: 1, isPinned: -1, createdAt: -1 });
CommunityPostSchema.index({ isDeleted: 1, isSolved: 1, createdAt: -1 });

export default mongoose.model<ICommunityPost>('CommunityPost', CommunityPostSchema);
