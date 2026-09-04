import mongoose, { Schema, Document } from 'mongoose';

export interface IRetentionLog extends Document {
  userId: string;
  day: string; // VD: 'Mon', 'Tue'
  retention: number; // Tỷ lệ nhớ nếu KHÔNG ôn tập
  withReview: number; // Tỷ lệ nhớ nếu CÓ ôn tập (SRS)
  date: Date;
}

const RetentionLogSchema = new Schema<IRetentionLog>({
  userId: { type: String, required: true },
  day: { type: String, required: true },
  retention: { type: Number, required: true },
  withReview: { type: Number, required: true },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<IRetentionLog>('RetentionLog', RetentionLogSchema);
