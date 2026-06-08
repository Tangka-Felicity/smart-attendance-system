import client from './client';

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    client.post('/auth/login/', { email, password }),
  register: (body: {
    name: string;
    matricule: string;
    email: string;
    phone?: string;
    password: string;
    role: string;
  }) =>
    client.post('/auth/register/', body),
  firstLoginChangePassword: (body: {
    new_password: string;
    confirm_password: string;
  }) =>
    client.post('/auth/first-login-change-password/', body),
  refresh: (refresh_token: string) =>
    client.post('/auth/refresh/', { refresh_token }),
  logout: (refresh_token: string) =>
    client.post('/auth/logout/', { refresh_token }),
  me: () =>
    client.get('/auth/me/'),
};

export const usersApi = {
  me: () =>
    client.get('/users/me/'),
  updateMe: (body: {
    name?: string;
    phone?: string;
    department?: string;
    bio?: string;
  }) =>
    client.put('/users/me/', body),
  updateAvatar: (body: { avatar_base64: string }) =>
    client.post('/users/me/avatar/', body),
  changePassword: (body: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) =>
    client.post('/users/me/change-password/', body),
  updateNotificationPreferences: (body: Record<string, boolean>) =>
    client.patch('/users/me/notification-preferences/', body),
  deleteMe: () =>
    client.delete('/users/me/'),
  updateFace: (body: { face_image_base64: string }) =>
    client.post('/users/me/face/', body),
};

export const studentApi = {
  faceRegister: (body: { face_image_base64: string }) =>
    client.post('/users/me/face/', body),
};

// Session API
export const sessionApi = {
  list: (params?: any) =>
    client.get('/sessions/', { params }),
  get: (id: string) =>
    client.get(`/sessions/${id}/`),
  getQR: (id: string) =>
    client.get(`/sessions/${id}/qr/`),
  open: (id: string) =>
    client.post(`/sessions/${id}/open/`, {}),
  close: (id: string) =>
    client.post(`/sessions/${id}/close/`, {}),
  announce: (id: string) =>
    client.post(`/sessions/${id}/announce/`, {}),
  getAttendance: (id: string) =>
    client.get(`/sessions/${id}/attendance/`),
  create: (body: any) =>
    client.post('/sessions/', body),
};

// Attendance API
export const attendanceApi = {
  checkin: (body: {
    session_id?: string;
    session_code?: string;
    latitude: number;
    longitude: number;
    face_image: string;
  }) =>
    client.post('/attendance/checkin/', body),
  checkout: (body: {
    session_id: string;
    qr_token: string;
  }) =>
    client.post('/attendance/checkout/', body),
  manualMark: (body: any) =>
    client.post('/attendance/manual-mark/', body),
  sync: (events: any[]) =>
    client.post('/attendance/sync-offline/', { events }),
};

// Notification API
export const notificationApi = {
  list: (unread_only?: boolean) =>
    client.get('/notifications/', { params: { unread_only } }),
  markRead: (id: string) =>
    client.put(`/notifications/${id}/read/`, {}),
};

// Analytics API
export const analyticsApi = {
  studentDashboard: (student_id: string) =>
    client.get(`/analytics/student/${student_id}/`),
};

// Course API
export const courseApi = {
  list: () =>
    client.get('/courses/'),
  listAvailable: () =>
    client.get('/courses/available/'),
  listMy: () =>
    client.get('/courses/my/'),
  enroll: (course_id: string) =>
    client.post(`/courses/${course_id}/enroll/`, {}),
  unenroll: (course_id: string) =>
    client.delete(`/courses/${course_id}/enroll/`),
  getStudents: (course_id: string) =>
    client.get(`/courses/${course_id}/students/`),
};

export default {
  authApi,
  usersApi,
  studentApi,
  sessionApi,
  attendanceApi,
  notificationApi,
  analyticsApi,
  courseApi,
};
