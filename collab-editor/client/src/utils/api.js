import axios from 'axios';

const BASE = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 15000,
});

// ── Documents ─────────────────────────────────────────────────────────────────

export const fetchDocuments = () => api.get('/documents').then((r) => r.data);

export const fetchDocument = (roomId) =>
  api.get(`/documents/${roomId}`).then((r) => r.data);

export const createDocument = (title) =>
  api.post('/documents', { title }).then((r) => r.data);

export const updateTitle = (roomId, title) =>
  api.patch(`/documents/${roomId}/title`, { title }).then((r) => r.data);

export const deleteDocument = (roomId) =>
  api.delete(`/documents/${roomId}`).then((r) => r.data);

export const fetchRevisions = (roomId) =>
  api.get(`/documents/${roomId}/revisions`).then((r) => r.data);

export const uploadDocx = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/documents/upload/docx', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const exportDocx = (roomId) => {
  return `${BASE}/api/documents/${roomId}/export`;
};

export default api;
