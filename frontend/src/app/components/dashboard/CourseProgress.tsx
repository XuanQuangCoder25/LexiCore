import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Calendar, Play, BookOpen } from "lucide-react";
import { CourseProgress as CourseType, NextLesson } from "./hooks/useDashboardData";

interface CourseProgressProps {
  courses: CourseType[];
  nextLessons: NextLesson[];
  onNavigateTab?: (tab: string) => void;
}

export function CourseProgress({ courses, nextLessons, onNavigateTab }: CourseProgressProps) {
  const handleGoToCourses = () => {
    if (onNavigateTab) {
      onNavigateTab("courses");
    } else {
      window.dispatchEvent(new CustomEvent("navigate-tab", { detail: { tab: "courses" } }));
    }
  };

  return (
    <div className="lg:col-span-2 space-y-6">
      <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-zinc-900" />
            Current Courses
          </CardTitle>
          {courses.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleGoToCourses} className="text-xs text-zinc-600 hover:text-zinc-900 rounded-xl">
              Xem tất cả
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {courses.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-200 rounded-xl space-y-3 bg-zinc-50/50">
              <p className="text-sm">Bạn chưa đăng ký khóa học nào.</p>
              <Button size="sm" variant="outline" onClick={handleGoToCourses} className="rounded-xl border-zinc-200 text-zinc-800 hover:border-zinc-900">
                Khám phá Khóa học
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={handleGoToCourses}
                  className="p-3.5 rounded-xl border border-zinc-200/70 bg-zinc-50/40 hover:bg-zinc-50 hover:border-zinc-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-sm mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-zinc-900 truncate">{course.title}</span>
                      {course.level && (
                        <Badge variant="outline" className="text-[10px] font-mono border-zinc-200 bg-white text-zinc-700 rounded-md shrink-0">
                          {course.level}
                        </Badge>
                      )}
                    </div>
                    <span className="text-zinc-700 font-bold font-mono text-xs shrink-0">
                      {course.completedLessons !== undefined && course.totalLessons !== undefined
                        ? `${course.completedLessons}/${course.totalLessons} bài (${course.progress}%)`
                        : `${course.progress}%`}
                    </span>
                  </div>
                  <Progress value={course.progress} className="h-2 bg-zinc-200" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-zinc-200/80 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-zinc-900" />
            Next Lessons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {nextLessons.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50 text-sm">
              Không có bài học tiếp theo trong danh sách chờ.
            </div>
          ) : (
            nextLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between p-4 bg-zinc-50/60 rounded-xl hover:bg-zinc-100/70 transition-colors border border-zinc-200/70"
              >
                <div className="min-w-0 pr-3">
                  <h4 className="font-semibold text-sm text-zinc-900 truncate">{lesson.title}</h4>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    {lesson.course} • {lesson.duration}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleGoToCourses}
                  className="rounded-xl px-4 bg-[#161616] hover:bg-black text-white shrink-0 font-medium text-xs"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                  Start
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
