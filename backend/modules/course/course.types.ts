export interface LessonDTO {
  id?: string;
  _id?: string;
  title: string;
  type?: 'video' | 'reading' | 'vocabulary' | 'quiz';
  durationMinutes?: number;
  order?: number;
  videoUrl?: string;
  notes?: string;
  content?: string;
  blocks?: any[];
  vocabulary?: Array<{
    id?: string;
    term: string;
    phonetic?: string;
    partOfSpeech?: string;
    meaning: string;
    example?: string;
  }>;
  quiz?: Array<{
    id?: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
  attachedFlashcardId?: string | null;
  attachedExamId?: string | null;
  isRequiredToPassExam?: boolean;
}

export interface ChapterDTO {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  summary?: string;
  keyTakeaways?: string[];
  order?: number;
  lessons: LessonDTO[];
}

export interface CourseMetaDTO {
  id?: string;
  _id?: string;
  title: string;
  shortDescription?: string;
  description?: string;
  thumbnail?: string;
  level?: string;
  tags?: string[];
  objectives?: string[];
  price?: number;
  isPublished?: boolean;
  status?: 'draft' | 'published';
}

export interface CourseTreeDTO {
  course: CourseMetaDTO;
  chapters: ChapterDTO[];
}

export interface ValidationErrorItem {
  field?: string;
  path: string;
  message: string;
}
