import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChapter extends Document {
  courseId: Types.ObjectId;
  title: string;
  description: string;
  order: number;
}

const ChapterSchema = new Schema<IChapter>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  order: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model<IChapter>('Chapter', ChapterSchema);
