import apiClient from './api';
import { API_PATHS } from '../constants';

export const authService = {
  login: (payload) => apiClient.post(`${API_PATHS.AUTH}/login`, payload),
  register: (payload) => apiClient.post(`${API_PATHS.AUTH}/register`, payload),
  logout: () => apiClient.post(`${API_PATHS.AUTH}/logout`),
  refresh: () => apiClient.post(`${API_PATHS.AUTH}/refresh`),
};

export const userService = {
  getProfile: () => apiClient.get(`${API_PATHS.USER}/profile`),
  updateProfile: (payload) => apiClient.patch(`${API_PATHS.USER}/profile`, payload),
  updatePassword: (payload) => apiClient.patch(`${API_PATHS.USER}/password`, payload),
  uploadAvatar: (formData) =>
    apiClient.post(`${API_PATHS.USER}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const dashboardService = {
  getOverview: () => apiClient.get(API_PATHS.DASHBOARD),
};

export const progressService = {
  get: () => apiClient.get(API_PATHS.PROGRESS),
  update: (payload) => apiClient.patch(API_PATHS.PROGRESS, payload),
};

export const goalsService = {
  list: (params) => apiClient.get(API_PATHS.GOALS, { params }),
  create: (payload) => apiClient.post(API_PATHS.GOALS, payload),
  update: (id, payload) => apiClient.patch(`${API_PATHS.GOALS}/${id}`, payload),
  remove: (id) => apiClient.delete(`${API_PATHS.GOALS}/${id}`),
  restore: (id) => apiClient.post(`${API_PATHS.GOALS}/${id}/restore`),
};

export const activityService = {
  list: (params) => apiClient.get(API_PATHS.ACTIVITY, { params }),
};

export const achievementsService = {
  list: () => apiClient.get(API_PATHS.ACHIEVEMENTS),
};

export const notificationsService = {
  list: (params) => apiClient.get(API_PATHS.NOTIFICATIONS, { params }),
  markRead: (id) => apiClient.patch(`${API_PATHS.NOTIFICATIONS}/${id}/read`),
};

export const analyticsService = {
  get: () => apiClient.get(API_PATHS.ANALYTICS),
};

export const chatService = {
  list: () => apiClient.get(API_PATHS.CHAT),
  send: (payload) => apiClient.post(API_PATHS.CHAT, payload),
};

export const interviewService = {
  list: () => apiClient.get(API_PATHS.INTERVIEW),
  create: (payload) => apiClient.post(API_PATHS.INTERVIEW, payload),
};

export const resumeService = {
  list: () => apiClient.get(API_PATHS.RESUME),
  upload: (formData) =>
    apiClient.post(`${API_PATHS.RESUME}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const plannerService = {
  list: () => apiClient.get(API_PATHS.PLANNER),
  create: (payload) => apiClient.post(API_PATHS.PLANNER, payload),
};

export const githubService = {
  status: () => apiClient.get(API_PATHS.GITHUB),
  connect: () => apiClient.post(`${API_PATHS.GITHUB}/connect`),
};
