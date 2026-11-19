import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  cancelAppointment,
  checkInAppointment,
  getAppointmentsForDate,
  rescheduleAppointment,
} from '../../api/appointments';
import { getAvailableDates, getDaySlots, listDoctors } from '../../api/doctors';
import { ApiError } from '../../lib/apiClient';
import { formatDisplayTime, getManilaToday } from '../../lib/dates';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DatePicker } from '../../components/DatePicker';
import { SlotPicker } from '../../components/SlotPicker';
import type {
  Appointment,
  AppointmentStatus,
  AvailableDateInfo,
  Doctor,
  SlotInfo,
} from '../../types';

export const StaffAppointments: React.FC = () => {
  const today = getManilaToday();
  const [date, setDate] = useState(today);
  const [doctorFilter, setDoctorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    listDoctors().then(setDoctors).catch(() => {});
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAppointmentsForDate(date);
      setAppointments(list);
    } catch {
      toast.error('Failed to load daily queue.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (doctorFilter && a.doctorId !== doctorFilter) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      return true;
    });
  }, [appointments, doctorFilter, statusFilter]);

  const handleCheckIn = async (appt: Appointment) => {
    try {
      await checkInAppointment(appt.id);
      toast.success(`${appt.patientName} checked in.`);
      await loadQueue();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to check in patient.');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelAppointment(cancelTarget.id);
      toast.success('Appointment cancelled.');
      setCancelTarget(null);
      await loadQueue();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel appointment.');
    } finally {
      setCancelling(false);
    }
  };

  const openReschedule = async (appt: Appointment) => {
    setReschedTarget(appt);
    setNewDate('');
    setNewTime('');
    setLoadingDates(true);
    try {
      const dates = await getAvailableDates(appt.doctorId, today, 14);
      setAvailDates(dates);
      const first = dates.find((d) => d.openSlots > 0);
      if (first) setNewDate(first.date);
    } catch {
      toast.error('Failed to load doctor dates.');
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
      await loadQueue();
    } catch (err: unknown) {
      toast.error(
        err instanceof ApiError && err.code === 'SLOT_TAKEN'
          ? 'That slot was just taken.'
          : err instanceof Error
          ? err.message
          : 'Unable to reschedule appointment.'
      );
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily Queue</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage check-ins, reschedules, cancellations, and walk-in bookings.
          </p>
        </div>
        <Link
          to="/staff/walk-in"
          className="inline-flex items-center gap-2 rounded-lg bg-clinic-600 px-4 py-2 text-sm font-semibold text-white hover:bg-clinic-700"
        >
          <Plus className="h-4 w-4" />
          Walk-in booking
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-clinic-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Doctor</label>
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-clinic-600 focus:outline-none"
          >
            <option value="">All doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | '')}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-clinic-600 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No appointments for this date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((appt) => {
                  const canCheckIn = date === today && appt.status === 'confirmed';
                  const canEdit = appt.status === 'confirmed';
                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium tabular-nums text-slate-900">
                        {formatDisplayTime(appt.timeSlot)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {appt.patientName}
                          {appt.isWalkIn && (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              · Walk-in
                            </span>
                          )}
                        </p>
                        <p className="font-mono text-xs tabular-nums text-slate-500">
                          {appt.patientPhone || 'No phone'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {appt.doctorName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={appt.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {canCheckIn && (
                            <button
                              type="button"
                              onClick={() => handleCheckIn(appt)}
                              className="rounded-lg bg-clinic-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-clinic-700"
                            >
                              Check in
                            </button>
                          )}
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => openReschedule(appt)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Reschedule
                              </button>
                              <button
                                type="button"
                                onClick={() => setCancelTarget(appt)}
                                className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel appointment"
        variant="danger"
        confirmLabel="Cancel appointment"
        loading={cancelling}
        description={
          cancelTarget && (
            <span>
              Cancel <strong>{cancelTarget.patientName}</strong>&apos;s appointment with{' '}
              <strong>{cancelTarget.doctorName}</strong> at{' '}
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
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Reschedule ({reschedTarget.patientName})
                </h2>
                <p className="text-xs text-slate-500">{reschedTarget.doctorName}</p>
              </div>
              <button
                type="button"
                onClick={() => setReschedTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <DatePicker
                dates={availDates}
                selectedDate={newDate}
                onSelect={setNewDate}
                loading={loadingDates}
              />
              <SlotPicker
                slots={daySlots}
                selectedTime={newTime}
                onSelect={setNewTime}
                blockedReason={blockedReason}
                loading={loadingSlots}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setReschedTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
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
