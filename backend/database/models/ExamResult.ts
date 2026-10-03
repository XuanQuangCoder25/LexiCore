import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExamResult extends Document {
  userId: string;
  examId: Types.ObjectId;
  score: number;
  progress: number;
  status: 'InProgress' | 'Completed';
  completedAt?: Date;
  answers: any; // Store user answers for each question
}

const ExamResultSchema = new Schema<IExamResult>({
  userId: { type: String, required: true }, // Referencing MySQL User ID
  examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
  score: { type: Number, default: 0 },
  progress: { type: Number, default: 0 },
  status: { type: String, enum: ['InProgress', 'Completed'], default: 'InProgress' },
  completedAt: { type: Date },
  answers: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export default mongoose.model<IExamResult>('ExamResult', ExamResultSchema);
