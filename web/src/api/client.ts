import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

// Resolve the backend base URL. Prefer VITE_API_BASE_URL (the documented var),
// fall back to the legacy VITE_API_URL, then to the hosted backend so the
// deployed app works even if no env var is configured on the host.
const ENV_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;

export const API_BASE_URL =
  (ENV_BASE_URL && String(ENV_BASE_URL).trim()) ||
  'https://felicityb4-smart-attendance-backend.hf.space/v1';

// Hugging Face free-tier Spaces sleep after inactivity and can take ~30-60s to
// wake. Use a generous timeout so the first request doesn't fail prematurely.
export const API_TIMEOUT_MS = 90_000;

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});

// Request Interceptor
client.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('access_token');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response Interceptor
let refreshInFlight: Promise<string> | null = null;

const performRefresh = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }
  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refresh_token: refreshToken }
  );
  const { access_token } = response.data;
  if (!access_token) {
    throw new Error('Refresh response missing access_token');
  }
  localStorage.setItem('access_token', access_token);
  return access_token;
};

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const url: string = originalRequest?.url || '';

    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        if (!refreshInFlight) {
          refreshInFlight = performRefresh().finally(() => {
            refreshInFlight = null;
          });
        }
        const access_token = await refreshInFlight;

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return client(originalRequest);
      } catch (refreshErr) {
        console.error('Token refresh failed:', refreshErr);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    client.post('/auth/login', { email, password }),
  register: (body: {
    name: string;
    email: string;
    password: string;
    student_number: string;
  }) => client.post('/auth/register', body),
  firstLoginChangePassword: (body: {
    new_password: string;
    confirm_password: string;
  }) => client.post('/auth/first-login-change-password', body),
  logout: (refresh_token: string) =>
    client.post('/auth/logout', { refresh_token }),
  me: () => client.get('/auth/me/'),
};

// Users API
export const usersApi = {
  me: () =>
    client.get('/users/me'),
  updateMe: (body: Record<string, unknown>) =>
    client.patch('/users/me', body),
  updateAvatar: (body: { avatar_base64: string }) =>
    client.post('/users/me/avatar', body),
  changePassword: (body: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) =>
    client.post('/users/me/change-password', body),
  updateFace: (body: { face_image_base64: string }) =>
    client.post('/users/me/face-register', body),
  list: (params?: Record<string, unknown>) =>
    client.get('/users/', { params }),
  create: (body: Record<string, unknown>) =>
    client.post('/users/', body),
  get: (id: string) =>
    client.get(`/users/${id}`),
  update: (id: string, body: Record<string, unknown>) =>
    client.put(`/users/${id}`, body),
  registerFace: (studentId: string, body: Record<string, unknown>) =>
    client.post(`/users/${studentId}/register-face`, body),
  deleteFace: (studentId: string, courseId: string) =>
    client.delete(`/users/${studentId}/face/${courseId}`),
};

// Courses API
export const coursesApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/courses/', { params }),
  create: (body: Record<string, unknown>) =>
    client.post('/courses/', body),
  get: (id: string) =>
    client.get(`/courses/${id}`),
  update: (id: string, body: Record<string, unknown>) =>
    client.put(`/courses/${id}`, body),
  students: (id: string) =>
    client.get(`/courses/${id}/students`),
  enroll: (id: string, student_ids: string[]) =>
    client.post(`/courses/${id}/enroll`, { student_ids }),
  unenroll: (courseId: string, studentId: string) =>
    client.delete(`/courses/${courseId}/enroll/${studentId}`),
};

// Sessions API
export const sessionsApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/sessions/', { params }),
  create: (body: Record<string, unknown>) =>
    client.post('/sessions/', body),
  get: (id: string) =>
    client.get(`/sessions/${id}`),
  update: (id: string, body: Record<string, unknown>) =>
    client.put(`/sessions/${id}`, body),
  announce: (id: string) =>
    client.post(`/sessions/${id}/announce`),
  open: (id: string) =>
    client.post(`/sessions/${id}/open`),
  close: (id: string) =>
    client.post(`/sessions/${id}/close`),
  getQR: (id: string) =>
    client.get(`/sessions/${id}/qr`),
  attendance: (id: string) =>
    client.get(`/sessions/${id}/attendance`),
};

// Attendance API
export const attendanceApi = {
  manual: (body: Record<string, unknown>) =>
    client.post('/attendance/manual/', body),
  get: (id: string) =>
    client.get(`/attendance/${id}`),
};

// Analytics API
export const analyticsApi = {
  student: (id: string) =>
    client.get(`/analytics/student/${id}`),
  reports: (params?: Record<string, unknown>) =>
    client.get('/analytics/reports', { params }),
  export: (params?: Record<string, unknown>) =>
    client.get('/analytics/export', { params, responseType: 'blob' }),
};

// Notifications API
export const notificationsApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/notifications/', { params }),
  markRead: (id: string) =>
    client.post(`/notifications/${id}/read`),
};

// Anomalies API
export const anomaliesApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/anomalies/', { params }),
  resolve: (id: string) =>
    client.post(`/anomalies/${id}/resolve`),
};

// Audit API
export const auditApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/audit/', { params }),
};

export default client;
