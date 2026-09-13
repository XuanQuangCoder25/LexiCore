import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  username: string;
  passwordHash: string;
  
  // Dashboard Metrics
  level: string; // VD: 'B2 Upper Intermediate'
  streak: number; // Chuỗi ngày học liên tiếp
  totalWordsLearned: number; // Tổng số từ vựng đã học
  weeklyActivityScore: number; // Tỉ lệ % tích cực hơn học viên khác
  
  // User's Progress Tracking
  enrolledCourses: Array<{
    courseId: Types.ObjectId;
    progressPercentage: number; // 0 - 100
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
  
  level: { type: String, default: 'A1 Beginner' },
  streak: { type: Number, default: 0 },
  totalWordsLearned: { type: Number, default: 0 },
  weeklyActivityScore: { type: Number, default: 0 },
  
  enrolledCourses: [{
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    progressPercentage: { type: Number, default: 0 }
  }],
  
  completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
  
  unlockedAchievements: [{
    achievementId: { type: Schema.Types.ObjectId, ref: 'Achievement' },
    unlockedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
