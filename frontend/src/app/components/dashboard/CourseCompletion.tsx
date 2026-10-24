import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { BookOpen, CalendarCheck, Clock, Layers, Trophy } from "lucide-react";
import { Confetti } from "./Confetti";

export interface CourseCompletionStats {
  totalChapters: number;
  totalLessons: number;
  completedLessons: number;
  totalDurationMinutes: number;
  progressPercentage: number;
  completedAt?: string | Date | null;
}

interface CourseCompletionProps {
  courseTitle: string;
  stats: CourseCompletionStats;
  onClose: () => void; // Ở lại xem lại khóa học
  onExit: () => void; // Quay về danh sách khóa học
}

const formatDuration = (totalMinutes: number) => {
  if (totalMinutes < 60) return `${totalMinutes} phút`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} giờ` : `${hours} giờ ${minutes} phút`;
};

// Đếm số tăng dần để tạo cảm giác "thành tựu"
const useCountUp = (target: number, duration = 1200) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
};

export const CourseCompletion = ({ courseTitle, stats, onClose, onExit }: CourseCompletionProps) => {
  const percent = useCountUp(stats.progressPercentage);
  const lessons = useCountUp(stats.completedLessons);
  const [ringFilled, setRingFilled] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setRingFilled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Đóng bằng phím Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = ringFilled ? circumference * (1 - stats.progressPercentage / 100) : circumference;

  const completedDate = stats.completedAt
    ? new Date(stats.completedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  const items = [
    { icon: BookOpen, label: "Bài học đã hoàn thành", value: `${lessons}/${stats.totalLessons}`, tone: "text-emerald-600 bg-emerald-500/10" },
    { icon: Layers, label: "Chương đã hoàn thành", value: `${stats.totalChapters}/${stats.totalChapters}`, tone: "text-indigo-600 bg-indigo-500/10" },
    { icon: Clock, label: "Tổng thời lượng", value: formatDuration(stats.totalDurationMinutes), tone: "text-sky-600 bg-sky-500/10" },
    { icon: CalendarCheck, label: "Ngày hoàn thành", value: completedDate ?? "Hôm nay", tone: "text-amber-600 bg-amber-500/10" },
  ];

  return (
    <>
      <Confetti />
      <div
        id="course-completion-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-completion-title"
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-md animate-in fade-in duration-300"
      >
        <Card className="relative w-full max-w-2xl overflow-hidden border-2 border-primary/20 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-6 duration-500">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />

          <CardContent className="relative space-y-8 p-8 text-center">
            {/* Vòng tròn 100% */}
            <div className="relative mx-auto h-40 w-40">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="8" className="stroke-muted" />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="stroke-emerald-500"
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: offset,
                    transition: "stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Trophy className="mb-1 h-8 w-8 text-amber-500 drop-shadow" />
                <span className="text-3xl font-extrabold leading-none">{percent}%</span>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Hoàn thành</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 id="course-completion-title" className="text-3xl font-bold tracking-tight">
                🎉 Chúc mừng bạn đã hoàn thành khóa học!
              </h2>
              <p className="mx-auto max-w-md text-muted-foreground">
                Bạn đã chinh phục toàn bộ nội dung của <span className="font-semibold text-foreground">{courseTitle}</span>.
                Một hành trình tuyệt vời!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              {items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3 transition-transform hover:-translate-y-0.5"
                >
                  <div className={`rounded-lg p-2 ${item.tone}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-lg font-bold leading-tight">{item.value}</div>
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <Button variant="outline" size="lg" onClick={onClose}>
                Xem lại khóa học
              </Button>
              <Button
                id="course-completion-exit"
                size="lg"
                onClick={onExit}
                className="bg-gradient-to-r from-primary to-emerald-600 font-semibold shadow-md hover:shadow-lg"
              >
                Về danh sách khóa học
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
