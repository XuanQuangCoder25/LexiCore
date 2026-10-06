import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Clock, Users, Search, Play, BookOpen, AlertCircle } from "lucide-react";
import { studentCourseService } from "../../services/student-course-service";
import { LearningWorkspace } from "./LearningWorkspace";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { toast } from "sonner";

export const CoursesView = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Navigation State
  const [activeWorkspaceCourseId, setActiveWorkspaceCourseId] = useState<string | null>(null);
  
  // Course Details State
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseDetails, setCourseDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, [search]);

  const fetchCourses = async () => {
    try {
      const res = await studentCourseService.getPublishedCourses({ search });
      if (res.status === 'success') {
        setCourses(res.data);
      }
    } catch (error) {
      console.error("Lỗi khi tải khóa học:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (id: string) => {
    setSelectedCourseId(id);
    setDetailsLoading(true);
    try {
      const res = await studentCourseService.getCourseDetails(id);
      if (res.status === 'success') {
        setCourseDetails(res.data);
      }
    } catch (error) {
      toast.error("Không thể tải chi tiết khóa học");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedCourseId) return;
    try {
      const res = await studentCourseService.enrollCourse(selectedCourseId);
      if (res.status === 'success') {
        toast.success("Đăng ký thành công! Bắt đầu học ngay.");
        // Refresh details to get isEnrolled = true
        handleOpenDetails(selectedCourseId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi đăng ký");
    }
  };

  const handleStartLearning = () => {
    if (selectedCourseId) {
      setActiveWorkspaceCourseId(selectedCourseId);
      setSelectedCourseId(null);
    }
  };

  if (activeWorkspaceCourseId) {
    return <LearningWorkspace courseId={activeWorkspaceCourseId} onBack={() => setActiveWorkspaceCourseId(null)} />;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Khám Phá Khóa Học</h1>
          <p className="text-muted-foreground mt-1 text-lg">Tìm khóa học phù hợp với trình độ của bạn</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Tìm kiếm khóa học..." 
            className="pl-10 h-12 rounded-full border-muted-foreground/20 focus-visible:ring-primary shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>
      ) : courses.length === 0 ? (
        <div className="text-center p-20 border rounded-xl bg-muted/10">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">Chưa có khóa học nào</h3>
          <p className="text-muted-foreground">Vui lòng quay lại sau.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course._id} className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-border/50 cursor-pointer" onClick={() => handleOpenDetails(course._id)}>
              <div className="relative h-48 w-full overflow-hidden bg-muted">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <BookOpen className="w-12 h-12 text-primary/40" />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-none shadow-sm">{course.level}</Badge>
                </div>
              </div>
              
              <CardContent className="p-5">
                <div className="flex gap-2 flex-wrap mb-3">
                  {course.tags?.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] uppercase tracking-wider">{tag}</Badge>
                  ))}
                </div>
                <h3 className="font-bold text-xl line-clamp-2 leading-tight mb-2 group-hover:text-primary transition-colors">{course.title}</h3>
                <p className="text-muted-foreground text-sm line-clamp-2">{course.description}</p>
              </CardContent>
              <CardFooter className="px-5 pb-5 pt-0 flex justify-between items-center border-t border-border/50 bg-muted/10 pt-4">
                 <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                   <span className="flex items-center gap-1"><BookOpen className="w-4 h-4 text-primary" /> Free</span>
                 </div>
                 <Button variant="ghost" className="hover:bg-primary hover:text-primary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-full p-2 h-10 w-10">
                   <Play className="w-5 h-5 ml-1" />
                 </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Course Details Dialog */}
      <Dialog open={selectedCourseId !== null} onOpenChange={(open) => !open && setSelectedCourseId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none rounded-2xl">
          {detailsLoading || !courseDetails ? (
            <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : (
            <>
              <div className="h-64 w-full relative">
                {courseDetails.course.thumbnail ? (
                  <img src={courseDetails.course.thumbnail} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <Badge className="mb-2">{courseDetails.course.level}</Badge>
                  <h2 className="text-3xl font-extrabold text-foreground">{courseDetails.course.title}</h2>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Giới thiệu khóa học</h3>
                  <p className="text-muted-foreground leading-relaxed">{courseDetails.course.description}</p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5" /> Lộ trình học (Syllabus)</h3>
                  <div className="space-y-3">
                    {courseDetails.syllabus.map((chapter: any) => (
                      <div key={chapter._id} className="border rounded-xl p-4 bg-card shadow-sm hover:shadow-md transition-shadow">
                        <div className="font-bold text-base mb-2">Chương {chapter.order}: {chapter.title}</div>
                        <div className="space-y-2">
                          {chapter.lessons.map((lesson: any) => (
                            <div key={lesson._id} className="flex justify-between items-center text-sm py-2 px-3 rounded-md bg-muted/30">
                              <span className="flex items-center gap-2">
                                <Play className="w-4 h-4 text-primary" /> {lesson.order}. {lesson.title}
                              </span>
                              <span className="text-muted-foreground">{lesson.durationMinutes} phút</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="sticky bottom-0 p-4 bg-background/80 backdrop-blur-md border-t flex justify-between items-center rounded-b-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                <div>
                  {courseDetails.isEnrolled ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-primary flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Đã đăng ký
                      </span>
                      <span className="text-xs text-muted-foreground">Tiến độ: {courseDetails.progress}%</span>
                    </div>
                  ) : (
                    <span className="font-bold text-xl">Miễn phí</span>
                  )}
                </div>
                {courseDetails.isEnrolled ? (
                  <Button size="lg" className="rounded-full shadow-lg" onClick={handleStartLearning}>Vào Học Ngay <Play className="w-4 h-4 ml-2" /></Button>
                ) : (
                  <Button size="lg" className="rounded-full shadow-lg" onClick={handleEnroll}>Đăng Ký Khóa Học</Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};