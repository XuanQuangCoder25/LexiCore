import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChapter extends Document {
  courseId: Types.ObjectId;
  title: string;
  description: string;
  summary: string; // Tóm tắt chương / Kiến thức cốt lõi
  keyTakeaways: string[]; // Các ý chính học viên cần nhớ
  order: number;
}

const ChapterSchema = new Schema<IChapter>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  summary: { type: String, default: '' },
  keyTakeaways: [{ type: String }],
  order: { type: Number, required: true }
}, { timestamps: true });

ChapterSchema.index({ courseId: 1, order: 1 });

export default mongoose.model<IChapter>('Chapter', ChapterSchema);
