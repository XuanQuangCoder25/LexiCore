import httpClient from './httpClient';

const API_BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api/v1/creator`;

export const creatorService = {
  getPrivateSpaceContent: async () => (await httpClient.get(`${API_BASE}/private-space`)).data,
  getCourses: async (params?: any) => (await httpClient.get(`${API_BASE}/courses`, { params })).data,
  createCourse: async (data: any) => (await httpClient.post(`${API_BASE}/courses`, data)).data,
  updateCourse: async (id: string, data: any) => (await httpClient.put(`${API_BASE}/courses/${id}`, data)).data,
  deleteCourse: async (id: string) => (await httpClient.delete(`${API_BASE}/courses/${id}`)).data,
  
  getFlashcards: async (courseId: string) => (await httpClient.get(`${API_BASE}/courses/${courseId}/flashcards`)).data,
  createFlashcard: async (data: any) => (await httpClient.post(`${API_BASE}/flashcards`, data)).data,
  updateFlashcard: async (id: string, data: any) => (await httpClient.put(`${API_BASE}/flashcards/${id}`, data)).data,
  deleteFlashcard: async (id: string) => (await httpClient.delete(`${API_BASE}/flashcards/${id}`)).data,

  // Flashcard Decks (Full & Atomic)
  getDeckById: async (id: string) => (await httpClient.get(`${API_BASE}/decks/${id}`)).data,
  saveFullDeck: async (payload: { deck: any; cards: any[] }) => (await httpClient.post(`${API_BASE}/decks/save-full`, payload)).data,
  publishDeck: async (id: string) => (await httpClient.post(`${API_BASE}/decks/${id}/publish`)).data,
  unpublishDeck: async (id: string) => (await httpClient.post(`${API_BASE}/decks/${id}/unpublish`)).data,
  cloneDirectDeck: async (id: string) => (await httpClient.post(`${API_BASE}/decks/${id}/clone`)).data,

  getExams: async () => (await httpClient.get(`${API_BASE}/exams`)).data,
  createExam: async (data: any) => (await httpClient.post(`${API_BASE}/exams`, data)).data,
  updateExam: async (id: string, data: any) => (await httpClient.put(`${API_BASE}/exams/${id}`, data)).data,
  deleteExam: async (id: string) => (await httpClient.delete(`${API_BASE}/exams/${id}`)).data,
};
