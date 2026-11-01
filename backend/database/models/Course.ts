import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseStats {
  totalChapters: number;
  totalLessons: number;
  totalDurationMinutes: number;
}

export interface ICourse extends Document {
  title: string;
  shortDescription: string;
  description: string;
  thumbnail: string;
  creatorId: string;
  isPublished: boolean;
  status: 'draft' | 'published';
  publishedAt?: Date | null;
  level: string; // 'ALL' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  tags: string[];
  objectives: string[]; // Danh sách mục tiêu đầu ra (Learning Objectives)
  price: number; // 0 for free, > 0 for coins (Economy)
  type: 'course' | 'flashcard';
  stats?: ICourseStats;
}

const CourseSchema = new Schema<ICourse>({
  title: { type: String, required: true },
  shortDescription: { type: String, default: '' },
  description: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  creatorId: { type: String, required: true },
  isPublished: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  publishedAt: { type: Date, default: null },
  level: { type: String, default: 'ALL' },
  tags: [{ type: String }],
  objectives: [{ type: String }],
  price: { type: Number, default: 0 },
  type: { type: String, enum: ['course', 'flashcard'], default: 'course' },
  stats: {
    totalChapters: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 },
    totalDurationMinutes: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Tối ưu hóa truy vấn: lọc nội dung cá nhân (Private Space) & nội dung cộng đồng
CourseSchema.index({ creatorId: 1, type: 1, isPublished: 1 });
CourseSchema.index({ isPublished: 1, type: 1 });
CourseSchema.index({ creatorId: 1, createdAt: -1 });

export default mongoose.model<ICourse>('Course', CourseSchema);
