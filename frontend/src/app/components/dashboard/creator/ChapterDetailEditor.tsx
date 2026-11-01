import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../ui/dialog';
import { FolderTree, AlertTriangle, CheckCircle, Plus, Trash2, Lightbulb, FileText } from 'lucide-react';
import { IChapterItem } from './courseBuilderState';

interface ChapterDetailEditorProps {
  chapter: IChapterItem;
  onChange: (updates: Partial<IChapterItem>) => void;
  onDelete: () => void;
  lessonCount: number;
}

export const ChapterDetailEditor: React.FC<ChapterDetailEditorProps> = ({
  chapter,
  onChange,
  onDelete,
  lessonCount
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const takeaways = chapter.keyTakeaways || [];

  const handleAddTakeaway = () => {
    onChange({ keyTakeaways: [...takeaways, ''] });
  };

  const handleUpdateTakeaway = (index: number, val: string) => {
    const next = [...takeaways];
    next[index] = val;
    onChange({ keyTakeaways: next });
  };

  const handleRemoveTakeaway = (index: number) => {
    const next = takeaways.filter((_, i) => i !== index);
    onChange({ keyTakeaways: next });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <FolderTree className="w-4 h-4" />
              </span>
              <CardTitle className="text-base">Thiết lập Chương học</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {lessonCount === 0 ? (
                <Badge variant="destructive" className="text-xs gap-1 py-0.5">
                  <AlertTriangle className="w-3 h-3" /> Chưa có bài học nào
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs gap-1 py-0.5 font-normal">
                  <CheckCircle className="w-3 h-3 text-emerald-500" /> {lessonCount} bài học
                </Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Xóa chương
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          {lessonCount === 0 && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Cảnh báo: Chương này chưa có bài học!</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Quy định hệ thống: Mọi chương phải có ít nhất 1 bài học hợp lệ mới có thể lưu và xuất bản khóa học. Hãy nhấn <strong>"+ Thêm bài học"</strong> ở danh mục bên trái.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="chapter-title" className="text-xs font-semibold uppercase text-muted-foreground">
              Tên chương <span className="text-destructive">*</span>
            </Label>
            <Input
              id="chapter-title"
              value={chapter.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="VD: Chương 1: Nền tảng Ngữ pháp & Cấu trúc câu"
              className="font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="chapter-desc" className="text-xs font-semibold uppercase text-muted-foreground">
              Mô tả ngắn gọn chương
            </Label>
            <Textarea
              id="chapter-desc"
              value={chapter.description || ''}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Giới thiệu khái quát các chủ đề sẽ học trong chương này..."
              rows={2}
            />
          </div>

          {/* Chapter Summary for learning workspace */}
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <Label htmlFor="chapter-summary" className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Tóm tắt chương (Hiển thị khi học viên hoàn thành chương)
              </Label>
              <span className="text-[11px] text-muted-foreground">Khuyên dùng</span>
            </div>
            <Textarea
              id="chapter-summary"
              value={chapter.summary || ''}
              onChange={(e) => onChange({ summary: e.target.value })}
              placeholder="VD: Trong chương này, bạn đã làm chủ 3 thì cơ bản và nắm được cách xây dựng câu phức..."
              rows={3}
            />
          </div>

          {/* Key Takeaways list */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  Các điểm cốt lõi đạt được (Key Takeaways)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Các gạch đầu dòng tóm tắt giá trị học viên ghi nhớ sau chương học này.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTakeaway}
                className="h-7 text-xs gap-1"
              >
                <Plus className="w-3 h-3" /> Thêm điểm cốt lõi
              </Button>
            </div>

            {takeaways.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                Chưa có điểm cốt lõi nào. Nhấn "+ Thêm điểm cốt lõi" để bổ sung.
              </p>
            ) : (
              <div className="space-y-2">
                {takeaways.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                      {index + 1}
                    </span>
                    <Input
                      value={item}
                      onChange={(e) => handleUpdateTakeaway(index, e.target.value)}
                      placeholder="VD: Tự tin sử dụng thì hiện tại hoàn thành trong giao tiếp..."
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTakeaway(index)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Chapter Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa chương học
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs text-muted-foreground">
              Hành động này sẽ xóa chương "{chapter.title || 'Chương không tên'}" cùng toàn bộ {lessonCount} bài học bên trong khỏi khung chương trình.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete();
              }}
            >
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
