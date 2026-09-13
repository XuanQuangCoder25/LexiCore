import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILesson extends Document {
  courseId: Types.ObjectId;
  title: string;
  durationMinutes: number;
  order: number;
}

const LessonSchema = new Schema<ILesson>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  durationMinutes: { type: Number, required: true },
  order: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model<ILesson>('Lesson', LessonSchema);
