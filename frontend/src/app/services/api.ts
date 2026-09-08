import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: '/api/auth',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error: AxiosError<{ status: string; message: string }>) => {
    const message = error.response?.data?.message || 'Có lỗi xảy ra từ máy chủ.';
    const status = error.response?.status;

    return Promise.reject({ message, status });
  }
);

export default api;
