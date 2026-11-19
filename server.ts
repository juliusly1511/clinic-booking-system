import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';

type UserRole = 'patient' | 'staff' | 'doctor' | 'admin';
type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show';
type NotificationType =
  | 'confirmation'
  | 'reschedule'
  | 'cancellation'
  | 'reminder_24h'
  | 'reminder_2h'
  | 'password_reset';
type NotificationChannel = 'sms' | 'email';

interface StoredUser {
  uid: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  consentAt: string | null;
  createdAt: string;
}

interface StoredDoctor {
  id: string;
  userId: string;
  name: string;
  specialty: string;
  slotDuration: number;
  workingDays: number[];
  startTime: string;
  endTime: string;
  bio: string;
}

interface StoredAppointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  startsAt: string;
  status: AppointmentStatus;
  reason: string;
  isWalkIn: boolean;
  createdBy: string;
  checkedInAt: string | null;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoredSlotLock {
  appointmentId: string;
  doctorId: string;
  date: string;
  timeSlot: string;
}

interface StoredVisitNote {
  appointmentId: string;
  doctorId: string;
  notes: string;
  updatedAt: string;
}

interface StoredBlockedDate {
  id: string;
  doctorId: string;
  date: string;
  reason: string;
  createdBy: string;
}

interface StoredNotificationLog {
  id: string;
  appointmentId: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  status: 'sent' | 'failed';
  errorMessage: string;
  provider: string;
  messagePreview: string;
  sentAt: string;
}

interface ClinicDatabase {
  users: Record<string, StoredUser>;
  doctors: Record<string, StoredDoctor>;
  appointments: Record<string, StoredAppointment>;
  slotLocks: Record<string, StoredSlotLock>;
  visitNotes: Record<string, StoredVisitNote>;
  blockedDates: Record<string, StoredBlockedDate>;
  notificationLogs: StoredNotificationLog[];
  sessions: Record<string, { uid: string; createdAt: string }>;
}

interface AuthedRequest extends Request {
  user?: StoredUser;
  token?: string;
}

const CLINIC_TIMEZONE = 'Asia/Manila';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'clinic.json');
const PH_PHONE_REGEX = /^(\+639|09)\d{9}$/;

function createEmptyDb(): ClinicDatabase {
  return {
    users: {},
    doctors: {},
    appointments: {},
    slotLocks: {},
    visitNotes: {},
    blockedDates: {},
    notificationLogs: [],
    sessions: {},
  };
}

function loadDb(): ClinicDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial = createEmptyDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ClinicDatabase>;
    return {
      users: parsed.users ?? {},
      doctors: parsed.doctors ?? {},
      appointments: parsed.appointments ?? {},
      slotLocks: parsed.slotLocks ?? {},
      visitNotes: parsed.visitNotes ?? {},
      blockedDates: parsed.blockedDates ?? {},
      notificationLogs: parsed.notificationLogs ?? [],
      sessions: parsed.sessions ?? {},
    };
  } catch {
    return createEmptyDb();
  }
}

let dbState: ClinicDatabase = loadDb();
let txChain: Promise<unknown> = Promise.resolve();

function persistDb(state: ClinicDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

/**
 * Serializes mutating operations so slot lock checks and writes are strictly atomic.
 */
function runDbMutation<T>(fn: (db: ClinicDatabase) => T | Promise<T>): Promise<T> {
  const next = txChain.then(async () => {
    const result = await fn(dbState);
    persistDb(dbState);
    return result;
  });
  txChain = next.catch(() => {});
  return next;
}

function sanitizeUser(u: StoredUser) {
  const { passwordHash: _pw, ...rest } = u;
  void _pw;
  return rest;
}

function isValidPhPhone(phone: string): boolean {
  return PH_PHONE_REGEX.test(phone.trim().replace(/\s|-/g, ''));
}

function normalizePhPhone(phone: string): string {
  const cleaned = phone.trim().replace(/\s|-/g, '');
  if (cleaned.startsWith('+639')) {
    return '0' + cleaned.slice(3);
  }
  return cleaned;
}

function getManilaToday(): string {
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

function getManilaNowTime(): string {
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

function addDays(dateStr: string, days: number): string {
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

function getDayOfWeek(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00+08:00`);
  const manilaMs = d.getTime() + 8 * 60 * 60 * 1000;
  return new Date(manilaMs).getUTCDay();
}

function buildStartsAtIso(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00+08:00`).toISOString();
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+08:00`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

function formatDisplayTime(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr} ${suffix}`;
}

function hoursUntil(startsAtIso: string): number {
  return (new Date(startsAtIso).getTime() - Date.now()) / (1000 * 60 * 60);
}

function getManilaWeekRange(): { start: string; end: string } {
  const today = getManilaToday();
  const dow = getDayOfWeek(today);
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const start = addDays(today, diffToMonday);
  return { start, end: addDays(start, 6) };
}

function getManilaMonthRange(): { start: string; end: string } {
  const today = getManilaToday();
  const [y, m] = today.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start, end: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHmm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateSlots(doctor: StoredDoctor, dateStr: string): string[] {
  const dow = getDayOfWeek(dateStr);
  if (!doctor.workingDays.includes(dow)) return [];
  const start = toMinutes(doctor.startTime);
  const end = toMinutes(doctor.endTime);
  const step = doctor.slotDuration;
  if (step < 10 || start >= end) return [];
  const slots: string[] = [];
  for (let current = start; current + step <= end; current += step) {
    slots.push(toHHmm(current));
  }
  return slots;
}

function findDoctorByUserId(db: ClinicDatabase, userId: string): StoredDoctor | null {
  return Object.values(db.doctors).find((d) => d.userId === userId) ?? null;
}

function buildNotificationMessage(
  type: Exclude<NotificationType, 'password_reset'>,
  patientName: string,
  doctorName: string,
  date: string,
  timeSlot: string
): string {
  const d = formatDisplayDate(date);
  const t = formatDisplayTime(timeSlot);
  if (type === 'confirmation') {
    return `City Health Clinic: Hi ${patientName}, your appointment with ${doctorName} is confirmed for ${d} at ${t}. You can reschedule or cancel up to 24 hours before.`;
  }
  if (type === 'reschedule') {
    return `City Health Clinic: Hi ${patientName}, your appointment with ${doctorName} has been rescheduled to ${d} at ${t}.`;
  }
  if (type === 'cancellation') {
    return `City Health Clinic: Hi ${patientName}, your appointment with ${doctorName} on ${d} at ${t} has been cancelled.`;
  }
  if (type === 'reminder_24h') {
    return `City Health Clinic: Reminder — ${patientName}, you have an appointment with ${doctorName} tomorrow, ${d} at ${t}.`;
  }
  return `City Health Clinic: Reminder — ${patientName}, your appointment with ${doctorName} is today at ${t}. Please arrive 10 minutes early.`;
}

function recordNotification(
  db: ClinicDatabase,
  params: {
    appointmentId: string;
    type: Exclude<NotificationType, 'password_reset'>;
    patientId: string;
    patientName: string;
    patientPhone?: string;
    doctorName: string;
    date: string;
    timeSlot: string;
  }
): StoredNotificationLog {
  const patient = db.users[params.patientId];
  const phone = params.patientPhone || patient?.phone || '';
  const email = patient?.email || '';
  // Intentionally omit medical reason from SMS/email preview
  const preview = buildNotificationMessage(
    params.type,
    params.patientName,
    params.doctorName,
    params.date,
    params.timeSlot
  );

  const hasValidPhone = Boolean(phone && isValidPhPhone(phone));
  const hasValidEmail = Boolean(email && !email.endsWith('@noemail.local'));

  let log: StoredNotificationLog;
  if (hasValidPhone) {
    log = {
      id: crypto.randomUUID(),
      appointmentId: params.appointmentId,
      type: params.type,
      channel: 'sms',
      recipient: normalizePhPhone(phone),
      status: 'sent',
      errorMessage: '',
      provider: 'simulated',
      messagePreview: preview,
      sentAt: new Date().toISOString(),
    };
  } else if (hasValidEmail) {
    log = {
      id: crypto.randomUUID(),
      appointmentId: params.appointmentId,
      type: params.type,
      channel: 'email',
      recipient: email,
      status: 'sent',
      errorMessage: '',
      provider: 'simulated',
      messagePreview: preview,
      sentAt: new Date().toISOString(),
    };
  } else {
    log = {
      id: crypto.randomUUID(),
      appointmentId: params.appointmentId,
      type: params.type,
      channel: 'sms',
      recipient: 'N/A',
      status: 'failed',
      errorMessage: 'Patient has no phone or email',
      provider: 'simulated',
      messagePreview: '',
      sentAt: new Date().toISOString(),
    };
  }

  db.notificationLogs.unshift(log);
  return log;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const session = dbState.sessions[token];
  if (!session) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
  }
  const user = dbState.users[session.uid];
  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ error: 'Your account has been deactivated. Please contact the clinic.' });
    return;
  }
  req.user = user;
  req.token = token;
  next();
}

function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}

function createApiRouter(): express.Router {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  // --- AUTH ---
  router.get('/auth/bootstrap-status', (_req, res) => {
    const users = Object.values(dbState.users);
    const hasAdmin = users.some((u) => u.role === 'admin');
    const hasDemoData = users.some((u) => u.email === 'staff@clinic.test');
    res.json({ hasAdmin, hasDemoData });
  });

  router.post('/auth/setup-admin', async (req, res) => {
    try {
      const { name, email, phone, password } = req.body ?? {};
      if (!name || String(name).trim().length < 2) {
        res.status(400).json({ error: 'Please enter a full name.' });
        return;
      }
      if (!email || !String(email).includes('@')) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (!phone || !isValidPhPhone(String(phone))) {
        res.status(400).json({ error: 'Use Philippine mobile format: 09XXXXXXXXX or +639XXXXXXXXX.' });
        return;
      }
      if (!password || String(password).length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters.' });
        return;
      }

      const result = await runDbMutation(async (db) => {
        const hasAdmin = Object.values(db.users).some((u) => u.role === 'admin');
        if (hasAdmin) {
          throw Object.assign(new Error('An admin account already exists.'), { status: 403 });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const duplicate = Object.values(db.users).some((u) => u.email === normalizedEmail);
        if (duplicate) {
          throw Object.assign(new Error('An account with this email already exists.'), { status: 409 });
        }

        const uid = crypto.randomUUID();
        const now = new Date().toISOString();
        const passwordHash = await bcrypt.hash(String(password), 10);
        const user: StoredUser = {
          uid,
          name: String(name).trim(),
          email: normalizedEmail,
          phone: normalizePhPhone(String(phone)),
          passwordHash,
          role: 'admin',
          isActive: true,
          consentAt: now,
          createdAt: now,
        };
        db.users[uid] = user;
        const token = crypto.randomBytes(32).toString('hex');
        db.sessions[token] = { uid, createdAt: now };
        return { token, user: sanitizeUser(user), doctorId: null };
      });

      res.status(201).json(result);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Setup failed.' });
    }
  });

  router.post('/auth/register', async (req, res) => {
    try {
      const { name, email, phone, password } = req.body ?? {};
      if (!name || String(name).trim().length < 2) {
        res.status(400).json({ error: 'Please enter your full name.' });
        return;
      }
      if (!email || !String(email).includes('@')) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (!phone || !isValidPhPhone(String(phone))) {
        res.status(400).json({ error: 'Use Philippine mobile format: 09XXXXXXXXX or +639XXXXXXXXX.' });
        return;
      }
      const pw = String(password || '');
      if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
        res.status(400).json({ error: 'Password must be at least 8 characters with 1 letter and 1 number.' });
        return;
      }

      const result = await runDbMutation(async (db) => {
        const normalizedEmail = String(email).trim().toLowerCase();
        const exists = Object.values(db.users).some((u) => u.email === normalizedEmail);
        if (exists) {
          throw Object.assign(new Error('An account with this email already exists.'), { status: 409 });
        }

        const uid = crypto.randomUUID();
        const now = new Date().toISOString();
        const passwordHash = await bcrypt.hash(pw, 10);
        const user: StoredUser = {
          uid,
          name: String(name).trim(),
          email: normalizedEmail,
          phone: normalizePhPhone(String(phone)),
          passwordHash,
          role: 'patient',
          isActive: true,
          consentAt: now,
          createdAt: now,
        };
        db.users[uid] = user;
        const token = crypto.randomBytes(32).toString('hex');
        db.sessions[token] = { uid, createdAt: now };
        return { token, user: sanitizeUser(user), doctorId: null };
      });

      res.status(201).json(result);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Registration failed.' });
    }
  });

  router.post('/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const pw = String(password || '');
      const user = Object.values(dbState.users).find((u) => u.email === normalizedEmail);
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      const valid = await bcrypt.compare(pw, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      if (!user.isActive) {
        res.status(403).json({ error: 'Your account has been deactivated. Please contact the clinic.' });
        return;
      }

      const token = await runDbMutation((db) => {
        const t = crypto.randomBytes(32).toString('hex');
        db.sessions[t] = { uid: user.uid, createdAt: new Date().toISOString() };
        return t;
      });

      const docRec = user.role === 'doctor' ? findDoctorByUserId(dbState, user.uid) : null;
      res.json({ token, user: sanitizeUser(user), doctorId: docRec?.id ?? null });
    } catch {
      res.status(500).json({ error: 'Sign in failed.' });
    }
  });

  router.post('/auth/logout', requireAuth, async (req: AuthedRequest, res) => {
    await runDbMutation((db) => {
      if (req.token) delete db.sessions[req.token];
    });
    res.json({ ok: true });
  });

  router.get('/auth/me', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const docRec = user.role === 'doctor' ? findDoctorByUserId(dbState, user.uid) : null;
    res.json({ user: sanitizeUser(user), doctorId: docRec?.id ?? null });
  });

  router.post('/auth/forgot-password', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    await runDbMutation((db) => {
      const user = Object.values(db.users).find((u) => u.email === email);
      if (user) {
        db.notificationLogs.unshift({
          id: crypto.randomUUID(),
          appointmentId: 'auth',
          type: 'password_reset',
          channel: 'email',
          recipient: email,
          status: 'sent',
          errorMessage: '',
          provider: 'simulated',
          messagePreview: 'City Health Clinic: Password reset instructions dispatched.',
          sentAt: new Date().toISOString(),
        });
      }
    });
    res.json({ ok: true });
  });

  // --- DOCTORS & SLOTS ---
  router.get('/doctors', requireAuth, (_req, res) => {
    const list = Object.values(dbState.doctors).sort((a, b) => a.name.localeCompare(b.name));
    res.json(list);
  });

  router.get('/doctors/:doctorId', requireAuth, (req, res) => {
    const doc = dbState.doctors[req.params.doctorId];
    if (!doc) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }
    res.json(doc);
  });

  router.get('/doctors/:doctorId/slots', requireAuth, (req, res) => {
    const doctorId = req.params.doctorId;
    const date = String(req.query.date || '');
    const doctor = dbState.doctors[doctorId];
    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD).' });
      return;
    }

    const block = dbState.blockedDates[`${doctorId}_${date}`];
    if (block) {
      res.json({
        doctor,
        slots: [],
        blockedReason: block.reason || 'Clinic / Doctor unavailable on this date',
        isWorkingDay: false,
      });
      return;
    }

    const generated = generateSlots(doctor, date);
    if (generated.length === 0) {
      res.json({
        doctor,
        slots: [],
        blockedReason: 'Doctor does not hold clinic on this weekday',
        isWorkingDay: false,
      });
      return;
    }

    const takenTimes = new Set(
      Object.values(dbState.slotLocks)
        .filter((l) => l.doctorId === doctorId && l.date === date)
        .map((l) => l.timeSlot)
    );

    const today = getManilaToday();
    const nowTime = getManilaNowTime();

    const slots = generated.map((time) => {
      if (date < today || (date === today && time <= nowTime)) {
        return { time, available: false, reason: 'past' };
      }
      if (takenTimes.has(time)) {
        return { time, available: false, reason: 'taken' };
      }
      return { time, available: true };
    });

    res.json({ doctor, slots, isWorkingDay: true });
  });

  router.get('/doctors/:doctorId/available-dates', requireAuth, (req, res) => {
    const doctorId = req.params.doctorId;
    const fromDate = String(req.query.from || getManilaToday());
    const days = Math.min(31, Math.max(1, Number(req.query.days || 14)));
    const doctor = dbState.doctors[doctorId];
    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }

    const blockedMap = new Map<string, string>();
    Object.values(dbState.blockedDates)
      .filter((b) => b.doctorId === doctorId)
      .forEach((b) => blockedMap.set(b.date, b.reason || 'Closed'));

    const locksByDate = new Map<string, Set<string>>();
    Object.values(dbState.slotLocks)
      .filter((l) => l.doctorId === doctorId)
      .forEach((l) => {
        if (!locksByDate.has(l.date)) locksByDate.set(l.date, new Set());
        locksByDate.get(l.date)!.add(l.timeSlot);
      });

    const today = getManilaToday();
    const nowTime = getManilaNowTime();
    const results = [];

    for (let i = 0; i < days; i++) {
      const date = addDays(fromDate, i);
      const blockedReason = blockedMap.get(date);
      if (blockedReason !== undefined) {
        results.push({ date, openSlots: 0, blockedReason });
        continue;
      }
      const generated = generateSlots(doctor, date);
      if (generated.length === 0) {
        results.push({ date, openSlots: 0 });
        continue;
      }
      const taken = locksByDate.get(date) ?? new Set<string>();
      let open = 0;
      for (const time of generated) {
        const isPast = date < today || (date === today && time <= nowTime);
        if (!isPast && !taken.has(time)) open++;
      }
      results.push({ date, openSlots: open });
    }

    res.json(results);
  });

  // --- APPOINTMENTS ---
  router.get('/appointments/mine', requireAuth, (req: AuthedRequest, res) => {
    const uid = req.user!.uid;
    const list = Object.values(dbState.appointments)
      .filter((a) => a.patientId === uid)
      .sort((a, b) => (b.date + b.timeSlot).localeCompare(a.date + a.timeSlot));
    res.json(list);
  });

  router.get('/appointments/daily', requireAuth, requireRole('staff', 'admin'), (req, res) => {
    const date = String(req.query.date || getManilaToday());
    const list = Object.values(dbState.appointments)
      .filter((a) => a.date === date)
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
    res.json(list);
  });

  router.get('/doctor/appointments', requireAuth, requireRole('doctor'), (req: AuthedRequest, res) => {
    const docRec = findDoctorByUserId(dbState, req.user!.uid);
    if (!docRec) {
      res.status(404).json({ error: 'Doctor profile not linked.' });
      return;
    }
    const date = String(req.query.date || getManilaToday());
    const list = Object.values(dbState.appointments)
      .filter((a) => a.doctorId === docRec.id && a.date === date)
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
    res.json(list);
  });

  router.get('/appointments/:id', requireAuth, (req: AuthedRequest, res) => {
    const appt = dbState.appointments[req.params.id];
    if (!appt) {
      res.status(404).json({ error: 'Appointment not found.' });
      return;
    }
    const user = req.user!;
    const docRec = user.role === 'doctor' ? findDoctorByUserId(dbState, user.uid) : null;
    const allowed =
      appt.patientId === user.uid ||
      user.role === 'staff' ||
      user.role === 'admin' ||
      (docRec && docRec.id === appt.doctorId);

    if (!allowed) {
      res.status(403).json({ error: 'You do not have permission to view this appointment.' });
      return;
    }
    res.json(appt);
  });

  router.post('/appointments', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const actor = req.user!;
      const { patientId, doctorId, date, timeSlot, reason, isWalkIn } = req.body ?? {};
      const targetPatientId =
        actor.role === 'patient' ? actor.uid : String(patientId || actor.uid);

      if (actor.role === 'patient' && isWalkIn) {
        res.status(403).json({ error: 'Patients cannot create walk-in records.' });
        return;
      }

      const appt = await runDbMutation((db) => {
        const patient = db.users[targetPatientId];
        if (!patient || !patient.isActive) {
          throw Object.assign(new Error('Patient record not found.'), { status: 404 });
        }
        const doctor = db.doctors[String(doctorId)];
        if (!doctor) {
          throw Object.assign(new Error('Doctor not found.'), { status: 404 });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}$/.test(String(timeSlot))) {
          throw Object.assign(new Error('Invalid date or time slot.'), { status: 400 });
        }
        if (db.blockedDates[`${doctor.id}_${date}`]) {
          throw Object.assign(new Error('Doctor is unavailable on that date.'), { status: 400 });
        }
        const validSlots = generateSlots(doctor, String(date));
        if (!validSlots.includes(String(timeSlot))) {
          throw Object.assign(new Error('Selected slot is outside doctor hours.'), { status: 400 });
        }
        const startsAtIso = buildStartsAtIso(String(date), String(timeSlot));
        if (new Date(startsAtIso).getTime() <= Date.now()) {
          throw Object.assign(new Error('Cannot book a slot in the past.'), { status: 400 });
        }

        // Patient overlapping appointment check
        const patientConflict = Object.values(db.appointments).some(
          (a) =>
            a.patientId === targetPatientId &&
            a.date === date &&
            a.timeSlot === timeSlot &&
            (a.status === 'confirmed' || a.status === 'checked_in')
        );
        if (patientConflict) {
          throw Object.assign(
            new Error('Patient already has another appointment at this date and time.'),
            { status: 409, code: 'PATIENT_CONFLICT' }
          );
        }

        // Atomic slot lock check
        const lockId = `${doctor.id}_${date}_${timeSlot}`;
        if (db.slotLocks[lockId]) {
          throw Object.assign(new Error('That slot was just taken.'), {
            status: 409,
            code: 'SLOT_TAKEN',
          });
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const newAppt: StoredAppointment = {
          id,
          patientId: patient.uid,
          patientName: patient.name,
          patientPhone: patient.phone,
          doctorId: doctor.id,
          doctorName: `Dr. ${doctor.name}`,
          date: String(date),
          timeSlot: String(timeSlot),
          startsAt: startsAtIso,
          status: 'confirmed',
          reason: String(reason || '').trim().slice(0, 200),
          isWalkIn: Boolean(isWalkIn && (actor.role === 'staff' || actor.role === 'admin')),
          createdBy: actor.uid,
          checkedInAt: null,
          reminderSent: false,
          createdAt: now,
          updatedAt: now,
        };

        db.slotLocks[lockId] = {
          appointmentId: id,
          doctorId: doctor.id,
          date: String(date),
          timeSlot: String(timeSlot),
        };
        db.appointments[id] = newAppt;

        recordNotification(db, {
          appointmentId: id,
          type: 'confirmation',
          patientId: patient.uid,
          patientName: patient.name,
          patientPhone: patient.phone,
          doctorName: newAppt.doctorName,
          date: newAppt.date,
          timeSlot: newAppt.timeSlot,
        });

        return newAppt;
      });

      res.status(201).json(appt);
    } catch (err: unknown) {
      const e = err as { status?: number; code?: string; message?: string };
      res.status(e.status || 500).json({ error: e.message || 'Booking failed.', code: e.code });
    }
  });

  router.patch('/appointments/:id/reschedule', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const actor = req.user!;
      const { newDate, newTimeSlot } = req.body ?? {};
      const updated = await runDbMutation((db) => {
        const appt = db.appointments[req.params.id];
        if (!appt) {
          throw Object.assign(new Error('Appointment not found.'), { status: 404 });
        }
        const isStaffOrAdmin = actor.role === 'staff' || actor.role === 'admin';
        const isOwner = appt.patientId === actor.uid;
        if (!isStaffOrAdmin && !isOwner) {
          throw Object.assign(new Error('Permission denied.'), { status: 403 });
        }
        if (appt.status !== 'confirmed') {
          throw Object.assign(new Error('Only confirmed appointments can be rescheduled.'), { status: 400 });
        }
        if (!isStaffOrAdmin && hoursUntil(appt.startsAt) < 24) {
          throw Object.assign(
            new Error('Changes are allowed until 24 hours before. Please contact the clinic.'),
            { status: 403 }
          );
        }
        if (newDate === appt.date && newTimeSlot === appt.timeSlot) {
          throw Object.assign(new Error('Please choose a different date or time slot.'), { status: 400 });
        }

        const doctor = db.doctors[appt.doctorId];
        if (!doctor) {
          throw Object.assign(new Error('Doctor not found.'), { status: 404 });
        }
        if (db.blockedDates[`${doctor.id}_${newDate}`]) {
          throw Object.assign(new Error('Doctor is unavailable on that date.'), { status: 400 });
        }
        const validSlots = generateSlots(doctor, String(newDate));
        if (!validSlots.includes(String(newTimeSlot))) {
          throw Object.assign(new Error('Selected slot is outside doctor hours.'), { status: 400 });
        }
        const newStartsAt = buildStartsAtIso(String(newDate), String(newTimeSlot));
        if (new Date(newStartsAt).getTime() <= Date.now()) {
          throw Object.assign(new Error('Cannot reschedule to a past time.'), { status: 400 });
        }

        const conflict = Object.values(db.appointments).some(
          (a) =>
            a.id !== appt.id &&
            a.patientId === appt.patientId &&
            a.date === newDate &&
            a.timeSlot === newTimeSlot &&
            (a.status === 'confirmed' || a.status === 'checked_in')
        );
        if (conflict) {
          throw Object.assign(
            new Error('Patient already has another appointment at that date and time.'),
            { status: 409, code: 'PATIENT_CONFLICT' }
          );
        }

        const newLockId = `${appt.doctorId}_${newDate}_${newTimeSlot}`;
        if (db.slotLocks[newLockId]) {
          throw Object.assign(new Error('That slot was just taken.'), {
            status: 409,
            code: 'SLOT_TAKEN',
          });
        }

        const oldLockId = `${appt.doctorId}_${appt.date}_${appt.timeSlot}`;
        delete db.slotLocks[oldLockId];
        db.slotLocks[newLockId] = {
          appointmentId: appt.id,
          doctorId: appt.doctorId,
          date: String(newDate),
          timeSlot: String(newTimeSlot),
        };

        appt.date = String(newDate);
        appt.timeSlot = String(newTimeSlot);
        appt.startsAt = newStartsAt;
        appt.updatedAt = new Date().toISOString();

        recordNotification(db, {
          appointmentId: appt.id,
          type: 'reschedule',
          patientId: appt.patientId,
          patientName: appt.patientName,
          patientPhone: appt.patientPhone,
          doctorName: appt.doctorName,
          date: appt.date,
          timeSlot: appt.timeSlot,
        });

        return appt;
      });
      res.json(updated);
    } catch (err: unknown) {
      const e = err as { status?: number; code?: string; message?: string };
      res.status(e.status || 500).json({ error: e.message || 'Reschedule failed.', code: e.code });
    }
  });

  router.patch('/appointments/:id/cancel', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const actor = req.user!;
      const updated = await runDbMutation((db) => {
        const appt = db.appointments[req.params.id];
        if (!appt) {
          throw Object.assign(new Error('Appointment not found.'), { status: 404 });
        }
        const isStaffOrAdmin = actor.role === 'staff' || actor.role === 'admin';
        const isOwner = appt.patientId === actor.uid;
        if (!isStaffOrAdmin && !isOwner) {
          throw Object.assign(new Error('Permission denied.'), { status: 403 });
        }
        if (appt.status !== 'confirmed') {
          throw Object.assign(new Error('Only confirmed appointments can be cancelled.'), { status: 400 });
        }
        if (!isStaffOrAdmin && hoursUntil(appt.startsAt) < 24) {
          throw Object.assign(
            new Error('Changes are allowed until 24 hours before. Please contact the clinic.'),
            { status: 403 }
          );
        }

        const lockId = `${appt.doctorId}_${appt.date}_${appt.timeSlot}`;
        delete db.slotLocks[lockId];
        appt.status = 'cancelled';
        appt.updatedAt = new Date().toISOString();

        recordNotification(db, {
          appointmentId: appt.id,
          type: 'cancellation',
          patientId: appt.patientId,
          patientName: appt.patientName,
          patientPhone: appt.patientPhone,
          doctorName: appt.doctorName,
          date: appt.date,
          timeSlot: appt.timeSlot,
        });

        return appt;
      });
      res.json(updated);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      res.status(e.status || 500).json({ error: e.message || 'Cancellation failed.' });
    }
  });

  router.patch(
    '/appointments/:id/check-in',
    requireAuth,
    requireRole('staff', 'admin'),
    async (req, res) => {
      try {
        const updated = await runDbMutation((db) => {
          const appt = db.appointments[req.params.id];
          if (!appt) {
            throw Object.assign(new Error('Appointment not found.'), { status: 404 });
          }
          if (appt.status !== 'confirmed') {
            throw Object.assign(new Error('Only confirmed appointments can be checked in.'), {
              status: 400,
            });
          }
          const now = new Date().toISOString();
          appt.status = 'checked_in';
          appt.checkedInAt = now;
          appt.updatedAt = now;
          return appt;
        });
        res.json(updated);
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        res.status(e.status || 500).json({ error: e.message || 'Check-in failed.' });
      }
    }
  );

  router.patch(
    '/appointments/:id/status',
    requireAuth,
    requireRole('doctor'),
    async (req: AuthedRequest, res) => {
      try {
        const newStatus = req.body?.status;
        if (newStatus !== 'completed' && newStatus !== 'no_show') {
          res.status(400).json({ error: 'Invalid status update.' });
          return;
        }
        const updated = await runDbMutation((db) => {
          const docRec = findDoctorByUserId(db, req.user!.uid);
          const appt = db.appointments[req.params.id];
          if (!appt) {
            throw Object.assign(new Error('Appointment not found.'), { status: 404 });
          }
          if (!docRec || appt.doctorId !== docRec.id) {
            throw Object.assign(new Error('Not assigned to this appointment.'), { status: 403 });
          }
          if (new Date(appt.startsAt).getTime() > Date.now()) {
            throw Object.assign(
              new Error('Cannot complete or mark no-show before the appointment start time.'),
              { status: 400 }
            );
          }
          if (!['confirmed', 'checked_in', 'completed', 'no_show'].includes(appt.status)) {
            throw Object.assign(new Error('Appointment cannot transition from current status.'), {
              status: 400,
            });
          }
          appt.status = newStatus;
          appt.updatedAt = new Date().toISOString();
          if (newStatus === 'no_show') {
            delete db.visitNotes[appt.id];
          }
          return appt;
        });
        res.json(updated);
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        res.status(e.status || 500).json({ error: e.message || 'Status update failed.' });
      }
    }
  );

  // --- VISIT NOTES (Doctor + Admin read; Doctor write; Patients NEVER allowed) ---
  router.get('/visit-notes/:appointmentId', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const appt = dbState.appointments[req.params.appointmentId];
    if (!appt) {
      res.status(404).json({ error: 'Appointment not found.' });
      return;
    }
    const docRec = user.role === 'doctor' ? findDoctorByUserId(dbState, user.uid) : null;
    const allowed = user.role === 'admin' || (docRec && docRec.id === appt.doctorId);
    if (!allowed) {
      res.status(403).json({ error: 'Patients and front-desk staff cannot access visit notes.' });
      return;
    }
    res.json(dbState.visitNotes[req.params.appointmentId] ?? null);
  });

  router.put(
    '/visit-notes/:appointmentId',
    requireAuth,
    requireRole('doctor'),
    async (req: AuthedRequest, res) => {
      try {
        const notes = String(req.body?.notes || '').trim();
        if (notes.length > 1000) {
          res.status(400).json({ error: 'Visit notes cannot exceed 1000 characters.' });
          return;
        }
        const saved = await runDbMutation((db) => {
          const docRec = findDoctorByUserId(db, req.user!.uid);
          const appt = db.appointments[req.params.appointmentId];
          if (!appt) {
            throw Object.assign(new Error('Appointment not found.'), { status: 404 });
          }
          if (!docRec || appt.doctorId !== docRec.id) {
            throw Object.assign(new Error('Permission denied.'), { status: 403 });
          }
          if (appt.status !== 'completed') {
            throw Object.assign(new Error('Visit notes can only be added to completed visits.'), {
              status: 400,
            });
          }
          const note: StoredVisitNote = {
            appointmentId: appt.id,
            doctorId: docRec.id,
            notes,
            updatedAt: new Date().toISOString(),
          };
          db.visitNotes[appt.id] = note;
          return note;
        });
        res.json(saved);
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        res.status(e.status || 500).json({ error: e.message || 'Failed to save visit notes.' });
      }
    }
  );

  router.delete(
    '/visit-notes/:appointmentId',
    requireAuth,
    requireRole('doctor'),
    async (req: AuthedRequest, res) => {
      try {
        await runDbMutation((db) => {
          const docRec = findDoctorByUserId(db, req.user!.uid);
          const appt = db.appointments[req.params.appointmentId];
          if (!appt || !docRec || appt.doctorId !== docRec.id) {
            throw Object.assign(new Error('Permission denied.'), { status: 403 });
          }
          delete db.visitNotes[req.params.appointmentId];
        });
        res.json({ ok: true });
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        res.status(e.status || 500).json({ error: e.message || 'Delete failed.' });
      }
    }
  );

  // --- PATIENTS (STAFF / ADMIN) ---
  router.get('/patients/search', requireAuth, requireRole('staff', 'admin'), (req, res) => {
    const term = String(req.query.q || '').trim().toLowerCase();
    if (term.length < 2) {
      res.json([]);
      return;
    }
    const matches = Object.values(dbState.users)
      .filter(
        (u) =>
          u.role === 'patient' &&
          u.isActive &&
          (u.name.toLowerCase().includes(term) ||
            u.phone.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term))
      )
      .slice(0, 15)
      .map(sanitizeUser);
    res.json(matches);
  });

  router.post(
    '/patients/walk-in',
    requireAuth,
    requireRole('staff', 'admin'),
    async (req, res) => {
      try {
        const { name, phone, email } = req.body ?? {};
        if (!name || String(name).trim().length < 2) {
          res.status(400).json({ error: 'Please enter the patient name.' });
          return;
        }
        if (!phone || !isValidPhPhone(String(phone))) {
          res.status(400).json({ error: 'Use Philippine mobile format: 09XXXXXXXXX or +639XXXXXXXXX.' });
          return;
        }
        const created = await runDbMutation(async (db) => {
          const uid = crypto.randomUUID();
          const digits = Date.now().toString().slice(-8) + Math.floor(100 + Math.random() * 900);
          const resolvedEmail =
            email && String(email).trim()
              ? String(email).trim().toLowerCase()
              : `walkin.${digits}@noemail.local`;
          const passwordHash = await bcrypt.hash(crypto.randomBytes(12).toString('hex'), 8);
          const now = new Date().toISOString();
          const patient: StoredUser = {
            uid,
            name: String(name).trim(),
            phone: normalizePhPhone(String(phone)),
            email: resolvedEmail,
            passwordHash,
            role: 'patient',
            isActive: true,
            consentAt: now,
            createdAt: now,
          };
          db.users[uid] = patient;
          return sanitizeUser(patient);
        });
        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: 'Unable to create walk-in patient.' });
      }
    }
  );

  // --- SCHEDULES & BLOCKED DATES (STAFF / ADMIN) ---
  router.patch(
    '/schedules/doctors/:doctorId',
    requireAuth,
    requireRole('staff', 'admin'),
    async (req, res) => {
      try {
        const { specialty, slotDuration, workingDays, startTime, endTime, bio } = req.body ?? {};
        const dur = Number(slotDuration);
        if (dur < 10 || dur > 120) {
          res.status(400).json({ error: 'Slot duration must be between 10 and 120 minutes.' });
          return;
        }
        if (!Array.isArray(workingDays) || workingDays.length === 0) {
          res.status(400).json({ error: 'Select at least one working day.' });
          return;
        }
        if (toMinutes(String(startTime)) >= toMinutes(String(endTime))) {
          res.status(400).json({ error: 'End time must be after start time.' });
          return;
        }
        const updated = await runDbMutation((db) => {
          const doc = db.doctors[req.params.doctorId];
          if (!doc) {
            throw Object.assign(new Error('Doctor not found.'), { status: 404 });
          }
          doc.specialty = String(specialty || doc.specialty).trim();
          doc.slotDuration = dur;
          doc.workingDays = workingDays.map(Number);
          doc.startTime = String(startTime);
          doc.endTime = String(endTime);
          doc.bio = String(bio ?? doc.bio).trim();
          return doc;
        });
        res.json(updated);
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        res.status(e.status || 500).json({ error: e.message || 'Failed to update schedule.' });
      }
    }
  );

  router.get(
    '/schedules/blocked-dates',
    requireAuth,
    requireRole('staff', 'admin'),
    (req, res) => {
      const doctorId = String(req.query.doctorId || '');
      const today = getManilaToday();
      const list = Object.values(dbState.blockedDates)
        .filter((b) => b.doctorId === doctorId && b.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
      res.json(list);
    }
  );

  router.get(
    '/schedules/blocked-dates/check',
    requireAuth,
    requireRole('staff', 'admin'),
    (req, res) => {
      const doctorId = String(req.query.doctorId || '');
      const date = String(req.query.date || '');
      const conflicts = Object.values(dbState.appointments).filter(
        (a) =>
          a.doctorId === doctorId &&
          a.date === date &&
          (a.status === 'confirmed' || a.status === 'checked_in')
      );
      res.json(conflicts);
    }
  );

  router.post(
    '/schedules/blocked-dates',
    requireAuth,
    requireRole('staff', 'admin'),
    async (req: AuthedRequest, res) => {
      const { doctorId, date, reason } = req.body ?? {};
      if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
        res.status(400).json({ error: 'Valid doctor and date required.' });
        return;
      }
      const created = await runDbMutation((db) => {
        const id = `${doctorId}_${date}`;
        const block: StoredBlockedDate = {
          id,
          doctorId: String(doctorId),
          date: String(date),
          reason: String(reason || '').trim() || 'Unavailable',
          createdBy: req.user!.uid,
        };
        db.blockedDates[id] = block;
        return block;
      });
      res.status(201).json(created);
    }
  );

  router.delete(
    '/schedules/blocked-dates/:id',
    requireAuth,
    requireRole('staff', 'admin'),
    async (req, res) => {
      await runDbMutation((db) => {
        delete db.blockedDates[req.params.id];
      });
      res.json({ ok: true });
    }
  );

  // --- ADMIN USERS ---
  router.get('/admin/users', requireAuth, requireRole('admin'), (_req, res) => {
    const list = Object.values(dbState.users)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(sanitizeUser);
    res.json(list);
  });

  router.get(
    '/admin/doctors/:doctorId/upcoming-count',
    requireAuth,
    requireRole('admin'),
    (req, res) => {
      const today = getManilaToday();
      const count = Object.values(dbState.appointments).filter(
        (a) =>
          a.doctorId === req.params.doctorId &&
          a.date >= today &&
          (a.status === 'confirmed' || a.status === 'checked_in')
      ).length;
      res.json({ count });
    }
  );

  router.post('/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { name, email, phone, password, role, doctorDetails } = req.body ?? {};
      if (!name || String(name).trim().length < 2) {
        res.status(400).json({ error: 'Please enter a full name.' });
        return;
      }
      if (!email || !String(email).includes('@')) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (!phone || !isValidPhPhone(String(phone))) {
        res.status(400).json({ error: 'Use Philippine mobile format: 09XXXXXXXXX or +639XXXXXXXXX.' });
        return;
      }
      if (!password || String(password).length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters.' });
        return;
      }
      if (!['patient', 'staff', 'doctor', 'admin'].includes(String(role))) {
        res.status(400).json({ error: 'Invalid role.' });
        return;
      }

      const created = await runDbMutation(async (db) => {
        const normalizedEmail = String(email).trim().toLowerCase();
        if (Object.values(db.users).some((u) => u.email === normalizedEmail)) {
          throw Object.assign(new Error('An account with this email already exists.'), { status: 409 });
        }
        const uid = crypto.randomUUID();
        const now = new Date().toISOString();
        const passwordHash = await bcrypt.hash(String(password), 10);
        const user: StoredUser = {
          uid,
          name: String(name).trim(),
          email: normalizedEmail,
          phone: normalizePhPhone(String(phone)),
          passwordHash,
          role: role as UserRole,
          isActive: true,
          consentAt: now,
          createdAt: now,
        };
        db.users[uid] = user;

        if (role === 'doctor' && doctorDetails) {
          const docId = crypto.randomUUID();
          db.doctors[docId] = {
            id: docId,
            userId: uid,
            name: user.name,
            specialty: String(doctorDetails.specialty || 'General Medicine').trim(),
            slotDuration: Number(doctorDetails.slotDuration || 30),
            workingDays: Array.isArray(doctorDetails.workingDays)
              ? doctorDetails.workingDays.map(Number)
              : [1, 2, 3, 4, 5],
            startTime: String(doctorDetails.startTime || '09:00'),
            endTime: String(doctorDetails.endTime || '17:00'),
            bio: String(doctorDetails.bio || '').trim(),
          };
        }

        return sanitizeUser(user);
      });
      res.status(201).json(created);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      res.status(e.status || 500).json({ error: e.message || 'Failed to create user.' });
    }
  });

  router.patch('/admin/users/:uid', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { name, phone, isActive, doctor } = req.body ?? {};
      if (!name || String(name).trim().length < 2) {
        res.status(400).json({ error: 'Please enter a full name.' });
        return;
      }
      if (!phone || !isValidPhPhone(String(phone))) {
        res.status(400).json({ error: 'Use Philippine mobile format: 09XXXXXXXXX or +639XXXXXXXXX.' });
        return;
      }

      const updated = await runDbMutation((db) => {
        const user = db.users[req.params.uid];
        if (!user) {
          throw Object.assign(new Error('User not found.'), { status: 404 });
        }
        user.name = String(name).trim();
        user.phone = normalizePhPhone(String(phone));
        user.isActive = Boolean(isActive);

        if (!user.isActive) {
          // Revoke active sessions on deactivation
          for (const [token, sess] of Object.entries(db.sessions)) {
            if (sess.uid === user.uid) delete db.sessions[token];
          }
        }

        if (doctor && doctor.id && db.doctors[doctor.id]) {
          const d = db.doctors[doctor.id];
          d.name = user.name;
          d.specialty = String(doctor.specialty || d.specialty).trim();
          d.slotDuration = Number(doctor.slotDuration || d.slotDuration);
          d.workingDays = Array.isArray(doctor.workingDays)
            ? doctor.workingDays.map(Number)
            : d.workingDays;
          d.startTime = String(doctor.startTime || d.startTime);
          d.endTime = String(doctor.endTime || d.endTime);
          d.bio = String(doctor.bio ?? d.bio).trim();
        }
        return sanitizeUser(user);
      });
      res.json(updated);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      res.status(e.status || 500).json({ error: e.message || 'Failed to update user.' });
    }
  });

  router.delete(
    '/admin/users/:uid',
    requireAuth,
    requireRole('admin'),
    async (req: AuthedRequest, res) => {
      try {
        if (req.params.uid === req.user!.uid) {
          res.status(400).json({ error: 'You cannot delete your own account.' });
          return;
        }
        await runDbMutation((db) => {
          const uid = req.params.uid;
          if (!db.users[uid]) {
            throw Object.assign(new Error('User not found.'), { status: 404 });
          }
          const hasPatientAppts = Object.values(db.appointments).some(
            (a) => a.patientId === uid
          );
          if (hasPatientAppts) {
            throw Object.assign(
              new Error('This user has appointment records. Deactivate instead.'),
              { status: 400 }
            );
          }
          const docRec = findDoctorByUserId(db, uid);
          if (docRec) {
            const hasDocAppts = Object.values(db.appointments).some(
              (a) => a.doctorId === docRec.id
            );
            if (hasDocAppts) {
              throw Object.assign(
                new Error('This doctor has appointment records. Deactivate instead.'),
                { status: 400 }
              );
            }
            delete db.doctors[docRec.id];
          }
          delete db.users[uid];
          for (const [token, sess] of Object.entries(db.sessions)) {
            if (sess.uid === uid) delete db.sessions[token];
          }
        });
        res.json({ ok: true });
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        res.status(e.status || 500).json({ error: e.message || 'Failed to delete user.' });
      }
    }
  );

  // --- REPORTS ---
  router.get('/admin/reports', requireAuth, requireRole('admin'), (req, res) => {
    const monthRange = getManilaMonthRange();
    const startDate = String(req.query.startDate || monthRange.start);
    const endDate = String(req.query.endDate || monthRange.end);

    const all = Object.values(dbState.appointments);
    const doctors = Object.values(dbState.doctors);

    const countByStatus = (list: StoredAppointment[]) => {
      const c = {
        total: list.length,
        confirmed: 0,
        checked_in: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
      };
      for (const a of list) {
        if (a.status !== 'pending' && a.status in c) {
          c[a.status]++;
        }
      }
      return c;
    };

    const todayStr = getManilaToday();
    const weekRange = getManilaWeekRange();

    const today = countByStatus(all.filter((a) => a.date === todayStr));
    const week = countByStatus(
      all.filter((a) => a.date >= weekRange.start && a.date <= weekRange.end)
    );
    const month = countByStatus(
      all.filter((a) => a.date >= monthRange.start && a.date <= monthRange.end)
    );

    const inRange = all.filter((a) => a.date >= startDate && a.date <= endDate);

    const dayMap = new Map<string, number>();
    for (const a of inRange) {
      dayMap.set(a.date, (dayMap.get(a.date) || 0) + 1);
    }
    const perDay = Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    const nowMs = Date.now();
    const docMap = new Map<
      string,
      {
        doctorId: string;
        doctorName: string;
        total: number;
        completed: number;
        cancelled: number;
        noShow: number;
        noShowRate: number;
      }
    >();

    for (const d of doctors) {
      docMap.set(d.id, {
        doctorId: d.id,
        doctorName: `Dr. ${d.name}`,
        total: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        noShowRate: 0,
      });
    }

    let totalCompleted = 0;
    let totalNoShow = 0;

    for (const a of inRange) {
      const row = docMap.get(a.doctorId) ?? {
        doctorId: a.doctorId,
        doctorName: a.doctorName,
        total: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        noShowRate: 0,
      };
      row.total++;
      if (a.status === 'cancelled') {
        row.cancelled++;
      } else if (new Date(a.startsAt).getTime() <= nowMs) {
        if (a.status === 'completed') {
          row.completed++;
          totalCompleted++;
        } else if (a.status === 'no_show') {
          row.noShow++;
          totalNoShow++;
        }
      }
      docMap.set(a.doctorId, row);
    }

    const perDoctor = Array.from(docMap.values()).map((r) => {
      const denom = r.completed + r.noShow;
      return {
        ...r,
        noShowRate: denom > 0 ? Number(((r.noShow / denom) * 100).toFixed(1)) : 0,
      };
    });

    const overallDenom = totalCompleted + totalNoShow;
    const overallNoShowRate =
      overallDenom > 0 ? Number(((totalNoShow / overallDenom) * 100).toFixed(1)) : 0;

    res.json({ today, week, month, perDay, perDoctor, overallNoShowRate });
  });

  // --- NOTIFICATION LOGS & REMINDER JOB ---
  router.get('/admin/notifications', requireAuth, requireRole('admin'), (req, res) => {
    const status = String(req.query.status || '');
    const channel = String(req.query.channel || '');
    const type = String(req.query.type || '');
    let logs = dbState.notificationLogs;
    if (status) logs = logs.filter((l) => l.status === status);
    if (channel) logs = logs.filter((l) => l.channel === channel);
    if (type) logs = logs.filter((l) => l.type === type);
    res.json(logs.slice(0, 200));
  });

  router.post(
    '/admin/notifications/run-reminders',
    requireAuth,
    requireRole('admin'),
    async (_req, res) => {
      const result = await runDbMutation((db) => {
        const now = Date.now();
        let sentCount = 0;
        let skippedCount = 0;

        for (const appt of Object.values(db.appointments)) {
          if (appt.status !== 'confirmed') continue;
          const startMs = new Date(appt.startsAt).getTime();
          const hours = (startMs - now) / (1000 * 60 * 60);
          if (hours <= 0 || hours > 25) continue;

          const reminderType: 'reminder_24h' | 'reminder_2h' | null =
            hours <= 2.5 ? 'reminder_2h' : hours >= 22 && hours <= 25 ? 'reminder_24h' : null;
          if (!reminderType) continue;

          const alreadySent = db.notificationLogs.some(
            (l) =>
              l.appointmentId === appt.id &&
              l.type === reminderType &&
              l.status === 'sent'
          );
          if (alreadySent) {
            skippedCount++;
            continue;
          }

          recordNotification(db, {
            appointmentId: appt.id,
            type: reminderType,
            patientId: appt.patientId,
            patientName: appt.patientName,
            patientPhone: appt.patientPhone,
            doctorName: appt.doctorName,
            date: appt.date,
            timeSlot: appt.timeSlot,
          });
          appt.reminderSent = true;
          sentCount++;
        }

        return { sentCount, skippedCount };
      });
      res.json(result);
    }
  );

  // --- SEED DEMO DATA ---
  router.post(
    '/admin/seed-demo',
    requireAuth,
    requireRole('admin'),
    async (req: AuthedRequest, res) => {
      try {
        const credentials = await runDbMutation(async (db) => {
          const alreadyLoaded = Object.values(db.users).some(
            (u) => u.email === 'staff@clinic.test'
          );
          if (alreadyLoaded) {
            throw Object.assign(new Error('Demo data is already loaded.'), { status: 409 });
          }

          const demoPassword = 'Password@123';
          const passwordHash = await bcrypt.hash(demoPassword, 10);
          const now = new Date().toISOString();
          const creds: Array<{ role: string; email: string; password: string }> = [];

          const addSeedUser = (
            name: string,
            email: string,
            phone: string,
            role: UserRole
          ): StoredUser => {
            const uid = crypto.randomUUID();
            const user: StoredUser = {
              uid,
              name,
              email,
              phone,
              passwordHash,
              role,
              isActive: true,
              consentAt: now,
              createdAt: now,
            };
            db.users[uid] = user;
            creds.push({ role, email, password: demoPassword });
            return user;
          };

          addSeedUser('Rhea Dela Cruz', 'staff@clinic.test', '09171234001', 'staff');

          const uSantos = addSeedUser(
            'Maria Santos',
            'maria.santos@clinic.test',
            '09171234010',
            'doctor'
          );
          const uReyes = addSeedUser(
            'Jose Reyes',
            'jose.reyes@clinic.test',
            '09171234011',
            'doctor'
          );
          const uCruz = addSeedUser(
            'Ana Cruz',
            'ana.cruz@clinic.test',
            '09171234012',
            'doctor'
          );

          const addSeedDoctor = (
            user: StoredUser,
            specialty: string,
            slotDuration: number,
            workingDays: number[],
            startTime: string,
            endTime: string,
            bio: string
          ): StoredDoctor => {
            const id = crypto.randomUUID();
            const doc: StoredDoctor = {
              id,
              userId: user.uid,
              name: user.name,
              specialty,
              slotDuration,
              workingDays,
              startTime,
              endTime,
              bio,
            };
            db.doctors[id] = doc;
            return doc;
          };

          const drSantos = addSeedDoctor(
            uSantos,
            'General Medicine',
            30,
            [1, 2, 3, 4, 5],
            '09:00',
            '17:00',
            'Primary care physician specializing in preventive health and chronic care.'
          );
          const drReyes = addSeedDoctor(
            uReyes,
            'Pediatrics',
            20,
            [1, 3, 5],
            '08:00',
            '12:00',
            'Pediatrician providing infant check-ups, vaccinations, and childhood care.'
          );
          const drCruz = addSeedDoctor(
            uCruz,
            'Dermatology',
            30,
            [2, 4],
            '13:00',
            '17:00',
            'Board-certified dermatologist for skin consultations and treatments.'
          );

          const juan = addSeedUser('Juan Mabini', 'juan@patient.test', '09171234101', 'patient');
          const liza = addSeedUser('Liza Mercado', 'liza@patient.test', '09171234102', 'patient');
          const carlo = addSeedUser('Carlo Bautista', 'carlo@patient.test', '09171234103', 'patient');

          const nextWorkingDate = (workingDays: number[], minOffset: number): string => {
            const today = getManilaToday();
            for (let i = minOffset; i < minOffset + 21; i++) {
              const d = addDays(today, i);
              if (workingDays.includes(getDayOfWeek(d))) return d;
            }
            return addDays(today, minOffset);
          };

          const pastWorkingDate = (workingDays: number[], minAgo: number): string => {
            const today = getManilaToday();
            for (let i = minAgo; i < minAgo + 21; i++) {
              const d = addDays(today, -i);
              if (workingDays.includes(getDayOfWeek(d))) return d;
            }
            return addDays(today, -minAgo);
          };

          const addSeedAppt = (
            patient: StoredUser,
            doctor: StoredDoctor,
            date: string,
            timeSlot: string,
            status: AppointmentStatus,
            reason: string,
            withLock: boolean,
            visitNote?: string
          ) => {
            const id = crypto.randomUUID();
            if (withLock) {
              db.slotLocks[`${doctor.id}_${date}_${timeSlot}`] = {
                appointmentId: id,
                doctorId: doctor.id,
                date,
                timeSlot,
              };
            }
            db.appointments[id] = {
              id,
              patientId: patient.uid,
              patientName: patient.name,
              patientPhone: patient.phone,
              doctorId: doctor.id,
              doctorName: `Dr. ${doctor.name}`,
              date,
              timeSlot,
              startsAt: buildStartsAtIso(date, timeSlot),
              status,
              reason,
              isWalkIn: false,
              createdBy: req.user!.uid,
              checkedInAt: null,
              reminderSent: false,
              createdAt: now,
              updatedAt: now,
            };
            if (visitNote) {
              db.visitNotes[id] = {
                appointmentId: id,
                doctorId: doctor.id,
                notes: visitNote,
                updatedAt: now,
              };
            }
          };

          // 4 upcoming confirmed
          addSeedAppt(
            juan,
            drSantos,
            nextWorkingDate(drSantos.workingDays, 2),
            '10:00',
            'confirmed',
            'Annual physical checkup',
            true
          );
          addSeedAppt(
            liza,
            drSantos,
            nextWorkingDate(drSantos.workingDays, 3),
            '14:00',
            'confirmed',
            'Follow-up blood pressure review',
            true
          );
          addSeedAppt(
            carlo,
            drReyes,
            nextWorkingDate(drReyes.workingDays, 2),
            '09:00',
            'confirmed',
            'Child immunization consultation',
            true
          );
          addSeedAppt(
            liza,
            drCruz,
            nextWorkingDate(drCruz.workingDays, 2),
            '14:30',
            'confirmed',
            'Skin rash evaluation',
            true
          );

          // 2 completed with visit notes
          addSeedAppt(
            juan,
            drSantos,
            pastWorkingDate(drSantos.workingDays, 4),
            '09:30',
            'completed',
            'Persistent cough',
            false,
            'Vitals normal. Mild upper respiratory irritation; advised hydration and prescribed symptomatic relief.'
          );
          addSeedAppt(
            carlo,
            drCruz,
            pastWorkingDate(drCruz.workingDays, 6),
            '15:00',
            'completed',
            'Dry skin patch',
            false,
            'Recommended gentle fragrance-free moisturizer and topical ointment for 7 days.'
          );

          // 1 no-show
          addSeedAppt(
            liza,
            drReyes,
            pastWorkingDate(drReyes.workingDays, 5),
            '10:00',
            'no_show',
            'Pediatric checkup',
            false
          );

          // 1 cancelled
          addSeedAppt(
            juan,
            drCruz,
            pastWorkingDate(drCruz.workingDays, 3),
            '13:30',
            'cancelled',
            'Acne consultation',
            false
          );

          // 1 blocked date 10 days out for Dr. Santos
          const blockedDate = addDays(getManilaToday(), 10);
          db.blockedDates[`${drSantos.id}_${blockedDate}`] = {
            id: `${drSantos.id}_${blockedDate}`,
            doctorId: drSantos.id,
            date: blockedDate,
            reason: 'Medical conference',
            createdBy: req.user!.uid,
          };

          return creds;
        });

        res.status(201).json({ credentials });
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        res.status(e.status || 500).json({ error: e.message || 'Seed failed.' });
      }
    }
  );

  return router;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.use('/api', createApiRouter());

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`City Health Clinic server running on http://0.0.0.0:${port}`);
  });
}

startServer();
