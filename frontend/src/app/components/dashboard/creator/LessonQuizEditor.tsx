import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { HelpCircle, Clock, Plus, Trash2, CheckCircle2, Award, Sparkles } from 'lucide-react';
import { ILessonItem, IQuizQuestion, generateTempId } from './courseBuilderState';

interface LessonQuizEditorProps {
  lesson: ILessonItem;
  onChange: (updates: Partial<ILessonItem>) => void;
  availableExams?: Array<{ _id: string; title: string }>;
}

export const LessonQuizEditor: React.FC<LessonQuizEditorProps> = ({
  lesson,
  onChange,
  availableExams = []
}) => {
  const quiz = lesson.quiz || [];

  const handleAddQuestion = () => {
    const newQuestion: IQuizQuestion = {
      id: generateTempId('q'),
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanation: ''
    };
    onChange({ quiz: [...quiz, newQuestion] });
  };

  const handleUpdateQuestion = (index: number, updates: Partial<IQuizQuestion>) => {
    const next = [...quiz];
    next[index] = { ...next[index], ...updates };
    onChange({ quiz: next });
  };

  const handleRemoveQuestion = (index: number) => {
    const next = quiz.filter((_, i) => i !== index);
    onChange({ quiz: next });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, val: string) => {
    const q = quiz[qIndex];
    const newOpts = [...q.options];
    newOpts[optIndex] = val;
    handleUpdateQuestion(qIndex, { options: newOpts });
  };

  const handleAddOption = (qIndex: number) => {
    const q = quiz[qIndex];
    if (q.options.length >= 6) return;
    handleUpdateQuestion(qIndex, { options: [...q.options, ''] });
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const q = quiz[qIndex];
    if (q.options.length <= 2) return;
    const newOpts = q.options.filter((_, i) => i !== optIndex);
    let newCorrect = q.correctIndex;
    if (newCorrect >= newOpts.length) newCorrect = newOpts.length - 1;
    handleUpdateQuestion(qIndex, { options: newOpts, correctIndex: newCorrect });
  };

  const handleAddSampleQuiz = () => {
    const sample: IQuizQuestion = {
      id: generateTempId('q'),
      question: 'Which of the following sentences uses the Present Perfect tense correctly?',
      options: [
        'I have seen that movie yesterday.',
        'She has lived in Paris for five years.',
        'They did already finish their homework.',
        'He has went to the market.'
      ],
      correctIndex: 1,
      explanation: 'Present Perfect is used with "for five years" to express an action continuing up to the present. "Yesterday" requires Past Simple.'
    };
    onChange({ quiz: [...quiz, sample] });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <HelpCircle className="w-4 h-4" />
              </span>
              Thiết lập bài kiểm tra & Mini Quiz
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Thời gian làm bài:
              <Input
                type="number"
                min="1"
                max="120"
                value={lesson.durationMinutes || 15}
                onChange={(e) => onChange({ durationMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-16 h-7 text-xs px-2 py-0 text-center"
              />
              phút
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="quiz-title" className="text-xs font-semibold uppercase text-muted-foreground">
              Tiêu đề bài kiểm tra <span className="text-destructive">*</span>
            </Label>
            <Input
              id="quiz-title"
              value={lesson.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="VD: Kiểm tra nhanh củng cố ngữ pháp Chương 1..."
              className="font-medium"
            />
          </div>

          {/* External Exam Linking */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                Liên kết đề thi từ Exam Builder (Tùy chọn)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Dùng nếu bạn muốn bài kiểm tra quy mô lớn
              </span>
            </div>

            <Select
              value={lesson.attachedExamId || 'none'}
              onValueChange={(val) => onChange({ attachedExamId: val === 'none' ? null : val })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="-- Không liên kết đề thi bên ngoài --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Không liên kết đề thi bên ngoài --</SelectItem>
                {availableExams.map((exam) => (
                  <SelectItem key={exam._id} value={exam._id}>
                    {exam.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {lesson.attachedExamId && (
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="req-pass"
                  checked={lesson.isRequiredToPassExam || false}
                  onCheckedChange={(checked) => onChange({ isRequiredToPassExam: !!checked })}
                />
                <Label htmlFor="req-pass" className="text-xs cursor-pointer">
                  Bắt buộc học viên phải vượt qua đề thi này để hoàn thành bài học
                </Label>
              </div>
            )}
          </div>

          {/* Inline Questions Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                  Danh sách câu hỏi trắc nghiệm ({quiz.length} câu)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Học viên sẽ làm các câu hỏi này và nhận chấm điểm ngay lập tức.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {quiz.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSampleQuiz}
                    className="h-7 text-xs gap-1 text-muted-foreground"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Thêm câu mẫu
                  </Button>
                )}
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleAddQuestion}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm câu hỏi
                </Button>
              </div>
            </div>

            {quiz.length === 0 && !lesson.attachedExamId ? (
              <div className="text-center py-8 border-2 border-dashed border-border/60 rounded-xl space-y-2">
                <p className="text-xs text-muted-foreground">Chưa có câu hỏi nào trong bài trắc nghiệm này.</p>
                <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion} className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Thêm câu hỏi đầu tiên
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {quiz.map((q, qIndex) => (
                  <div
                    key={q.id || qIndex}
                    className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500">
                        Câu {qIndex + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveQuestion(qIndex)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Nội dung câu hỏi *</Label>
                      <Textarea
                        value={q.question}
                        onChange={(e) => handleUpdateQuestion(qIndex, { question: e.target.value })}
                        placeholder="Nhập câu hỏi trắc nghiệm..."
                        rows={2}
                        className="text-xs"
                      />
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] text-muted-foreground uppercase font-semibold">
                          Các lựa chọn (Tích chọn đáp án đúng) *
                        </Label>
                        {q.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIndex)}
                            className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Thêm đáp án
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, optIndex) => {
                          const isCorrect = q.correctIndex === optIndex;
                          const labelChar = String.fromCharCode(65 + optIndex);
                          return (
                            <div
                              key={optIndex}
                              className={`flex items-center gap-2 p-1.5 rounded-lg border transition-colors ${
                                isCorrect
                                  ? 'border-emerald-500/50 bg-emerald-500/5'
                                  : 'border-border/60 bg-background/50'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleUpdateQuestion(qIndex, { correctIndex: optIndex })}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                  isCorrect
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                                title="Chọn làm đáp án đúng"
                              >
                                {labelChar}
                              </button>
                              <Input
                                value={opt}
                                onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                                placeholder={`Nhập nội dung đáp án ${labelChar}...`}
                                className="h-8 text-xs flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent"
                              />
                              {isCorrect && (
                                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 px-2">
                                  Đáp án đúng
                                </span>
                              )}
                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(qIndex, optIndex)}
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive flex items-center justify-center"
                                  title="Xóa lựa chọn"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="space-y-1 pt-1 border-t border-border/30">
                      <Label className="text-[11px] text-muted-foreground">
                        Giải thích chi tiết đáp án (Hiển thị sau khi học viên nộp bài)
                      </Label>
                      <Input
                        value={q.explanation || ''}
                        onChange={(e) => handleUpdateQuestion(qIndex, { explanation: e.target.value })}
                        placeholder="VD: Quy tắc ngữ pháp áp dụng ở đây là..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
