import mongoose, { Schema, Document } from 'mongoose';

export interface ICardReview extends Document {
  userId: string;
  cardId: mongoose.Types.ObjectId;
  deckId: mongoose.Types.ObjectId;
  easeFactor: number; // Hệ số độ dễ (Mặc định SM-2 là 2.5)
  interval: number; // Khoảng thời gian lặp lại (ngày)
  repetitions: number; // Số lần trả lời đúng liên tiếp
  nextReviewDate: Date; // Ngày tiếp theo cần ôn thẻ này
}

const CardReviewSchema = new Schema<ICardReview>({
  userId: { type: String, required: true },
  cardId: { type: Schema.Types.ObjectId, required: true },
  deckId: { type: Schema.Types.ObjectId, required: true },
  easeFactor: { type: Number, default: 2.5 },
  interval: { type: Number, default: 0 },
  repetitions: { type: Number, default: 0 },
  nextReviewDate: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<ICardReview>('CardReview', CardReviewSchema);
