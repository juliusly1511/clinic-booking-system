import { apiRequest } from '../lib/apiClient';
import type { Appointment, BlockedDate, Doctor, UserProfile, UserRole } from '../types';

export async function listAllUsers(): Promise<UserProfile[]> {
  return apiRequest('/api/admin/users');
}

export async function createUserByAdmin(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  doctorDetails?: {
    specialty: string;
    slotDuration: number;
    workingDays: number[];
    startTime: string;
    endTime: string;
    bio?: string;
  };
}): Promise<UserProfile> {
  return apiRequest('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function countDoctorUpcomingAppointments(doctorId: string): Promise<number> {
  const res = await apiRequest<{ count: number }>(
    `/api/admin/doctors/${encodeURIComponent(doctorId)}/upcoming-count`
  );
  return res.count;
}

export async function updateUserByAdmin(input: {
  uid: string;
  name: string;
  phone: string;
  isActive: boolean;
  doctor?: {
    id: string;
    specialty: string;
    slotDuration: number;
    workingDays: number[];
    startTime: string;
    endTime: string;
    bio: string;
  };
}): Promise<UserProfile> {
  return apiRequest(`/api/admin/users/${encodeURIComponent(input.uid)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteUserByAdmin(uid: string): Promise<void> {
  await apiRequest(`/api/admin/users/${encodeURIComponent(uid)}`, {
    method: 'DELETE',
  });
}

export async function updateDoctorSchedule(
  doctorId: string,
  data: Pick<Doctor, 'specialty' | 'slotDuration' | 'workingDays' | 'startTime' | 'endTime' | 'bio'>
): Promise<Doctor> {
  return apiRequest(`/api/schedules/doctors/${encodeURIComponent(doctorId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function listBlockedDates(doctorId: string): Promise<BlockedDate[]> {
  return apiRequest(`/api/schedules/blocked-dates?doctorId=${encodeURIComponent(doctorId)}`);
}

export async function checkAppointmentsOnDate(
  doctorId: string,
  date: string
): Promise<Appointment[]> {
  return apiRequest(
    `/api/schedules/blocked-dates/check?doctorId=${encodeURIComponent(
      doctorId
    )}&date=${encodeURIComponent(date)}`
  );
}

export async function addBlockedDate(input: {
  doctorId: string;
  date: string;
  reason: string;
}): Promise<BlockedDate> {
  return apiRequest('/api/schedules/blocked-dates', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function removeBlockedDate(blockId: string): Promise<void> {
  await apiRequest(`/api/schedules/blocked-dates/${encodeURIComponent(blockId)}`, {
    method: 'DELETE',
  });
}

export async function seedDemoData(): Promise<
  Array<{ role: string; email: string; password: string }>
> {
  const res = await apiRequest<{
    credentials: Array<{ role: string; email: string; password: string }>;
  }>('/api/admin/seed-demo', { method: 'POST' });
  return res.credentials;
}
