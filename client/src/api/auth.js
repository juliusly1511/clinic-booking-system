import api from './axios';

export const loginUser = (payload) => api.post('/auth/login', payload).then((r) => r.data);
export const registerUser = (payload) => api.post('/auth/register', payload).then((r) => r.data);
export const fetchCurrentUser = () => api.get('/auth/me').then((r) => r.data);
export const requestPasswordReset = (email) =>
  api.post('/auth/forgot-password', { email }).then((r) => r.data);
