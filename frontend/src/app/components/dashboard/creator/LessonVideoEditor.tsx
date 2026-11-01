import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Video, Clock, FileText, ExternalLink, Play } from 'lucide-react';
import { ILessonItem } from './courseBuilderState';

interface LessonVideoEditorProps {
  lesson: ILessonItem;
  onChange: (updates: Partial<ILessonItem>) => void;
}

export const LessonVideoEditor: React.FC<LessonVideoEditorProps> = ({ lesson, onChange }) => {
  const getEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
      // YouTube formats
      if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        const v = urlObj.searchParams.get('v');
        return v ? `https://www.youtube.com/embed/${v}` : null;
      }
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (url.includes('youtube.com/embed/')) {
        return url;
      }
      return null;
    } catch {
      return null;
    }
  };

  const embedUrl = getEmbedUrl(lesson.videoUrl);
  const isDirectVideo = lesson.videoUrl && (lesson.videoUrl.endsWith('.mp4') || lesson.videoUrl.endsWith('.webm'));

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                <Video className="w-4 h-4" />
              </span>
              Thiết lập bài giảng Video
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Thời lượng ước tính:
              <Input
                type="number"
                min="1"
                max="300"
                value={lesson.durationMinutes || 10}
                onChange={(e) => onChange({ durationMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-16 h-7 text-xs px-2 py-0 text-center"
              />
              phút
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lesson-title" className="text-xs font-semibold uppercase text-muted-foreground">
              Tiêu đề bài học <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lesson-title"
              value={lesson.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="VD: Giới thiệu cấu trúc thì hiện tại đơn..."
              className="font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="video-url" className="text-xs font-semibold uppercase text-muted-foreground">
              Đường dẫn Video (YouTube URL hoặc MP4) <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="video-url"
                value={lesson.videoUrl || ''}
                onChange={(e) => onChange({ videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=... hoặc link video MP4"
              />
              {lesson.videoUrl && (
                <a
                  href={lesson.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 border rounded-md hover:bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground text-xs"
                  title="Mở liên kết"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Hỗ trợ link YouTube (chuẩn hoặc rút gọn youtu.be) và link tệp MP4 trực tiếp.
            </p>
          </div>

          {/* Video Preview Box */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Xem trước bài giảng
            </Label>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-muted/40 border border-border/60 flex items-center justify-center relative">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title="Video preview"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : isDirectVideo ? (
                <video
                  src={lesson.videoUrl}
                  controls
                  className="w-full h-full object-contain"
                >
                  Trình duyệt không hỗ trợ xem video trực tiếp.
                </video>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <Play className="w-6 h-6 ml-0.5" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lesson.videoUrl ? 'URL không hợp lệ hoặc không thể nhúng trực tiếp' : 'Dán đường dẫn video bên trên để xem trước'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Lecture Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="lesson-notes" className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Ghi chú & Tóm tắt bài giảng (Dành cho học viên)
              </Label>
              <span className="text-[11px] text-muted-foreground">Tùy chọn</span>
            </div>
            <Textarea
              id="lesson-notes"
              value={lesson.notes || ''}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Nhập các điểm mấu chốt, công thức ngữ pháp, hoặc lưu ý bài giảng..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
