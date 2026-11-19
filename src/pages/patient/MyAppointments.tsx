import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarX, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  cancelAppointment,
  getPatientAppointments,
  rescheduleAppointment,
} from '../../api/appointments';
import { getAvailableDates, getDaySlots } from '../../api/doctors';
import { ApiError } from '../../lib/apiClient';
import {
  formatDisplayDate,
  formatDisplayTime,
  getManilaToday,
  hoursUntil,
} from '../../lib/dates';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DatePicker } from '../../components/DatePicker';
import { SlotPicker } from '../../components/SlotPicker';
import type { Appointment, AvailableDateInfo, SlotInfo } from '../../types';

export const MyAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [reschedTarget, setReschedTarget] = useState<Appointment | null>(null);
  const [availDates, setAvailDates] = useState<AvailableDateInfo[]>([]);
  const [newDate, setNewDate] = useState('');
  const [daySlots, setDaySlots] = useState<SlotInfo[]>([]);
  const [blockedReason, setBlockedReason] = useState<string | undefined>();
  const [newTime, setNewTime] = useState('');
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPatientAppointments();
      setAppointments(list);
    } catch {
      toast.error('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const today = getManilaToday();

  const { upcoming, past } = useMemo(() => {
    const up: Appointment[] = [];
    const pa: Appointment[] = [];
    for (const a of appointments) {
      const isUpcomingStatus =
        a.status === 'confirmed' || a.status === 'checked_in' || a.status === 'pending';
      if (isUpcomingStatus && a.date >= today) {
        up.push(a);
      } else {
        pa.push(a);
      }
    }
    up.sort((a, b) => (a.date + a.timeSlot).localeCompare(b.date + b.timeSlot));
    pa.sort((a, b) => (b.date + b.timeSlot).localeCompare(a.date + a.timeSlot));
    return { upcoming: up, past: pa };
  }, [appointments, today]);

  const visibleList = tab === 'upcoming' ? upcoming : past;

  const openReschedule = async (appt: Appointment) => {
    setReschedTarget(appt);
    setNewDate('');
    setNewTime('');
    setDaySlots([]);
    setLoadingDates(true);
    try {
      const dates = await getAvailableDates(appt.doctorId, today, 14);
      setAvailDates(dates);
      const first = dates.find((d) => d.openSlots > 0);
      if (first) setNewDate(first.date);
    } catch {
      toast.error('Failed to load available dates.');
    } finally {
      setLoadingDates(false);
    }
  };

  useEffect(() => {
    if (!reschedTarget || !newDate) return;
    setLoadingSlots(true);
    setNewTime('');
    getDaySlots(reschedTarget.doctorId, newDate)
      .then((res) => {
        setDaySlots(res.slots);
        setBlockedReason(res.blockedReason);
      })
      .catch(() => toast.error('Failed to load slots.'))
      .finally(() => setLoadingSlots(false));
  }, [reschedTarget, newDate]);

  const handleConfirmReschedule = async () => {
    if (!reschedTarget || !newDate || !newTime) return;
    setRescheduling(true);
    try {
      await rescheduleAppointment({
        appointmentId: reschedTarget.id,
        newDate,
        newTimeSlot: newTime,
      });
      toast.success('Appointment rescheduled.');
      setReschedTarget(null);
      await loadData();
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError && err.code === 'SLOT_TAKEN'
          ? 'That slot was just taken. Please pick another.'
          : err instanceof ApiError && err.code === 'PATIENT_CONFLICT'
          ? 'You already have another appointment at that date and time.'
          : err instanceof Error
          ? err.message
          : 'Unable to reschedule.';
      toast.error(msg);
    } finally {
      setRescheduling(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelAppointment(cancelTarget.id);
      toast.success('Appointment cancelled.');
      setCancelTarget(null);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to cancel appointment.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
          <p className="mt-1 text-sm text-slate-600">View, reschedule, or cancel your bookings.</p>
        </div>
        <Link
          to="/patient/doctors"
          className="rounded-lg bg-clinic-600 px-4 py-2 text-sm font-semibold text-white hover:bg-clinic-700"
        >
          Book appointment
        </Link>
      </div>

      <div className="mt-6 flex gap-6 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('upcoming')}
          className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${
            tab === 'upcoming'
              ? 'border-clinic-600 text-clinic-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Upcoming (<span className="tabular-nums">{upcoming.length}</span>)
        </button>
        <button
          type="button"
          onClick={() => setTab('past')}
          className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${
            tab === 'past'
              ? 'border-clinic-600 text-clinic-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Past (<span className="tabular-nums">{past.length}</span>)
        </button>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : visibleList.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center">
          <CalendarX className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            No {tab} appointments
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {tab === 'upcoming'
              ? 'Schedule a visit with one of our doctors.'
              : 'Your past appointment history will appear here.'}
          </p>
          <Link
            to="/patient/doctors"
            className="mt-4 inline-block rounded-lg bg-clinic-600 px-5 py-2 text-sm font-semibold text-white hover:bg-clinic-700"
          >
            Book now
          </Link>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {visibleList.map((appt) => {
            const within24h = hoursUntil(appt.startsAt) < 24;
            const canModify = tab === 'upcoming' && appt.status === 'confirmed';

            return (
              <div
                key={appt.id}
                className="flex flex-wrap items-start justify-between gap-4 p-5"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-semibold text-slate-900">{appt.doctorName}</h3>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <StatusBadge status={appt.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span>{formatDisplayDate(appt.date)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-xs tabular-nums">
                      {formatDisplayTime(appt.timeSlot)}
                    </span>
                  </div>
                  {appt.reason && (
                    <p className="mt-1.5 text-xs text-slate-500">Reason: {appt.reason}</p>
                  )}
                </div>

                {canModify && (
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={within24h}
                        onClick={() => openReschedule(appt)}
                        className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        disabled={within24h}
                        onClick={() => setCancelTarget(appt)}
                        className="rounded-lg border border-rose-200 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                    {within24h && (
                      <p className="max-w-xs text-right text-[11px] text-amber-700">
                        Changes are allowed until 24 hours before. Please contact the clinic.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel appointment"
        variant="danger"
        confirmLabel="Yes, cancel"
        loading={cancelling}
        description={
          cancelTarget && (
            <span>
              Cancel your appointment with <strong>{cancelTarget.doctorName}</strong> on{' '}
              <strong>{formatDisplayDate(cancelTarget.date)}</strong> at{' '}
              <strong>{formatDisplayTime(cancelTarget.timeSlot)}</strong>?
            </span>
          )
        }
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />

      {reschedTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 id="reschedule-title" className="text-lg font-semibold text-slate-900">
                  Reschedule Appointment
                </h2>
                <p className="text-xs text-slate-500">{reschedTarget.doctorName}</p>
              </div>
              <button
                type="button"
                onClick={() => setReschedTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close reschedule dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-5">
              <div>
                <h3 className="mb-2 text-xs font-semibold text-slate-600">New date</h3>
                <DatePicker
                  dates={availDates}
                  selectedDate={newDate}
                  onSelect={setNewDate}
                  loading={loadingDates}
                />
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold text-slate-600">New time slot</h3>
                <SlotPicker
                  slots={daySlots}
                  selectedTime={newTime}
                  onSelect={setNewTime}
                  blockedReason={blockedReason}
                  loading={loadingSlots}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setReschedTarget(null)}
                disabled={rescheduling}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!newDate || !newTime || rescheduling}
                onClick={handleConfirmReschedule}
                className="rounded-lg bg-clinic-600 px-5 py-2 text-sm font-semibold text-white hover:bg-clinic-700 disabled:opacity-50"
              >
                {rescheduling ? 'Saving...' : 'Confirm reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
