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
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Khám Phá Khóa Học</h1>
          <p className="text-zinc-500 mt-1 text-sm md:text-base">Tìm kiếm khóa học ngoại ngữ theo lộ trình chuẩn hóa</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input 
            placeholder="Tìm kiếm khóa học..." 
            className="pl-10 h-11 rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 focus:outline-none transition-all duration-200 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 border-t-transparent"></div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center p-16 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/60">
          <BookOpen className="w-10 h-10 mx-auto text-zinc-400 mb-3" />
          <h3 className="text-base font-semibold text-zinc-900">Chưa có khóa học nào</h3>
          <p className="text-sm text-zinc-500 mt-0.5">Vui lòng quay lại sau hoặc liên hệ quản trị viên.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card 
              key={course._id} 
              className="bg-white border border-zinc-200/80 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-zinc-900 hover:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.07),0_2px_6px_-1px_rgba(0,0,0,0.04)] cursor-pointer group flex flex-col justify-between overflow-hidden" 
              onClick={() => handleOpenDetails(course._id)}
            >
              <div>
                <div className="relative h-48 w-full overflow-hidden bg-zinc-100">
                  {course.thumbnail ? (
                    <img 
                      src={course.thumbnail} 
                      alt={course.title} 
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-50 text-zinc-400">
                      <BookOpen className="w-10 h-10 opacity-40" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className="bg-[#161616]/85 text-white backdrop-blur-sm border-none shadow-sm text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      {course.level}
                    </span>
                  </div>
                </div>
                
                <CardContent className="p-5">
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {course.tags?.map((tag: string) => (
                      <span 
                        key={tag} 
                        className="text-[10px] font-medium tracking-wider uppercase bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-200/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-bold text-lg text-zinc-900 line-clamp-2 leading-snug mb-1.5 group-hover:text-zinc-700 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">
                    {course.description || "Khóa học ngoại ngữ tương tác toàn diện trên nền tảng LexiCore."}
                  </p>
                </CardContent>
              </div>

              <CardFooter className="px-5 pb-4 pt-3 flex justify-between items-center border-t border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
                  <BookOpen className="w-3.5 h-3.5 text-zinc-900" /> Miễn phí
                </div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 text-zinc-800 group-hover:bg-[#161616] group-hover:text-white transition-all duration-200">
                  <Play className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Course Details Dialog */}
      <Dialog open={selectedCourseId !== null} onOpenChange={(open) => !open && setSelectedCourseId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border border-zinc-200 rounded-2xl bg-white shadow-2xl" aria-describedby={undefined}>
          <DialogHeader className="sr-only">
            <DialogTitle>{courseDetails?.course?.title || "Chi tiết khóa học"}</DialogTitle>
          </DialogHeader>
          {detailsLoading || !courseDetails ? (
            <div className="p-16 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <div className="h-60 w-full relative bg-zinc-900 overflow-hidden">
                {courseDetails.course.thumbnail ? (
                  <img src={courseDetails.course.thumbnail} className="w-full h-full object-cover opacity-85" alt="" />
                ) : (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-zinc-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>
                <div className="absolute bottom-5 left-6 right-6">
                  <span className="inline-block bg-white/20 text-white backdrop-blur-md text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2">
                    {courseDetails.course.level}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    {courseDetails.course.title}
                  </h2>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Giới thiệu khóa học</h3>
                  <p className="text-zinc-700 text-sm leading-relaxed">{courseDetails.course.description}</p>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-zinc-900" /> Lộ trình học (Syllabus)
                  </h3>
                  <div className="space-y-3">
                    {courseDetails.syllabus.map((chapter: any) => (
                      <div key={chapter._id} className="border border-zinc-200/80 rounded-xl p-4 bg-zinc-50/50 hover:border-zinc-300 transition-colors">
                        <div className="font-semibold text-sm text-zinc-900 mb-2.5">
                          Chương {chapter.order}: {chapter.title}
                        </div>
                        <div className="space-y-1.5">
                          {chapter.lessons.map((lesson: any) => (
                            <div key={lesson._id} className="flex justify-between items-center text-xs py-2 px-3 rounded-lg bg-white border border-zinc-200/60">
                              <span className="flex items-center gap-2 font-medium text-zinc-800">
                                <Play className="w-3.5 h-3.5 text-zinc-900" /> {lesson.order}. {lesson.title}
                              </span>
                              <span className="text-zinc-500 font-mono">{lesson.durationMinutes} phút</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="sticky bottom-0 p-4 bg-white/95 backdrop-blur-md border-t border-zinc-200 flex justify-between items-center rounded-b-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
                <div>
                  {courseDetails.isEnrolled ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-zinc-700" /> Đã đăng ký khóa học
                      </span>
                      <span className="text-xs text-zinc-500">Tiến độ: {courseDetails.progress}%</span>
                    </div>
                  ) : (
                    <span className="font-bold text-base text-zinc-900">Miễn phí trọn đời</span>
                  )}
                </div>
                {courseDetails.isEnrolled ? (
                  <Button 
                    className="bg-[#161616] text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl px-5 h-10 text-sm font-medium gap-2 group" 
                    onClick={handleStartLearning}
                  >
                    Vào Học Ngay <Play className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                  </Button>
                ) : (
                  <Button 
                    className="bg-[#161616] text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl px-5 h-10 text-sm font-medium" 
                    onClick={handleEnroll}
                  >
                    Đăng Ký Khóa Học
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};