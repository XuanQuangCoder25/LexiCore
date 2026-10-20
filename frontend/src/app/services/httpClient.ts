/**
 * httpClient.ts
 *
 * Axios instance dung chung toan app theo Memory Token Pattern:
 *   - accessToken: luu trong tokenStore (bo nho RAM), gui qua Authorization header
 *   - refreshToken: luu trong httpOnly cookie (browser tu gui, JS khong doc duoc)
 *
 * Khi nhan 401:
 *   1. Goi POST /api/auth/refresh-token (refreshToken cookie tu dong duoc gui)
 *   2. Backend tra ve accessToken moi trong body JSON
 *   3. Luu vao tokenStore, retry request goc
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { tokenStore } from "./tokenStore";

const REFRESH_URL = "/api/auth/refresh-token";
const LOGIN_PAGE  = "/login";

// Chi goi refresh 1 lan du nhieu request cung fail
let isRefreshing = false;
let pendingQueue: Array<{
    resolve: (value?: unknown) => void;
    reject:  (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown) {
    pendingQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve();
    });
    pendingQueue = [];
}

const httpClient = axios.create({
    baseURL: "",
    withCredentials: true,   // can thiet de gui refreshToken cookie
    headers: { "Content-Type": "application/json" },
});

// --- Request interceptor: tu dong gan Authorization header ---
httpClient.interceptors.request.use((config) => {
    const token = tokenStore.getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- Response interceptor: tu dong refresh khi nhan 401 ---
httpClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (
            error.response?.status !== 401 ||
            originalRequest._retry ||
            originalRequest.url === REFRESH_URL
        ) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                pendingQueue.push({ resolve, reject });
            })
                .then(() => httpClient(originalRequest))
                .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            // refreshToken cookie tu dong duoc gui boi browser
            const res = await axios.post<{ accessToken?: string; token?: string }>(
                REFRESH_URL,
                {},
                { withCredentials: true }
            );

            // Backend tra ve accessToken trong body
            const newToken = res.data?.accessToken || res.data?.token;
            if (newToken) {
                tokenStore.setToken(newToken);
            }

            processQueue(null);
            return httpClient(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError);
            tokenStore.clear();
            window.location.href = LOGIN_PAGE;
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default httpClient;
