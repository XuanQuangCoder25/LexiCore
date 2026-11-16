import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Clock, Users, Play, BookOpen, AlertCircle, Eye, CheckCircle2 } from "lucide-react";
import { studentCourseService } from "../../services/student-course-service";
import { LearningWorkspace } from "./LearningWorkspace";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { toast } from "sonner";
import { CatalogFilterBar, CatalogEmptyState, SortOption } from "./CatalogFilterBar";

export const CoursesView = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("ALL");
  const [sort, setSort] = useState<SortOption>("newest");
  
  // Navigation State
  const [activeWorkspaceCourseId, setActiveWorkspaceCourseId] = useState<string | null>(null);
  
  // Course Details State
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseDetails, setCourseDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentCourseService.getPublishedCourses({
        search,
        level: level === "ALL" ? undefined : level,
        sort,
      });
      if (res.status === 'success') {
        setCourses(res.data);
      }
    } catch (error) {
      console.error("Lỗi khi tải khóa học:", error);
    } finally {
      setLoading(false);
    }
  }, [search, level, sort]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleResetFilters = () => {
    setSearch("");
    setLevel("ALL");
    setSort("newest");
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
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Khám Phá Khóa Học</h1>
        <p className="text-zinc-500 mt-1 text-sm md:text-base">
          Tìm kiếm khóa học ngoại ngữ theo lộ trình chuẩn hóa quốc tế
        </p>
      </div>

      {/* Catalog Filter Bar chuẩn Monochrome */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <CatalogFilterBar
          search={search}
          onSearchChange={setSearch}
          level={level}
          onLevelChange={setLevel}
          sort={sort}
          onSortChange={setSort}
          totalResults={courses.length}
          resultLabel="khóa học"
          searchPlaceholder="Tìm kiếm khóa học theo tiêu đề, mô tả, từ khóa..."
          onReset={handleResetFilters}
        />
      </div>

      {/* Grid danh sách khóa học */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 border-t-transparent"></div>
          <p className="text-xs text-zinc-500 mt-3 font-medium">Đang tải danh sách khóa học...</p>
        </div>
      ) : courses.length === 0 ? (
        <CatalogEmptyState
          title="Không tìm thấy khóa học nào"
          description="Hãy thử đổi từ khóa tìm kiếm hoặc chọn cấp bậc khác để khám phá các khóa học phù hợp."
          onReset={handleResetFilters}
        />
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
                  {/* Level & Views Badges */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="bg-zinc-900/90 text-white backdrop-blur-sm border-none shadow-sm text-xs font-bold px-2.5 py-0.5 rounded-full font-mono">
                      {course.level || "B1"}
                    </span>
                    <span className="bg-white/95 text-zinc-800 backdrop-blur-sm shadow-sm text-[11px] font-medium px-2 py-0.5 rounded-full font-mono flex items-center gap-1 border border-zinc-200/60">
                      <Eye className="w-3 h-3 text-zinc-500" />
                      {course.viewsCount || 0}
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
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 text-zinc-800 group-hover:bg-zinc-900 group-hover:text-white transition-all duration-200">
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
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block bg-white/20 text-white backdrop-blur-md text-xs font-bold px-2.5 py-0.5 rounded-full font-mono">
                      {courseDetails.course.level}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-black/40 text-zinc-200 backdrop-blur-md text-xs font-medium px-2.5 py-0.5 rounded-full font-mono border border-white/10">
                      <Eye className="w-3 h-3 text-zinc-400" />
                      {courseDetails.course.viewsCount || 0} lượt xem
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1 leading-tight">{courseDetails.course.title}</h2>
                  <p className="text-zinc-300 text-xs line-clamp-1">{courseDetails.course.shortDescription || courseDetails.course.description}</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">Giới thiệu khóa học</h4>
                  <p className="text-sm text-zinc-600 leading-relaxed">{courseDetails.course.description}</p>
                </div>

                {courseDetails.course.objectives?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">Mục tiêu đầu ra</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {courseDetails.course.objectives.map((obj: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                          <CheckCircle2 className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Syllabus */}
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">Lộ trình học tập (Syllabus)</h4>
                  <div className="space-y-3">
                    {courseDetails.chapters?.map((chap: any, idx: number) => (
                      <div key={chap._id} className="border border-zinc-200/80 rounded-xl p-4 bg-zinc-50/50">
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-sm text-zinc-900">
                            Chương {idx + 1}: {chap.title}
                          </h5>
                          <span className="text-xs text-zinc-400 font-mono">
                            {courseDetails.lessons?.filter((l: any) => l.chapterId === chap._id).length} bài học
                          </span>
                        </div>
                        {chap.description && <p className="text-xs text-zinc-500 mt-1">{chap.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="p-4 border-t border-zinc-100 bg-zinc-50/60 flex items-center justify-between sm:justify-between">
                <Button variant="ghost" onClick={() => setSelectedCourseId(null)} className="rounded-xl text-zinc-600 hover:text-zinc-900">
                  Đóng
                </Button>
                {courseDetails.isEnrolled ? (
                  <Button onClick={handleStartLearning} className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-5 text-sm font-semibold gap-1.5">
                    <Play className="w-4 h-4 fill-white" /> Vào học ngay
                  </Button>
                ) : (
                  <Button onClick={handleEnroll} className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-5 text-sm font-semibold">
                    Đăng ký khóa học (Miễn phí)
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
