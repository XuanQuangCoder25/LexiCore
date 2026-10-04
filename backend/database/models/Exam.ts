import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExam extends Document {
  title: string;
  description: string;
  thumbnail: string;
  totalQuestions: number;
  createdBy: string;
  status: 'Draft' | 'Published' | 'Suspended';
  password?: string;
  totalRatings: number;
  averageRating: number;
}

const ExamSchema = new Schema<IExam>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  totalQuestions: { type: Number, default: 0 },
  createdBy: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Published', 'Suspended'], default: 'Draft' },
  password: { type: String, default: '' }, // plaintext for internal sharing
  totalRatings: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IExam>('Exam', ExamSchema);
