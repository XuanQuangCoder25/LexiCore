import mongoose, { Schema, Document, Types } from 'mongoose';

export type ReactionTargetType = 'post' | 'comment';
export type ReactionType = 'like' | 'insightful' | 'fire' | 'celebrate';

export interface ICommunityReaction extends Document {
  _id: Types.ObjectId;
  targetType: ReactionTargetType;
  targetId: Types.ObjectId;
  userId: string; // MySQL UUID
  type: ReactionType;
  createdAt: Date;
}

const CommunityReactionSchema = new Schema<ICommunityReaction>(
  {
    targetType: {
      type: String,
      enum: ['post', 'comment'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: String, required: true },
    type: {
      type: String,
      enum: ['like', 'insightful', 'fire', 'celebrate'],
      default: 'like',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Chặn duplicate reaction trên cùng 1 target của 1 user
CommunityReactionSchema.index({ targetType: 1, targetId: 1, userId: 1 }, { unique: true });
CommunityReactionSchema.index({ userId: 1, targetId: 1 });

export default mongoose.model<ICommunityReaction>('CommunityReaction', CommunityReactionSchema);
