export type LessonType = 'video' | 'reading' | 'vocabulary' | 'quiz';

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

export interface ILessonItem {
  id: string;
  title: string;
  type: LessonType;
  durationMinutes: number;
  order: number;
  videoUrl?: string;
  notes?: string;
  content?: string;
  blocks?: any[];
  vocabulary?: IVocabularyItem[];
  quiz?: IQuizQuestion[];
  attachedFlashcardId?: string | null;
  attachedExamId?: string | null;
  isRequiredToPassExam?: boolean;
}

export interface IChapterItem {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  keyTakeaways?: string[];
  order: number;
  lessons: ILessonItem[];
}

export interface ICourseMeta {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  thumbnail: string;
  level: string;
  tags: string[];
  objectives: string[];
  price?: number;
  status: 'draft' | 'published';
  isPublished: boolean;
}

export type SelectionTarget = 
  | { type: 'course' }
  | { type: 'chapter'; chapterId: string }
  | { type: 'lesson'; chapterId: string; lessonId: string };

export interface CourseBuilderState {
  course: ICourseMeta;
  chapters: IChapterItem[];
  activeStep: 1 | 2 | 3;
  selection: SelectionTarget;
  isDirty: boolean;
  validationErrors: Array<{ path: string; message: string }>;
}

export type CourseBuilderAction =
  | { type: 'SET_STEP'; step: 1 | 2 | 3 }
  | { type: 'SELECT_ITEM'; selection: SelectionTarget }
  | { type: 'SET_META'; payload: Partial<ICourseMeta> }
  | { type: 'ADD_CHAPTER'; title?: string }
  | { type: 'UPDATE_CHAPTER'; chapterId: string; payload: Partial<IChapterItem> }
  | { type: 'DELETE_CHAPTER'; chapterId: string }
  | { type: 'MOVE_CHAPTER'; chapterId: string; direction: 'up' | 'down' }
  | { type: 'ADD_LESSON'; chapterId: string; lessonType?: LessonType; title?: string }
  | { type: 'UPDATE_LESSON'; chapterId: string; lessonId: string; payload: Partial<ILessonItem> }
  | { type: 'DELETE_LESSON'; chapterId: string; lessonId: string }
  | { type: 'MOVE_LESSON'; chapterId: string; lessonId: string; direction: 'up' | 'down' }
  | { type: 'MOVE_LESSON_TO_CHAPTER'; lessonId: string; fromChapterId: string; toChapterId: string }
  | { type: 'HYDRATE_TREE'; payload: { course: any; chapters: any[] } }
  | { type: 'APPLY_ID_MAP'; idMap: Record<string, string> }
  | { type: 'SET_ERRORS'; errors: Array<{ path: string; message: string }> }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'MARK_CLEAN' };

export const generateTempId = (prefix = 'tmp') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

export const createInitialState = (courseId: string): CourseBuilderState => ({
  course: {
    id: courseId,
    title: '',
    shortDescription: '',
    description: '',
    thumbnail: '',
    level: 'ALL',
    tags: [],
    objectives: [],
    price: 0,
    status: 'draft',
    isPublished: false
  },
  chapters: [],
  activeStep: 1,
  selection: { type: 'course' },
  isDirty: false,
  validationErrors: []
});

export const courseBuilderReducer = (
  state: CourseBuilderState,
  action: CourseBuilderAction
): CourseBuilderState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, activeStep: action.step };

    case 'SELECT_ITEM':
      return { ...state, selection: action.selection };

    case 'SET_META':
      return {
        ...state,
        course: { ...state.course, ...action.payload },
        isDirty: true
      };

    case 'ADD_CHAPTER': {
      const newChapterId = generateTempId('tmp_ch');
      const defaultLessonId = generateTempId('tmp_ls');
      const newOrder = state.chapters.length + 1;
      
      const newLesson: ILessonItem = {
        id: defaultLessonId,
        title: 'Bài 1: Giới thiệu bài học',
        type: 'video',
        durationMinutes: 5,
        order: 1,
        videoUrl: '',
        notes: '',
        content: '',
        blocks: [],
        vocabulary: [],
        quiz: []
      };

      const newChapter: IChapterItem = {
        id: newChapterId,
        title: action.title || `Chương ${newOrder}: Tên chương mới`,
        description: '',
        summary: '',
        keyTakeaways: [],
        order: newOrder,
        lessons: [newLesson]
      };

      return {
        ...state,
        chapters: [...state.chapters, newChapter],
        selection: { type: 'chapter', chapterId: newChapterId },
        isDirty: true
      };
    }

    case 'UPDATE_CHAPTER':
      return {
        ...state,
        chapters: state.chapters.map(ch =>
          ch.id === action.chapterId ? { ...ch, ...action.payload } : ch
        ),
        isDirty: true
      };

    case 'DELETE_CHAPTER': {
      const remaining = state.chapters.filter(ch => ch.id !== action.chapterId);
      const reordered = remaining.map((ch, idx) => ({ ...ch, order: idx + 1 }));
      return {
        ...state,
        chapters: reordered,
        selection: { type: 'course' },
        isDirty: true
      };
    }

    case 'MOVE_CHAPTER': {
      const idx = state.chapters.findIndex(ch => ch.id === action.chapterId);
      if (idx === -1) return state;
      const targetIdx = action.direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= state.chapters.length) return state;

      const newChapters = [...state.chapters];
      const [moved] = newChapters.splice(idx, 1);
      newChapters.splice(targetIdx, 0, moved);

      return {
        ...state,
        chapters: newChapters.map((ch, i) => ({ ...ch, order: i + 1 })),
        isDirty: true
      };
    }

    case 'ADD_LESSON': {
      const chapter = state.chapters.find(ch => ch.id === action.chapterId);
      if (!chapter) return state;

      const newLessonId = generateTempId('tmp_ls');
      const newOrder = chapter.lessons.length + 1;
      const lessonType = action.lessonType || 'reading';

      let initialDuration = 5;
      if (lessonType === 'video') initialDuration = 10;
      if (lessonType === 'quiz') initialDuration = 5;
      if (lessonType === 'vocabulary') initialDuration = 8;

      const newLesson: ILessonItem = {
        id: newLessonId,
        title: action.title || `Bài ${newOrder}: Bài học mới`,
        type: lessonType,
        durationMinutes: initialDuration,
        order: newOrder,
        videoUrl: '',
        notes: '',
        content: '',
        blocks: [],
        vocabulary: lessonType === 'vocabulary' ? [
          { id: generateTempId('v'), term: '', meaning: '', phonetic: '', partOfSpeech: 'noun', example: '' }
        ] : [],
        quiz: lessonType === 'quiz' ? [
          { id: generateTempId('q'), question: 'Câu hỏi kiểm tra...', options: ['Đáp án A', 'Đáp án B'], correctIndex: 0, explanation: '' }
        ] : []
      };

      return {
        ...state,
        chapters: state.chapters.map(ch =>
          ch.id === action.chapterId
            ? { ...ch, lessons: [...ch.lessons, newLesson] }
            : ch
        ),
        selection: { type: 'lesson', chapterId: action.chapterId, lessonId: newLessonId },
        isDirty: true
      };
    }

    case 'UPDATE_LESSON':
      return {
        ...state,
        chapters: state.chapters.map(ch => {
          if (ch.id !== action.chapterId) return ch;
          return {
            ...ch,
            lessons: ch.lessons.map(ls =>
              ls.id === action.lessonId ? { ...ls, ...action.payload } : ls
            )
          };
        }),
        isDirty: true
      };

    case 'DELETE_LESSON':
      return {
        ...state,
        chapters: state.chapters.map(ch => {
          if (ch.id !== action.chapterId) return ch;
          const remainingLessons = ch.lessons.filter(ls => ls.id !== action.lessonId);
          return {
            ...ch,
            lessons: remainingLessons.map((ls, idx) => ({ ...ls, order: idx + 1 }))
          };
        }),
        selection: { type: 'chapter', chapterId: action.chapterId },
        isDirty: true
      };

    case 'MOVE_LESSON': {
      const chapter = state.chapters.find(ch => ch.id === action.chapterId);
      if (!chapter) return state;

      const idx = chapter.lessons.findIndex(ls => ls.id === action.lessonId);
      if (idx === -1) return state;
      const targetIdx = action.direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= chapter.lessons.length) return state;

      const newLessons = [...chapter.lessons];
      const [moved] = newLessons.splice(idx, 1);
      newLessons.splice(targetIdx, 0, moved);

      return {
        ...state,
        chapters: state.chapters.map(ch =>
          ch.id === action.chapterId
            ? { ...ch, lessons: newLessons.map((ls, i) => ({ ...ls, order: i + 1 })) }
            : ch
        ),
        isDirty: true
      };
    }

    case 'MOVE_LESSON_TO_CHAPTER': {
      if (action.fromChapterId === action.toChapterId) return state;
      const fromCh = state.chapters.find(ch => ch.id === action.fromChapterId);
      const toCh = state.chapters.find(ch => ch.id === action.toChapterId);
      if (!fromCh || !toCh) return state;

      const lesson = fromCh.lessons.find(l => l.id === action.lessonId);
      if (!lesson) return state;

      const newFromLessons = fromCh.lessons.filter(l => l.id !== action.lessonId).map((l, i) => ({ ...l, order: i + 1 }));
      const newToLessons = [...toCh.lessons, { ...lesson, order: toCh.lessons.length + 1 }];

      return {
        ...state,
        chapters: state.chapters.map(ch => {
          if (ch.id === action.fromChapterId) return { ...ch, lessons: newFromLessons };
          if (ch.id === action.toChapterId) return { ...ch, lessons: newToLessons };
          return ch;
        }),
        selection: { type: 'lesson', chapterId: action.toChapterId, lessonId: action.lessonId },
        isDirty: true
      };
    }

    case 'HYDRATE_TREE': {
      const { course, chapters } = action.payload;
      const formattedChapters: IChapterItem[] = (chapters || []).map((ch: any, cIdx: number) => ({
        id: ch._id || ch.id || generateTempId('tmp_ch'),
        title: ch.title || `Chương ${cIdx + 1}`,
        description: ch.description || '',
        summary: ch.summary || '',
        keyTakeaways: Array.isArray(ch.keyTakeaways) ? ch.keyTakeaways : [],
        order: ch.order || cIdx + 1,
        lessons: (ch.lessons || []).map((ls: any, lIdx: number) => ({
          id: ls._id || ls.id || generateTempId('tmp_ls'),
          title: ls.title || `Bài ${lIdx + 1}`,
          type: ls.type || 'reading',
          durationMinutes: ls.durationMinutes || 5,
          order: ls.order || lIdx + 1,
          videoUrl: ls.videoUrl || '',
          notes: ls.notes || '',
          content: ls.content || '',
          blocks: ls.blocks || [],
          vocabulary: Array.isArray(ls.vocabulary) ? ls.vocabulary : [],
          quiz: Array.isArray(ls.quiz) ? ls.quiz : [],
          attachedFlashcardId: ls.attachedFlashcardId ? (ls.attachedFlashcardId._id || ls.attachedFlashcardId).toString() : 'none',
          attachedExamId: ls.attachedExamId ? (ls.attachedExamId._id || ls.attachedExamId).toString() : 'none',
          isRequiredToPassExam: !!ls.isRequiredToPassExam
        }))
      }));

      const initialSelection: SelectionTarget = formattedChapters.length > 0 && formattedChapters[0].lessons.length > 0
        ? { type: 'lesson', chapterId: formattedChapters[0].id, lessonId: formattedChapters[0].lessons[0].id }
        : formattedChapters.length > 0
        ? { type: 'chapter', chapterId: formattedChapters[0].id }
        : { type: 'course' };

      return {
        ...state,
        course: {
          id: course._id || course.id || state.course.id,
          title: course.title || '',
          shortDescription: course.shortDescription || '',
          description: course.description || '',
          thumbnail: course.thumbnail || '',
          level: course.level || 'ALL',
          tags: Array.isArray(course.tags) ? course.tags : [],
          objectives: Array.isArray(course.objectives) ? course.objectives : [],
          price: course.price || 0,
          status: course.status || (course.isPublished ? 'published' : 'draft'),
          isPublished: !!course.isPublished
        },
        chapters: formattedChapters,
        selection: initialSelection,
        isDirty: false,
        validationErrors: []
      };
    }

    case 'APPLY_ID_MAP': {
      const { idMap } = action;
      if (!idMap || Object.keys(idMap).length === 0) return state;

      const updatedChapters = state.chapters.map(ch => {
        const realChId = idMap[ch.id] || ch.id;
        return {
          ...ch,
          id: realChId,
          lessons: ch.lessons.map(ls => ({
            ...ls,
            id: idMap[ls.id] || ls.id
          }))
        };
      });

      // Cập nhật selection nếu id đang chọn thay đổi
      let updatedSelection = state.selection;
      if (updatedSelection.type === 'chapter' && idMap[updatedSelection.chapterId]) {
        updatedSelection = { ...updatedSelection, chapterId: idMap[updatedSelection.chapterId] };
      } else if (updatedSelection.type === 'lesson') {
        const newChId = idMap[updatedSelection.chapterId] || updatedSelection.chapterId;
        const newLsId = idMap[updatedSelection.lessonId] || updatedSelection.lessonId;
        updatedSelection = { type: 'lesson', chapterId: newChId, lessonId: newLsId };
      }

      return {
        ...state,
        chapters: updatedChapters,
        selection: updatedSelection,
        isDirty: false
      };
    }

    case 'SET_ERRORS':
      return { ...state, validationErrors: action.errors };

    case 'CLEAR_ERRORS':
      return { ...state, validationErrors: [] };

    case 'MARK_CLEAN':
      return { ...state, isDirty: false };

    default:
      return state;
  }
};

export const validateCourse = (course: ICourseMeta, chapters: IChapterItem[]): Array<{ path: string; message: string }> => {
  const errors: Array<{ path: string; message: string }> = [];

  if (!course.title || !course.title.trim()) {
    errors.push({ path: 'course.title', message: 'Tên khóa học không được để trống' });
  }

  if (!chapters || chapters.length === 0) {
    errors.push({ path: 'chapters', message: 'Khóa học phải có ít nhất 1 chương' });
  }

  chapters.forEach((ch, chIdx) => {
    if (!ch.title || !ch.title.trim()) {
      errors.push({ path: `chapters[${chIdx}].title`, message: `Chương ${chIdx + 1} chưa có tiêu đề` });
    }
    if (!ch.lessons || ch.lessons.length === 0) {
      errors.push({
        path: `chapters[${chIdx}].lessons`,
        message: `Chương "${ch.title || chIdx + 1}" chưa có bài học nào. Mọi chương phải có ít nhất 1 bài học.`
      });
    } else {
      ch.lessons.forEach((ls, lsIdx) => {
        if (!ls.title || !ls.title.trim()) {
          errors.push({
            path: `chapters[${chIdx}].lessons[${lsIdx}].title`,
            message: `Bài học ${lsIdx + 1} trong chương "${ch.title || chIdx + 1}" chưa có tiêu đề`
          });
        }
      });
    }
  });

  return errors;
};
