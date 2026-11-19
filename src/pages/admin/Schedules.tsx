import React, { useCallback, useEffect, useState } from 'react';
import { CalendarOff, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { listDoctors } from '../../api/doctors';
import {
  addBlockedDate,
  checkAppointmentsOnDate,
  listBlockedDates,
  removeBlockedDate,
  updateDoctorSchedule,
} from '../../api/admin';
import { formatDisplayDate, getManilaToday } from '../../lib/dates';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { Appointment, BlockedDate, Doctor } from '../../types';

const WEEKDAYS = [
  { val: 1, label: 'Mon' },
  { val: 2, label: 'Tue' },
  { val: 3, label: 'Wed' },
  { val: 4, label: 'Thu' },
  { val: 5, label: 'Fri' },
  { val: 6, label: 'Sat' },
  { val: 0, label: 'Sun' },
];

export const AdminSchedules: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    specialty: '',
    slotDuration: 30,
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
    bio: '',
  });
  const [saving, setSaving] = useState(false);

  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [blockDate, setBlockDate] = useState(getManilaToday());
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [conflictAppts, setConflictAppts] = useState<Appointment[] | null>(null);

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listDoctors();
      setDoctors(list);
      if (list.length > 0) {
        setSelectedDoctorId((prev) => prev || list[0].id);
      }
    } catch {
      toast.error('Failed to load doctors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    const docItem = doctors.find((d) => d.id === selectedDoctorId);
    if (!docItem) return;
    setForm({
      specialty: docItem.specialty,
      slotDuration: docItem.slotDuration,
      workingDays: docItem.workingDays,
      startTime: docItem.startTime,
      endTime: docItem.endTime,
      bio: docItem.bio,
    });
    listBlockedDates(docItem.id).then(setBlockedDates).catch(() => {});
  }, [selectedDoctorId, doctors]);

  const toggleDay = (val: number) => {
    setForm((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(val)
        ? prev.workingDays.filter((d) => d !== val)
        : [...prev.workingDays, val],
    }));
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) return;
    if (form.workingDays.length === 0) {
      toast.error('Select at least one working day.');
      return;
    }
    if (form.startTime >= form.endTime) {
      toast.error('End time must be after start time.');
      return;
    }
    if (form.slotDuration < 10 || form.slotDuration > 120) {
      toast.error('Slot duration must be between 10 and 120 minutes.');
      return;
    }

    setSaving(true);
    try {
      await updateDoctorSchedule(selectedDoctorId, form);
      toast.success('Schedule updated.');
      await loadDoctors();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update schedule.');
    } finally {
      setSaving(false);
    }
  };

  const commitBlockDate = async () => {
    if (!selectedDoctorId) return;
    setBlocking(true);
    try {
      await addBlockedDate({
        doctorId: selectedDoctorId,
        date: blockDate,
        reason: blockReason,
      });
      toast.success('Date blocked.');
      setBlockReason('');
      setConflictAppts(null);
      const updated = await listBlockedDates(selectedDoctorId);
      setBlockedDates(updated);
    } catch {
      toast.error('Failed to block date.');
    } finally {
      setBlocking(false);
    }
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !blockDate) return;
    const existing = await checkAppointmentsOnDate(selectedDoctorId, blockDate);
    if (existing.length > 0) {
      setConflictAppts(existing);
      return;
    }
    await commitBlockDate();
  };

  const handleRemoveBlock = async (id: string) => {
    try {
      await removeBlockedDate(id);
      toast.success('Blocked date removed.');
      setBlockedDates((prev) => prev.filter((b) => b.id !== id));
    } catch {
      toast.error('Failed to remove blocked date.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Doctor Schedules &amp; Blocked Dates</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure clinic hours, appointment slot duration, and holidays or leave days.
        </p>
      </div>

      {loading ? (
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-slate-200" />
      ) : doctors.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No doctors found. Create a doctor account or load demo data from Users.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <form
              onSubmit={handleSaveSchedule}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600">Select Doctor</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Specialty</label>
                  <input
                    type="text"
                    required
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Slot duration (10–120 mins)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    required
                    value={form.slotDuration}
                    onChange={(e) => setForm({ ...form, slotDuration: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Start time</label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">End time</label>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Working days</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => {
                    const active = form.workingDays.includes(d.val);
                    return (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() => toggleDay(d.val)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? 'border-clinic-600 bg-clinic-600 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Bio</label>
                <textarea
                  rows={2}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-clinic-600 px-5 py-2 text-sm font-semibold text-white hover:bg-clinic-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save schedule'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <CalendarOff className="h-4 w-4 text-clinic-600" />
                Blocked Dates
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Block holidays, conferences, or leave days for this doctor.
              </p>

              <form onSubmit={handleAddBlock} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Date</label>
                  <input
                    type="date"
                    required
                    min={getManilaToday()}
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Reason</label>
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="e.g. Medical conference, Clinic holiday"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={blocking}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                >
                  {blocking ? 'Blocking...' : 'Block this date'}
                </button>
              </form>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-semibold text-slate-500">Upcoming blocked dates</h3>
                {blockedDates.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-400">No upcoming blocked dates.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-slate-100">
                    {blockedDates.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between py-2.5 text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {formatDisplayDate(b.date)}
                          </p>
                          <p className="text-xs text-slate-500">{b.reason}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBlock(b.id)}
                          aria-label="Remove blocked date"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(conflictAppts)}
        title="Existing bookings on this date"
        variant="danger"
        confirmLabel="Block date anyway"
        loading={blocking}
        description={
          conflictAppts && (
            <span>
              There are <strong>{conflictAppts.length}</strong> confirmed/checked-in appointment(s)
              on <strong>{formatDisplayDate(blockDate)}</strong>. Blocking this date prevents new
              bookings, and staff should reschedule affected patients.
            </span>
          )
        }
        onConfirm={commitBlockDate}
        onCancel={() => setConflictAppts(null)}
      />
    </div>
  );
};
