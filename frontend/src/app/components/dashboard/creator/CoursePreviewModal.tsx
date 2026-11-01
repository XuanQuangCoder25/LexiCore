import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent } from '../../ui/card';
import { 
  X, 
  Video, 
  BookOpen, 
  Languages, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  FolderTree, 
  Play, 
  FileText,
  RotateCw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { CourseBuilderState, ILessonItem } from './courseBuilderState';

interface CoursePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: CourseBuilderState;
}

export const CoursePreviewModal: React.FC<CoursePreviewModalProps> = ({
  isOpen,
  onClose,
  state
}) => {
  const { course, chapters } = state;

  // Selected chapter and lesson for student preview
  const firstChapter = chapters[0];
  const firstLesson = firstChapter?.lessons?.[0];

  const [activeChapterId, setActiveChapterId] = useState<string>(firstChapter?.id || '');
  const [activeLessonId, setActiveLessonId] = useState<string>(firstLesson?.id || '');

  // Quiz state for student preview
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittedQuiz, setSubmittedQuiz] = useState<boolean>(false);

  // Vocab flashcard flip index
  const [activeVocabCardIndex, setActiveVocabCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  const currentChapter = chapters.find((c) => c.id === activeChapterId) || firstChapter;
  const currentLesson: ILessonItem | undefined =
    currentChapter?.lessons?.find((l) => l.id === activeLessonId) || currentChapter?.lessons?.[0];

  const getEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
      if (url.includes('youtube.com/watch')) {
        const v = new URL(url).searchParams.get('v');
        return v ? `https://www.youtube.com/embed/${v}` : null;
      }
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (url.includes('youtube.com/embed/')) return url;
      return null;
    } catch {
      return null;
    }
  };

  const handleSelectLesson = (chId: string, lsId: string) => {
    setActiveChapterId(chId);
    setActiveLessonId(lsId);
    setSelectedAnswers({});
    setSubmittedQuiz(false);
    setActiveVocabCardIndex(0);
    setIsFlipped(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideClose className="sm:max-w-5xl md:max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col gap-0 border-border/80">
        {/* Preview Top Header */}
        <div className="p-4 px-6 bg-muted/60 border-b border-border/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight">{course.title || 'Khóa học xem trước'}</span>
                <Badge variant="outline" className="text-[10px] bg-background">
                  Giao diện học viên (Live Preview)
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Đang xem trước nội dung trực tiếp từ bộ nhớ Course Builder
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Preview Body: Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Course Curriculum Sidebar */}
          <div className="w-72 sm:w-80 border-r border-border/60 bg-muted/10 flex flex-col overflow-y-auto shrink-0 p-3 space-y-3">
            <div className="px-2 pt-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-primary" /> Mục lục khóa học
              </span>
            </div>

            {chapters.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 text-center">Chưa có chương học nào.</p>
            ) : (
              chapters.map((ch, chIdx) => (
                <div key={ch.id} className="space-y-1">
                  <div className="px-2 py-1.5 text-xs font-semibold text-foreground/80 flex items-center justify-between">
                    <span className="truncate">
                      Chương {chIdx + 1}: {ch.title || 'Không tên'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-normal shrink-0">
                      {ch.lessons?.length || 0} bài
                    </span>
                  </div>

                  <div className="space-y-0.5 pl-2">
                    {ch.lessons?.map((ls, lsIdx) => {
                      const isActive = ch.id === currentChapter?.id && ls.id === currentLesson?.id;
                      return (
                        <button
                          key={ls.id}
                          type="button"
                          onClick={() => handleSelectLesson(ch.id, ls.id)}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center gap-2 transition-all ${
                            isActive
                              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                          }`}
                        >
                          {ls.type === 'video' && <Video className="w-3.5 h-3.5 shrink-0" />}
                          {ls.type === 'reading' && <BookOpen className="w-3.5 h-3.5 shrink-0" />}
                          {ls.type === 'vocabulary' && <Languages className="w-3.5 h-3.5 shrink-0" />}
                          {ls.type === 'quiz' && <HelpCircle className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate flex-1">{ls.title || 'Bài học'}</span>
                          <span className="text-[10px] opacity-75 shrink-0">{ls.durationMinutes || 5}p</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Lesson Player / Reader / Quiz View */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            {!currentLesson ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Chưa có bài học nào để hiển thị xem trước.</p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Lesson Header */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs uppercase font-medium">
                      {currentLesson.type === 'video' && '🎬 Bài giảng Video'}
                      {currentLesson.type === 'reading' && '📖 Bài đọc lý thuyết'}
                      {currentLesson.type === 'vocabulary' && '🔤 Từ vựng & Flashcards'}
                      {currentLesson.type === 'quiz' && '❓ Mini Quiz trắc nghiệm'}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {currentLesson.durationMinutes || 5} phút học
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {currentLesson.title || 'Bài học chưa đặt tên'}
                  </h1>
                </div>

                {/* 1. VIDEO LESSON TYPE */}
                {currentLesson.type === 'video' && (
                  <div className="space-y-4">
                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-md border border-border/60 flex items-center justify-center">
                      {getEmbedUrl(currentLesson.videoUrl) ? (
                        <iframe
                          src={getEmbedUrl(currentLesson.videoUrl)!}
                          title="Preview Video"
                          className="w-full h-full border-0"
                          allowFullScreen
                        />
                      ) : currentLesson.videoUrl ? (
                        <video src={currentLesson.videoUrl} controls className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-center p-6 text-muted-foreground text-xs space-y-1">
                          <Play className="w-8 h-8 mx-auto opacity-50" />
                          <p>Chưa cấu hình URL video cho bài giảng này.</p>
                        </div>
                      )}
                    </div>

                    {currentLesson.notes && (
                      <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1.5">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 uppercase">
                          <FileText className="w-3.5 h-3.5" /> Ghi chú bài giảng
                        </span>
                        <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {currentLesson.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. READING LESSON TYPE */}
                {currentLesson.type === 'reading' && (
                  <div className="space-y-4">
                    <Card className="border-border/60 shadow-sm bg-card/60">
                      <CardContent className="p-6 prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                        {currentLesson.content || 'Chưa có nội dung lý thuyết.'}
                      </CardContent>
                    </Card>

                    {currentLesson.blocks && currentLesson.blocks.length > 0 && (
                      <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          Khối tương tác ({currentLesson.blocks.length} khối)
                        </span>
                        <div className="space-y-2">
                          {currentLesson.blocks.map((b: any, idx: number) => (
                            <div key={b.id || idx} className="p-3 rounded-lg border bg-card text-xs">
                              <span className="font-semibold text-primary uppercase text-[10px] block mb-1">
                                {b.type}
                              </span>
                              <p>{b.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. VOCABULARY LESSON TYPE */}
                {currentLesson.type === 'vocabulary' && (
                  <div className="space-y-6">
                    {/* Interactive Flashcard Preview Widget */}
                    {currentLesson.vocabulary && currentLesson.vocabulary.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Thẻ {activeVocabCardIndex + 1} / {currentLesson.vocabulary.length}
                          </span>
                          <span>Bấm vào thẻ để lật xem nghĩa</span>
                        </div>

                        {(() => {
                          const item = currentLesson.vocabulary[activeVocabCardIndex];
                          if (!item) return null;
                          return (
                            <div
                              onClick={() => setIsFlipped(!isFlipped)}
                              className="aspect-[16/9] max-h-64 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-purple-500/5 shadow-md flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none transition-all hover:border-primary/40"
                            >
                              {!isFlipped ? (
                                <div className="space-y-2">
                                  <h2 className="text-3xl font-extrabold text-foreground tracking-wide">
                                    {item.term || 'Từ vựng'}
                                  </h2>
                                  {item.phonetic && (
                                    <p className="text-sm font-mono text-muted-foreground">{item.phonetic}</p>
                                  )}
                                  {item.partOfSpeech && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.partOfSpeech}
                                    </Badge>
                                  )}
                                  <p className="text-[11px] text-muted-foreground pt-3 flex items-center justify-center gap-1">
                                    <RotateCw className="w-3 h-3" /> Nhấn để lật thẻ
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                    Ý nghĩa & Ví dụ
                                  </span>
                                  <h3 className="text-xl font-bold text-foreground">
                                    {item.meaning || 'Nghĩa của từ'}
                                  </h3>
                                  {item.example && (
                                    <p className="text-xs text-muted-foreground italic max-w-md">
                                      "{item.example}"
                                    </p>
                                  )}
                                  <p className="text-[11px] text-muted-foreground pt-2 flex items-center justify-center gap-1">
                                    <RotateCw className="w-3 h-3" /> Nhấn để lật lại
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Pagination buttons */}
                        <div className="flex items-center justify-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={activeVocabCardIndex === 0}
                            onClick={() => {
                              setActiveVocabCardIndex((i) => Math.max(0, i - 1));
                              setIsFlipped(false);
                            }}
                          >
                            Thẻ trước
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={activeVocabCardIndex === (currentLesson.vocabulary.length - 1)}
                            onClick={() => {
                              setActiveVocabCardIndex((i) => i + 1);
                              setIsFlipped(false);
                            }}
                          >
                            Thẻ tiếp
                          </Button>
                        </div>

                        {/* Vocabulary Word List Table */}
                        <div className="pt-4 border-t border-border/40 space-y-2">
                          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                            Danh sách từ vựng chi tiết
                          </h4>
                          <div className="divide-y border rounded-xl overflow-hidden bg-card text-xs">
                            {currentLesson.vocabulary.map((voc, i) => (
                              <div key={voc.id || i} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-primary mr-2">{voc.term}</span>
                                  <span className="font-mono text-muted-foreground mr-2">{voc.phonetic}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                    {voc.partOfSpeech}
                                  </span>
                                  <p className="text-muted-foreground text-xs mt-0.5">{voc.meaning}</p>
                                </div>
                                {voc.example && (
                                  <p className="text-[11px] italic text-muted-foreground/80 sm:max-w-xs">
                                    {voc.example}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10 border border-dashed rounded-xl space-y-1">
                        <p className="text-xs text-muted-foreground">Bài học này chưa có từ vựng nào.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. QUIZ LESSON TYPE */}
                {currentLesson.type === 'quiz' && (
                  <div className="space-y-6">
                    {currentLesson.quiz && currentLesson.quiz.length > 0 ? (
                      <div className="space-y-5">
                        {currentLesson.quiz.map((q, qIdx) => {
                          const chosen = selectedAnswers[qIdx];
                          const isCorrect = submittedQuiz && chosen === q.correctIndex;
                          const isWrong = submittedQuiz && chosen !== undefined && chosen !== q.correctIndex;

                          return (
                            <Card key={q.id || qIdx} className="border-border/60 shadow-xs">
                              <CardContent className="p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-medium text-sm">
                                    <span className="font-bold text-primary mr-2">Câu {qIdx + 1}:</span>
                                    {q.question}
                                  </h3>
                                  {submittedQuiz && (
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

                                <div className="space-y-2 pt-1">
                                  {q.options?.map((opt, optIdx) => {
                                    const isSelected = chosen === optIdx;
                                    const isRightAnswer = q.correctIndex === optIdx;

                                    let btnStyle = 'border-border/60 hover:bg-muted/40';
                                    if (submittedQuiz) {
                                      if (isRightAnswer) {
                                        btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold';
                                      } else if (isSelected && !isRightAnswer) {
                                        btnStyle = 'border-destructive bg-destructive/10 text-destructive line-through';
                                      }
                                    } else if (isSelected) {
                                      btnStyle = 'border-primary bg-primary/10 text-primary font-semibold';
                                    }

                                    return (
                                      <button
                                        key={optIdx}
                                        type="button"
                                        disabled={submittedQuiz}
                                        onClick={() => setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))}
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

                                {submittedQuiz && q.explanation && (
                                  <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground border mt-2">
                                    <strong className="text-foreground">Giải thích: </strong>
                                    {q.explanation}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}

                        {/* Submit Button */}
                        <div className="flex justify-end gap-2 pt-2">
                          {submittedQuiz ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSubmittedQuiz(false);
                                setSelectedAnswers({});
                              }}
                            >
                              Làm lại bài kiểm tra
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setSubmittedQuiz(true)}
                              disabled={Object.keys(selectedAnswers).length === 0}
                            >
                              Nộp bài & Kiểm tra đáp án
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10 border border-dashed rounded-xl space-y-1">
                        <p className="text-xs text-muted-foreground">Bài học này chưa có câu hỏi trắc nghiệm nào.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
