import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExamRating extends Document {
  examId: Types.ObjectId;
  userId: string;
  rating: number; // 1-5
  review: string;
}

const ExamRatingSchema = new Schema<IExamRating>({
  examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
  userId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  review: { type: String, default: '' }
}, { timestamps: true });

// Prevent duplicate ratings: a user can only rate an exam once
ExamRatingSchema.index({ examId: 1, userId: 1 }, { unique: true });

export default mongoose.model<IExamRating>('ExamRating', ExamRatingSchema);
