import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document<any> {
  _id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'content_creator';
  
  // Dashboard Metrics
  level: string; // VD: 'B2 Upper Intermediate'
  streak: number; // Chuỗi ngày học liên tiếp
  totalWordsLearned: number; // Tổng số từ vựng đã học
  weeklyActivityScore: number; // Tỉ lệ % tích cực hơn học viên khác
  
  // User's Progress Tracking
  enrolledCourses: Array<{
    courseId: Types.ObjectId;
    progressPercentage: number; // 0 - 100
    completedChapters?: Types.ObjectId[]; // Các chương đã được xác nhận hoàn thành
    isCompleted?: boolean; // Đã hoàn thành toàn bộ khóa học
    completedAt?: Date | null; // Thời điểm hoàn thành khóa học
  }>;
  
  completedLessons: Types.ObjectId[]; // Lưu các bài học đã hoàn thành
  
  unlockedAchievements: Array<{
    achievementId: Types.ObjectId;
    unlockedAt: Date;
  }>;
}

const UserSchema = new Schema<IUser>({
  _id: { type: String, required: true }, // Dùng String để lưu UUID từ MySQL
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'content_creator'], default: 'user' },
  
  level: { type: String, default: 'A1 Beginner' },
  streak: { type: Number, default: 0 },
  totalWordsLearned: { type: Number, default: 0 },
  weeklyActivityScore: { type: Number, default: 0 },
  
  enrolledCourses: [{
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    progressPercentage: { type: Number, default: 0 },
    completedChapters: [{ type: Schema.Types.ObjectId, ref: 'Chapter' }],
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null }
  }],
  
  completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
  
  unlockedAchievements: [{
    achievementId: { type: Schema.Types.ObjectId, ref: 'Achievement' },
    unlockedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
