import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { Calendar, Play } from "lucide-react";
import { CourseProgress as CourseType, NextLesson } from "./hooks/useDashboardData";

interface CourseProgressProps {
  courses: CourseType[];
  nextLessons: NextLesson[];
}

export function CourseProgress({ courses, nextLessons }: CourseProgressProps) {
  return (
    <div className="lg:col-span-2 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Courses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {courses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
              You haven't enrolled in any courses yet.
            </div>
          ) : (
            <div className="space-y-5">
              {courses.map((course) => (
                <div key={course.id}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-foreground">{course.title}</span>
                    <span className="text-muted-foreground font-medium">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-2.5 bg-secondary" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Next Lessons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {nextLessons.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
              No upcoming lessons scheduled.
            </div>
          ) : (
            nextLessons.map((lesson) => (
              <div key={lesson.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border/50">
                <div>
                  <h4 className="font-medium">{lesson.title}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {lesson.course} • {lesson.duration}
                  </p>
                </div>
                <Button size="sm" className="rounded-full px-4">
                  <Play className="h-4 w-4 mr-1.5 fill-current" />
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
