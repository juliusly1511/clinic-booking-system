import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarCheck2, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAvailableDates, getDaySlots, getDoctor } from '../../api/doctors';
import { bookAppointment } from '../../api/appointments';
import { ApiError } from '../../lib/apiClient';
import { addDays, formatDisplayDate, formatDisplayTime, getManilaToday } from '../../lib/dates';
import { DatePicker } from '../../components/DatePicker';
import { SlotPicker } from '../../components/SlotPicker';
import type { Appointment, AvailableDateInfo, Doctor, SlotInfo } from '../../types';

export const BookAppointment: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [dates, setDates] = useState<AvailableDateInfo[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [blockedReason, setBlockedReason] = useState<string | undefined>();
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [conflictMessage, setConflictMessage] = useState('');
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([]);
  const [suggestedDates, setSuggestedDates] = useState<AvailableDateInfo[]>([]);
  const [confirmedAppt, setConfirmedAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!doctorId) return;
    setLoadingInit(true);
    const today = getManilaToday();
    Promise.all([getDoctor(doctorId), getAvailableDates(doctorId, today, 14)])
      .then(([docData, availDates]) => {
        setDoctor(docData);
        setDates(availDates);
        const firstOpen = availDates.find((d) => d.openSlots > 0);
        if (firstOpen) {
          setSelectedDate(firstOpen.date);
        } else if (availDates.length > 0) {
          setSelectedDate(availDates[0].date);
        }
      })
      .catch(() => toast.error('Could not load doctor schedule.'))
      .finally(() => setLoadingInit(false));
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedTime('');
    getDaySlots(doctorId, selectedDate)
      .then((res) => {
        setSlots(res.slots);
        setBlockedReason(res.blockedReason);
      })
      .catch(() => toast.error('Could not load time slots.'))
      .finally(() => setLoadingSlots(false));
  }, [doctorId, selectedDate]);

  const handleConfirmBooking = async () => {
    if (!doctor || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setConflictMessage('');
    setSuggestedTimes([]);
    setSuggestedDates([]);

    try {
      const appt = await bookAppointment({
        doctorId: doctor.id,
        date: selectedDate,
        timeSlot: selectedTime,
        reason,
        isWalkIn: false,
      });
      setConfirmedAppt(appt);
      toast.success('Appointment confirmed!');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'PATIENT_CONFLICT') {
        toast.error('You already have another appointment at this date and time.');
      } else if (err instanceof ApiError && err.code === 'SLOT_TAKEN') {
        setConflictMessage('That slot was just taken. Please pick another available option below.');
        toast.error('That slot was just taken.');
        setSelectedTime('');

        const refreshed = await getDaySlots(doctor.id, selectedDate);
        setSlots(refreshed.slots);
        const otherTimes = refreshed.slots
          .filter((s) => s.available)
          .slice(0, 6)
          .map((s) => s.time);

        if (otherTimes.length > 0) {
          setSuggestedTimes(otherTimes);
        } else {
          const nextDates = await getAvailableDates(doctor.id, addDays(selectedDate, 1), 14);
          setSuggestedDates(nextDates.filter((d) => d.openSlots > 0).slice(0, 3));
        }
      } else {
        toast.error(err instanceof Error ? err.message : 'Unable to complete booking.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-slate-600">Doctor not found.</p>
        <Link to="/patient/doctors" className="mt-4 inline-block text-clinic-700 underline">
          Back to doctors
        </Link>
      </div>
    );
  }

  if (confirmedAppt) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-xl border border-emerald-200 bg-white p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Appointment Confirmed</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your booking has been saved and a confirmation notification has been logged.
          </p>

          <div className="mt-6 border-t border-b border-slate-100 py-4 text-left text-sm">
            <p className="font-semibold text-slate-900">{confirmedAppt.doctorName}</p>
            <p className="mt-1 font-mono text-xs tabular-nums text-slate-600">
              {formatDisplayDate(confirmedAppt.date)} · {formatDisplayTime(confirmedAppt.timeSlot)}
            </p>
            {confirmedAppt.reason && (
              <p className="mt-2 text-xs text-slate-500">Reason: {confirmedAppt.reason}</p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/patient/appointments"
              className="rounded-lg bg-clinic-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-clinic-700"
            >
              Go to My appointments
            </Link>
            <Link
              to="/patient/doctors"
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Book another visit
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        to="/patient/doctors"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to doctors
      </Link>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="border-b border-slate-100 pb-4">
          <h1 className="text-xl font-bold text-slate-900">Dr. {doctor.name}</h1>
          <p className="text-sm font-medium text-clinic-700">{doctor.specialty}</p>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CalendarCheck2 className="h-4 w-4 text-clinic-600" />
              Step 1: Select a date
            </h2>
            <DatePicker dates={dates} selectedDate={selectedDate} onSelect={setSelectedDate} />
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Clock className="h-4 w-4 text-clinic-600" />
              Step 2: Select a time slot
            </h2>
            <SlotPicker
              slots={slots}
              selectedTime={selectedTime}
              onSelect={setSelectedTime}
              blockedReason={blockedReason}
              loading={loadingSlots}
            />
          </div>

          {conflictMessage && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-800">{conflictMessage}</p>
              {suggestedTimes.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-rose-700">Other open times today:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestedTimes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setSelectedTime(t);
                          setConflictMessage('');
                        }}
                        className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-mono text-xs font-semibold tabular-nums text-slate-800 hover:border-clinic-600 hover:bg-clinic-50"
                      >
                        {formatDisplayTime(t)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {suggestedDates.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-rose-700">Next dates with open slots:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestedDates.map((d) => (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => {
                          setSelectedDate(d.date);
                          setConflictMessage('');
                        }}
                        className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold tabular-nums text-slate-800 hover:border-clinic-600 hover:bg-clinic-50"
                      >
                        {formatDisplayDate(d.date)} ({d.openSlots} open)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="reason" className="text-sm font-semibold text-slate-800">
                Reason for visit (optional)
              </label>
              <span className="font-mono text-xs tabular-nums text-slate-400">
                {reason.length}/200
              </span>
            </div>
            <textarea
              id="reason"
              rows={2}
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe your symptoms or reason for visit..."
              className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
            />
          </div>

          <div className="flex flex-col items-start justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
            <div className="text-sm">
              {selectedDate && selectedTime ? (
                <p className="font-medium text-slate-900">
                  {formatDisplayDate(selectedDate)} at{' '}
                  <span className="font-mono tabular-nums">{formatDisplayTime(selectedTime)}</span>{' '}
                  with Dr. {doctor.name}
                </p>
              ) : (
                <p className="text-slate-500">Select a date and time slot to continue.</p>
              )}
            </div>
            <button
              type="button"
              disabled={!selectedDate || !selectedTime || submitting}
              onClick={handleConfirmBooking}
              className="w-full shrink-0 rounded-lg bg-clinic-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting ? 'Booking...' : 'Confirm booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
