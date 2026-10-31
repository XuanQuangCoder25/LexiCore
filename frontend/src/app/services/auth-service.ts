import httpClient from './httpClient';

export const authService = {
  register: async (data: unknown) => {
    const res = await httpClient.post('/api/auth/register', data);
    return res.data;
  },

  login: async (data: unknown) => {
    const res = await httpClient.post('/api/auth/login', data);
    return res.data;
  },

  logout: async () => {
    const res = await httpClient.post('/api/auth/logout');
    return res.data;
  },

  verifyEmail: async (data: { email: string; otp_code: string }) => {
    const res = await httpClient.post('/api/auth/verify-email', data);
    return res.data;
  },

  getMe: async () => {
    const res = await httpClient.get('/api/auth/me');
    return res.data;
  },

  refreshToken: async () => {
    const res = await httpClient.post('/api/auth/refresh-token');
    return res.data;
  },

  forgotPassword: async (data: { email: string }) => {
    const res = await httpClient.post('/api/auth/forgot-password', data);
    return res.data;
  },

  resetPassword: async (data: unknown) => {
    const res = await httpClient.post('/api/auth/reset-password', data);
    return res.data;
  },

  resendOtp: async (data: { email: string; mode: 'REGISTER' | 'FORGOT_PASSWORD' }) => {
    const res = await httpClient.post('/api/auth/resend-otp', data);
    return res.data;
  },

  verifyOtp: async (data: { email: string; otp_code: string; mode: 'REGISTER' | 'FORGOT_PASSWORD' }) => {
    const res = await httpClient.post('/api/auth/verify-otp', data);
    return res.data;
  }
};

