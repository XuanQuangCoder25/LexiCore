import mongoose, { Schema, Document } from 'mongoose';

export interface IStudySession extends Document {
  userId: string;
  durationMinutes: number; // Tổng thời gian học (phút)
  lessonsCompleted: number; // Số bài học đã xong
  date: Date;
}

const StudySessionSchema = new Schema<IStudySession>({
  userId: { type: String, required: true },
  durationMinutes: { type: Number, required: true, default: 0 },
  lessonsCompleted: { type: Number, required: true, default: 0 },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<IStudySession>('StudySession', StudySessionSchema);
