import apiClient from './api';
import { API_PATHS } from '../constants';

export const resumeService = {
  list: (params) => apiClient.get(API_PATHS.RESUME, { params }),
  get: (id) => apiClient.get(`${API_PATHS.RESUME}/${id}`),
  upload: (formData) =>
    apiClient.post(`${API_PATHS.RESUME}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id, payload) => apiClient.patch(`${API_PATHS.RESUME}/${id}`, payload),
  remove: (id) => apiClient.delete(`${API_PATHS.RESUME}/${id}`),
  addVersion: (id, formData) =>
    apiClient.post(`${API_PATHS.RESUME}/${id}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  reindex: (id, payload = {}) => apiClient.post(`${API_PATHS.RESUME}/${id}/reindex`, payload),
  search: (id, payload) => apiClient.post(`${API_PATHS.RESUME}/${id}/search`, payload),
  ats: (id, payload = {}) => apiClient.post(`${API_PATHS.RESUME}/${id}/ats`, payload),
  bullets: (id, payload = {}) => apiClient.post(`${API_PATHS.RESUME}/${id}/bullets`, payload),
  skills: (id, payload = {}) => apiClient.post(`${API_PATHS.RESUME}/${id}/skills`, payload),
  report: (id, payload = {}) => apiClient.post(`${API_PATHS.RESUME}/${id}/report`, payload),
  compare: (id, payload) => apiClient.post(`${API_PATHS.RESUME}/${id}/compare`, payload),
  rollback: (id, payload) => apiClient.post(`${API_PATHS.RESUME}/${id}/rollback`, payload),
  listJd: () => apiClient.get(`${API_PATHS.RESUME}/jd`),
  createJd: (payload) => apiClient.post(`${API_PATHS.RESUME}/jd`, payload),
  matchJd: (id, jdId, payload = {}) =>
    apiClient.post(`${API_PATHS.RESUME}/${id}/jd/${jdId}/match`, payload),
  chat: (id, payload) => apiClient.post(`${API_PATHS.RESUME}/${id}/chat`, payload),
  ensureChat: (id) => apiClient.post(`${API_PATHS.RESUME}/${id}/chat/session`),
  analytics: (id) => apiClient.get(`${API_PATHS.RESUME}/${id}/analytics`),
};
