import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExam extends Document {
  title: string;
  description: string;
  thumbnail: string;
  totalQuestions: number;
  createdBy: string;
  status: 'Draft' | 'Published';
}

const ExamSchema = new Schema<IExam>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  totalQuestions: { type: Number, default: 0 },
  createdBy: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' }
}, { timestamps: true });

export default mongoose.model<IExam>('Exam', ExamSchema);
