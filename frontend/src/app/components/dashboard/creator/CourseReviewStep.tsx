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
  onGoToStep1?: () => void;
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
  onGoToStep1,
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
  const untitledChapters: Array<{ chapter: IChapterItem; index: number }> = [];
  const incompleteLessons: Array<{ chapter: IChapterItem; chapterIndex: number; lesson: ILessonItem; lessonIndex: number; reason: string }> = [];

  chapters.forEach((ch, chIdx) => {
    if (!(ch.title || '').trim()) {
      untitledChapters.push({ chapter: ch, index: chIdx });
    }
    if (!ch.lessons || ch.lessons.length === 0) {
      emptyChapters.push(ch);
    } else {
      totalLessons += ch.lessons.length;
      ch.lessons.forEach((l, lIdx) => {
        totalDurationMinutes += Number(l.durationMinutes || 0);
        const missingReasons: string[] = [];

        if (!(l.title || '').trim()) {
          missingReasons.push('Chưa nhập tiêu đề bài học');
        }

        if (l.type === 'video') {
          videoLessons++;
          if (!(l.videoUrl || '').trim()) {
            missingReasons.push('Chưa có đường dẫn (URL) video');
          }
        } else if (l.type === 'reading') {
          readingLessons++;
          if (!(l.content || '').trim() && (!l.blocks || l.blocks.length === 0)) {
            missingReasons.push('Chưa có nội dung văn bản lý thuyết');
          }
        } else if (l.type === 'vocabulary') {
          vocabLessons++;
          const validVocab = Array.isArray(l.vocabulary)
            ? l.vocabulary.filter((v) => (v.term || '').trim() && (v.meaning || '').trim())
            : [];
          const hasDeck = !!l.attachedFlashcardId && l.attachedFlashcardId !== 'none';
          if (validVocab.length === 0 && !hasDeck) {
            missingReasons.push('Chưa nhập từ vựng (đủ Từ & Nghĩa) hoặc liên kết bộ Flashcard');
          }
        } else if (l.type === 'quiz') {
          quizLessons++;
          const questions = Array.isArray(l.quiz) ? l.quiz : [];
          const hasExam = !!l.attachedExamId && l.attachedExamId !== 'none';
          if (questions.length === 0 && !hasExam) {
            missingReasons.push('Chưa có câu hỏi trắc nghiệm hoặc liên kết đề thi');
          } else if (questions.length > 0 && !hasExam) {
            const invalidQuestion = questions.find(
              (q) =>
                !(q.question || '').trim() ||
                !Array.isArray(q.options) ||
                q.options.map((o) => String(o).trim()).filter(Boolean).length < 2
            );
            if (invalidQuestion) {
              missingReasons.push('Có câu hỏi trắc nghiệm chưa nhập nội dung hoặc chưa đủ 2 đáp án');
            }
          }
        }

        if (missingReasons.length > 0) {
          incompleteLessons.push({
            chapter: ch,
            chapterIndex: chIdx,
            lesson: l,
            lessonIndex: lIdx,
            reason: missingReasons.join('; ')
          });
        }
      });
    }
  });

  const trimmedCourseTitle = (course.title || '').trim();
  const isCourseTitleValid = trimmedCourseTitle.length >= 3 && trimmedCourseTitle.length <= 120;
  const hasBlockingErrors =
    !isCourseTitleValid ||
    totalChapters === 0 ||
    emptyChapters.length > 0 ||
    untitledChapters.length > 0 ||
    incompleteLessons.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Overview Header Card */}
      <Card className="border border-zinc-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
        <div className="bg-zinc-50/80 p-6 border-b border-zinc-200/80">
          <div className="flex flex-col md:flex-row gap-5 items-start">
            <div className="w-32 h-20 md:w-40 md:h-24 rounded-xl overflow-hidden border border-zinc-200/80 bg-zinc-100 shrink-0 shadow-xs">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                  Chưa có ảnh bìa
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={course.isPublished ? 'default' : 'secondary'} className="text-xs rounded-full border-zinc-200">
                  {course.isPublished ? (
                    <><Globe className="w-3 h-3 mr-1 text-emerald-600" /> Đã xuất bản (Công khai)</>
                  ) : (
                    <><Lock className="w-3 h-3 mr-1 text-zinc-500" /> Bản nháp (Private Space)</>
                  )}
                </Badge>
                <Badge variant="outline" className="text-xs rounded-full border-zinc-200 bg-white text-zinc-700">
                  Level: {course.level || 'ALL'}
                </Badge>
                {course.tags?.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[11px] py-0 px-2 rounded-full border-zinc-200 bg-zinc-100 text-zinc-700">
                    #{t}
                  </Badge>
                ))}
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900">
                {course.title || 'Khóa học chưa đặt tên'}
              </h2>
              <p className="text-xs text-zinc-500 line-clamp-2">
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
              {isCourseTitleValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              Tên khóa học hợp lệ (tối thiểu 3 ký tự)
            </span>
            {isCourseTitleValid ? (
              <span className="text-emerald-500 font-medium">Đạt</span>
            ) : (
              <span className="text-destructive font-medium flex items-center gap-2">
                {!trimmedCourseTitle
                  ? 'Chưa nhập tên'
                  : trimmedCourseTitle.length < 3
                  ? `Quá ngắn (${trimmedCourseTitle.length}/3 ký tự)`
                  : 'Vượt quá 120 ký tự'}
                {onGoToStep1 && (
                  <button
                    type="button"
                    onClick={onGoToStep1}
                    className="underline font-semibold hover:opacity-80"
                  >
                    Sửa ngay (Bước 1)
                  </button>
                )}
              </span>
            )}
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
            <span className={totalChapters > 0 ? 'text-emerald-500 font-medium' : 'text-destructive font-medium'}>
              {totalChapters > 0 ? `${totalChapters} chương` : 'Chưa có chương nào'}
            </span>
          </div>

          {/* Rule 3: No empty chapters */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/40">
            <span className="flex items-center gap-2">
              {emptyChapters.length === 0 && untitledChapters.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              Tất cả các chương đều có tên và ít nhất 1 bài học (Không có chương rỗng)
            </span>
            {emptyChapters.length === 0 && untitledChapters.length === 0 ? (
              <span className="text-emerald-500 font-medium">Đạt</span>
            ) : (
              <span className="text-destructive font-medium">
                {emptyChapters.length > 0 ? `${emptyChapters.length} chương bị rỗng` : `${untitledChapters.length} chương thiếu tên`}
              </span>
            )}
          </div>

          {/* Rule 4: Lesson content completeness */}
          <div className="flex items-center justify-between text-xs py-1.5">
            <span className="flex items-center gap-2">
              {incompleteLessons.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              Nội dung các bài học được cấu hình đầy đủ để xuất bản
            </span>
            {incompleteLessons.length === 0 ? (
              <span className="text-emerald-500 font-medium">Đạt</span>
            ) : (
              <span className="text-destructive font-medium">{incompleteLessons.length} bài chưa hoàn thiện</span>
            )}
          </div>

          {/* Detailed Error List if any */}
          {!isCourseTitleValid && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-center justify-between gap-2 mt-2">
              <span className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {!trimmedCourseTitle
                  ? 'Tên khóa học đang để trống. Vui lòng nhập tên khóa học ở Bước 1.'
                  : `Tên khóa học "${trimmedCourseTitle}" quá ngắn (cần từ 3 đến 120 ký tự).`}
              </span>
              {onGoToStep1 && (
                <button
                  type="button"
                  onClick={onGoToStep1}
                  className="underline font-semibold shrink-0 hover:opacity-80"
                >
                  Sửa tại Bước 1 →
                </button>
              )}
            </div>
          )}

          {emptyChapters.length > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive space-y-1 mt-2">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Các chương rỗng cần bổ sung bài học:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-[11px]">
                {emptyChapters.map((ch) => (
                  <li key={ch.id}>
                    Chương "{ch.title || 'Không tên'}"
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTarget({ type: 'chapter', chapterId: ch.id });
                        onBackToStep2();
                      }}
                      className="ml-2 underline font-semibold hover:opacity-80"
                    >
                      Đi tới chương này →
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {incompleteLessons.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2 mt-2">
              <p className="font-semibold flex items-center gap-1.5 text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" /> Cần hoàn thiện {incompleteLessons.length} bài học sau trước khi xuất bản:
              </p>
              <ul className="space-y-1.5 pl-1 text-xs">
                {incompleteLessons.map(({ chapter, chapterIndex, lesson, lessonIndex, reason }) => (
                  <li
                    key={lesson.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded-lg bg-white border border-rose-200/80"
                  >
                    <div>
                      <span className="font-semibold text-zinc-900">
                        Chương {chapterIndex + 1} ({chapter.title || 'Không tên'}) • Bài {lessonIndex + 1}: "{lesson.title || 'Chưa đặt tên'}"
                      </span>
                      <p className="text-[11px] text-rose-600 mt-0.5">→ Thiếu: {reason}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTarget({ type: 'lesson', chapterId: chapter.id, lessonId: lesson.id });
                        onBackToStep2();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold text-[11px] hover:bg-rose-700 transition-colors shrink-0 self-start sm:self-center"
                    >
                      Bổ sung ngay →
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
                {ch.lessons.map((l, lIdx) => {
                  const incompleteInfo = incompleteLessons.find((item) => item.lesson.id === l.id);
                  return (
                    <div
                      key={l.id}
                      className={`flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg border text-xs ${
                        incompleteInfo
                          ? 'bg-rose-50/70 border-rose-200'
                          : 'bg-card/60 border-border/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground text-[10px] w-4">{lIdx + 1}.</span>
                        {l.type === 'video' && <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                        {l.type === 'reading' && <BookOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        {l.type === 'vocabulary' && <Languages className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                        {l.type === 'quiz' && <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        <span className="font-medium truncate">{l.title || 'Bài học chưa đặt tên'}</span>
                        {incompleteInfo && (
                          <span className="text-[11px] text-rose-600 font-medium">
                            ({incompleteInfo.reason})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {incompleteInfo && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectTarget({ type: 'lesson', chapterId: ch.id, lessonId: l.id });
                              onBackToStep2();
                            }}
                            className="text-[11px] font-semibold text-rose-600 underline hover:opacity-80"
                          >
                            Bổ sung ngay
                          </button>
                        )}
                        <span className="text-[11px] text-muted-foreground">{l.durationMinutes || 5} phút</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-200/80">
        <Button
          type="button"
          variant="outline"
          onClick={onBackToStep2}
          className="w-full sm:w-auto gap-2 rounded-xl border-zinc-200 hover:bg-zinc-50 text-zinc-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại: Chỉnh sửa khung chương trình
        </Button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex-1 sm:flex-none gap-2 rounded-xl border-zinc-200 hover:bg-zinc-50 text-zinc-800"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Đang lưu nháp...' : 'Lưu vào Private Space (Bản nháp)'}
          </Button>

          <Button
            type="button"
            onClick={onPublish}
            disabled={isPublishing}
            className="flex-1 sm:flex-none gap-2 bg-[#161616] hover:bg-black text-white shadow-xs rounded-xl active:scale-[0.99] transition-all font-semibold"
          >
            <Rocket className="w-4 h-4" />
            {isPublishing ? 'Đang xuất bản...' : 'Xuất bản khóa học (Public)'}
          </Button>
        </div>
      </div>
    </div>
  );
};
