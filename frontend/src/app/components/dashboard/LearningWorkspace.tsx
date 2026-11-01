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
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Bài tập: Điền từ</span>
        <div className="p-4 bg-background rounded-lg border border-border leading-relaxed text-lg">
          {block.content.split(/(\[.*?\])/g).map((part: string, i: number) => {
            if (part.startsWith('[') && part.endsWith(']')) {
              return (
                <input
                  key={i}
                  type="text"
                  className={`inline-block mx-1 px-2 py-1 w-24 bg-muted font-mono text-sm rounded border-b-2 outline-none focus:border-primary transition-colors ${showResult ? (isCorrect(i, answers[i] || '') ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600') : 'border-primary/50'}`}
                  value={answers[i] || ''}
                  onChange={(e) => { setAnswers({ ...answers, [i]: e.target.value }); setShowResult(false); }}
                />
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
        <Button variant="outline" className="self-end" onClick={checkAnswers}>Kiểm tra</Button>
      </div>
    );
  }

  if (block.type === 'drag_drop') {
    return (
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Bài tập: Kéo thả từ</span>
        
        <div className="flex flex-wrap gap-2 mb-4 p-4 bg-muted/30 rounded-lg min-h-[60px]">
          {availableWords.map((word, i) => (
            <div 
              key={i} 
              draggable 
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', word); setDraggedWord(word); }}
              onDragEnd={() => setDraggedWord(null)}
              className="px-3 py-1 bg-white border shadow-sm rounded cursor-grab active:cursor-grabbing hover:border-primary select-none font-medium text-primary"
            >
              {word}
            </div>
          ))}
          {availableWords.length === 0 && <span className="text-muted-foreground italic text-sm">Tuyệt vời! Bạn đã ghép xong.</span>}
        </div>

        <div className="p-4 bg-background rounded-lg border border-border leading-relaxed text-lg">
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
                  className={`inline-flex items-center justify-center mx-1 min-w-[80px] h-8 px-2 bg-muted font-mono text-sm rounded border-b-2 transition-colors cursor-pointer ${answered ? 'bg-primary/10 text-primary border-primary' : 'border-dashed border-muted-foreground/50 text-transparent'} ${showResult ? (isCorrect(i, answers[i] || '') ? 'border-green-500 text-green-600 bg-green-50' : 'border-red-500 text-red-600 bg-red-50') : ''}`}
                >
                  {answered || part.slice(1,-1)}
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
        <Button variant="outline" className="self-end" onClick={checkAnswers}>Kiểm tra</Button>
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
    <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-card shadow-sm my-6 overflow-hidden">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-semibold border-purple-200">
            <Languages className="w-3.5 h-3.5 mr-1" /> Thẻ từ vựng trọng tâm ({vocabulary.length} từ)
          </Badge>
          <span className="text-xs text-muted-foreground">
            Từ {index + 1} / {vocabulary.length}
          </span>
        </div>

        {current && (
          <div
            id="card-vocab-flashcard"
            onClick={() => setIsFlipped(!isFlipped)}
            className="aspect-[16/8] max-h-56 rounded-2xl border-2 border-purple-500/30 bg-card shadow-sm flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none transition-all hover:border-purple-500/50"
          >
            {!isFlipped ? (
              <div className="space-y-2">
                <h3 className="text-3xl font-extrabold text-foreground tracking-wide">
                  {current.term}
                </h3>
                {current.phonetic && (
                  <p className="text-sm font-mono text-muted-foreground">{current.phonetic}</p>
                )}
                {current.partOfSpeech && (
                  <Badge variant="outline" className="text-xs">
                    {current.partOfSpeech}
                  </Badge>
                )}
                <p className="text-[11px] text-muted-foreground pt-2 flex items-center justify-center gap-1">
                  <RotateCw className="w-3 h-3" /> Nhấn để lật xem nghĩa
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Định nghĩa & Ví dụ
                </span>
                <h4 className="text-xl font-bold text-foreground">
                  {current.meaning}
                </h4>
                {current.example && (
                  <p className="text-xs text-muted-foreground italic max-w-md">
                    "{current.example}"
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground pt-2 flex items-center justify-center gap-1">
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
    <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-card shadow-sm my-6 overflow-hidden">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-medium">
            <HelpCircle className="w-3.5 h-3.5 mr-1" /> Câu hỏi củng cố ({quiz.length} câu)
          </Badge>
          {isSubmitted && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Đã hoàn thành kiểm tra
            </span>
          )}
        </div>

        <div className="space-y-4">
          {quiz.map((q: any, qIdx: number) => {
            const chosen = selectedAnswers[qIdx];
            const isCorrect = isSubmitted && chosen === q.correctIndex;

            return (
              <div key={q.id || qIdx} className="p-4 rounded-xl border bg-card/60 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold">
                    <span className="text-amber-500 mr-2">Câu {qIdx + 1}:</span>
                    {q.question}
                  </h4>
                  {isSubmitted && (
                    <span className="text-xs font-semibold shrink-0">
                      {isCorrect ? (
                        <span className="text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                        </span>
                      ) : (
                        <span className="text-destructive flex items-center gap-1">
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

                    let btnStyle = 'border-border/60 hover:bg-muted/40';
                    if (isSubmitted) {
                      if (isRight) {
                        btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold';
                      } else if (isSelected && !isRight) {
                        btnStyle = 'border-destructive bg-destructive/10 text-destructive line-through';
                      }
                    } else if (isSelected) {
                      btnStyle = 'border-primary bg-primary/10 text-primary font-semibold';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center gap-3 transition-colors ${btnStyle}`}
                      >
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {isSubmitted && q.explanation && (
                  <div className="p-2.5 rounded-lg bg-muted/40 text-xs text-muted-foreground border mt-2">
                    <strong className="text-foreground">Giải thích: </strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          {isSubmitted ? (
            <Button
              id="btn-reset-quiz"
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setIsSubmitted(false); setSelectedAnswers({}); }}
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
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4 bg-card">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">{data.course.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Tiến độ: {data.progress}%</span>
              <Progress value={data.progress} className="w-32 h-2" />
              {data.isCompleted && (
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white gap-1">
                  <CheckCircle className="w-3 h-3" /> Đã hoàn thành khóa học
                </Badge>
              )}
            </div>
          </div>
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
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">{lessonContent.title}</h2>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <PlayCircle className="w-4 h-4" /> {lessonContent.durationMinutes} phút
                </div>
              </div>

              {lessonContent.videoUrl && (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg border">
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
                    <Card key={block.id} className="border-none shadow-sm bg-muted/10 overflow-hidden">
                      <CardContent className="p-6">
                        {block.type === 'text' && (
                          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{block.content}</div>
                        )}
                        {block.type === 'audio' && (
                          <div className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Audio</span>
                            <audio controls src={block.content} className="w-full" />
                          </div>
                        )}
                        {block.type === 'video' && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-primary uppercase tracking-wider">Video</span>
                              {block.metadata?.showTranscript && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">Interactive Shadowing</span>
                              )}
                            </div>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center shadow-md">
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
                            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Luyện nói</span>
                            <div className="p-4 bg-background rounded-lg border border-border text-xl text-center italic">
                              "{block.content}"
                            </div>
                            <Button variant="outline" className="w-full max-w-sm mx-auto rounded-full gap-2 border-primary text-primary hover:bg-primary/10">
                              <Mic className="w-4 h-4" /> Bấm để thu âm
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {lessonContent.content && (
                <Card className="border-none shadow-sm bg-muted/20">
                  <CardContent className="p-6 prose dark:prose-invert max-w-none">
                     <div className="whitespace-pre-wrap">{lessonContent.content}</div>
                  </CardContent>
                </Card>
              )}

              {/* Ghi chú bài giảng (Lesson Notes) */}
              {lessonContent.notes && (
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2 my-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    <FileText className="w-4 h-4" /> Ghi chú bài giảng
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
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
                <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-background to-card shadow-md my-6 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary hover:bg-primary text-white font-medium">
                            <FileText className="w-3.5 h-3.5 mr-1" /> Bài kiểm tra đính kèm
                          </Badge>
                          {typeof lessonContent.attachedExamId === 'object' && lessonContent.attachedExamId.totalQuestions > 0 && (
                            <span className="text-xs text-muted-foreground font-medium">
                              {lessonContent.attachedExamId.totalQuestions} câu hỏi
                            </span>
                          )}
                          {lessonContent.isRequiredToPassExam && (
                            <Badge variant="outline" className="border-amber-500 text-amber-600 text-[11px]">
                              Bắt buộc hoàn thành
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-xl font-bold tracking-tight">
                          {typeof lessonContent.attachedExamId === 'object' 
                            ? lessonContent.attachedExamId.title 
                            : "Bài kiểm tra cuối bài học"}
                        </h3>
                        {typeof lessonContent.attachedExamId === 'object' && lessonContent.attachedExamId.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {lessonContent.attachedExamId.description}
                          </p>
                        )}
                      </div>

                      <Button 
                        size="lg" 
                        className="shrink-0 gap-2 font-semibold shadow-md bg-primary hover:bg-primary/90"
                        onClick={() => {
                          const id = typeof lessonContent.attachedExamId === 'object' 
                            ? lessonContent.attachedExamId._id 
                            : lessonContent.attachedExamId;
                          setTakingExamId(id);
                        }}
                      >
                        <PlayCircle className="w-5 h-5" /> Bắt đầu làm bài kiểm tra
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Đính kèm Flashcards (Attached Flashcard) */}
              {lessonContent.attachedFlashcardId && (
                <Card className="border-2 border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-background to-card shadow-md my-4 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold border-indigo-200">
                              📚 Bộ thẻ Flashcard đính kèm
                            </Badge>
                          </div>
                          <h3 className="text-xl font-bold tracking-tight">
                            {typeof lessonContent.attachedFlashcardId === 'object' 
                              ? lessonContent.attachedFlashcardId.title 
                              : "Bộ thẻ từ vựng của bài học"}
                          </h3>
                          {typeof lessonContent.attachedFlashcardId === 'object' && lessonContent.attachedFlashcardId.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {lessonContent.attachedFlashcardId.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button 
                        size="lg" 
                        className="shrink-0 gap-2 font-semibold shadow-md bg-indigo-600 hover:bg-indigo-700 text-white"
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
                        <Sparkles className="w-4 h-4" /> Luyện tập thẻ nhớ (SRS)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="pt-6 border-t flex justify-between items-center gap-3 flex-wrap">
                 <Button variant="outline" onClick={onBack}>Thoát</Button>
                 <div className="flex items-center gap-3">
                   {isActiveChapterFullyLearned && activeChapter && (
                     <Button variant="outline" size="lg" className="gap-2" onClick={() => setSummaryChapterId(activeChapter._id)}>
                       <ListChecks className="w-5 h-5" /> Tổng kết chương
                     </Button>
                   )}
                   {data.completedLessons?.includes(activeLesson?._id) ? (
                     <Button size="lg" className="bg-green-500 hover:bg-green-600 shadow-md cursor-default text-white" disabled>
                       <CheckCircle className="w-5 h-5 mr-2" /> Đã hoàn thành
                     </Button>
                   ) : (
                     <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-md" onClick={handleMarkComplete}>
                       <CheckCircle className="w-5 h-5 mr-2" /> Hoàn thành bài học
                     </Button>
                   )}
                 </div>
              </div>
            </div>
          ) : activeLesson && lessonError ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 min-h-[300px]">
              <Lock className="w-10 h-10 text-muted-foreground/40" />
              <p className="font-medium text-foreground">{lessonError}</p>
            </div>
          ) : activeLesson ? (
            <div className="h-full flex items-center justify-center min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-3 min-h-[300px]">
              <BookOpen className="w-10 h-10 text-muted-foreground/40" />
              <p className="font-medium text-foreground">Chưa có bài học nào trong khóa học này.</p>
              <p className="text-xs max-w-xs text-muted-foreground">Bạn có thể vào Creator Studio để thêm chương và bài giảng cho khóa học.</p>
              <Button variant="outline" size="sm" onClick={onBack} className="gap-1 mt-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Syllabus Sidebar */}
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b font-semibold bg-muted/10">Nội dung khóa học</div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {data.syllabus.map((chapter: any) => {
              const isUnlocked = unlockedChapterIds.includes(chapter._id);
              const isChapterDone = completedChapterIds.includes(chapter._id);
              const doneCount = chapter.lessons.filter((l: any) => completedLessonIds.includes(l._id)).length;
              return (
              <div key={chapter._id} className={`space-y-2 transition-opacity ${isUnlocked ? '' : 'opacity-60'}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">
                    Chương {chapter.order}: {chapter.title}
                  </h3>
                  {isChapterDone ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : !isUnlocked ? (
                    <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <span className="text-[11px] text-muted-foreground shrink-0">{doneCount}/{chapter.lessons.length}</span>
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
                        className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all ${!isUnlocked ? 'cursor-not-allowed' : ''} ${isActive ? 'bg-primary/10 border-primary/20 border shadow-sm' : `${isUnlocked ? 'hover:bg-muted/50' : ''} border border-transparent`}`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {!isUnlocked ? <Lock className="w-5 h-5 text-muted-foreground" /> : isCompleted ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />}
                        </div>
                        <div>
                          <div className={`font-medium text-sm leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {lesson.order}. {lesson.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1"><PlayCircle className="w-3 h-3" /> {lesson.durationMinutes} phút</span>
                            {lesson.attachedExamId && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/40 text-primary font-normal">
                                Quiz
                              </Badge>
                            )}
                            {lesson.attachedFlashcardId && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-normal">
                                Cards
                              </Badge>
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
