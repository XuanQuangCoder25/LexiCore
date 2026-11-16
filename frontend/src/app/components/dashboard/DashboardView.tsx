import { DashboardHeader } from "./DashboardHeader";
import { QuickStats } from "./QuickStats";
import { CourseProgress } from "./CourseProgress";
import { ActivitySidebar } from "./ActivitySidebar";
import { RetentionChartCard } from "./RetentionChartCard";
import { useDashboardData } from "./hooks/useDashboardData";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { AlertCircle, RefreshCw, Rocket } from "lucide-react";

interface DashboardViewProps {
  onNavigateTab?: (tab: string) => void;
  userName?: string;
}

export function DashboardView({ onNavigateTab, userName }: DashboardViewProps) {
  const { data, loading, error, refetch } = useDashboardData();

  const handleNavigate = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      window.dispatchEvent(new CustomEvent("navigate-tab", { detail: { tab } }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-10 w-[250px] sm:w-[300px]" />
            <Skeleton className="h-5 w-[200px] sm:w-[250px]" />
          </div>
          <Skeleton className="h-8 w-[100px] sm:w-[120px] rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[110px] w-full rounded-2xl" />
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[250px] w-full rounded-2xl" />
            <Skeleton className="h-[200px] w-full rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[220px] w-full rounded-2xl" />
            <Skeleton className="h-[200px] w-full rounded-2xl" />
            <Skeleton className="h-[150px] w-full rounded-2xl" />
          </div>
        </div>

        <Skeleton className="h-[320px] w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
        <div className="bg-rose-500/10 p-4 rounded-full">
          <AlertCircle className="h-10 w-10 text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Không thể tải dữ liệu Dashboard</h2>
        <p className="text-zinc-500 max-w-md text-sm">{error}</p>
        <Button onClick={refetch} variant="outline" className="mt-4 rounded-xl border-zinc-200">
          <RefreshCw className="mr-2 h-4 w-4" />
          Thử lại
        </Button>
      </div>
    );
  }

  if (!data || !data.stats) {
    return null;
  }

  const resolvedUserName = data.stats.userName || userName || "Học viên";

  // Chỉ hiện trạng thái Empty Onboarding nếu user thực sự chưa có bất kỳ hoạt động nào trên toàn hệ thống
  const isCompletelyNewUser =
    data.stats.lessonsCompleted === 0 &&
    data.courses.length === 0 &&
    data.stats.wordsLearned === 0 &&
    (data.stats.durationSeconds || 0) === 0 &&
    data.retentionData.length === 0 &&
    (data.activities?.achievements?.length || 0) === 0;

  if (isCompletelyNewUser) {
    return (
      <div className="space-y-6 pb-10">
        <DashboardHeader userName={resolvedUserName} streak={data.stats.streak} />
        <QuickStats stats={data.stats} />
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-5 max-w-md mx-auto px-4 border border-dashed border-zinc-200 rounded-3xl bg-white">
          <div className="bg-zinc-100 p-5 rounded-2xl flex items-center justify-center border border-zinc-200/80">
            <Rocket className="h-10 w-10 text-zinc-900" strokeWidth={1.75} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-zinc-900">Chào mừng {resolvedUserName} đến với LexiCore!</h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Hãy bắt đầu khóa học hoặc bộ thẻ từ vựng đầu tiên để hệ thống ghi nhận tiến độ, thành tựu và biểu đồ ghi nhớ của bạn tại đây.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Button
              onClick={() => handleNavigate("courses")}
              className="rounded-xl bg-[#161616] hover:bg-black text-white px-5 font-semibold"
            >
              Khám phá Khóa học ngay
            </Button>
            <Button
              variant="outline"
              onClick={() => handleNavigate("flashcards")}
              className="rounded-xl border-zinc-200 text-zinc-800 hover:bg-zinc-50 px-5"
            >
              Ôn tập Flashcards
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <DashboardHeader userName={resolvedUserName} streak={data.stats.streak} />

      <QuickStats stats={data.stats} />

      <div className="grid lg:grid-cols-3 gap-6">
        <CourseProgress
          courses={data.courses}
          nextLessons={data.nextLessons}
          onNavigateTab={handleNavigate}
        />

        <ActivitySidebar
          streak={data.stats.streak}
          activities={data.activities || { achievements: [], weeklyActivityScore: 0 }}
          onNavigateTab={handleNavigate}
        />
      </div>

      <RetentionChartCard
        data={data.retentionData}
        dueCardsToday={data.stats.dueCardsToday ?? 0}
      />
    </div>
  );
}
