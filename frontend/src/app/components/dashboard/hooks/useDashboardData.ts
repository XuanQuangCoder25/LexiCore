import { useState, useEffect } from 'react';

export interface DashboardStats {
  lessonsCompleted: number;
  durationHours: number;
  wordsLearned: number;
  level: string;
  streak: number;
}

export interface RetentionPoint {
  day: string;
  retention: number;
  withReview: number;
}

export interface CourseProgress {
  id: number;
  title: string;
  progress: number;
}

export interface NextLesson {
  id: number;
  title: string;
  course: string;
  duration: string;
}

export interface Achievement {
  id: number;
  title: string;
  description: string;
}

export interface DashboardActivities {
  achievements: Achievement[];
  weeklyActivityScore: number;
}

export interface DashboardData {
  stats: DashboardStats | null;
  retentionData: RetentionPoint[];
  courses: CourseProgress[];
  nextLessons: NextLesson[];
  activities: DashboardActivities | null;
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    stats: null,
    retentionData: [],
    courses: [],
    nextLessons: [],
    activities: null,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchOptions = { credentials: 'include' as RequestCredentials };

      // Tối ưu hoá gọi API đồng thời với Promise.all, sử dụng relative path để Vite Proxy xử lý
      const [statsRes, retRes, coursesRes, lessonsRes, activitiesRes] = await Promise.all([
        fetch(`/api/v1/dashboard/stats`, fetchOptions),
        fetch(`/api/v1/dashboard/retention`, fetchOptions),
        fetch(`/api/v1/dashboard/courses`, fetchOptions),
        fetch(`/api/v1/dashboard/lessons`, fetchOptions),
        fetch(`/api/v1/dashboard/activities`, fetchOptions),
      ]);

      if (statsRes.status === 401 || retRes.status === 401) {
        throw new Error('UNAUTHORIZED');
      }

      if (!statsRes.ok || !retRes.ok || !coursesRes.ok || !lessonsRes.ok || !activitiesRes.ok) {
        throw new Error('Failed to fetch some dashboard data');
      }

      const [stats, retentionData, courses, nextLessons, activities] = await Promise.all([
        statsRes.json(),
        retRes.json(),
        coursesRes.json(),
        lessonsRes.json(),
        activitiesRes.json(),
      ]);

      setData({
        stats,
        retentionData,
        courses,
        nextLessons,
        activities,
      });
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu dashboard:', err);
      if (err.message === 'UNAUTHORIZED') {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setError(err.message || 'Có lỗi xảy ra khi kết nối máy chủ');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return { data, loading, error, refetch: fetchDashboardData };
}
