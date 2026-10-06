import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILessonBlock {
  id: string;
  type: 'text' | 'audio' | 'fill_in_the_blank' | 'callout' | 'speech_recognition' | 'sentence_reordering';
  content: string;
  metadata?: any;
}

export interface ILesson extends Document {
  courseId: Types.ObjectId;
  chapterId: Types.ObjectId;
  title: string;
  durationMinutes: number;
  order: number;
  videoUrl?: string; // For video lessons
  content?: string; // Rich text / Markdown content (legacy)
  blocks?: ILessonBlock[]; // Modern Notion-like blocks
  attachedExamId?: Types.ObjectId; // Mini-quiz at the end of the lesson
  attachedFlashcardId?: Types.ObjectId; // Flashcard deck for the lesson
  isRequiredToPassExam: boolean; // Drip content completion rule
}

const LessonSchema = new Schema<ILesson>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
  title: { type: String, required: true },
  durationMinutes: { type: Number, required: true },
  order: { type: Number, required: true },
  videoUrl: { type: String, default: '' },
  content: { type: String, default: '' },
  blocks: { type: [Schema.Types.Mixed], default: [] },
  attachedExamId: { type: Schema.Types.ObjectId, ref: 'Exam' },
  attachedFlashcardId: { type: Schema.Types.ObjectId, ref: 'Course' },
  isRequiredToPassExam: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<ILesson>('Lesson', LessonSchema);
