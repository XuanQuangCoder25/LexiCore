import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description: string;
  thumbnail: string;
  creatorId: string;
  isPublished: boolean;
  level: string; // e.g., 'A1 Beginner', 'B2 Upper Intermediate'
  tags: string[];
  price: number; // 0 for free, > 0 for coins (Economy)
  type: 'course' | 'flashcard';
}

const CourseSchema = new Schema<ICourse>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  creatorId: { type: String, required: true },
  isPublished: { type: Boolean, default: false },
  level: { type: String, default: 'All Levels' },
  tags: [{ type: String }],
  price: { type: Number, default: 0 },
  type: { type: String, enum: ['course', 'flashcard'], default: 'course' }
}, { timestamps: true });

// Tối ưu hóa truy vấn: lọc nội dung cá nhân (Private Space) & nội dung cộng đồng
CourseSchema.index({ creatorId: 1, type: 1, isPublished: 1 });
CourseSchema.index({ isPublished: 1, type: 1 });

export default mongoose.model<ICourse>('Course', CourseSchema);
