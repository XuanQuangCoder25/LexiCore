import { useState, useEffect, useCallback } from 'react';
import httpClient from '../../../services/httpClient';

const API_BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api/v1/dashboard`;

export interface DashboardStats {
  userName?: string;
  lessonsCompleted: number;
  durationHours: number;
  durationMinutes?: number;
  durationSeconds?: number;
  formattedDuration?: string;
  wordsLearned: number;
  level: string;
  streak: number;
  dueCardsToday?: number;
  examsCompleted?: number;
}

export interface RetentionPoint {
  day: string;
  date?: string;
  retention: number;
  withReview: number;
  reviewsCount?: number;
}

export interface CourseProgress {
  id: string;
  title: string;
  level?: string;
  thumbnail?: string;
  progress: number;
  completedLessons?: number;
  totalLessons?: number;
  isCompleted?: boolean;
}

export interface NextLesson {
  id: string;
  courseId?: string;
  title: string;
  course: string;
  duration: string;
  type?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon?: string;
  category?: string;
  unlockedAt?: string;
}

export interface DailyGoalsSummary {
  completed: number;
  total: number;
  title: string;
}

export interface DashboardActivities {
  achievements: Achievement[];
  weeklyActivityScore: number;
  dailyGoals?: DailyGoalsSummary;
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

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, retRes, coursesRes, lessonsRes, activitiesRes] = await Promise.all([
        httpClient.get<DashboardStats>(`${API_BASE}/stats`),
        httpClient.get<RetentionPoint[]>(`${API_BASE}/retention`),
        httpClient.get<CourseProgress[]>(`${API_BASE}/courses`),
        httpClient.get<NextLesson[]>(`${API_BASE}/lessons`),
        httpClient.get<DashboardActivities>(`${API_BASE}/activities`),
      ]);

      setData({
        stats: statsRes.data,
        retentionData: Array.isArray(retRes.data) ? retRes.data : [],
        courses: Array.isArray(coursesRes.data) ? coursesRes.data : [],
        nextLessons: Array.isArray(lessonsRes.data) ? lessonsRes.data : [],
        activities: activitiesRes.data || { achievements: [], weeklyActivityScore: 0 },
      });
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu dashboard:', err);
      if (err?.response?.status === 401) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setError(err?.response?.data?.message || err.message || 'Có lỗi xảy ra khi kết nối máy chủ');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, loading, error, refetch: fetchDashboardData };
}
