import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import axios from 'axios';
import { tokenStore } from '../services/tokenStore';

const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Bước 1: Thử dùng token đang có trong memory (nếu app chưa F5)
      if (tokenStore.getToken()) {
        try {
          await axios.get('/api/auth/me', {
            withCredentials: true,
            headers: { Authorization: `Bearer ${tokenStore.getToken()}` }
          });
          setIsAuthenticated(true);
          return;
        } catch {
          // Token trong memory đã hết hạn, thử refresh
        }
      }

      // Bước 2: Silent refresh — dùng refreshToken cookie để lấy accessToken mới
      // (đây là bước luôn chạy khi F5, vì memory bị xóa khi reload)
      try {
        const res = await axios.post<{ accessToken?: string; token?: string }>(
          '/api/auth/refresh-token',
          {},
          { withCredentials: true }
        );
        const newToken = res.data?.accessToken || res.data?.token;
        if (newToken) {
          tokenStore.setToken(newToken);
        }
        setIsAuthenticated(true);
      } catch {
        // refreshToken cũng hết hạn → yêu cầu đăng nhập lại
        tokenStore.clear();
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;

