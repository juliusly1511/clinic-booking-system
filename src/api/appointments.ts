import { apiRequest } from '../lib/apiClient';
import type { Appointment, UserProfile, VisitNote } from '../types';

export async function bookAppointment(input: {
  patientId?: string;
  doctorId: string;
  date: string;
  timeSlot: string;
  reason: string;
  isWalkIn: boolean;
}): Promise<Appointment> {
  return apiRequest('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function rescheduleAppointment(params: {
  appointmentId: string;
  newDate: string;
  newTimeSlot: string;
}): Promise<Appointment> {
  return apiRequest(`/api/appointments/${encodeURIComponent(params.appointmentId)}/reschedule`, {
    method: 'PATCH',
    body: JSON.stringify({ newDate: params.newDate, newTimeSlot: params.newTimeSlot }),
  });
}

export async function cancelAppointment(appointmentId: string): Promise<Appointment> {
  return apiRequest(`/api/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
    method: 'PATCH',
  });
}

export async function checkInAppointment(appointmentId: string): Promise<Appointment> {
  return apiRequest(`/api/appointments/${encodeURIComponent(appointmentId)}/check-in`, {
    method: 'PATCH',
  });
}

export async function updateDoctorAppointmentStatus(
  appointmentId: string,
  status: 'completed' | 'no_show'
): Promise<Appointment> {
  return apiRequest(`/api/appointments/${encodeURIComponent(appointmentId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getPatientAppointments(): Promise<Appointment[]> {
  return apiRequest('/api/appointments/mine');
}

export async function getAppointmentsForDate(date: string): Promise<Appointment[]> {
  return apiRequest(`/api/appointments/daily?date=${encodeURIComponent(date)}`);
}

export async function getDoctorAppointmentsForDate(date: string): Promise<Appointment[]> {
  return apiRequest(`/api/doctor/appointments?date=${encodeURIComponent(date)}`);
}

export async function getAppointmentById(appointmentId: string): Promise<Appointment> {
  return apiRequest(`/api/appointments/${encodeURIComponent(appointmentId)}`);
}

export async function getVisitNote(appointmentId: string): Promise<VisitNote | null> {
  return apiRequest(`/api/visit-notes/${encodeURIComponent(appointmentId)}`);
}

export async function saveVisitNote(appointmentId: string, notes: string): Promise<VisitNote> {
  return apiRequest(`/api/visit-notes/${encodeURIComponent(appointmentId)}`, {
    method: 'PUT',
    body: JSON.stringify({ notes }),
  });
}

export async function searchPatients(searchTerm: string): Promise<UserProfile[]> {
  return apiRequest(`/api/patients/search?q=${encodeURIComponent(searchTerm)}`);
}

export async function createWalkInPatient(input: {
  name: string;
  phone: string;
  email?: string;
}): Promise<UserProfile> {
  return apiRequest('/api/patients/walk-in', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
