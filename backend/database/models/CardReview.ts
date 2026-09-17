import mongoose, { Schema, Document } from 'mongoose';

export interface ICardReview extends Document {
  userId: string;
  cardId: mongoose.Types.ObjectId;
  deckId: mongoose.Types.ObjectId;
  easeFactor: number; // Hệ số độ dễ (Mặc định SM-2 là 2.5)
  interval: number; // Khoảng thời gian lặp lại (ngày)
  repetitions: number; // Số lần trả lời đúng liên tiếp
  nextReviewDate: Date; // Ngày tiếp theo cần ôn thẻ này
  status: 'New' | 'Learning' | 'Review' | 'Relearning'; // Trạng thái thẻ
  reviewHistory: Array<{
    date: Date;
    quality: number;
    interval: number;
    easeFactor: number;
    responseTimeMs?: number;
  }>;
}

const CardReviewSchema = new Schema<ICardReview>({
  userId: { type: String, required: true },
  cardId: { type: Schema.Types.ObjectId, required: true },
  deckId: { type: Schema.Types.ObjectId, required: true },
  easeFactor: { type: Number, default: 2.5 },
  interval: { type: Number, default: 0 },
  repetitions: { type: Number, default: 0 },
  nextReviewDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['New', 'Learning', 'Review', 'Relearning'], default: 'New' },
  reviewHistory: [{
    date: { type: Date, default: Date.now },
    quality: { type: Number },
    interval: { type: Number },
    easeFactor: { type: Number },
    responseTimeMs: { type: Number }
  }]
}, { timestamps: true });

// Tối ưu Database Performance: Đánh Compound Index cho các query thường dùng
CardReviewSchema.index({ userId: 1, nextReviewDate: 1 });
CardReviewSchema.index({ userId: 1, deckId: 1, nextReviewDate: 1 });
CardReviewSchema.index({ userId: 1, cardId: 1 }, { unique: true });

export default mongoose.model<ICardReview>('CardReview', CardReviewSchema);
