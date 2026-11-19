import type { Doctor } from '../types';
import { getDayOfWeek } from './dates';

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHmm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Generates "HH:mm" slots from doctor.startTime to doctor.endTime in steps of slotDuration.
 * A slot must fit completely before endTime. Returns [] if doctor does not work that weekday.
 */
export function generateSlots(
  doctor: Pick<Doctor, 'workingDays' | 'startTime' | 'endTime' | 'slotDuration'>,
  dateStr: string
): string[] {
  const dow = getDayOfWeek(dateStr);
  if (!doctor.workingDays.includes(dow)) {
    return [];
  }

  const start = toMinutes(doctor.startTime);
  const end = toMinutes(doctor.endTime);
  const step = doctor.slotDuration;

  if (step < 10 || start >= end) {
    return [];
  }

  const slots: string[] = [];
  for (let current = start; current + step <= end; current += step) {
    slots.push(toHHmm(current));
  }
  return slots;
}
