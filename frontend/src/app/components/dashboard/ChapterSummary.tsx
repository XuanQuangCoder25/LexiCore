import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  Layers,
  Loader2,
  PartyPopper,
  Sparkles,
  Trophy,
} from "lucide-react";

interface ChapterSummaryProps {
  chapter: any; // { _id, order, title, description, lessons[] }
  completedLessonIds: string[];
  isChapterCompleted: boolean; // Chương đã được xác nhận hoàn thành trên server
  isLastChapter: boolean;
  nextChapterTitle?: string;
  submitting: boolean;
  onConfirm: () => void;
  onReviewLesson: (lesson: any) => void;
  onBack: () => void;
  // Cấp khóa học: chỉ dùng ở chương cuối
  isCourseCompleted?: boolean;
  completingCourse?: boolean;
  onCompleteCourse?: () => void;
}

const formatDuration = (totalMinutes: number) => {
  if (totalMinutes < 60) return `${totalMinutes} phút`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} giờ` : `${hours} giờ ${minutes} phút`;
};

export const ChapterSummary = ({
  chapter,
  completedLessonIds,
  isChapterCompleted,
  isLastChapter,
  nextChapterTitle,
  submitting,
  onConfirm,
  onReviewLesson,
  onBack,
  isCourseCompleted = false,
  completingCourse = false,
  onCompleteCourse,
}: ChapterSummaryProps) => {
  const lessons: any[] = chapter.lessons ?? [];
  const completedCount = lessons.filter((l) => completedLessonIds.includes(l._id)).length;
  const totalMinutes = lessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
  const quizCount = lessons.filter((l) => l.attachedExamId).length;
  const deckCount = lessons.filter((l) => l.attachedFlashcardId).length;
  const percent = lessons.length === 0 ? 100 : Math.round((completedCount / lessons.length) * 100);

  const ctaLabel = isLastChapter
    ? "Hoàn thành chương cuối"
    : isChapterCompleted
      ? "Sang chương tiếp theo"
      : "Hoàn thành & Sang chương tiếp theo";

  const stats = [
    { icon: BookOpen, label: "Bài đã học", value: `${completedCount}/${lessons.length}` },
    { icon: Clock, label: "Tổng thời lượng", value: formatDuration(totalMinutes) },
    { icon: FileText, label: "Bài kiểm tra", value: String(quizCount) },
    { icon: Layers, label: "Bộ flashcard", value: String(deckCount) },
  ];

  return (
    <div
      id="chapter-summary"
      className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300"
    >
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="relative space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#161616] text-white shadow-md">
            <PartyPopper className="h-7 w-7" />
          </div>
          <span className="inline-block text-xs font-semibold bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full border border-zinc-200/60">
            Chương {chapter.order}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">Hoàn thành chương: {chapter.title}</h2>
          <p className="mx-auto max-w-md text-xs sm:text-sm text-zinc-500 leading-relaxed">
            {chapter.description || "Bạn đã học xong toàn bộ bài học của chương này. Cùng nhìn lại hành trình của bạn nhé!"}
          </p>
          <div className="mx-auto max-w-xs pt-2">
            <div className="mb-1 flex justify-between text-xs text-zinc-500">
              <span>Tiến độ chương</span>
              <span className="font-semibold text-zinc-900 font-mono">{percent}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-zinc-900 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chapter Summary & Key Takeaways Card */}
      {(chapter.summary || (chapter.keyTakeaways && chapter.keyTakeaways.length > 0)) && (
        <Card className="border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-6 space-y-4">
            {chapter.summary && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5 text-zinc-700" /> Tóm tắt kiến thức chương
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {chapter.summary}
                </p>
              </div>
            )}

            {chapter.keyTakeaways && chapter.keyTakeaways.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-zinc-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-700" /> Các điểm cốt lõi bạn đã làm chủ (Key Takeaways)
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {chapter.keyTakeaways.map((point: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-zinc-200/60 bg-zinc-50/60 flex items-start gap-2.5 text-xs text-zinc-800"
                    >
                      <CheckCircle className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border border-zinc-200/70 bg-zinc-50/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 rounded-2xl">
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="rounded-xl p-2.5 bg-zinc-100 text-zinc-800 border border-zinc-200/60">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold text-zinc-900 leading-none">{s.value}</div>
              <div className="text-xs text-zinc-500 font-medium">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lesson checklist */}
      <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
        <CardContent className="space-y-1 p-4">
          <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Các bài học trong chương
          </div>
          {lessons.map((lesson) => {
            const done = completedLessonIds.includes(lesson._id);
            return (
              <button
                key={lesson._id}
                type="button"
                onClick={() => onReviewLesson(lesson)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-zinc-50"
              >
                <CheckCircle className={`h-4 w-4 shrink-0 ${done ? "text-zinc-900" : "text-zinc-300"}`} />
                <span className="flex-1 text-xs sm:text-sm font-medium text-zinc-800 leading-tight">
                  {lesson.order}. {lesson.title}
                </span>
                <span className="shrink-0 text-xs text-zinc-400 font-mono">{lesson.durationMinutes} phút</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Call-to-action */}
      <div className="flex flex-col items-center gap-3 border-t border-zinc-200/80 pt-6 sm:flex-row sm:justify-between">
        <Button 
          variant="outline" 
          onClick={onBack} 
          disabled={submitting}
          className="bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] rounded-xl text-xs font-medium h-10 px-4"
        >
          Xem lại bài học
        </Button>

        {isLastChapter && isChapterCompleted ? (
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <div className="flex items-center gap-2 rounded-xl bg-zinc-100 border border-zinc-200/70 px-4 py-2 text-xs font-medium text-zinc-800">
              <Sparkles className="h-3.5 w-3.5 text-zinc-600" /> Bạn đã hoàn thành chương cuối cùng!
            </div>
            {onCompleteCourse && (
              <Button
                id="course-complete-cta"
                disabled={completingCourse}
                onClick={onCompleteCourse}
                className="gap-2 bg-[#161616] text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl font-medium text-sm h-11 px-5"
              >
                {completingCourse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                {isCourseCompleted ? "Xem tổng kết khóa học" : "Hoàn thành khóa học"}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 sm:items-end">
            <Button
              id="chapter-complete-cta"
              disabled={submitting}
              onClick={onConfirm}
              className="gap-2 bg-[#161616] text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl font-medium text-sm h-11 px-5 group/cta"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {ctaLabel}
              {!submitting && <ArrowRight className="h-4 w-4 group-hover/cta:translate-x-0.5 transition-transform duration-200" />}
            </Button>
            {!isLastChapter && nextChapterTitle && (
              <span className="text-xs text-zinc-500">Tiếp theo: {nextChapterTitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
