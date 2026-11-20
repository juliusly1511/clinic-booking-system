import api from './axios';

export const fetchAppointments = (params) => api.get('/appointments', { params }).then((r) => r.data);
export const fetchAppointmentById = (id) => api.get(`/appointments/${id}`).then((r) => r.data);
export const createAppointment = (payload) => api.post('/appointments', payload).then((r) => r.data);
export const cancelAppointment = (id) => api.patch(`/appointments/${id}/cancel`).then((r) => r.data);
export const rescheduleAppointment = (id, payload) =>
  api.patch(`/appointments/${id}/reschedule`, payload).then((r) => r.data);
export const updateAppointmentStatus = (id, status) =>
  api.patch(`/appointments/${id}/status`, { status }).then((r) => r.data);
export const saveVisitNotes = (id, payload) =>
  api.patch(`/appointments/${id}/notes`, payload).then((r) => r.data);
