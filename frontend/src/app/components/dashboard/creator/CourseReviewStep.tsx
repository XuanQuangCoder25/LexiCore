import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { 
  Rocket, 
  Save, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Video, 
  BookOpen, 
  Languages, 
  HelpCircle, 
  Clock, 
  Layers, 
  FolderTree, 
  ExternalLink,
  Target,
  Sparkles,
  Lock,
  Globe
} from 'lucide-react';
import { CourseBuilderState, IChapterItem, ILessonItem } from './courseBuilderState';

interface CourseReviewStepProps {
  state: CourseBuilderState;
  onBackToStep2: () => void;
  onSelectTarget: (target: any) => void;
  onSaveDraft: () => Promise<void>;
  onPublish: () => Promise<void>;
  isSaving: boolean;
  isPublishing: boolean;
  userRole?: string;
}

export const CourseReviewStep: React.FC<CourseReviewStepProps> = ({
  state,
  onBackToStep2,
  onSelectTarget,
  onSaveDraft,
  onPublish,
  isSaving,
  isPublishing,
  userRole = 'user'
}) => {
  const { course, chapters } = state;
  const isCreatorOrAdmin = userRole?.toLowerCase() === 'content_creator' || userRole?.toLowerCase() === 'admin';

  // Stats calculation
  const totalChapters = chapters.length;
  let totalLessons = 0;
  let totalDurationMinutes = 0;
  let videoLessons = 0;
  let readingLessons = 0;
  let vocabLessons = 0;
  let quizLessons = 0;

  const emptyChapters: IChapterItem[] = [];
  const incompleteLessons: Array<{ chapter: IChapterItem; lesson: ILessonItem; reason: string }> = [];

  chapters.forEach((ch) => {
    if (!ch.lessons || ch.lessons.length === 0) {
      emptyChapters.push(ch);
    } else {
      totalLessons += ch.lessons.length;
      ch.lessons.forEach((l) => {
        totalDurationMinutes += Number(l.durationMinutes || 0);
        if (l.type === 'video') {
          videoLessons++;
          if (!l.videoUrl) incompleteLessons.push({ chapter: ch, lesson: l, reason: 'Chưa có URL video' });
        } else if (l.type === 'reading') {
          readingLessons++;
          if (!l.content && (!l.blocks || l.blocks.length === 0)) {
            incompleteLessons.push({ chapter: ch, lesson: l, reason: 'Chưa có nội dung lý thuyết' });
          }
        } else if (l.type === 'vocabulary') {
          vocabLessons++;
          if ((!l.vocabulary || l.vocabulary.length === 0) && !l.attachedFlashcardId) {
            incompleteLessons.push({ chapter: ch, lesson: l, reason: 'Chưa có từ vựng hoặc flashcard liên kết' });
          }
        } else if (l.type === 'quiz') {
          quizLessons++;
          if ((!l.quiz || l.quiz.length === 0) && !l.attachedExamId) {
            incompleteLessons.push({ chapter: ch, lesson: l, reason: 'Chưa có câu hỏi trắc nghiệm hoặc đề thi' });
          }
        }
      });
    }
  });

  const hasBlockingErrors = !course.title.trim() || totalChapters === 0 || emptyChapters.length > 0;
  const hasWarnings = incompleteLessons.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Overview Header Card */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/40">
          <div className="flex flex-col md:flex-row gap-5 items-start">
            <div className="w-32 h-20 md:w-40 md:h-24 rounded-xl overflow-hidden border border-border/60 bg-muted shrink-0 shadow-sm">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  Chưa có ảnh bìa
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={course.isPublished ? 'default' : 'secondary'} className="text-xs">
                  {course.isPublished ? (
                    <><Globe className="w-3 h-3 mr-1" /> Đã xuất bản (Công khai)</>
                  ) : (
                    <><Lock className="w-3 h-3 mr-1" /> Bản nháp (Private Space)</>
                  )}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Level: {course.level || 'ALL'}
                </Badge>
                {course.tags?.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[11px] py-0 px-2">
                    #{t}
                  </Badge>
                ))}
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                {course.title || 'Khóa học chưa đặt tên'}
              </h2>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {course.shortDescription || course.description || 'Chưa có mô tả cho khóa học này.'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-primary" /> Tổng số chương
              </span>
              <p className="text-2xl font-bold mt-1">{totalChapters}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" /> Tổng số bài học
              </span>
              <p className="text-2xl font-bold mt-1">{totalLessons}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Tổng thời lượng
              </span>
              <p className="text-2xl font-bold mt-1">~{totalDurationMinutes} <span className="text-xs font-normal text-muted-foreground">phút</span></p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" /> Mục tiêu học tập
              </span>
              <p className="text-2xl font-bold mt-1">{course.objectives?.length || 0}</p>
            </div>
          </div>

          {/* Breakdown by Lesson Type */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border/40 text-xs">
            <span className="text-muted-foreground">Phân bổ loại bài:</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
              <Video className="w-3 h-3" /> {videoLessons} Video
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
              <BookOpen className="w-3 h-3" /> {readingLessons} Đọc lý thuyết
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
              <Languages className="w-3 h-3" /> {vocabLessons} Từ vựng
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
              <HelpCircle className="w-3 h-3" /> {quizLessons} Trắc nghiệm
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Validation Status Report */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Kiểm tra tính hợp lệ & Sẵn sàng xuất bản
          </CardTitle>
          <CardDescription className="text-xs">
            Hệ thống đảm bảo khóa học của bạn đầy đủ nội dung để học viên có trải nghiệm học tập tốt nhất.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Rule 1: Course title */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/40">
            <span className="flex items-center gap-2">
              {course.title.trim() ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              Tên khóa học hợp lệ
            </span>
            <span className="text-muted-foreground">{course.title.trim() ? 'Đạt' : 'Chưa nhập tên'}</span>
          </div>

          {/* Rule 2: Has chapters */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/40">
            <span className="flex items-center gap-2">
              {totalChapters > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              Khung chương trình có ít nhất 1 chương
            </span>
            <span className="text-muted-foreground">{totalChapters > 0 ? `${totalChapters} chương` : 'Chưa có chương nào'}</span>
          </div>

          {/* Rule 3: No empty chapters */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/40">
            <span className="flex items-center gap-2">
              {emptyChapters.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              Tất cả các chương đều có ít nhất 1 bài học (Không có chương rỗng)
            </span>
            {emptyChapters.length === 0 ? (
              <span className="text-emerald-500 font-medium">Đạt</span>
            ) : (
              <span className="text-destructive font-medium">{emptyChapters.length} chương bị rỗng</span>
            )}
          </div>

          {/* Rule 4: Lesson content completeness */}
          <div className="flex items-center justify-between text-xs py-1.5">
            <span className="flex items-center gap-2">
              {incompleteLessons.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
              Nội dung các bài học được cấu hình đầy đủ
            </span>
            {incompleteLessons.length === 0 ? (
              <span className="text-emerald-500 font-medium">Đạt</span>
            ) : (
              <span className="text-amber-500 font-medium">{incompleteLessons.length} bài chưa điền đủ</span>
            )}
          </div>

          {/* Detailed Error List if any */}
          {emptyChapters.length > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive space-y-1 mt-2">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Các chương rỗng cần bổ sung bài học:
              </p>
              <ul className="list-disc list-inside space-y-0.5 pl-2 text-[11px]">
                {emptyChapters.map((ch) => (
                  <li key={ch.id}>
                    Chương "{ch.title || 'Không tên'}"
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTarget({ type: 'chapter', chapterId: ch.id });
                        onBackToStep2();
                      }}
                      className="ml-2 underline font-medium hover:opacity-80"
                    >
                      Đi tới chương này
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {incompleteLessons.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400 space-y-1 mt-2">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Lưu ý các bài học chưa hoàn tất cấu hình:
              </p>
              <ul className="list-disc list-inside space-y-0.5 pl-2 text-[11px]">
                {incompleteLessons.slice(0, 5).map(({ chapter, lesson, reason }) => (
                  <li key={lesson.id}>
                    "{lesson.title || 'Bài học'}" ({reason})
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTarget({ type: 'lesson', chapterId: chapter.id, lessonId: lesson.id });
                        onBackToStep2();
                      }}
                      className="ml-2 underline font-medium hover:opacity-80"
                    >
                      Bổ sung ngay
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Curriculum Outline Preview */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-primary" />
            Cấu trúc chương trình học ({chapters.length} chương)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {chapters.map((ch, chIdx) => (
            <div key={ch.id} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                    {chIdx + 1}
                  </span>
                  {ch.title || 'Chương không tên'}
                </h4>
                <span className="text-xs text-muted-foreground">{ch.lessons.length} bài học</span>
              </div>
              {ch.description && (
                <p className="text-xs text-muted-foreground pl-7">{ch.description}</p>
              )}

              <div className="pl-7 space-y-1.5 pt-1">
                {ch.lessons.map((l, lIdx) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/40 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-[10px] w-4">{lIdx + 1}.</span>
                      {l.type === 'video' && <Video className="w-3.5 h-3.5 text-blue-500" />}
                      {l.type === 'reading' && <BookOpen className="w-3.5 h-3.5 text-emerald-500" />}
                      {l.type === 'vocabulary' && <Languages className="w-3.5 h-3.5 text-purple-500" />}
                      {l.type === 'quiz' && <HelpCircle className="w-3.5 h-3.5 text-amber-500" />}
                      <span className="font-medium">{l.title || 'Bài học chưa đặt tên'}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{l.durationMinutes || 5} phút</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40">
        <Button
          type="button"
          variant="outline"
          onClick={onBackToStep2}
          className="w-full sm:w-auto gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại: Chỉnh sửa khung chương trình
        </Button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex-1 sm:flex-none gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Đang lưu nháp...' : 'Lưu vào Private Space (Bản nháp)'}
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={onPublish}
            disabled={isPublishing || hasBlockingErrors}
            className="flex-1 sm:flex-none gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
          >
            <Rocket className="w-4 h-4" />
            {isPublishing ? 'Đang xuất bản...' : 'Xuất bản khóa học (Public)'}
          </Button>
        </div>
      </div>
    </div>
  );
};
