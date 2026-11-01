import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { ArrowLeft, PlayCircle, FileText, CheckCircle, Circle, Mic, BookOpen, Sparkles, Lock, ListChecks, RotateCw, HelpCircle, CheckCircle2, Languages, AlertCircle } from "lucide-react";
import { studentCourseService } from "../../services/student-course-service";
import { toast } from "sonner";
import { ScrollArea } from "../ui/scroll-area";
import { ExamTakingView } from "./ExamView";
import { FlashcardStudySession } from "./FlashcardStudySession";
import { ChapterSummary } from "./ChapterSummary";
import { CourseCompletion, type CourseCompletionStats } from "./CourseCompletion";

const formatVideoEmbedUrl = (url: string) => {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?enablejsapi=1`;
  }
  return url;
};


const InteractiveBlock = ({ block }: { block: any }) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);

  useEffect(() => {
    if (block.type === 'drag_drop') {
      const parts = block.content.split(/(\[.*?\])/g);
      const words = parts.filter(p => p.startsWith('[') && p.endsWith(']')).map(p => p.slice(1, -1));
      setAvailableWords(words.sort(() => Math.random() - 0.5));
    }
  }, [block]);

  const checkAnswers = () => {
    setShowResult(true);
  };

  const isCorrect = (index: number, answer: string) => {
    let count = 0;
    const parts = block.content.split(/(\[.*?\])/g);
    for (let i = 0; i <= index; i++) {
      if (parts[i].startsWith('[') && parts[i].endsWith(']')) {
        if (i === index) return parts[i].slice(1, -1).toLowerCase().trim() === answer.toLowerCase().trim();
        count++;
      }
    }
    return false;
  };

  if (block.type === 'fill_in_the_blank') {
    return (
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bài tập: Điền từ</span>
        <div className="p-4 bg-white rounded-xl border border-zinc-200/80 leading-relaxed text-base shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          {block.content.split(/(\[.*?\])/g).map((part: string, i: number) => {
            if (part.startsWith('[') && part.endsWith(']')) {
              return (
                <input
                  key={i}
                  type="text"
                  className={`inline-block mx-1 px-2.5 py-1 w-28 bg-zinc-50 font-mono text-sm rounded-lg border outline-none transition-all duration-150 ${
                    showResult 
                      ? (isCorrect(i, answers[i] || '') 
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-semibold' 
                          : 'border-red-600 bg-red-50/50 text-red-900') 
                      : 'border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5'
                  }`}
                  value={answers[i] || ''}
                  onChange={(e) => { setAnswers({ ...answers, [i]: e.target.value }); setShowResult(false); }}
                />
              );
            }
            return <span key={i} className="text-zinc-800">{part}</span>;
          })}
        </div>
        <Button 
          variant="outline" 
          className="self-end bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-400 active:scale-[0.98] rounded-xl text-xs font-medium h-9" 
          onClick={checkAnswers}
        >
          Kiểm tra kết quả
        </Button>
      </div>
    );
  }

  if (block.type === 'drag_drop') {
    return (
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bài tập: Kéo thả từ</span>
        
        <div className="flex flex-wrap gap-2 mb-2 p-3 bg-zinc-50/70 border border-zinc-200/60 rounded-xl min-h-[52px]">
          {availableWords.map((word, i) => (
            <div 
              key={i} 
              draggable 
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', word); setDraggedWord(word); }}
              onDragEnd={() => setDraggedWord(null)}
              className="px-3 py-1 bg-white border border-zinc-200 shadow-sm rounded-lg cursor-grab active:cursor-grabbing hover:border-zinc-900 select-none font-medium text-xs text-zinc-900 transition-all duration-150"
            >
              {word}
            </div>
          ))}
          {availableWords.length === 0 && <span className="text-zinc-400 italic text-xs my-auto">Tuyệt vời! Bạn đã hoàn thành ghép từ.</span>}
        </div>

        <div className="p-4 bg-white rounded-xl border border-zinc-200/80 leading-relaxed text-base shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          {block.content.split(/(\[.*?\])/g).map((part: string, i: number) => {
            if (part.startsWith('[') && part.endsWith(']')) {
              const answered = answers[i];
              return (
                <span 
                  key={i} 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const word = e.dataTransfer.getData('text/plain');
                    if (word) {
                      setAnswers({ ...answers, [i]: word });
                      setAvailableWords(prev => prev.filter(w => w !== word));
                      if (answered) setAvailableWords(prev => [...prev, answered]);
                      setShowResult(false);
                    }
                  }}
                  onClick={() => {
                    if (answered) {
                      setAnswers(prev => { const n = {...prev}; delete n[i]; return n; });
                      setAvailableWords(prev => [...prev, answered]);
                    }
                  }}
                  className={`inline-flex items-center justify-center mx-1 min-w-[84px] h-8 px-2.5 font-mono text-xs rounded-lg border transition-all duration-150 cursor-pointer ${
                    answered 
                      ? 'bg-zinc-100 text-zinc-900 border-zinc-900 font-semibold shadow-xs' 
                      : 'border-dashed border-zinc-300 bg-zinc-50 text-transparent hover:border-zinc-400'
                  } ${
                    showResult 
                      ? (isCorrect(i, answers[i] || '') 
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-semibold' 
                          : 'border-red-600 bg-red-50/50 text-red-900 line-through') 
                      : ''
                  }`}
                >
                  {answered || part.slice(1,-1)}
                </span>
              );
            }
            return <span key={i} className="text-zinc-800">{part}</span>;
          })}
        </div>
        <Button 
          variant="outline" 
          className="self-end bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-400 active:scale-[0.98] rounded-xl text-xs font-medium h-9" 
          onClick={checkAnswers}
        >
          Kiểm tra kết quả
        </Button>
      </div>
    );
  }

  return null;
};


const InlineVocabPlayer = ({ vocabulary }: { vocabulary: any[] }) => {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!vocabulary || vocabulary.length === 0) return null;
  const current = vocabulary[index];

  return (
    <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] my-6 overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200/60">
            <Languages className="w-3.5 h-3.5" /> Thẻ từ vựng trọng tâm ({vocabulary.length} từ)
          </span>
          <span className="text-xs text-zinc-500 font-mono">
            {index + 1} / {vocabulary.length}
          </span>
        </div>

        {current && (
          <div
            id="card-vocab-flashcard"
            onClick={() => setIsFlipped(!isFlipped)}
            className="aspect-[16/8] max-h-52 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 hover:bg-zinc-50 hover:border-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            {!isFlipped ? (
              <div className="space-y-1.5">
                <h3 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                  {current.term}
                </h3>
                {current.phonetic && (
                  <p className="text-sm font-mono text-zinc-500">{current.phonetic}</p>
                )}
                {current.partOfSpeech && (
                  <span className="inline-block text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/60 px-2 py-0.5 rounded-md mt-1">
                    {current.partOfSpeech}
                  </span>
                )}
                <p className="text-[11px] text-zinc-400 pt-2 flex items-center justify-center gap-1">
                  <RotateCw className="w-3 h-3" /> Nhấn để lật xem nghĩa
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Định nghĩa & Ví dụ
                </span>
                <h4 className="text-lg font-bold text-zinc-900">
                  {current.meaning}
                </h4>
                {current.example && (
                  <p className="text-xs text-zinc-500 italic max-w-md">
                    "{current.example}"
                  </p>
                )}
                <p className="text-[11px] text-zinc-400 pt-2 flex items-center justify-center gap-1">
                  <RotateCw className="w-3 h-3" /> Nhấn để lật lại
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button
            id="btn-vocab-prev"
            type="button"
            variant="outline"
            size="sm"
            disabled={index === 0}
            onClick={() => { setIndex(i => Math.max(0, i - 1)); setIsFlipped(false); }}
            className="bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] rounded-xl text-xs font-medium h-8"
          >
            Từ trước
          </Button>
          <Button
            id="btn-vocab-next"
            type="button"
            variant="outline"
            size="sm"
            disabled={index === vocabulary.length - 1}
            onClick={() => { setIndex(i => i + 1); setIsFlipped(false); }}
            className="bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] rounded-xl text-xs font-medium h-8"
          >
            Từ tiếp theo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const InlineQuizPlayer = ({ quiz }: { quiz: any[] }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!quiz || quiz.length === 0) return null;

  return (
    <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] my-6 overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200/60">
            <HelpCircle className="w-3.5 h-3.5" /> Câu hỏi củng cố ({quiz.length} câu)
          </span>
          {isSubmitted && (
            <span className="text-xs font-semibold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
              Đã kiểm tra kết quả
            </span>
          )}
        </div>

        <div className="space-y-3">
          {quiz.map((q: any, qIdx: number) => {
            const chosen = selectedAnswers[qIdx];
            const isCorrect = isSubmitted && chosen === q.correctIndex;

            return (
              <div key={q.id || qIdx} className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-zinc-900 leading-snug">
                    <span className="text-zinc-500 mr-1.5">Câu {qIdx + 1}:</span>
                    {q.question}
                  </h4>
                  {isSubmitted && (
                    <span className="text-xs font-semibold shrink-0">
                      {isCorrect ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                        </span>
                      ) : (
                        <span className="text-red-700 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Sai
                        </span>
                      )}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {q.options?.map((opt: string, optIdx: number) => {
                    const isSelected = chosen === optIdx;
                    const isRight = q.correctIndex === optIdx;

                    let btnStyle = 'border-zinc-200/80 bg-white text-zinc-800 hover:border-zinc-400 hover:translate-x-0.5';
                    if (isSubmitted) {
                      if (isRight) {
                        btnStyle = 'border-emerald-600 bg-emerald-50/60 text-emerald-900 font-semibold';
                      } else if (isSelected && !isRight) {
                        btnStyle = 'border-red-600 bg-red-50/60 text-red-900 line-through';
                      }
                    } else if (isSelected) {
                      btnStyle = 'border-zinc-900 bg-zinc-900/[0.04] text-zinc-900 font-semibold shadow-xs';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center gap-2.5 transition-all duration-150 ${btnStyle}`}
                      >
                        <span className="w-5 h-5 rounded-md bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-zinc-200/60">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {isSubmitted && q.explanation && (
                  <div className="p-2.5 rounded-lg bg-white border border-zinc-200/80 text-xs text-zinc-600 mt-2">
                    <strong className="text-zinc-900">Giải thích: </strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-1">
          {isSubmitted ? (
            <Button
              id="btn-reset-quiz"
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setIsSubmitted(false); setSelectedAnswers({}); }}
              className="bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] rounded-xl text-xs font-medium h-9"
            >
              Làm lại câu hỏi
            </Button>
          ) : (
            <Button
              id="btn-check-quiz"
              type="button"
              size="sm"
              onClick={() => setIsSubmitted(true)}
              disabled={Object.keys(selectedAnswers).length === 0}
              className="bg-[#161616] text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl text-xs font-medium h-9"
            >
              Kiểm tra kết quả
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const LearningWorkspace = ({ courseId, onBack }: { courseId: string; onBack: () => void }) => {
  const [data, setData] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [lessonContent, setLessonContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [takingExamId, setTakingExamId] = useState<string | null>(null);
  const [studyingFlashcardDeck, setStudyingFlashcardDeck] = useState<{ id: string; title: string } | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [summaryChapterId, setSummaryChapterId] = useState<string | null>(null);
  const [completingChapter, setCompletingChapter] = useState(false);
  const [completingCourse, setCompletingCourse] = useState(false);
  const [courseCompletionStats, setCourseCompletionStats] = useState<CourseCompletionStats | null>(null);

  const fetchCourseData = async () => {
    try {
      const res = await studentCourseService.getCourseDetails(courseId);
      if (res.status === 'success') {
        setData(res.data);
        // Tự động chọn bài học đầu tiên nếu chưa chọn
        if (res.data.syllabus.length > 0 && res.data.syllabus[0].lessons.length > 0 && !activeLesson) {
          handleSelectLesson(res.data.syllabus[0].lessons[0]);
        }
        return res.data;
      }
    } catch (error) {
      toast.error("Không thể tải khóa học");
    } finally {
      setLoading(false);
    }
    return null;
  };

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const handleSelectLesson = async (lesson: any) => {
    setSummaryChapterId(null);
    setActiveLesson(lesson);
    setLessonContent(null);
    setLessonError(null);
    try {
      const res = await studentCourseService.getLessonContent(courseId, lesson._id);
      if (res.status === 'success') {
        setLessonContent(res.data);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Lỗi khi tải nội dung bài học";
      setLessonError(message);
      toast.error(message);
    }
  };

  const handleMarkComplete = async () => {
    if (!activeLesson) return;
    try {
      const res = await studentCourseService.completeLesson(courseId, activeLesson._id);
      if (res.status === 'success') {
        toast.success(res.message);
        const fresh = await fetchCourseData(); // Reload progress
        if (!fresh) return;

        // Học xong toàn bộ bài của chương (bài cuối cùng) -> hiện màn hình tổng kết chương
        const chapter = fresh.syllabus.find((c: any) => c.lessons.some((l: any) => l._id === activeLesson._id));
        if (chapter) {
          const doneIds: string[] = fresh.completedLessons ?? [];
          const allDone = chapter.lessons.every((l: any) => doneIds.includes(l._id));
          const alreadyConfirmed = (fresh.completedChapters ?? []).includes(chapter._id);
          if (allDone && !alreadyConfirmed) {
            setSummaryChapterId(chapter._id);
          }
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi hoàn thành bài học");
    }
  };

  // Xác nhận hoàn thành chương -> lưu DB -> mở khóa chương kế -> chuyển sang bài đầu của chương mới
  const handleCompleteChapter = async () => {
    if (!summaryChapterId || !data) return;
    setCompletingChapter(true);
    try {
      const res = await studentCourseService.completeChapter(courseId, summaryChapterId);
      if (res.status !== 'success') return;

      await fetchCourseData(); // Cập nhật completedChapters + unlockedChapterIds

      const { isLastChapter, nextLessonId } = res.data;
      if (isLastChapter) {
        toast.success(res.message); // Giữ nguyên màn tổng kết chương cuối
        return;
      }

      const nextLesson = data.syllabus
        .flatMap((c: any) => c.lessons)
        .find((l: any) => l._id === nextLessonId);
      if (nextLesson) {
        toast.success("Đã mở khóa chương tiếp theo!");
        await handleSelectLesson(nextLesson);
      } else {
        toast.success(res.message);
        setSummaryChapterId(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi hoàn thành chương");
    } finally {
      setCompletingChapter(false);
    }
  };

  // Hoàn thành khóa học -> lưu is_completed/completed_at -> hiện màn hình chúc mừng + confetti
  const handleCompleteCourse = async () => {
    setCompletingCourse(true);
    try {
      const res = await studentCourseService.completeCourse(courseId);
      if (res.status === 'success') {
        await fetchCourseData(); // Cập nhật isCompleted/completedAt
        setCourseCompletionStats(res.data);
        if (!res.data.alreadyCompleted) toast.success(res.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi hoàn thành khóa học");
    } finally {
      setCompletingCourse(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
        <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-2" />
        <h3 className="text-lg font-semibold">Không tìm thấy nội dung khóa học</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Khóa học này có thể chưa có nội dung bài giảng hoặc đang được cập nhật.
        </p>
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Button>
      </div>
    );
  }

  // Nếu đang mở bài kiểm tra đính kèm
  if (takingExamId) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-background">
        <div className="p-3 border-b flex items-center justify-between bg-card shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setTakingExamId(null)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Quay lại bài học
          </Button>
          <span className="text-sm font-medium text-muted-foreground">Bài kiểm tra đính kèm của bài học: {activeLesson?.title}</span>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <ExamTakingView 
            examId={takingExamId} 
            onBack={() => {
              setTakingExamId(null);
              fetchCourseData();
            }} 
          />
        </div>
      </div>
    );
  }

  // Nếu đang mở bộ thẻ Flashcard đính kèm
  if (studyingFlashcardDeck) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-background">
        <div className="flex-1 overflow-auto p-6">
          <FlashcardStudySession 
            deckId={studyingFlashcardDeck.id}
            deckTitle={studyingFlashcardDeck.title}
            onBack={() => {
              setStudyingFlashcardDeck(null);
              fetchCourseData();
            }} 
          />
        </div>
      </div>
    );
  }

  // --- Dữ liệu dẫn xuất cho tiến độ chương ---
  const completedLessonIds: string[] = data.completedLessons ?? [];
  const completedChapterIds: string[] = data.completedChapters ?? [];
  const unlockedChapterIds: string[] = data.unlockedChapterIds ?? data.syllabus.map((c: any) => c._id);
  const activeChapter = data.syllabus.find((c: any) => c.lessons.some((l: any) => l._id === activeLesson?._id));
  const isActiveChapterFullyLearned =
    !!activeChapter && activeChapter.lessons.every((l: any) => completedLessonIds.includes(l._id));
  const summaryChapterIndex = data.syllabus.findIndex((c: any) => c._id === summaryChapterId);
  const summaryChapter = summaryChapterIndex >= 0 ? data.syllabus[summaryChapterIndex] : null;
  const summaryNextChapter = summaryChapter ? data.syllabus[summaryChapterIndex + 1] : null;

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-background">
      {courseCompletionStats && (
        <CourseCompletion
          courseId={data.course._id}
          courseTitle={data.course.title}
          stats={courseCompletionStats}
          onClose={() => setCourseCompletionStats(null)}
          onExit={onBack}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        <div className="p-4 border-b border-zinc-200/80 flex items-center justify-between bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl h-9 w-9"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="font-extrabold text-base text-zinc-900 tracking-tight">{data.course.title}</h1>
              <div className="flex items-center gap-2.5 text-xs text-zinc-500 mt-0.5">
                <span>Tiến độ: {data.progress}%</span>
                <div className="w-28 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-zinc-900 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ width: `${Math.min(100, Math.round(data.progress))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {data.isCompleted && (
            <span className="inline-flex items-center gap-1.5 bg-zinc-900 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-xs">
              <CheckCircle className="w-3.5 h-3.5" /> Đã hoàn thành khóa học
            </span>
          )}
        </div>

        <ScrollArea className="flex-1 p-6">
          {summaryChapter ? (
            <ChapterSummary
              chapter={summaryChapter}
              completedLessonIds={completedLessonIds}
              isChapterCompleted={completedChapterIds.includes(summaryChapter._id)}
              isLastChapter={!summaryNextChapter}
              nextChapterTitle={summaryNextChapter ? `Chương ${summaryNextChapter.order}: ${summaryNextChapter.title}` : undefined}
              submitting={completingChapter}
              onConfirm={handleCompleteChapter}
              onReviewLesson={handleSelectLesson}
              onBack={() => setSummaryChapterId(null)}
              isCourseCompleted={!!data.isCompleted}
              completingCourse={completingCourse}
              onCompleteCourse={handleCompleteCourse}
            />
          ) : lessonContent ? (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 mb-1.5">{lessonContent.title}</h2>
                <div className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
                  <PlayCircle className="w-3.5 h-3.5 text-zinc-700" /> {lessonContent.durationMinutes} phút học
                </div>
              </div>

              {lessonContent.videoUrl && (
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-zinc-950 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-zinc-200/80">
                  {lessonContent.videoUrl.includes('youtube') || lessonContent.videoUrl.includes('youtu.be') ? (
                    <iframe 
                      className="w-full h-full"
                      src={formatVideoEmbedUrl(lessonContent.videoUrl)} 
                      title="Lesson Video Player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                      allowFullScreen 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <video src={lessonContent.videoUrl} controls className="w-full h-full" />
                    </div>
                  )}
                </div>
              )}

              {lessonContent.blocks && lessonContent.blocks.length > 0 && (
                <div className="space-y-6 my-6">
                  {lessonContent.blocks.map((block: any) => (
                    <Card key={block.id} className="border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] bg-zinc-50/50 rounded-2xl overflow-hidden">
                      <CardContent className="p-6">
                        {block.type === 'text' && (
                          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-zinc-800 leading-relaxed text-sm sm:text-base">{block.content}</div>
                        )}
                        {block.type === 'audio' && (
                          <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Audio bài học</span>
                            <audio controls src={block.content} className="w-full" />
                          </div>
                        )}
                        {block.type === 'video' && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Video minh họa</span>
                              {block.metadata?.showTranscript && (
                                <span className="text-[11px] bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-md font-medium border border-zinc-200/60">
                                  Interactive Shadowing
                                </span>
                              )}
                            </div>
                            <div className="aspect-video bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center shadow-md border border-zinc-200/80">
                              {block.content.includes('youtube.com') || block.content.includes('youtu.be') ? (
                                <iframe 
                                  className="w-full h-full" 
                                  src={formatVideoEmbedUrl(block.content)} 
                                  title="Block Video Player"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen 
                                />
                              ) : (
                                <video controls src={block.content} className="w-full h-full" />
                              )}
                            </div>
                          </div>
                        )}
                        {(block.type === 'fill_in_the_blank' || block.type === 'drag_drop') && (
                          <InteractiveBlock block={block} />
                        )}
                        {block.type === 'speech_recognition' && (
                          <div className="flex flex-col gap-3">
                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Luyện phát âm</span>
                            <div className="p-4 bg-white rounded-xl border border-zinc-200 text-lg text-center italic text-zinc-800 font-serif shadow-xs">
                              "{block.content}"
                            </div>
                            <Button variant="outline" className="w-full max-w-xs mx-auto rounded-xl gap-2 bg-white border-zinc-200 text-zinc-800 hover:border-zinc-400 active:scale-[0.98] text-xs font-medium h-9">
                              <Mic className="w-3.5 h-3.5" /> Bấm để thu âm
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {lessonContent.content && (
                <Card className="border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] bg-white rounded-2xl">
                  <CardContent className="p-6 prose dark:prose-invert max-w-none">
                     <div className="whitespace-pre-wrap text-zinc-800 leading-relaxed text-sm sm:text-base">{lessonContent.content}</div>
                  </CardContent>
                </Card>
              )}

              {/* Ghi chú bài giảng (Lesson Notes) */}
              {lessonContent.notes && (
                <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/70 space-y-1.5 my-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5 text-zinc-700" /> Ghi chú bài giảng
                  </div>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                    {lessonContent.notes}
                  </p>
                </div>
              )}

              {/* Từ vựng Inline (Vocabulary Flashcards) */}
              {lessonContent.vocabulary && lessonContent.vocabulary.length > 0 && (
                <InlineVocabPlayer vocabulary={lessonContent.vocabulary} />
              )}

              {/* Câu hỏi trắc nghiệm Inline (Mini Quiz) */}
              {lessonContent.quiz && lessonContent.quiz.length > 0 && (
                <InlineQuizPlayer quiz={lessonContent.quiz} />
              )}

              {/* Đính kèm Bài kiểm tra (Attached Exam) */}
              {lessonContent.attachedExamId && (
                <Card className="border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-2xl my-6 overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-zinc-900 hover:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.07)] group">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-zinc-900 text-white px-2.5 py-0.5 rounded-full">
                            <FileText className="w-3.5 h-3.5 mr-0.5" /> Bài kiểm tra đính kèm
                          </span>
                          {typeof lessonContent.attachedExamId === 'object' && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {lessonContent.attachedExamId.totalQuestions > 0 && (
                                <span className="text-[11px] font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-200/60">
                                  {lessonContent.attachedExamId.totalQuestions} câu hỏi
                                </span>
                              )}
                              {lessonContent.attachedExamId.durationMinutes && (
                                <span className="text-[11px] font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-200/60">
                                  {lessonContent.attachedExamId.durationMinutes} phút
                                </span>
                              )}
                              {lessonContent.attachedExamId.level && (
                                <span className="text-[11px] font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-200/60">
                                  {lessonContent.attachedExamId.level}
                                </span>
                              )}
                            </div>
                          )}
                          {lessonContent.isRequiredToPassExam && (
                            <span className="text-[11px] font-medium border border-zinc-300 text-zinc-700 px-2 py-0.5 rounded-md">
                              Bắt buộc hoàn thành
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold tracking-tight text-zinc-900">
                          {typeof lessonContent.attachedExamId === 'object' 
                            ? lessonContent.attachedExamId.title 
                            : "Bài kiểm tra cuối bài học"}
                        </h3>
                        {typeof lessonContent.attachedExamId === 'object' && lessonContent.attachedExamId.description && (
                          <p className="text-xs text-zinc-500 line-clamp-2">
                            {lessonContent.attachedExamId.description}
                          </p>
                        )}
                      </div>

                      <Button 
                        className="shrink-0 gap-2 bg-[#161616] text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl px-5 h-11 text-sm font-medium group/btn"
                        onClick={() => {
                          const id = typeof lessonContent.attachedExamId === 'object' 
                            ? lessonContent.attachedExamId._id 
                            : lessonContent.attachedExamId;
                          setTakingExamId(id);
                        }}
                      >
                        <PlayCircle className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform duration-200" /> Bắt đầu làm bài kiểm tra
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Đính kèm Flashcards (Attached Flashcard) */}
              {lessonContent.attachedFlashcardId && (
                <Card className="border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-2xl my-4 overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-zinc-900 hover:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.07)] group">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-zinc-100 text-zinc-800 rounded-xl border border-zinc-200/60">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold bg-zinc-100 text-zinc-800 px-2.5 py-0.5 rounded-md border border-zinc-200/60">
                              📚 Bộ thẻ Flashcard đính kèm
                            </span>
                            {typeof lessonContent.attachedFlashcardId === 'object' && typeof lessonContent.attachedFlashcardId.cardCount === 'number' && (
                              <span className="text-[11px] font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-200/60">
                                {lessonContent.attachedFlashcardId.cardCount} thẻ ghi nhớ
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold tracking-tight text-zinc-900">
                            {typeof lessonContent.attachedFlashcardId === 'object' 
                              ? lessonContent.attachedFlashcardId.title 
                              : "Bộ thẻ từ vựng của bài học"}
                          </h3>
                          {typeof lessonContent.attachedFlashcardId === 'object' && lessonContent.attachedFlashcardId.description && (
                            <p className="text-xs text-zinc-500 line-clamp-2">
                              {lessonContent.attachedFlashcardId.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button 
                        className="shrink-0 gap-2 bg-[#161616] text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl px-5 h-11 text-sm font-medium group/btn"
                        onClick={() => {
                          const id = typeof lessonContent.attachedFlashcardId === 'object' 
                            ? lessonContent.attachedFlashcardId._id 
                            : lessonContent.attachedFlashcardId;
                          const title = typeof lessonContent.attachedFlashcardId === 'object' 
                            ? lessonContent.attachedFlashcardId.title 
                            : "Bộ thẻ từ vựng của bài học";
                          setStudyingFlashcardDeck({ id, title });
                        }}
                      >
                        <Sparkles className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform duration-200" /> Luyện tập thẻ nhớ (SRS)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="pt-6 border-t border-zinc-200/80 flex justify-between items-center gap-3 flex-wrap">
                 <Button 
                   variant="outline" 
                   onClick={onBack}
                   className="bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 rounded-xl text-xs font-medium h-10 px-4"
                 >
                   Thoát bài học
                 </Button>
                 <div className="flex items-center gap-3">
                   {isActiveChapterFullyLearned && activeChapter && (
                     <Button 
                       variant="outline" 
                       className="gap-2 bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-400 rounded-xl text-xs sm:text-sm font-medium h-10 px-4" 
                       onClick={() => setSummaryChapterId(activeChapter._id)}
                     >
                       <ListChecks className="w-4 h-4" /> Tổng kết chương
                     </Button>
                   )}
                   {data.completedLessons?.includes(activeLesson?._id) ? (
                     <Button 
                       className="bg-zinc-100 text-zinc-700 border border-zinc-200/80 shadow-none cursor-default rounded-xl font-medium text-xs sm:text-sm h-10 px-5 gap-2" 
                       disabled
                     >
                       <CheckCircle className="w-4 h-4" /> Đã hoàn thành bài học
                     </Button>
                   ) : (
                     <Button 
                       className="bg-[#161616] text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl font-medium text-xs sm:text-sm h-10 px-5 gap-2" 
                       onClick={handleMarkComplete}
                     >
                       <CheckCircle className="w-4 h-4" /> Hoàn thành bài học
                     </Button>
                   )}
                 </div>
              </div>
            </div>
          ) : activeLesson && lessonError ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 min-h-[300px]">
              <Lock className="w-10 h-10 text-zinc-400" />
              <p className="font-medium text-zinc-800">{lessonError}</p>
            </div>
          ) : activeLesson ? (
            <div className="h-full flex items-center justify-center min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 border-t-transparent"></div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 min-h-[300px]">
              <BookOpen className="w-10 h-10 text-zinc-400 mx-auto" />
              <p className="font-semibold text-zinc-900">Chưa có bài học nào trong khóa học này.</p>
              <p className="text-xs max-w-xs text-zinc-500">Bạn có thể vào Creator Studio để thêm chương và bài giảng cho khóa học.</p>
              <Button variant="outline" size="sm" onClick={onBack} className="gap-1 mt-2 bg-white text-zinc-700 border-zinc-200 rounded-xl">
                <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Syllabus Sidebar */}
      <div className="w-80 border-l border-zinc-200/80 bg-zinc-50/70 flex flex-col">
        <div className="p-4 border-b border-zinc-200/80 font-semibold text-xs tracking-wider uppercase text-zinc-500 bg-white">
          Nội dung khóa học
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {data.syllabus.map((chapter: any) => {
              const isUnlocked = unlockedChapterIds.includes(chapter._id);
              const isChapterDone = completedChapterIds.includes(chapter._id);
              const doneCount = chapter.lessons.filter((l: any) => completedLessonIds.includes(l._id)).length;
              return (
              <div key={chapter._id} className={`space-y-2 transition-opacity ${isUnlocked ? '' : 'opacity-60'}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-xs uppercase text-zinc-500 tracking-wider">
                    Chương {chapter.order}: {chapter.title}
                  </h3>
                  {isChapterDone ? (
                    <CheckCircle className="w-4 h-4 text-zinc-900 shrink-0" />
                  ) : !isUnlocked ? (
                    <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  ) : (
                    <span className="text-[11px] text-zinc-500 font-mono shrink-0">{doneCount}/{chapter.lessons.length}</span>
                  )}
                </div>
                <div className="space-y-1">
                  {chapter.lessons.map((lesson: any) => {
                    const isCompleted = data.completedLessons?.includes(lesson._id);
                    const isActive = activeLesson?._id === lesson._id;
                    return (
                      <button
                        key={lesson._id}
                        disabled={!isUnlocked}
                        onClick={() => handleSelectLesson(lesson)}
                        title={isUnlocked ? undefined : 'Hoàn thành chương trước để mở khóa'}
                        className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all duration-150 ${
                          !isUnlocked ? 'cursor-not-allowed opacity-50' : ''
                        } ${
                          isActive 
                            ? 'bg-white border border-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-zinc-900' 
                            : `${isUnlocked ? 'hover:bg-white hover:border-zinc-200/80' : ''} border border-transparent text-zinc-600`
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {!isUnlocked ? (
                            <Lock className="w-4 h-4 text-zinc-400" />
                          ) : isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-zinc-900" />
                          ) : (
                            <Circle className={`w-4 h-4 ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-xs leading-snug line-clamp-2 ${isActive ? 'text-zinc-900 font-semibold' : 'text-zinc-700'}`}>
                            {lesson.order}. {lesson.title}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="flex items-center gap-1"><PlayCircle className="w-3 h-3" /> {lesson.durationMinutes}p</span>
                            {lesson.attachedExamId && (
                              <span className="text-[10px] px-1.5 py-0 rounded bg-zinc-100 text-zinc-700 border border-zinc-200/60 font-medium">
                                Quiz
                              </span>
                            )}
                            {lesson.attachedFlashcardId && (
                              <span className="text-[10px] px-1.5 py-0 rounded bg-zinc-100 text-zinc-700 border border-zinc-200/60 font-medium">
                                Cards
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
