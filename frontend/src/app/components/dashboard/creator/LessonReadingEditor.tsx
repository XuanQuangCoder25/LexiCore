import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';
import { BookOpen, Clock, Eye, Edit3, Bold, Italic, Heading2, List, Quote, Sparkles } from 'lucide-react';
import { ILessonItem } from './courseBuilderState';
import { LessonBlockEditor, ILessonBlock } from './LessonBlockEditor';

interface LessonReadingEditorProps {
  lesson: ILessonItem;
  onChange: (updates: Partial<ILessonItem>) => void;
}

export const LessonReadingEditor: React.FC<LessonReadingEditorProps> = ({ lesson, onChange }) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showBlockEditor, setShowBlockEditor] = useState<boolean>((lesson.blocks && lesson.blocks.length > 0) || false);

  const insertSnippet = (before: string, after = '') => {
    const textarea = document.getElementById('reading-content-area') as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = lesson.content || '';
    const selected = current.substring(start, end);
    const replacement = `${before}${selected || 'nội dung'}${after}`;
    const newContent = current.substring(0, start) + replacement + current.substring(end);
    onChange({ content: newContent });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selected ? selected.length : 7));
    }, 50);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <BookOpen className="w-4 h-4" />
              </span>
              Thiết lập bài đọc lý thuyết
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Thời gian đọc ước tính:
              <Input
                type="number"
                min="1"
                max="120"
                value={lesson.durationMinutes || 5}
                onChange={(e) => onChange({ durationMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-16 h-7 text-xs px-2 py-0 text-center"
              />
              phút
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reading-title" className="text-xs font-semibold uppercase text-muted-foreground">
              Tiêu đề bài học <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reading-title"
              value={lesson.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="VD: Tổng quan và cách dùng Câu điều kiện loại 1..."
              className="font-medium"
            />
          </div>

          {/* Editor Mode Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={activeTab === 'edit' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('edit')}
                  className="h-7 text-xs px-2.5 gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Soạn thảo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={activeTab === 'preview' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('preview')}
                  className="h-7 text-xs px-2.5 gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Xem trước
                </Button>
              </div>

              {activeTab === 'edit' && (
                <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/40">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title="Tiêu đề (H2)"
                    onClick={() => insertSnippet('## ')}
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 font-bold"
                    title="In đậm"
                    onClick={() => insertSnippet('**', '**')}
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 italic"
                    title="In nghiêng"
                    onClick={() => insertSnippet('*', '*')}
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title="Danh sách gạch đầu dòng"
                    onClick={() => insertSnippet('- ')}
                  >
                    <List className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title="Trích dẫn/Lưu ý"
                    onClick={() => insertSnippet('> ')}
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {activeTab === 'edit' ? (
              <Textarea
                id="reading-content-area"
                value={lesson.content || ''}
                onChange={(e) => onChange({ content: e.target.value })}
                placeholder="Nhập nội dung bài giảng lý thuyết tại đây... (Hỗ trợ định dạng Markdown: ## Tiêu đề, **in đậm**, - danh sách)"
                className="min-h-[260px] font-mono text-sm leading-relaxed"
              />
            ) : (
              <div className="min-h-[260px] p-4 rounded-xl border border-border/60 bg-muted/20 prose prose-sm dark:prose-invert max-w-none">
                {lesson.content ? (
                  <div className="space-y-3 whitespace-pre-wrap">
                    {lesson.content}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    Chưa có nội dung lý thuyết để xem trước.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Notion Blocks Toggle */}
          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Khối bài tập tương tác (Notion-style Blocks)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Thêm câu hỏi điền từ, kéo thả hoặc luyện đọc âm thanh trực tiếp trong bài đọc.
                </p>
              </div>
              <Button
                type="button"
                variant={showBlockEditor ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => setShowBlockEditor(!showBlockEditor)}
                className="text-xs h-7"
              >
                {showBlockEditor ? 'Ẩn khối tương tác' : 'Bật khối tương tác'}
              </Button>
            </div>

            {showBlockEditor && (
              <div className="p-4 rounded-xl border border-border/60 bg-muted/10">
                <LessonBlockEditor
                  blocks={(lesson.blocks as ILessonBlock[]) || []}
                  onChange={(blocks) => onChange({ blocks })}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
