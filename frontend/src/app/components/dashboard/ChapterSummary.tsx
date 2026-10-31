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
    { icon: BookOpen, label: "Bài đã học", value: `${completedCount}/${lessons.length}`, tone: "text-emerald-600 bg-emerald-500/10" },
    { icon: Clock, label: "Tổng thời lượng", value: formatDuration(totalMinutes), tone: "text-sky-600 bg-sky-500/10" },
    { icon: FileText, label: "Bài kiểm tra", value: String(quizCount), tone: "text-primary bg-primary/10" },
    { icon: Layers, label: "Bộ flashcard", value: String(deckCount), tone: "text-indigo-600 bg-indigo-500/10" },
  ];

  return (
    <div
      id="chapter-summary"
      className="max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500"
    >
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-background to-emerald-500/10 p-8 text-center shadow-sm">
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
            <PartyPopper className="h-8 w-8" />
          </div>
          <Badge variant="secondary" className="font-medium">
            Chương {chapter.order}
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight">Hoàn thành chương: {chapter.title}</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {chapter.description || "Bạn đã học xong toàn bộ bài học của chương này. Cùng nhìn lại hành trình của bạn nhé!"}
          </p>
          <div className="mx-auto max-w-xs pt-2">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Tiến độ chương</span>
              <span className="font-semibold text-foreground">{percent}%</span>
            </div>
            <Progress value={percent} className="h-2" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-none bg-muted/30 shadow-sm transition-transform hover:-translate-y-0.5">
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <div className={`rounded-lg p-2 ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-xl font-bold leading-none">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lesson checklist */}
      <Card className="border shadow-sm">
        <CardContent className="space-y-1 p-4">
          <div className="px-2 pb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Các bài học trong chương
          </div>
          {lessons.map((lesson) => {
            const done = completedLessonIds.includes(lesson._id);
            return (
              <button
                key={lesson._id}
                type="button"
                onClick={() => onReviewLesson(lesson)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
              >
                <CheckCircle className={`h-5 w-5 shrink-0 ${done ? "text-green-500" : "text-muted-foreground/40"}`} />
                <span className="flex-1 text-sm font-medium leading-tight">
                  {lesson.order}. {lesson.title}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{lesson.durationMinutes} phút</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Call-to-action */}
      <div className="flex flex-col items-center gap-3 border-t pt-6 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Xem lại bài học
        </Button>

        {isLastChapter && isChapterCompleted ? (
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" /> Bạn đã hoàn thành chương cuối cùng!
            </div>
            {onCompleteCourse && (
              <Button
                id="course-complete-cta"
                size="lg"
                disabled={completingCourse}
                onClick={onCompleteCourse}
                className="gap-2 bg-gradient-to-r from-amber-500 to-emerald-600 font-semibold text-white shadow-md transition-all hover:shadow-lg"
              >
                {completingCourse ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trophy className="h-5 w-5" />}
                {isCourseCompleted ? "Xem tổng kết khóa học" : "Hoàn thành khóa học"}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 sm:items-end">
            <Button
              id="chapter-complete-cta"
              size="lg"
              disabled={submitting}
              onClick={onConfirm}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 font-semibold shadow-md transition-all hover:shadow-lg"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {ctaLabel}
              {!submitting && <ArrowRight className="h-5 w-5" />}
            </Button>
            {!isLastChapter && nextChapterTitle && (
              <span className="text-xs text-muted-foreground">Tiếp theo: {nextChapterTitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
