import api from './axios';

export const fetchUsers = (params) => api.get('/admin/users', { params }).then((r) => r.data);
export const createAdminUser = (payload) => api.post('/admin/users', payload).then((r) => r.data);
export const toggleUserStatus = (id) => api.patch(`/admin/users/${id}/toggle`).then((r) => r.data);
export const updateDoctorSchedule = (id, payload) =>
  api.patch(`/admin/doctors/${id}/schedule`, payload).then((r) => r.data);
export const fetchBlockedDates = (params) =>
  api.get('/admin/blocked-dates', { params }).then((r) => r.data);
export const addBlockedDate = (payload) =>
  api.post('/admin/blocked-dates', payload).then((r) => r.data);
export const removeBlockedDate = (id) =>
  api.delete(`/admin/blocked-dates/${id}`).then((r) => r.data);
