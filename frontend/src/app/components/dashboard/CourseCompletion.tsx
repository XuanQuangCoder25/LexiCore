import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { BookOpen, CalendarCheck, Clock, Layers, Trophy, Sparkles, Loader2, Share2 } from "lucide-react";
import { Confetti } from "./Confetti";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { communityService, getCommunityErrorMessage } from "../../services/community-service";

export interface CourseCompletionStats {
  totalChapters: number;
  totalLessons: number;
  completedLessons: number;
  totalDurationMinutes: number;
  progressPercentage: number;
  completedAt?: string | Date | null;
}

interface CourseCompletionProps {
  courseId?: string;
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

export const CourseCompletion = ({ courseId, courseTitle, stats, onClose, onExit }: CourseCompletionProps) => {
  const percent = useCountUp(stats.progressPercentage);
  const lessons = useCountUp(stats.completedLessons);
  const [ringFilled, setRingFilled] = useState(false);
  const [sharingMilestone, setSharingMilestone] = useState(false);
  const [hasShared, setHasShared] = useState(false);

  const handleShareToCommunity = async () => {
    if (!courseId) {
      toast.info("Đã ghi nhận thành tích khóa học của bạn!");
      return;
    }
    try {
      setSharingMilestone(true);
      await communityService.shareCourseMilestone({
        courseId,
        caption: `🎉 Mình vừa hoàn thành 100% khóa học "${courseTitle}"! Thật tự hào và hào hứng!`,
      });
      setHasShared(true);
      toast.success("Đã đăng thành tích của bạn lên Community Hub!");
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (error) {
      toast.error(getCommunityErrorMessage(error, "Không thể chia sẻ lên Community lúc này."));
    } finally {
      setSharingMilestone(false);
    }
  };

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
    { icon: BookOpen, label: "Bài học đã hoàn thành", value: `${lessons}/${stats.totalLessons}` },
    { icon: Layers, label: "Chương đã hoàn thành", value: `${stats.totalChapters}/${stats.totalChapters}` },
    { icon: Clock, label: "Tổng thời lượng", value: formatDuration(stats.totalDurationMinutes) },
    { icon: CalendarCheck, label: "Ngày hoàn thành", value: completedDate ?? "Hôm nay" },
  ];

  return (
    <>
      <Confetti />
      <div
        id="course-completion-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-completion-title"
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-zinc-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-300"
      >
        <Card className="relative w-full max-w-2xl overflow-hidden border border-zinc-200/80 bg-white shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300">
          <CardContent className="relative space-y-8 p-8 text-center">
            {/* Vòng tròn 100% */}
            <div className="relative mx-auto h-36 w-36">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="6" className="stroke-zinc-100" />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="stroke-zinc-900"
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: offset,
                    transition: "stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Trophy className="mb-0.5 h-6 w-6 text-zinc-900" />
                <span className="text-3xl font-extrabold text-zinc-900 leading-none">{percent}%</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mt-1">Hoàn thành</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 id="course-completion-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
                Chúc mừng bạn đã hoàn thành khóa học!
              </h2>
              <p className="mx-auto max-w-md text-xs sm:text-sm text-zinc-500 leading-relaxed">
                Bạn đã chinh phục toàn bộ nội dung của <span className="font-semibold text-zinc-800">{courseTitle}</span>.
                Một hành trình học tập xuất sắc!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              {items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200/60 bg-zinc-50/60 p-3 transition-transform hover:-translate-y-0.5"
                >
                  <div className="rounded-lg p-2 bg-zinc-100 text-zinc-800 border border-zinc-200/60">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-zinc-900 leading-tight">{item.value}</div>
                    <div className="text-[11px] text-zinc-500">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleShareToCommunity}
                disabled={hasShared || sharingMilestone}
                className="bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 border border-zinc-200 text-xs sm:text-sm font-medium gap-2 shadow-none rounded-xl h-11 px-4 active:scale-[0.98]"
              >
                {sharingMilestone ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-zinc-700" />
                )}
                <span>
                  {hasShared ? "Đã khoe lên Community ✓" : "Khoe lên Community (+Exp & Xu)"}
                </span>
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] rounded-xl text-xs sm:text-sm font-medium h-11 px-4"
              >
                Xem lại khóa học
              </Button>
              <Button
                id="course-completion-exit"
                onClick={onExit}
                className="bg-[#161616] text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-150 rounded-xl font-medium text-xs sm:text-sm h-11 px-5"
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
