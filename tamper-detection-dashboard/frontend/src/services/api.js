import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
});

// Auth token interceptor (placeholder)
api.interceptors.request.use((config) => {
  // attach token if needed
  return config;
});

// Error handling interceptor
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API error:', err?.response?.data || err.message);
    return Promise.reject(err);
  }
);

export const deviceAPI = {
  getAllDevices: () => api.get('/api/devices').then((r) => r.data),
  getDevice: (id) => api.get(`/api/devices/${id}`).then((r) => r.data),
  createDevice: (payload) => api.post('/api/devices', payload).then((r) => r.data),
  updateDevice: (id, payload) => api.put(`/api/devices/${id}`, payload).then((r) => r.data),
  deleteDevice: (id) => api.delete(`/api/devices/${id}`).then((r) => r.data),
  updateReading: (id, reading) => api.put(`/api/devices/${id}/reading`, { reading }).then((r) => r.data),
  simulateTamper: (id, body) => api.post(`/api/devices/${id}/simulate-tamper`, body).then((r) => r.data),
  getAnalytics: (id) => api.get(`/api/devices/${id}/analytics`).then((r) => r.data),
};

export const eventAPI = {
  getAllEvents: (params) => api.get('/api/events', { params }).then((r) => r.data),
  getEvent: (id) => api.get(`/api/events/${id}`).then((r) => r.data),
  createEvent: (payload) => api.post('/api/events', payload).then((r) => r.data),
  updateEventStatus: (id, status) => api.put(`/api/events/${id}/status`, { status }).then((r) => r.data),
  getStats: () => api.get('/api/events/stats/summary').then((r) => r.data),
  verifyChain: () => api.post('/api/events/verify-chain').then((r) => r.data),
  deleteEvent: (id) => api.delete(`/api/events/${id}`).then((r) => r.data),
};

export const healthCheck = () => api.get('/api/health').then((r) => r.data);

export default api;


