import api from './api';

export const authService = {
  register: async (data: any) => {
    return api.post('/register', data);
  },

  login: async (data: any) => {
    return api.post('/login', data);
  },

  verifyEmail: async (data: { email: string; otp_code: string }) => {
    return api.post('/verify-email', data);
  },

  getMe: async () => {
    return api.get('/me');
  },

  forgotPassword: async (data: { email: string }) => {
    return api.post('/forgot-password', data);
  },

  resetPassword: async (data: any) => {
    return api.post('/reset-password', data);
  },

  resendOtp: async (data: { email: string; mode: 'REGISTER' | 'FORGOT_PASSWORD' }) => {
    return api.post('/resend-otp', data);
  },

  verifyOtp: async (data: { email: string; otp_code: string; mode: 'REGISTER' | 'FORGOT_PASSWORD' }) => {
    return api.post('/verify-otp', data);
  }
};
