import apiClient from './api';

const BASE = '/code-intel';

export const codeIntelService = {
  list: (params) => apiClient.get(BASE, { params }),
  get: (id) => apiClient.get(`${BASE}/${id}`),
  create: (payload) => apiClient.post(BASE, payload),
  remove: (id) => apiClient.delete(`${BASE}/${id}`),
  upload: (formData) =>
    apiClient.post(`${BASE}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  analyze: (id, payload = {}) => apiClient.post(`${BASE}/${id}/analyze`, payload),
  analyzeAsync: (id, payload = {}) => apiClient.post(`${BASE}/${id}/analyze/async`, payload),
  complexity: (id) => apiClient.post(`${BASE}/${id}/complexity`),
  security: (id) => apiClient.post(`${BASE}/${id}/security`),
  performance: (id) => apiClient.post(`${BASE}/${id}/performance`),
  refactor: (id, payload = {}) => apiClient.post(`${BASE}/${id}/refactor`, payload),
  interview: (id, payload = {}) => apiClient.post(`${BASE}/${id}/interview`, payload),
  diff: (id, payload) => apiClient.post(`${BASE}/${id}/diff`, payload),
  chat: (id, payload) => apiClient.post(`${BASE}/${id}/chat`, payload),
  ensureChat: (id) => apiClient.post(`${BASE}/${id}/chat/session`),
  analytics: () => apiClient.get(`${BASE}/analytics`),
};
