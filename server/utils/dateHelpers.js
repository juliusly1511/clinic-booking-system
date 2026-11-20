const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function isValidDateStr(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeStr(value) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/**
 * Converts a YYYY-MM-DD + HH:mm in Asia/Manila (UTC+8) into a JS UTC Date object.
 */
function manilaDateTimeToUtc(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, 0) - MANILA_OFFSET_MS;
  return new Date(utcMs);
}

/**
 * Returns today's YYYY-MM-DD string in Asia/Manila.
 */
function getTodayManila(now = new Date()) {
  const manila = new Date(now.getTime() + MANILA_OFFSET_MS);
  const y = manila.getUTCFullYear();
  const m = String(manila.getUTCMonth() + 1).padStart(2, '0');
  const d = String(manila.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns day-of-week (0=Sun..6=Sat) for YYYY-MM-DD in Asia/Manila.
 */
function getManilaDayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTimeStr(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function normalizePhPhone(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[\s\-()]/g, '');
  if (/^09\d{9}$/.test(cleaned)) {
    return `+63${cleaned.slice(1)}`;
  }
  if (/^\+639\d{9}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^639\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  return null;
}

module.exports = {
  isValidDateStr,
  isValidTimeStr,
  manilaDateTimeToUtc,
  getTodayManila,
  getManilaDayOfWeek,
  toMinutes,
  minutesToTimeStr,
  normalizePhPhone
};
