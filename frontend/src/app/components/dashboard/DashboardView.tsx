import { DashboardHeader } from "./DashboardHeader";
import { QuickStats } from "./QuickStats";
import { CourseProgress } from "./CourseProgress";
import { ActivitySidebar } from "./ActivitySidebar";
import { RetentionChartCard } from "./RetentionChartCard";
import { useDashboardData } from "./hooks/useDashboardData";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export function DashboardView() {
  const { data, loading, error, refetch } = useDashboardData();

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
            <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
          ))}
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[250px] w-full rounded-xl" />
            <Skeleton className="h-[200px] w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[300px] w-full rounded-xl" />
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <Skeleton className="h-[150px] w-full rounded-xl" />
          </div>
        </div>
        
        <Skeleton className="h-[350px] w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
        <div className="bg-destructive/10 p-4 rounded-full">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">Failed to load dashboard</h2>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Button onClick={refetch} variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!data || !data.stats) {
    return null;
  }

  // Global Empty State for completely new users
  const isCompletelyNewUser = data.stats.lessonsCompleted === 0 && data.courses.length === 0;

  if (isCompletelyNewUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6 max-w-md mx-auto px-4">
        <div className="bg-primary/10 p-6 rounded-full mb-2">
          <span className="text-6xl block">🚀</span>
        </div>
        <h2 className="text-2xl font-bold">Welcome to LexiCore!</h2>
        <p className="text-muted-foreground text-base">
          Trang Dashboard của bạn hiện chưa có dữ liệu học tập. Hãy bắt đầu khóa học đầu tiên để theo dõi tiến độ, thành tựu và biểu đồ ghi nhớ của bạn tại đây nhé.
        </p>
        <Button size="lg" className="w-full sm:w-auto rounded-full mt-4 shadow-md">
          Khám phá Khóa học ngay
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <DashboardHeader 
        userName="Sarah" 
        streak={data.stats.streak} 
      />

      <QuickStats stats={data.stats} />

      <div className="grid lg:grid-cols-3 gap-6">
        <CourseProgress 
          courses={data.courses} 
          nextLessons={data.nextLessons} 
        />

        <ActivitySidebar 
          streak={data.stats.streak} 
          activities={data.activities!} 
        />
      </div>

      <RetentionChartCard data={data.retentionData} />
    </div>
  );
}