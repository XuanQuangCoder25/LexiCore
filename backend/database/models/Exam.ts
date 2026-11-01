import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExam extends Document {
  title: string;
  description: string;
  thumbnail: string;
  totalQuestions: number;
  createdBy: string;
  status: 'Draft' | 'Published' | 'Suspended';
  password?: string;
  durationMinutes: number;
  passingScore: number;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'All';
  shuffleQuestions: boolean;
  skills: string[];
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
  durationMinutes: { type: Number, default: 45 },
  passingScore: { type: Number, default: 70 },
  level: { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'All'], default: 'All' },
  shuffleQuestions: { type: Boolean, default: false },
  skills: [{ type: String, default: 'General' }],
  totalRatings: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 }
}, { timestamps: true });

// Tối ưu hóa truy vấn: lọc bài kiểm tra cá nhân (Private Space) & bài kiểm tra cộng đồng
ExamSchema.index({ createdBy: 1, status: 1 });
ExamSchema.index({ status: 1, level: 1 });

export default mongoose.model<IExam>('Exam', ExamSchema);
