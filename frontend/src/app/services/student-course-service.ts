import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1/student/courses',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const studentCourseService = {
  getPublishedCourses: async (params?: { level?: string; search?: string }) => {
    return (await api.get('/', { params })).data;
  },
  
  getCourseDetails: async (id: string) => {
    return (await api.get(`/${id}`)).data;
  },
  
  enrollCourse: async (id: string) => {
    return (await api.post(`/${id}/enroll`)).data;
  },
  
  getLessonContent: async (courseId: string, lessonId: string) => {
    return (await api.get(`/${courseId}/lessons/${lessonId}`)).data;
  },
  
  completeLesson: async (courseId: string, lessonId: string) => {
    return (await api.post(`/${courseId}/lessons/${lessonId}/complete`)).data;
  }
};
