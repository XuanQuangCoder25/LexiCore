import httpClient from './httpClient';

const API_BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api/courses`;

export const courseBuilderService = {
  getMyCourses: async () => (await httpClient.get(`${API_BASE}/my-courses`)).data,
  getMyResources: async () => (await httpClient.get(`${API_BASE}/resources`)).data,
  createCourse: async (data: any) => (await httpClient.post(`${API_BASE}`, data)).data,
  updateCourse: async (id: string, data: any) => (await httpClient.put(`${API_BASE}/${id}`, data)).data,
  getCourseBuilderData: async (id: string) => (await httpClient.get(`${API_BASE}/${id}/builder`)).data,
  syncCourseTree: async (id: string, tree: any) => (await httpClient.put(`${API_BASE}/${id}/tree`, tree)).data,
  publishCourse: async (id: string) => (await httpClient.post(`${API_BASE}/${id}/publish`)).data,
  unpublishCourse: async (id: string) => (await httpClient.post(`${API_BASE}/${id}/unpublish`)).data,
  deleteCourse: async (id: string) => (await httpClient.delete(`${API_BASE}/${id}`)).data,
  
  createChapter: async (courseId: string, data: any) => (await httpClient.post(`${API_BASE}/${courseId}/chapters`, data)).data,
  updateChapter: async (courseId: string, chapterId: string, data: any) => (await httpClient.put(`${API_BASE}/${courseId}/chapters/${chapterId}`, data)).data,
  deleteChapter: async (courseId: string, chapterId: string) => (await httpClient.delete(`${API_BASE}/${courseId}/chapters/${chapterId}`)).data,
  
  createLesson: async (courseId: string, chapterId: string, data: any) => (await httpClient.post(`${API_BASE}/${courseId}/chapters/${chapterId}/lessons`, data)).data,
  updateLesson: async (courseId: string, chapterId: string, lessonId: string, data: any) => (await httpClient.put(`${API_BASE}/${courseId}/chapters/${chapterId}/lessons/${lessonId}`, data)).data,
  deleteLesson: async (courseId: string, chapterId: string, lessonId: string) => (await httpClient.delete(`${API_BASE}/${courseId}/chapters/${chapterId}/lessons/${lessonId}`)).data,
};
