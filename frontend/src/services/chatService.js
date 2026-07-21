import apiClient from './api';
import { getAccessToken } from '../lib/token';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const conversationService = {
  list: (params) => apiClient.get('/conversations', { params }),
  create: (payload) => apiClient.post('/conversations', payload),
  get: (id) => apiClient.get(`/conversations/${id}`),
  update: (id, payload) => apiClient.patch(`/conversations/${id}`, payload),
  remove: (id) => apiClient.delete(`/conversations/${id}`),
  duplicate: (id) => apiClient.post(`/conversations/${id}/duplicate`),
  messages: (id, params) => apiClient.get(`/conversations/${id}/messages`, { params }),
  search: (q) => apiClient.get('/conversations/search', { params: { q } }),
  import: (payload) => apiClient.post('/conversations/import', payload),
  exportUrl: (id, format = 'json') =>
    `${baseURL}/conversations/${id}/export?format=${encodeURIComponent(format)}`,
};

export const chatService = {
  send: (payload) => apiClient.post('/chat', payload),
  regenerate: (payload) => apiClient.post('/chat/regenerate', payload),
  retry: (payload) => apiClient.post('/chat/retry', payload),
  stop: (payload) => apiClient.post('/chat/stop', payload),
  providers: () => apiClient.get('/chat/providers'),
  models: () => apiClient.get('/chat/models'),
  analytics: (params) => apiClient.get('/chat/analytics', { params }),
  templates: {
    list: () => apiClient.get('/chat/templates'),
    create: (payload) => apiClient.post('/chat/templates', payload),
    update: (id, payload) => apiClient.patch(`/chat/templates/${id}`, payload),
    remove: (id) => apiClient.delete(`/chat/templates/${id}`),
    duplicate: (id) => apiClient.post(`/chat/templates/${id}/duplicate`),
  },
  prompts: {
    list: (params) => apiClient.get('/chat/prompts', { params }),
    create: (payload) => apiClient.post('/chat/prompts', payload),
    update: (id, payload) => apiClient.patch(`/chat/prompts/${id}`, payload),
    remove: (id) => apiClient.delete(`/chat/prompts/${id}`),
    duplicate: (id) => apiClient.post(`/chat/prompts/${id}/duplicate`),
    import: (payload) => apiClient.post('/chat/prompts/import', payload),
    exportUrl: () => `${baseURL}/chat/prompts/export`,
  },
  uploadAttachment: (formData) =>
    apiClient.post('/chat/attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  async stream(payload, { signal, onEvent } = {}) {
    const token = getAccessToken();
    const res = await fetch(`${baseURL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(payload),
      signal,
    });
    if (!res.ok) throw new Error((await res.text()) || `Stream failed (${res.status})`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        const lines = part.split('\n');
        let event = 'message';
        let data = '';
        for (const line of lines) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (!data) continue;
        try {
          onEvent?.(event, JSON.parse(data));
        } catch {
          onEvent?.(event, { raw: data });
        }
      }
    }
  },

  async downloadExport(conversationId, format) {
    const token = getAccessToken();
    const res = await fetch(conversationService.exportUrl(conversationId, format), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat.${format === 'md' ? 'md' : format}`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

const RECOVERY_KEY = 'cm_chat_recovery';

export function loadChatRecovery() {
  try {
    return JSON.parse(localStorage.getItem(RECOVERY_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveChatRecovery(state) {
  try {
    localStorage.setItem(RECOVERY_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {
    /* quota */
  }
}

export function clearChatRecovery() {
  localStorage.removeItem(RECOVERY_KEY);
}
