import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1/creator',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const creatorService = {
  getPrivateSpaceContent: async () => (await api.get('/private-space')).data,
  getCourses: async (params?: any) => (await api.get('/courses', { params })).data,
  createCourse: async (data: any) => (await api.post('/courses', data)).data,
  updateCourse: async (id: string, data: any) => (await api.put(`/courses/${id}`, data)).data,
  deleteCourse: async (id: string) => (await api.delete(`/courses/${id}`)).data,
  
  getFlashcards: async (courseId: string) => (await api.get(`/courses/${courseId}/flashcards`)).data,
  createFlashcard: async (data: any) => (await api.post('/flashcards', data)).data,
  updateFlashcard: async (id: string, data: any) => (await api.put(`/flashcards/${id}`, data)).data,
  deleteFlashcard: async (id: string) => (await api.delete(`/flashcards/${id}`)).data,

  // Flashcard Decks (Full & Atomic)
  getDeckById: async (id: string) => (await api.get(`/decks/${id}`)).data,
  saveFullDeck: async (payload: { deck: any; cards: any[] }) => (await api.post('/decks/save-full', payload)).data,
  publishDeck: async (id: string) => (await api.post(`/decks/${id}/publish`)).data,
  unpublishDeck: async (id: string) => (await api.post(`/decks/${id}/unpublish`)).data,
  cloneDirectDeck: async (id: string) => (await api.post(`/decks/${id}/clone`)).data,

  getExams: async () => (await api.get('/exams')).data,
  createExam: async (data: any) => (await api.post('/exams', data)).data,
  updateExam: async (id: string, data: any) => (await api.put(`/exams/${id}`, data)).data,
  deleteExam: async (id: string) => (await api.delete(`/exams/${id}`)).data,
};
