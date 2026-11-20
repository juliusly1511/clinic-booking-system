import api from './axios';

export const fetchDoctors = (params) => api.get('/doctors', { params }).then((r) => r.data);
export const fetchDoctorById = (id) => api.get(`/doctors/${id}`).then((r) => r.data);
export const fetchDoctorSlots = (id, date) =>
  api.get(`/doctors/${id}/slots`, { params: { date } }).then((r) => r.data);
