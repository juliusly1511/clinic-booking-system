import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  getDoctorAppointmentsForDate,
  getVisitNote,
  saveVisitNote,
  updateDoctorAppointmentStatus,
} from '../../api/appointments';
import { formatDisplayDate, formatDisplayTime, getManilaToday } from '../../lib/dates';
import { StatusBadge } from '../../components/StatusBadge';
import type { Appointment } from '../../types';

export const DailySchedule: React.FC = () => {
  const { doctorId } = useAuth();
  const [date, setDate] = useState(getManilaToday());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState<Appointment | null>(null);

  const [notes, setNotes] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const loadSchedule = useCallback(async () => {
    if (!doctorId) {
      setLoadingList(false);
      return;
    }
    setLoadingList(true);
    try {
      const list = await getDoctorAppointmentsForDate(date);
      setAppointments(list);
      setSelected((prev) => {
        if (!prev) return list[0] ?? null;
        return list.find((a) => a.id === prev.id) ?? list[0] ?? null;
      });
    } catch {
      toast.error('Failed to load schedule.');
    } finally {
      setLoadingList(false);
    }
  }, [doctorId, date]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    if (!selected || selected.status !== 'completed') {
      setNotes('');
      return;
    }
    setLoadingNotes(true);
    getVisitNote(selected.id)
      .then((n) => setNotes(n?.notes || ''))
      .catch(() => setNotes(''))
      .finally(() => setLoadingNotes(false));
  }, [selected]);

  const handleStatusChange = async (newStatus: 'completed' | 'no_show') => {
    if (!selected) return;
    setSavingStatus(true);
    try {
      await updateDoctorAppointmentStatus(selected.id, newStatus);
      toast.success(newStatus === 'completed' ? 'Marked as completed.' : 'Marked as no-show.');
      if (newStatus === 'no_show') setNotes('');
      await loadSchedule();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to update status.');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      await saveVisitNote(selected.id, notes);
      toast.success('Visit notes saved.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save visit notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const isFuture = selected ? new Date(selected.startsAt).getTime() > Date.now() : false;
  const canUpdateStatus =
    selected &&
    !isFuture &&
    ['confirmed', 'checked_in', 'completed', 'no_show'].includes(selected.status);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
          <p className="mt-1 text-sm text-slate-600">{formatDisplayDate(date)}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Select schedule date"
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-clinic-600 focus:outline-none"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-600">
              Appointments (<span className="tabular-nums">{appointments.length}</span>)
            </div>
            {loadingList ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No appointments scheduled for this date.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {appointments.map((appt) => {
                  const active = selected?.id === appt.id;
                  return (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => setSelected(appt)}
                      className={`flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors ${
                        active ? 'bg-clinic-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="font-mono text-xs font-semibold tabular-nums text-clinic-700">
                          {formatDisplayTime(appt.timeSlot)}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">
                          {appt.patientName}
                        </p>
                        {appt.reason && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                            {appt.reason}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={appt.status} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          {!selected ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              <FileText className="mb-2 h-8 w-8 text-slate-300" />
              Select an appointment to view details and record visit notes.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900">{selected.patientName}</h2>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <StatusBadge status={selected.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDisplayDate(selected.date)} ·{' '}
                    <span className="font-mono text-xs tabular-nums">
                      {formatDisplayTime(selected.timeSlot)}
                    </span>
                    {selected.patientPhone ? ` · ${selected.patientPhone}` : ''}
                  </p>
                </div>

                <Link
                  to={`/doctor/appointments/${selected.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-clinic-700 hover:underline"
                >
                  Open full view
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500">Reason for visit</p>
                <p className="mt-1 text-sm text-slate-800">
                  {selected.reason || 'No reason provided'}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  disabled={!canUpdateStatus || savingStatus}
                  onClick={() => handleStatusChange('completed')}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark completed
                </button>
                <button
                  type="button"
                  disabled={!canUpdateStatus || savingStatus}
                  onClick={() => handleStatusChange('no_show')}
                  className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark no-show
                </button>
                {isFuture && (
                  <p className="text-xs text-slate-500">
                    Status updates unlock once the appointment start time arrives.
                  </p>
                )}
              </div>

              {selected.status === 'completed' && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="visit-notes" className="text-sm font-semibold text-slate-900">
                      Visit notes (Doctor-only)
                    </label>
                    <span className="font-mono text-xs tabular-nums text-slate-400">
                      {notes.length}/1000
                    </span>
                  </div>
                  {loadingNotes ? (
                    <div className="mt-2 h-28 animate-pulse rounded-lg bg-slate-100" />
                  ) : (
                    <>
                      <textarea
                        id="visit-notes"
                        rows={5}
                        maxLength={1000}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter clinical observations, diagnosis, or prescription summary..."
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
                      />
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          disabled={savingNotes}
                          onClick={handleSaveNotes}
                          className="rounded-lg bg-clinic-600 px-5 py-2 text-sm font-semibold text-white hover:bg-clinic-700 disabled:opacity-50"
                        >
                          {savingNotes ? 'Saving...' : 'Save notes'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
