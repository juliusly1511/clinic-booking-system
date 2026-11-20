const {
  getManilaDayOfWeek,
  getTodayManila,
  manilaDateTimeToUtc,
  toMinutes,
  minutesToTimeStr
} = require('./dateHelpers');

/**
 * Computes open HH:mm slots for a given doctor profile, date string, blocked flag, and booked slots.
 */
function generateAvailableSlots({ doctor, dateStr, isBlocked, bookedSlots = [], now = new Date() }) {
  if (!doctor || !doctor.isActive || isBlocked) {
    return [];
  }

  const todayStr = getTodayManila(now);
  if (dateStr < todayStr) {
    return [];
  }

  const dow = getManilaDayOfWeek(dateStr);
  if (!doctor.workingDays.includes(dow)) {
    return [];
  }

  const startMins = toMinutes(doctor.startTime);
  const endMins = toMinutes(doctor.endTime);
  const duration = Number(doctor.slotDuration) || 30;
  const bookedSet = new Set(bookedSlots);

  const slots = [];
  for (let m = startMins; m + duration <= endMins; m += duration) {
    const slotLabel = minutesToTimeStr(m);
    if (bookedSet.has(slotLabel)) continue;

    // Exclude slots whose start time has already passed in Asia/Manila
    const slotUtc = manilaDateTimeToUtc(dateStr, slotLabel);
    if (slotUtc.getTime() <= now.getTime()) continue;

    slots.push(slotLabel);
  }

  return slots;
}

module.exports = {
  generateAvailableSlots
};
