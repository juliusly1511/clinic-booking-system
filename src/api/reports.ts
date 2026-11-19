import { apiRequest } from '../lib/apiClient';
import type { NotificationChannel, NotificationLog, NotificationType } from '../types';

export interface StatusCounts {
  total: number;
  confirmed: number;
  checked_in: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface DoctorReportRow {
  doctorId: string;
  doctorName: string;
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  noShowRate: number;
}

export interface ReportsResult {
  today: StatusCounts;
  week: StatusCounts;
  month: StatusCounts;
  perDay: Array<{ date: string; count: number }>;
  perDoctor: DoctorReportRow[];
  overallNoShowRate: number;
}

export async function getReportsData(startDate: string, endDate: string): Promise<ReportsResult> {
  return apiRequest(
    `/api/admin/reports?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(
      endDate
    )}`
  );
}

export async function listNotificationLogs(filters: {
  status?: 'sent' | 'failed' | '';
  channel?: NotificationChannel | '';
  type?: NotificationType | '';
}): Promise<NotificationLog[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.channel) params.set('channel', filters.channel);
  if (filters.type) params.set('type', filters.type);
  const qs = params.toString();
  return apiRequest(`/api/admin/notifications${qs ? `?${qs}` : ''}`);
}

export async function runReminderJob(): Promise<{ sentCount: number; skippedCount: number }> {
  return apiRequest('/api/admin/notifications/run-reminders', { method: 'POST' });
}
