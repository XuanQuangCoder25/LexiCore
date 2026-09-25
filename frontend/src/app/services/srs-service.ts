import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1/srs',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const srsService = {
  getDecks: async () => (await api.get('/decks')).data,
  getDueCards: async (courseId?: string) => (await api.get(`/due${courseId ? `?courseId=${courseId}` : ''}`)).data,
  submitReview: async (data: { cardId: string; courseId: string; quality: number; responseTimeMs: number }) => 
    (await api.post('/review', data)).data,
  getStats: async () => (await api.get('/stats')).data,
};
