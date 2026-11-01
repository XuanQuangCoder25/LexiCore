import React, { useState, useEffect, useReducer } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Rocket,
  Plus,
  FolderTree,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Trash2,
  Video,
  BookOpen,
  Languages,
  HelpCircle,
  AlertTriangle,
  CheckCircle,
  Settings,
  Sparkles,
  ExternalLink,
  Layers,
  Clock,
  Eye,
  CheckCircle2,
  Lock,
  Globe
} from 'lucide-react';

import {
  courseBuilderReducer,
  createInitialState,
  LessonType,
  IChapterItem,
  ILessonItem,
  SelectionTarget,
  validateCourse
} from './courseBuilderState';
import { courseBuilderService } from '../../../services/course-builder-service';
import { CourseMetaStep } from './CourseMetaStep';
import { ChapterDetailEditor } from './ChapterDetailEditor';
import { LessonVideoEditor } from './LessonVideoEditor';
import { LessonReadingEditor } from './LessonReadingEditor';
import { LessonVocabEditor } from './LessonVocabEditor';
import { LessonQuizEditor } from './LessonQuizEditor';
import { CourseReviewStep } from './CourseReviewStep';
import { PublishRestrictedModal } from './PublishRestrictedModal';
import { CoursePreviewModal } from './CoursePreviewModal';

interface CourseBuilderProps {
  courseId: string;
  onBack: () => void;
  userRole?: string;
  onNavigateTab?: (tab: string) => void;
}

export const CourseBuilder: React.FC<CourseBuilderProps> = ({
  courseId,
  onBack,
  userRole = 'user',
  onNavigateTab
}) => {
  const [state, dispatch] = useReducer(courseBuilderReducer, createInitialState(courseId));
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Available resources
  const [availableFlashcards, setAvailableFlashcards] = useState<any[]>([]);
  const [availableExams, setAvailableExams] = useState<any[]>([]);

  // Dialogs
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [showAddLessonModal, setShowAddLessonModal] = useState<string | null>(null); // chapterId
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState<LessonType>('video');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showSavedSuccessModal, setShowSavedSuccessModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Collapsed chapters map
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});

  const isCreatorOrAdmin = userRole?.toLowerCase() === 'content_creator' || userRole?.toLowerCase() === 'admin';

  // 1. Fetch Course Data & Resources
  const fetchData = async () => {
    try {
      setLoading(true);
      const [builderRes, resourcesRes] = await Promise.all([
        courseBuilderService.getCourseBuilderData(courseId),
        courseBuilderService.getMyResources().catch(() => ({ status: 'success', data: { flashcards: [], exams: [] } }))
      ]);

      if (builderRes.status === 'success' && builderRes.data) {
        dispatch({
          type: 'HYDRATE_TREE',
          payload: {
            course: builderRes.data.course || {},
            chapters: builderRes.data.chapters || []
          }
        });
      }

      if (resourcesRes?.status === 'success' && resourcesRes.data) {
        setAvailableFlashcards(resourcesRes.data.flashcards || []);
        setAvailableExams(resourcesRes.data.exams || []);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu Course Builder:', err);
      toast.error('Không thể tải dữ liệu khóa học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [courseId]);

  // 2. Save Draft (Sync Tree)
  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      const payload = {
        course: state.course,
        chapters: state.chapters
      };

      const res = await courseBuilderService.syncCourseTree(courseId, payload);
      if (res.status === 'success') {
        if (res.data?.idMap) {
          dispatch({ type: 'APPLY_ID_MAP', idMap: res.data.idMap });
        }
        dispatch({ type: 'MARK_CLEAN' });
        toast.success('Đã lưu toàn bộ khóa học vào Private Space!');
        setShowSavedSuccessModal(true);
      } else {
        toast.error(res.message || 'Lỗi khi lưu khóa học');
      }
    } catch (err: any) {
      console.error('Lỗi lưu tree:', err);
      const msg = err.response?.data?.message || err.message || 'Lỗi khi lưu cấu trúc khóa học';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Publish Course
  const handlePublish = async () => {
    // If not creator/admin, show permission restriction modal immediately
    if (!isCreatorOrAdmin) {
      setShowPublishModal(true);
      return;
    }

    // Validate tree before publish
    const errors = validateCourse(state.course, state.chapters);
    if (errors.length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      toast.error(`Còn ${errors.length} lỗi cần khắc phục trước khi xuất bản`);
      return;
    }

    try {
      setIsPublishing(true);
      // Auto-save tree first to ensure latest edits are synced
      await courseBuilderService.syncCourseTree(courseId, {
        course: state.course,
        chapters: state.chapters
      });

      const res = await courseBuilderService.publishCourse(courseId);
      if (res.status === 'success') {
        dispatch({ type: 'SET_META', payload: { isPublished: true, status: 'published' } });
        dispatch({ type: 'MARK_CLEAN' });
        toast.success('🎉 Khóa học đã được xuất bản công khai thành công!');
      } else {
        toast.error(res.message || 'Lỗi khi xuất bản khóa học');
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setShowPublishModal(true);
      } else {
        toast.error(err.response?.data?.message || 'Không thể xuất bản khóa học');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  // Helper: toggle collapse
  const toggleCollapse = (chId: string) => {
    setCollapsedChapters((prev) => ({ ...prev, [chId]: !prev[chId] }));
  };

  // Dialog actions
  const handleConfirmAddChapter = () => {
    if (!newChapterTitle.trim()) {
      toast.error('Vui lòng nhập tên chương');
      return;
    }
    dispatch({ type: 'ADD_CHAPTER', title: newChapterTitle.trim() });
    setNewChapterTitle('');
    setShowAddChapterModal(false);
  };

  const handleConfirmAddLesson = () => {
    if (!showAddLessonModal) return;
    if (!newLessonTitle.trim()) {
      toast.error('Vui lòng nhập tên bài học');
      return;
    }
    dispatch({
      type: 'ADD_LESSON',
      chapterId: showAddLessonModal,
      title: newLessonTitle.trim(),
      lessonType: newLessonType
    });
    setNewLessonTitle('');
    setShowAddLessonModal(null);
  };

  // Selected Chapter / Lesson references
  let selectedChapter: IChapterItem | undefined;
  let selectedLesson: ILessonItem | undefined;

  if (state.selection.type === 'chapter') {
    selectedChapter = state.chapters.find((c) => c.id === state.selection.chapterId);
  } else if (state.selection.type === 'lesson') {
    selectedChapter = state.chapters.find((c) => c.id === state.selection.chapterId);
    selectedLesson = selectedChapter?.lessons.find((l) => l.id === state.selection.lessonId);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Đang nạp dữ liệu khóa học...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-16 space-y-6">
      {/* TOP NAVBAR / ACTION BAR */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/60 py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Left: Back & Course Title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 w-full lg:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 px-2 text-muted-foreground hover:text-foreground shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Creator Studio
            </Button>
            <div className="h-4 w-px bg-border/60 hidden sm:block shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[200px] lg:max-w-[240px]">
                {state.course.title || 'Khóa học mới'}
              </span>
              <Badge variant={state.course.isPublished ? 'default' : 'secondary'} className="text-[10px] py-0 px-1.5 shrink-0">
                {state.course.isPublished ? 'Công khai' : 'Bản nháp'}
              </Badge>
              {state.isDirty && (
                <span className="flex items-center text-[10px] text-amber-500 font-medium shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping mr-1" />
                  Chưa lưu
                </span>
              )}
            </div>
          </div>

          {/* Center: Stepper */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {[
              { step: 1, label: '1. Tổng quan' },
              { step: 2, label: '2. Khung chương trình' },
              { step: 3, label: '3. Xem trước & Xuất bản' }
            ].map(({ step, label }) => {
              const isActive = state.activeStep === step;
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_STEP', step: step as 1 | 2 | 3 })}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#161616] text-white shadow-xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewModal(true)}
              className="h-8 text-xs gap-1.5 shrink-0 rounded-xl border-zinc-200 hover:bg-zinc-50 text-zinc-700"
            >
              <Eye className="w-3.5 h-3.5 text-zinc-700" />
              Xem trước
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="h-9 text-xs gap-1.5 rounded-xl border-zinc-200 hover:bg-zinc-50 text-zinc-800"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Đang lưu...' : 'Lưu nháp'}
            </Button>

            {state.activeStep !== 3 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => dispatch({ type: 'SET_STEP', step: (state.activeStep + 1) as 2 | 3 })}
                className="h-9 text-xs gap-1 bg-[#161616] hover:bg-black text-white shadow-xs rounded-xl active:scale-[0.99] transition-all"
              >
                Tiếp tục
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handlePublish}
                disabled={isPublishing}
                className="h-9 text-xs gap-1.5 bg-[#161616] hover:bg-black text-white shadow-xs rounded-xl active:scale-[0.99] transition-all duration-200 font-semibold"
              >
                <Rocket className="w-3.5 h-3.5" />
                {isPublishing ? 'Đang xuất bản...' : 'Xuất bản (Public)'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* STEP 1: COURSE METADATA */}
      {state.activeStep === 1 && (
        <CourseMetaStep
          course={state.course}
          onChange={(payload) => dispatch({ type: 'SET_META', payload })}
          onNext={() => dispatch({ type: 'SET_STEP', step: 2 })}
        />
      )}

      {/* STEP 2: CURRICULUM TREE & SPLIT-VIEW EDITOR */}
      {state.activeStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full items-start">
          {/* LEFT COLUMN: CURRICULUM TREE NAV (4/12 columns) */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border border-zinc-200/80 shadow-xs rounded-2xl bg-white overflow-hidden sticky top-16">
              <CardHeader className="p-4 pb-3 border-b border-zinc-200/80 bg-zinc-50/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-zinc-900" />
                    <CardTitle className="text-sm font-semibold text-zinc-900">Khung chương trình</CardTitle>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddChapterModal(true)}
                    className="h-7 text-xs px-2.5 gap-1 rounded-lg border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 text-zinc-800"
                  >
                    <Plus className="w-3 h-3" /> Thêm chương
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5 max-h-[calc(100vh-180px)] overflow-y-auto">
                {/* Course Root item */}
                <div
                  onClick={() => dispatch({ type: 'SELECT_ITEM', selection: { type: 'course' } })}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    state.selection.type === 'course'
                      ? 'border-zinc-900 bg-zinc-900/[0.04] text-zinc-900 font-semibold shadow-xs'
                      : 'border-zinc-200/80 hover:bg-zinc-50 text-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Settings className="w-3.5 h-3.5 text-zinc-700" />
                    <span className="truncate">{state.course.title || 'Thông tin khóa học'}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-normal">Tổng quan</span>
                </div>

                {state.chapters.length === 0 ? (
                  <div className="text-center py-8 px-4 border border-dashed border-zinc-200 rounded-xl space-y-2 bg-zinc-50/50">
                    <p className="text-xs text-zinc-500">Chưa có chương nào trong khóa học.</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddChapterModal(true)}
                      className="text-xs h-7 rounded-lg border-zinc-200 hover:border-zinc-900"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Thêm chương đầu tiên
                    </Button>
                  </div>
                ) : (
                  state.chapters.map((ch, chIdx) => {
                    const isSelected = state.selection.type === 'chapter' && state.selection.chapterId === ch.id;
                    const isCollapsed = collapsedChapters[ch.id];
                    const isEmpty = !ch.lessons || ch.lessons.length === 0;

                    return (
                      <div
                        key={ch.id}
                        className={`rounded-xl border transition-all overflow-hidden ${
                          isSelected
                            ? 'border-zinc-900 ring-2 ring-zinc-900/5 bg-white shadow-xs'
                            : 'border-zinc-200/80 bg-white hover:border-zinc-300'
                        }`}
                      >
                        {/* Chapter Title Bar */}
                        <div
                          className={`p-2.5 flex items-center justify-between gap-1 text-xs cursor-pointer select-none ${
                            isSelected ? 'bg-zinc-50' : 'hover:bg-zinc-50/60'
                          }`}
                          onClick={() => dispatch({ type: 'SELECT_ITEM', selection: { type: 'chapter', chapterId: ch.id } })}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCollapse(ch.id);
                              }}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                            >
                              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <span className="w-4 h-4 rounded bg-muted text-[10px] flex items-center justify-center font-bold text-muted-foreground shrink-0">
                              {chIdx + 1}
                            </span>
                            <span className="font-medium truncate flex-1">{ch.title || 'Chương không tên'}</span>
                            {isEmpty && (
                              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" title="Chương rỗng!" />
                            )}
                          </div>

                          {/* Chapter actions: reorder & add lesson */}
                          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={chIdx === 0}
                              onClick={() => dispatch({ type: 'MOVE_CHAPTER', chapterId: ch.id, direction: 'up' })}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20"
                              title="Di chuyển lên"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={chIdx === state.chapters.length - 1}
                              onClick={() => dispatch({ type: 'MOVE_CHAPTER', chapterId: ch.id, direction: 'down' })}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20"
                              title="Di chuyển xuống"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="p-1 text-primary hover:bg-primary/10 rounded"
                                  title="Thêm bài học"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuItem onClick={() => { setShowAddLessonModal(ch.id); setNewLessonType('video'); }}>
                                  <Video className="w-3.5 h-3.5 mr-2 text-blue-500" /> Bài giảng Video
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setShowAddLessonModal(ch.id); setNewLessonType('reading'); }}>
                                  <BookOpen className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Đọc lý thuyết
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setShowAddLessonModal(ch.id); setNewLessonType('vocabulary'); }}>
                                  <Languages className="w-3.5 h-3.5 mr-2 text-purple-500" /> Từ vựng & Flashcards
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setShowAddLessonModal(ch.id); setNewLessonType('quiz'); }}>
                                  <HelpCircle className="w-3.5 h-3.5 mr-2 text-amber-500" /> Mini Quiz & Kiểm tra
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Chapter Lessons List */}
                        {!isCollapsed && (
                          <div className="border-t border-border/40 p-1.5 space-y-1 bg-background/50">
                            {isEmpty ? (
                              <div className="py-2 px-2 text-center text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Chưa có bài học
                                </span>
                                <button
                                  type="button"
                                  onClick={() => { setShowAddLessonModal(ch.id); setNewLessonType('video'); }}
                                  className="underline font-semibold"
                                >
                                  + Thêm
                                </button>
                              </div>
                            ) : (
                              ch.lessons.map((l, lIdx) => {
                                const isLessonSelected =
                                  state.selection.type === 'lesson' &&
                                  state.selection.chapterId === ch.id &&
                                  state.selection.lessonId === l.id;

                                return (
                                  <div
                                    key={l.id}
                                    onClick={() =>
                                      dispatch({
                                        type: 'SELECT_ITEM',
                                        selection: { type: 'lesson', chapterId: ch.id, lessonId: l.id }
                                      })
                                    }
                                    className={`p-2 rounded-lg text-xs flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                                      isLessonSelected
                                        ? 'bg-primary/10 text-primary font-medium border border-primary/30'
                                        : 'hover:bg-muted/50 text-foreground border border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      {l.type === 'video' && <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                      {l.type === 'reading' && <BookOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                      {l.type === 'vocabulary' && <Languages className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                                      {l.type === 'quiz' && <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                      <span className="truncate flex-1">{l.title || 'Bài học chưa đặt tên'}</span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-[10px] text-muted-foreground">{l.durationMinutes || 5}p</span>
                                      <button
                                        type="button"
                                        disabled={lIdx === 0}
                                        onClick={() =>
                                          dispatch({
                                            type: 'MOVE_LESSON',
                                            chapterId: ch.id,
                                            lessonId: l.id,
                                            direction: 'up'
                                          })
                                        }
                                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={lIdx === ch.lessons.length - 1}
                                        onClick={() =>
                                          dispatch({
                                            type: 'MOVE_LESSON',
                                            chapterId: ch.id,
                                            lessonId: l.id,
                                            direction: 'down'
                                          })
                                        }
                                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          dispatch({
                                            type: 'DELETE_LESSON',
                                            chapterId: ch.id,
                                            lessonId: l.id
                                          })
                                        }
                                        className="p-0.5 text-muted-foreground hover:text-destructive"
                                        title="Xóa bài học"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: DYNAMIC EDITOR PANE (8/12 columns) */}
          <div className="lg:col-span-8 space-y-4">
            {/* If Course is selected */}
            {state.selection.type === 'course' && (
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" />
                    Tổng quan khóa học
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <p className="text-muted-foreground">
                    Bạn đang chọn thông tin cấp độ khóa học. Để chỉnh sửa đầy đủ thông tin giới thiệu, mục tiêu học tập và ảnh bìa, vui lòng chuyển qua <strong>Bước 1: Tổng quan</strong>.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}
                    className="gap-1.5"
                  >
                    Chuyển đến Bước 1
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* If Chapter is selected */}
            {state.selection.type === 'chapter' && selectedChapter && (
              <ChapterDetailEditor
                chapter={selectedChapter}
                onChange={(payload) =>
                  dispatch({
                    type: 'UPDATE_CHAPTER',
                    chapterId: selectedChapter!.id,
                    payload
                  })
                }
                onDelete={() =>
                  dispatch({
                    type: 'DELETE_CHAPTER',
                    chapterId: selectedChapter!.id
                  })
                }
                lessonCount={selectedChapter.lessons.length}
              />
            )}

            {/* If Lesson is selected */}
            {state.selection.type === 'lesson' && selectedChapter && selectedLesson && (
              <div className="space-y-4">
                {/* Lesson Type Switcher Header */}
                <div className="p-3 rounded-xl border border-border/60 bg-card flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Thuộc chương:</span>
                    <span className="font-semibold">{selectedChapter.title || 'Chương không tên'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Loại bài học:</span>
                    <Select
                      value={selectedLesson.type}
                      onValueChange={(val: LessonType) =>
                        dispatch({
                          type: 'UPDATE_LESSON',
                          chapterId: selectedChapter!.id,
                          lessonId: selectedLesson!.id,
                          payload: { type: val }
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">
                          <span className="flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-blue-500" /> Bài giảng Video
                          </span>
                        </SelectItem>
                        <SelectItem value="reading">
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> Đọc lý thuyết
                          </span>
                        </SelectItem>
                        <SelectItem value="vocabulary">
                          <span className="flex items-center gap-1.5">
                            <Languages className="w-3.5 h-3.5 text-purple-500" /> Từ vựng & Flashcards
                          </span>
                        </SelectItem>
                        <SelectItem value="quiz">
                          <span className="flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-500" /> Mini Quiz trắc nghiệm
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sub-editor for selected lesson type */}
                {selectedLesson.type === 'video' && (
                  <LessonVideoEditor
                    lesson={selectedLesson}
                    onChange={(payload) =>
                      dispatch({
                        type: 'UPDATE_LESSON',
                        chapterId: selectedChapter!.id,
                        lessonId: selectedLesson!.id,
                        payload
                      })
                    }
                  />
                )}

                {selectedLesson.type === 'reading' && (
                  <LessonReadingEditor
                    lesson={selectedLesson}
                    onChange={(payload) =>
                      dispatch({
                        type: 'UPDATE_LESSON',
                        chapterId: selectedChapter!.id,
                        lessonId: selectedLesson!.id,
                        payload
                      })
                    }
                  />
                )}

                {selectedLesson.type === 'vocabulary' && (
                  <LessonVocabEditor
                    lesson={selectedLesson}
                    availableFlashcards={availableFlashcards}
                    onChange={(payload) =>
                      dispatch({
                        type: 'UPDATE_LESSON',
                        chapterId: selectedChapter!.id,
                        lessonId: selectedLesson!.id,
                        payload
                      })
                    }
                  />
                )}

                {selectedLesson.type === 'quiz' && (
                  <LessonQuizEditor
                    lesson={selectedLesson}
                    availableExams={availableExams}
                    onChange={(payload) =>
                      dispatch({
                        type: 'UPDATE_LESSON',
                        chapterId: selectedChapter!.id,
                        lessonId: selectedLesson!.id,
                        payload
                      })
                    }
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & PUBLISH */}
      {state.activeStep === 3 && (
        <CourseReviewStep
          state={state}
          onBackToStep2={() => dispatch({ type: 'SET_STEP', step: 2 })}
          onSelectTarget={(target) => dispatch({ type: 'SELECT_ITEM', selection: target })}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          isSaving={isSaving}
          isPublishing={isPublishing}
          userRole={userRole}
        />
      )}

      {/* MODALS */}
      {/* 1. Add Chapter Modal */}
      <Dialog open={showAddChapterModal} onOpenChange={setShowAddChapterModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-primary" /> Thêm chương học mới
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tạo chương mới để phân chia lộ trình học tập khoa học.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="new-ch-title" className="text-xs">Tên chương *</Label>
            <Input
              id="new-ch-title"
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              placeholder="VD: Chương 1: Giới thiệu thì Hiện tại đơn..."
              className="text-xs"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddChapter()}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddChapterModal(false)}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleConfirmAddChapter}>
              Tạo chương
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Add Lesson Modal */}
      <Dialog open={!!showAddLessonModal} onOpenChange={(open) => !open && setShowAddLessonModal(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Thêm bài học mới
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Chọn thể loại bài học và nhập tiêu đề khởi tạo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-less-title" className="text-xs">Tiêu đề bài học *</Label>
              <Input
                id="new-less-title"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder="VD: Quy tắc thêm -s / -es và phát âm chuẩn..."
                className="text-xs"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddLesson()}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Loại bài học</Label>
              <Select value={newLessonType} onValueChange={(val: LessonType) => setNewLessonType(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">
                    <span className="flex items-center gap-2">
                      <Video className="w-3.5 h-3.5 text-blue-500" /> Bài giảng Video
                    </span>
                  </SelectItem>
                  <SelectItem value="reading">
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> Đọc lý thuyết & Khối tương tác
                    </span>
                  </SelectItem>
                  <SelectItem value="vocabulary">
                    <span className="flex items-center gap-2">
                      <Languages className="w-3.5 h-3.5 text-purple-500" /> Từ vựng & Flashcards
                    </span>
                  </SelectItem>
                  <SelectItem value="quiz">
                    <span className="flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-500" /> Mini Quiz & Đề kiểm tra
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddLessonModal(null)}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleConfirmAddLesson}>
              Tạo bài học
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Publish Restricted Modal for Regular Users */}
      <PublishRestrictedModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onNavigateToApplication={() => {
          setShowPublishModal(false);
          if (onNavigateTab) {
            onNavigateTab('creator_application');
          }
        }}
      />

      {/* 4. Save Success Modal */}
      <Dialog open={showSavedSuccessModal} onOpenChange={setShowSavedSuccessModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-base">Đã lưu vào Không gian cá nhân!</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Toàn bộ cấu trúc khóa học, chương và các bài học đã được đồng bộ an toàn vào Database và hiển thị trong Private Space của bạn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSavedSuccessModal(false)}
              className="w-full sm:w-auto"
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowSavedSuccessModal(false);
                if (onNavigateTab) {
                  onNavigateTab('private_space');
                } else {
                  onBack();
                }
              }}
              className="w-full sm:w-auto gap-1"
            >
              Xem trong Private Space
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Live Student Course Preview Modal */}
      <CoursePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        state={state}
      />
    </div>
  );
};
