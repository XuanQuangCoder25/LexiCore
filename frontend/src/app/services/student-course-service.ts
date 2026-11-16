import httpClient from './httpClient';

const API_BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api/v1/student/courses`;

export const studentCourseService = {
  getPublishedCourses: async (params?: { level?: string; search?: string; sort?: string }) => {
    return (await httpClient.get(`${API_BASE}/`, { params })).data;
  },
  
  getCourseDetails: async (id: string) => {
    return (await httpClient.get(`${API_BASE}/${id}`)).data;
  },
  
  enrollCourse: async (id: string) => {
    return (await httpClient.post(`${API_BASE}/${id}/enroll`)).data;
  },
  
  getLessonContent: async (courseId: string, lessonId: string) => {
    return (await httpClient.get(`${API_BASE}/${courseId}/lessons/${lessonId}`)).data;
  },
  
  completeLesson: async (courseId: string, lessonId: string, timeSpentSeconds?: number) => {
    return (await httpClient.post(`${API_BASE}/${courseId}/lessons/${lessonId}/complete`, { timeSpentSeconds })).data;
  },

  completeChapter: async (courseId: string, chapterId: string) => {
    return (await httpClient.post(`${API_BASE}/${courseId}/chapters/${chapterId}/complete`)).data;
  },

  completeCourse: async (courseId: string, timeSpentSeconds?: number) => {
    return (await httpClient.post(`${API_BASE}/${courseId}/complete`, { timeSpentSeconds })).data;
  }
};
