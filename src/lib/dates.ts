export const CLINIC_TIMEZONE = 'Asia/Manila';

const phPhoneRegex = /^(\+639|09)\d{9}$/;

export function isValidPhPhone(phone: string): boolean {
  return phPhoneRegex.test(phone.trim().replace(/\s|-/g, ''));
}

/** Normalize +639XXXXXXXXX to 09XXXXXXXXX for consistent local SMS formatting & matching */
export function normalizePhPhone(phone: string): string {
  const cleaned = phone.trim().replace(/\s|-/g, '');
  if (cleaned.startsWith('+639')) {
    return '0' + cleaned.slice(3);
  }
  return cleaned;
}

/** Returns current date in Asia/Manila as "YYYY-MM-DD" */
export function getManilaToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

/** Returns current time in Asia/Manila as "HH:mm" (24-hour) */
export function getManilaNowTime(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === 'hour')!.value;
  const min = parts.find((p) => p.type === 'minute')!.value;
  return `${h === '24' ? '00' : h}:${min}`;
}

/** Adds days to a "YYYY-MM-DD" string safely using Manila noon */
export function addDays(dateStr: string, days: number): string {
  const base = new Date(`${dateStr}T12:00:00+08:00`);
  base.setUTCDate(base.getUTCDate() + days);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(base);
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

/** Returns 0 (Sun) .. 6 (Sat) for a "YYYY-MM-DD" date in Manila */
export function getDayOfWeek(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00+08:00`);
  const manilaMs = d.getTime() + 8 * 60 * 60 * 1000;
  return new Date(manilaMs).getUTCDay();
}

/** Builds ISO timestamp for "YYYY-MM-DD" + "HH:mm" in Asia/Manila (+08:00) */
export function buildStartsAtIso(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00+08:00`).toISOString();
}

/** Formats "YYYY-MM-DD" -> "Tue, Dec 1, 2026" */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T12:00:00+08:00`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

/** Formats "HH:mm" (24h) -> "10:30 AM" */
export function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr} ${suffix}`;
}

/** Formats an ISO timestamp in Asia/Manila */
export function formatDisplayDateTime(isoStr: string): string {
  if (!isoStr) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoStr));
}

/** Hours remaining from now until startsAt (negative if already passed) */
export function hoursUntil(startsAtIso: string): number {
  const diffMs = new Date(startsAtIso).getTime() - Date.now();
  return diffMs / (1000 * 60 * 60);
}

/** Monday..Sunday range containing today (Manila) */
export function getManilaWeekRange(): { start: string; end: string } {
  const today = getManilaToday();
  const dow = getDayOfWeek(today);
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const start = addDays(today, diffToMonday);
  const end = addDays(start, 6);
  return { start, end };
}

/** First and last day of current month in Manila */
export function getManilaMonthRange(): { start: string; end: string } {
  const today = getManilaToday();
  const [y, m] = today.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatWorkingDays(days: number[]): string {
  if (!days || days.length === 0) return 'No working days';
  const sorted = [...days].sort((a, b) => a - b);
  const isContiguous =
    sorted.length > 2 && sorted.every((val, idx) => idx === 0 || val === sorted[idx - 1] + 1);
  if (isContiguous) {
    return `${DAY_NAMES[sorted[0]]} to ${DAY_NAMES[sorted[sorted.length - 1]]}`;
  }
  return sorted.map((d) => DAY_NAMES[d]).join(', ');
}
