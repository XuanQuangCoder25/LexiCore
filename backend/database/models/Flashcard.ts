import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFlashcard extends Document {
  courseId: Types.ObjectId;
  lessonId?: Types.ObjectId;
  front: string;
  back: string;
  order: number;
}

const FlashcardSchema = new Schema<IFlashcard>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
  front: { type: String, required: true },
  back: { type: String, required: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IFlashcard>('Flashcard', FlashcardSchema);
