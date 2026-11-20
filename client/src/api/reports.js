import api from './axios';

export const fetchSummaryReport = (params) =>
  api.get('/reports/summary', { params }).then((r) => r.data);
export const fetchNotificationLogs = () =>
  api.get('/reports/notifications').then((r) => r.data);
