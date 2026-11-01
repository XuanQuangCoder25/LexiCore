import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILessonBlock {
  id: string;
  type: 'text' | 'audio' | 'video' | 'fill_in_the_blank' | 'drag_drop' | 'speech_recognition' | 'callout' | 'sentence_reordering';
  content: string;
  metadata?: any;
}

export interface IVocabularyItem {
  id: string;
  term: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaning: string;
  example?: string;
}

export interface IQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface ILesson extends Document {
  courseId: Types.ObjectId;
  chapterId: Types.ObjectId;
  title: string;
  type: 'video' | 'reading' | 'vocabulary' | 'quiz';
  durationMinutes: number;
  order: number;
  videoUrl?: string; // For video lessons
  notes?: string; // Ghi chú bài giảng / hướng dẫn học
  content?: string; // Rich text / Markdown content
  blocks?: ILessonBlock[]; // Interactive blocks
  vocabulary?: IVocabularyItem[]; // Trọng tâm từ vựng
  quiz?: IQuizQuestion[]; // Mini-quiz trắc nghiệm củng cố
  attachedExamId?: Types.ObjectId; // Mini-quiz bên ngoài (nếu có)
  attachedFlashcardId?: Types.ObjectId; // Bộ thẻ Flashcard đính kèm
  isRequiredToPassExam: boolean; // Drip content completion rule
}

const LessonSchema = new Schema<ILesson>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
  title: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['video', 'reading', 'vocabulary', 'quiz'], 
    default: 'reading' 
  },
  durationMinutes: { type: Number, default: 5 },
  order: { type: Number, required: true },
  videoUrl: { type: String, default: '' },
  notes: { type: String, default: '' },
  content: { type: String, default: '' },
  blocks: { type: [Schema.Types.Mixed] as any, default: [] },
  vocabulary: [{
    id: { type: String },
    term: { type: String, required: true },
    phonetic: { type: String, default: '' },
    partOfSpeech: { type: String, default: '' },
    meaning: { type: String, required: true },
    example: { type: String, default: '' }
  }],
  quiz: [{
    id: { type: String },
    question: { type: String, required: true },
    options: [{ type: String }],
    correctIndex: { type: Number, default: 0 },
    explanation: { type: String, default: '' }
  }],
  attachedExamId: { type: Schema.Types.ObjectId, ref: 'Exam' },
  attachedFlashcardId: { type: Schema.Types.ObjectId, ref: 'Course' },
  isRequiredToPassExam: { type: Boolean, default: false }
}, { timestamps: true });

LessonSchema.index({ courseId: 1, chapterId: 1, order: 1 });
LessonSchema.index({ chapterId: 1, order: 1 });

export default mongoose.model<ILesson>('Lesson', LessonSchema);
