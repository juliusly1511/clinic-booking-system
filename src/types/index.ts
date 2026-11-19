export type UserRole = 'patient' | 'staff' | 'doctor' | 'admin';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type NotificationType =
  | 'confirmation'
  | 'reschedule'
  | 'cancellation'
  | 'reminder_24h'
  | 'reminder_2h'
  | 'password_reset';

export type NotificationChannel = 'sms' | 'email';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  consentAt: string | null;
  createdAt: string;
}

export interface Doctor {
  id: string;
  userId: string;
  name: string;
  specialty: string;
  slotDuration: number; // 10 to 120 minutes
  workingDays: number[]; // 0 = Sun ... 6 = Sat
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  bio: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  doctorId: string;
  doctorName: string;
  date: string; // "YYYY-MM-DD"
  timeSlot: string; // "HH:mm"
  startsAt: string; // ISO string
  status: AppointmentStatus;
  reason: string;
  isWalkIn: boolean;
  createdBy: string;
  checkedInAt?: string | null;
  reminderSent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VisitNote {
  appointmentId: string;
  doctorId: string;
  notes: string;
  updatedAt: string;
}

export interface BlockedDate {
  id: string; // `${doctorId}_${date}`
  doctorId: string;
  date: string;
  reason: string;
  createdBy: string;
}

export interface NotificationLog {
  id: string;
  appointmentId: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  provider: string;
  messagePreview?: string;
  sentAt: string;
}

export interface SlotInfo {
  time: string; // "HH:mm"
  available: boolean;
  reason?: 'taken' | 'past' | 'closed';
  closedMessage?: string;
}

export interface AvailableDateInfo {
  date: string; // "YYYY-MM-DD"
  openSlots: number;
  blockedReason?: string;
}
