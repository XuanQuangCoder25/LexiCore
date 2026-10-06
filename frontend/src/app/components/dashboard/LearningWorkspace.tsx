import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";
import { ArrowLeft, PlayCircle, FileText, CheckCircle, Circle } from "lucide-react";
import { studentCourseService } from "../../services/student-course-service";
import { toast } from "sonner";
import { ScrollArea } from "../ui/scroll-area";

export const LearningWorkspace = ({ courseId, onBack }: { courseId: string; onBack: () => void }) => {
  const [data, setData] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [lessonContent, setLessonContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCourseData = async () => {
    try {
      const res = await studentCourseService.getCourseDetails(courseId);
      if (res.success) {
        setData(res.data);
        // Tự động chọn bài học đầu tiên nếu chưa chọn
        if (res.data.syllabus.length > 0 && res.data.syllabus[0].lessons.length > 0 && !activeLesson) {
          handleSelectLesson(res.data.syllabus[0].lessons[0]);
        }
      }
    } catch (error) {
      toast.error("Không thể tải khóa học");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const handleSelectLesson = async (lesson: any) => {
    setActiveLesson(lesson);
    setLessonContent(null);
    try {
      const res = await studentCourseService.getLessonContent(courseId, lesson._id);
      if (res.success) {
        setLessonContent(res.data);
      }
    } catch (error) {
      toast.error("Lỗi khi tải nội dung bài học");
    }
  };

  const handleMarkComplete = async () => {
    if (!activeLesson) return;
    try {
      const res = await studentCourseService.completeLesson(courseId, activeLesson._id);
      if (res.success) {
        toast.success(res.message);
        fetchCourseData(); // Reload progress
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi hoàn thành bài học");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!data) return <div>Không có dữ liệu.</div>;

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4 bg-card">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">{data.course.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Tiến độ: {data.progress}%</span>
              <Progress value={data.progress} className="w-32 h-2" />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          {lessonContent ? (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">{lessonContent.title}</h2>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <PlayCircle className="w-4 h-4" /> {lessonContent.durationMinutes} phút
                </div>
              </div>

              {lessonContent.videoUrl && (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg border">
                  {/* Fake Video Player or actual iframe */}
                  {lessonContent.videoUrl.includes('youtube') ? (
                    <iframe 
                      className="w-full h-full"
                      src={lessonContent.videoUrl.replace('watch?v=', 'embed/')} 
                      title="Video Player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <video src={lessonContent.videoUrl} controls className="w-full h-full" />
                    </div>
                  )}
                </div>
              )}

              {lessonContent.content && (
                <Card className="border-none shadow-sm bg-muted/20">
                  <CardContent className="p-6 prose dark:prose-invert max-w-none">
                     <div className="whitespace-pre-wrap">{lessonContent.content}</div>
                  </CardContent>
                </Card>
              )}

              <div className="pt-6 border-t flex justify-between items-center">
                 <Button variant="outline" onClick={onBack}>Thoát</Button>
                 {data.completedLessons?.includes(activeLesson?._id) ? (
                   <Button size="lg" className="bg-green-500 hover:bg-green-600 shadow-md cursor-default text-white" disabled>
                     <CheckCircle className="w-5 h-5 mr-2" /> Đã hoàn thành
                   </Button>
                 ) : (
                   <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-md" onClick={handleMarkComplete}>
                     <CheckCircle className="w-5 h-5 mr-2" /> Hoàn thành bài học
                   </Button>
                 )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
               <div className="animate-pulse">Đang tải nội dung...</div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Syllabus Sidebar */}
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b font-semibold bg-muted/10">Nội dung khóa học</div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {data.syllabus.map((chapter: any) => (
              <div key={chapter._id} className="space-y-2">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">
                  Chương {chapter.order}: {chapter.title}
                </h3>
                <div className="space-y-1">
                  {chapter.lessons.map((lesson: any) => {
                    const isCompleted = data.completedLessons?.includes(lesson._id);
                    const isActive = activeLesson?._id === lesson._id;
                    return (
                      <button
                        key={lesson._id}
                        onClick={() => handleSelectLesson(lesson)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all ${isActive ? 'bg-primary/10 border-primary/20 border shadow-sm' : 'hover:bg-muted/50 border border-transparent'}`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isCompleted ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />}
                        </div>
                        <div>
                          <div className={`font-medium text-sm leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {lesson.order}. {lesson.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <PlayCircle className="w-3 h-3" /> {lesson.durationMinutes} phút
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
