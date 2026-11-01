import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { 
  Sparkles, 
  Target, 
  Tag, 
  Image as ImageIcon, 
  GraduationCap, 
  ArrowRight, 
  Plus, 
  Trash2, 
  X,
  CheckCircle2
} from 'lucide-react';
import { ICourseMeta } from './courseBuilderState';
import { toast } from 'sonner';

interface CourseMetaStepProps {
  course: ICourseMeta;
  onChange: (updates: Partial<ICourseMeta>) => void;
  onNext: () => void;
}

const CEFR_LEVELS = [
  { value: 'ALL', label: 'Tất cả trình độ (Mọi đối tượng)' },
  { value: 'A1', label: 'A1 - Người mới bắt đầu (Beginner)' },
  { value: 'A2', label: 'A2 - Sơ cấp (Elementary)' },
  { value: 'B1', label: 'B1 - Trung cấp (Intermediate)' },
  { value: 'B2', label: 'B2 - Trung cao cấp (Upper Intermediate)' },
  { value: 'C1', label: 'C1 - Cao cấp (Advanced)' },
  { value: 'C2', label: 'C2 - Thành thạo (Mastery)' },
];

export const CourseMetaStep: React.FC<CourseMetaStepProps> = ({
  course,
  onChange,
  onNext
}) => {
  const [tagInput, setTagInput] = useState('');
  const [imgError, setImgError] = useState(false);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (!trimmed) return;
    if (course.tags.includes(trimmed)) {
      toast.info('Thẻ này đã tồn tại');
      return;
    }
    onChange({ tags: [...course.tags, trimmed] });
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange({ tags: course.tags.filter((t) => t !== tagToRemove) });
  };

  const handleKeyDownTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const objectives = course.objectives || [];

  const handleAddObjective = () => {
    onChange({ objectives: [...objectives, ''] });
  };

  const handleUpdateObjective = (index: number, val: string) => {
    const next = [...objectives];
    next[index] = val;
    onChange({ objectives: next });
  };

  const handleRemoveObjective = (index: number) => {
    const next = objectives.filter((_, i) => i !== index);
    onChange({ objectives: next });
  };

  const handleAddSampleObjectives = () => {
    const samples = [
      'Nắm vững 500+ từ vựng học thuật thông dụng nhất trong bài thi',
      'Làm chủ các cấu trúc ngữ pháp phức tạp và tránh các lỗi sai thường gặp',
      'Tự tin nghe hiểu các đoạn hội thoại thực tế của người bản xứ'
    ];
    onChange({ objectives: [...objectives, ...samples] });
  };

  const handleContinue = () => {
    if (!course.title.trim()) {
      toast.error('Vui lòng nhập tên khóa học');
      return;
    }
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <GraduationCap className="w-4 h-4" />
            Bước 1 / 3: Thiết lập tổng quan
          </div>
          <CardTitle className="text-xl">Thông tin cốt lõi của Khóa học</CardTitle>
          <CardDescription className="text-xs">
            Cung cấp tiêu đề, mục tiêu và hình ảnh để thu hút học viên khi duyệt khóa học trên thư viện LexiCore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="course-title" className="text-xs font-semibold uppercase text-muted-foreground">
              Tên khóa học <span className="text-destructive">*</span>
            </Label>
            <Input
              id="course-title"
              value={course.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="VD: Tiếng Anh Giao Tiếp Toàn Diện Cho Người Đi Làm"
              className="text-base font-medium h-11"
            />
          </div>

          {/* Short description & Full description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="short-desc" className="text-xs font-semibold uppercase text-muted-foreground">
                Mô tả ngắn (Hiển thị trên thẻ khóa học)
              </Label>
              <Textarea
                id="short-desc"
                value={course.shortDescription || ''}
                onChange={(e) => onChange({ shortDescription: e.target.value })}
                placeholder="Khóa học tập trung rèn luyện phản xạ nhanh và chuẩn hóa phát âm chỉ trong 30 ngày..."
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full-desc" className="text-xs font-semibold uppercase text-muted-foreground">
                Mô tả chi tiết khóa học
              </Label>
              <Textarea
                id="full-desc"
                value={course.description || ''}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Giới thiệu chi tiết phương pháp học, lộ trình, kết quả đầu ra và đối tượng phù hợp..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          {/* Thumbnail & Level */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-border/40">
            {/* Level selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Trình độ mục tiêu (CEFR)
              </Label>
              <Select
                value={course.level || 'ALL'}
                onValueChange={(val) => onChange({ level: val })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Chọn trình độ" />
                </SelectTrigger>
                <SelectContent>
                  {CEFR_LEVELS.map((lvl) => (
                    <SelectItem key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Thumbnail URL */}
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="thumb-url" className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                Ảnh bìa khóa học (URL Thumbnail)
              </Label>
              <div className="flex gap-4 items-start">
                <Input
                  id="thumb-url"
                  value={course.thumbnail || ''}
                  onChange={(e) => {
                    setImgError(false);
                    onChange({ thumbnail: e.target.value });
                  }}
                  placeholder="https://images.unsplash.com/... hoặc link ảnh bất kỳ"
                  className="h-10 text-xs flex-1"
                />
                <div className="w-24 h-14 rounded-lg border border-border/60 overflow-hidden bg-muted/40 shrink-0 flex items-center justify-center">
                  {course.thumbnail && !imgError ? (
                    <img
                      src={course.thumbnail}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground text-center px-1">Chưa có ảnh</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Thẻ từ khóa (Tags)
            </Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDownTag}
                placeholder="Nhập từ khóa (VD: grammar, ielts, speaking...) rồi nhấn Enter"
                className="h-9 text-xs max-w-md"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddTag} className="h-9 text-xs">
                Thêm thẻ
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {course.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs py-0.5 px-2.5 gap-1.5">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {course.tags.length === 0 && (
                <span className="text-xs text-muted-foreground italic">Chưa có thẻ nào được thêm.</span>
              )}
            </div>
          </div>

          {/* Objectives */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  Mục tiêu học tập khóa học (What you will learn)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Học viên sẽ nhận được gì sau khi hoàn thành khóa học này?
                </p>
              </div>
              <div className="flex items-center gap-2">
                {objectives.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSampleObjectives}
                    className="h-7 text-xs gap-1 text-muted-foreground"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Thêm mục tiêu gợi ý
                  </Button>
                )}
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleAddObjective}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm mục tiêu
                </Button>
              </div>
            </div>

            {objectives.length === 0 ? (
              <div className="p-4 border border-dashed border-border/60 rounded-xl text-center space-y-1">
                <p className="text-xs text-muted-foreground">Chưa có mục tiêu học tập nào.</p>
                <button
                  type="button"
                  onClick={handleAddObjective}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Thêm ngay
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {objectives.map((obj, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <Input
                      value={obj}
                      onChange={(e) => handleUpdateObjective(index, e.target.value)}
                      placeholder="VD: Làm chủ 12 thì tiếng Anh cơ bản và nâng cao..."
                      className="h-9 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveObjective(index)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
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

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          size="lg"
          onClick={handleContinue}
          className="gap-2 px-6"
        >
          Tiếp tục: Xây dựng khung chương trình
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
