import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICommunityComment extends Document {
  _id: Types.ObjectId;
  postId: Types.ObjectId;
  parentId?: Types.ObjectId | null; // null: root comment. Nếu là reply thì luôn trỏ về root comment ID!
  replyToUserId?: string | null; // MySQL UUID của người được reply (hỗ trợ @mention)
  authorId: string; // MySQL UUID
  authorRole: 'USER' | 'CONTENT_CREATOR' | 'ADMIN';
  content: string;
  likesCount: number;
  repliesCount: number;
  isCreatorVerified: boolean;
  isBestAnswer: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommunityCommentSchema = new Schema<ICommunityComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'CommunityComment', default: null },
    replyToUserId: { type: String, default: null },
    authorId: { type: String, required: true },
    authorRole: {
      type: String,
      enum: ['USER', 'CONTENT_CREATOR', 'ADMIN'],
      default: 'USER',
    },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    likesCount: { type: Number, default: 0 },
    repliesCount: { type: Number, default: 0 },
    isCreatorVerified: { type: Boolean, default: false },
    isBestAnswer: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes cho 2-tier comment pagination
CommunityCommentSchema.index({ postId: 1, parentId: 1, isDeleted: 1, createdAt: -1, _id: -1 });
CommunityCommentSchema.index({ parentId: 1, isDeleted: 1, createdAt: 1, _id: 1 });
CommunityCommentSchema.index({ authorId: 1, createdAt: -1 });

export default mongoose.model<ICommunityComment>('CommunityComment', CommunityCommentSchema);
