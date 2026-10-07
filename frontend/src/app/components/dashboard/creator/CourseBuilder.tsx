import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { courseBuilderService } from "../../../services/course-builder-service";
import { creatorService } from "../../../services/creator-service";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ArrowLeft, Video, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Badge } from "../../ui/badge";
import { LessonBlockEditor, ILessonBlock } from "./LessonBlockEditor";

export const CourseBuilder = ({ courseId, onBack }: { courseId: string; onBack: () => void }) => {
  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  // Form states
  const [chapterTitle, setChapterTitle] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonBlocks, setLessonBlocks] = useState<ILessonBlock[]>([]);
  const [lessonVideo, setLessonVideo] = useState("");
  const [attachedFlashcardId, setAttachedFlashcardId] = useState("none");
  const [attachedExamId, setAttachedExamId] = useState("none");
  const [availableFlashcards, setAvailableFlashcards] = useState<any[]>([]);
  const [availableExams, setAvailableExams] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const res = await courseBuilderService.getCourseBuilderData(courseId);
      if (res.status === 'success') {
        setCourseData(res.data);
      }
    } catch (error) {
      toast.error("Lỗi khi tải dữ liệu khóa học");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const [flashcardsRes, examsRes] = await Promise.all([
          creatorService.getCourses(),
          axios.get('/api/exams', { withCredentials: true })
        ]);
        if (flashcardsRes.success) setAvailableFlashcards(flashcardsRes.data);
        if (examsRes.data.success) setAvailableExams(examsRes.data.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchResources();
    fetchData();
  }, [courseId]);

  const handleAddChapter = async () => {
    try {
      const order = courseData.chapters.length + 1;
      const res = await courseBuilderService.createChapter(courseId, { title: chapterTitle, order });
      if (res.status === 'success') {
        toast.success("Thêm chương thành công!");
        setShowChapterModal(false);
        setChapterTitle("");
        fetchData();
      }
    } catch (error) {
      toast.error("Lỗi khi thêm chương");
    }
  };

  
  const handleEditLesson = (chapterId: string, lesson: any) => {
    setActiveChapterId(chapterId);
    setActiveLessonId(lesson._id);
    setLessonTitle(lesson.title);
    setLessonDuration(lesson.durationMinutes.toString());
    setLessonContent(lesson.content || "");
    setLessonBlocks(lesson.blocks || []);
    setLessonVideo(lesson.videoUrl || "");
    setAttachedFlashcardId(lesson.attachedFlashcardId || "none");
    setAttachedExamId(lesson.attachedExamId || "none");
    setShowLessonModal(true);
  };

  const handleAddLesson = async () => {
    if (!activeChapterId) return;
    try {
      const activeChapter = courseData.chapters.find((c: any) => c._id === activeChapterId);
      const order = activeChapter.lessons.length + 1;
      const payload = {
        title: lessonTitle,
        durationMinutes: Math.max(1, parseInt(lessonDuration) || 5),
        order,
        content: lessonContent,
        blocks: lessonBlocks,
        videoUrl: lessonVideo,
        attachedFlashcardId: attachedFlashcardId !== "none" ? attachedFlashcardId : undefined,
        attachedExamId: attachedExamId !== "none" ? attachedExamId : undefined,
      };
      
      const res = activeLessonId 
        ? await courseBuilderService.updateLesson(courseId, activeChapterId, activeLessonId, payload)
        : await courseBuilderService.createLesson(courseId, activeChapterId, payload);
      
      if (res.status === 'success') {
        toast.success(activeLessonId ? "Cập nhật bài học thành công!" : "Thêm bài học thành công!");
        setShowLessonModal(false);
        setLessonTitle("");
        setLessonDuration("");
        setLessonContent("");
        setLessonBlocks([]);
        setLessonVideo("");
        setAttachedFlashcardId("none");
        setAttachedExamId("none");
        fetchData();
      }
    } catch (error) {
      toast.error("Lỗi khi thêm bài học");
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (!courseData) return <div>Không tìm thấy dữ liệu.</div>;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold">{courseData.course.title}</h2>
          <Badge variant={courseData.course.isPublished ? "default" : "secondary"}>
            {courseData.course.isPublished ? "Đã xuất bản" : "Bản nháp"}
          </Badge>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Chương trình học (Syllabus)</h3>
        <Button onClick={() => setShowChapterModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/25 transition-all">
          <Plus className="w-4 h-4 mr-2" /> Thêm Chương mới
        </Button>
      </div>

      <div className="space-y-4">
        {courseData.chapters.map((chapter: any) => (
          <Card key={chapter._id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Chương {chapter.order}: {chapter.title}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setActiveChapterId(chapter._id);
                    setActiveLessonId(null);
                    setLessonTitle("");
                    setLessonDuration("");
                    setLessonContent("");
                    setLessonBlocks([]);
                    setLessonVideo("");
                    setAttachedFlashcardId("none");
                    setAttachedExamId("none");
                    setShowLessonModal(true);
                  }}>
                    <Plus className="w-4 h-4 mr-1" /> Thêm bài học
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {chapter.lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Chưa có bài học nào trong chương này.</p>
              ) : (
                chapter.lessons.map((lesson: any) => (
                  <div key={lesson._id} className="flex justify-between items-center p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      {lesson.videoUrl ? <Video className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-orange-500" />}
                      <span className="font-medium">Bài {lesson.order}: {lesson.title}</span>
                      <Badge variant="outline" className="text-xs">{lesson.durationMinutes} phút</Badge>
                    </div>
                    <div className="flex gap-2">
                       <Button variant="ghost" size="icon" onClick={() => handleEditLesson(chapter._id, lesson)}><Edit className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chapter Modal */}
      <Dialog open={showChapterModal} onOpenChange={setShowChapterModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm Chương Mới</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên chương</Label>
              <Input placeholder="VD: Giới thiệu chung" value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} />
            </div>
            <Button onClick={handleAddChapter} className="w-full">Lưu Chương</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lesson Modal */}
      <Dialog open={showLessonModal} onOpenChange={setShowLessonModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>{activeLessonId ? "Sửa Bài Học" : "Thêm Bài Học Mới"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-2">
            <div className="space-y-2">
              <Label>Tên bài học</Label>
              <Input placeholder="VD: Bài 1: Xin chào" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Thời lượng ước tính (phút)</Label>
              <Input type="number" value={lessonDuration} onChange={(e) => setLessonDuration(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <Label>Nội dung bài học dạng khối (Notion-like)</Label>
              <LessonBlockEditor blocks={lessonBlocks} setBlocks={setLessonBlocks} />
            </div>
            <div className="space-y-2">
              <Label>Đính kèm Bộ thẻ Flashcard (Tùy chọn)</Label>
              <Select value={attachedFlashcardId} onValueChange={setAttachedFlashcardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bộ thẻ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không đính kèm</SelectItem>
                  {availableFlashcards.map(f => (
                    <SelectItem key={f._id} value={f._id}>{f.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Đính kèm Bài kiểm tra (Tùy chọn)</Label>
              <Select value={attachedExamId} onValueChange={setAttachedExamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bài kiểm tra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không đính kèm</SelectItem>
                  {availableExams.map(e => (
                    <SelectItem key={e._id} value={e._id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddLesson} className="w-full">{activeLessonId ? "Cập nhật Bài Học" : "Lưu Bài Học"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
