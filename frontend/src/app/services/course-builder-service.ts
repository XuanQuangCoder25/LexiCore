import axios from 'axios';

const api = axios.create({
  baseURL: '/api/courses',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const courseBuilderService = {
  getMyCourses: async () => (await api.get('/my-courses')).data,
  getMyResources: async () => (await api.get('/resources')).data,
  createCourse: async (data: any) => (await api.post('/', data)).data,
  updateCourse: async (id: string, data: any) => (await api.put(`/${id}`, data)).data,
  getCourseBuilderData: async (id: string) => (await api.get(`/${id}/builder`)).data,
  syncCourseTree: async (id: string, tree: any) => (await api.put(`/${id}/tree`, tree)).data,
  publishCourse: async (id: string) => (await api.post(`/${id}/publish`)).data,
  unpublishCourse: async (id: string) => (await api.post(`/${id}/unpublish`)).data,
  deleteCourse: async (id: string) => (await api.delete(`/${id}`)).data,
  
  createChapter: async (courseId: string, data: any) => (await api.post(`/${courseId}/chapters`, data)).data,
  updateChapter: async (courseId: string, chapterId: string, data: any) => (await api.put(`/${courseId}/chapters/${chapterId}`, data)).data,
  deleteChapter: async (courseId: string, chapterId: string) => (await api.delete(`/${courseId}/chapters/${chapterId}`)).data,
  
  createLesson: async (courseId: string, chapterId: string, data: any) => (await api.post(`/${courseId}/chapters/${chapterId}/lessons`, data)).data,
  updateLesson: async (courseId: string, chapterId: string, lessonId: string, data: any) => (await api.put(`/${courseId}/chapters/${chapterId}/lessons/${lessonId}`, data)).data,
  deleteLesson: async (courseId: string, chapterId: string, lessonId: string) => (await api.delete(`/${courseId}/chapters/${chapterId}/lessons/${lessonId}`)).data,
};
