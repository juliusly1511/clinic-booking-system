import { apiRequest } from '../lib/apiClient';
import type { AvailableDateInfo, Doctor, SlotInfo } from '../types';

export async function listDoctors(): Promise<Doctor[]> {
  return apiRequest('/api/doctors');
}

export async function getDoctor(doctorId: string): Promise<Doctor> {
  return apiRequest(`/api/doctors/${encodeURIComponent(doctorId)}`);
}

export async function getDaySlots(
  doctorId: string,
  date: string
): Promise<{
  doctor: Doctor;
  slots: SlotInfo[];
  blockedReason?: string;
  isWorkingDay: boolean;
}> {
  return apiRequest(
    `/api/doctors/${encodeURIComponent(doctorId)}/slots?date=${encodeURIComponent(date)}`
  );
}

export async function getAvailableDates(
  doctorId: string,
  fromDate: string,
  days = 14
): Promise<AvailableDateInfo[]> {
  return apiRequest(
    `/api/doctors/${encodeURIComponent(doctorId)}/available-dates?from=${encodeURIComponent(
      fromDate
    )}&days=${days}`
  );
}
