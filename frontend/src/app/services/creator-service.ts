import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1/creator',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const creatorService = {
  getCourses: async () => (await api.get('/courses')).data,
  createCourse: async (data: any) => (await api.post('/courses', data)).data,
  updateCourse: async (id: string, data: any) => (await api.put(`/courses/${id}`, data)).data,
  deleteCourse: async (id: string) => (await api.delete(`/courses/${id}`)).data,
  
  getFlashcards: async (courseId: string) => (await api.get(`/courses/${courseId}/flashcards`)).data,
  createFlashcard: async (data: any) => (await api.post('/flashcards', data)).data,
  updateFlashcard: async (id: string, data: any) => (await api.put(`/flashcards/${id}`, data)).data,
  deleteFlashcard: async (id: string) => (await api.delete(`/flashcards/${id}`)).data,
};
