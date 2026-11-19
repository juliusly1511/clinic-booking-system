import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  bookAppointment,
  createWalkInPatient,
  searchPatients,
} from '../../api/appointments';
import { getAvailableDates, getDaySlots, listDoctors } from '../../api/doctors';
import { ApiError } from '../../lib/apiClient';
import { getManilaToday, isValidPhPhone } from '../../lib/dates';
import { DatePicker } from '../../components/DatePicker';
import { SlotPicker } from '../../components/SlotPicker';
import type { AvailableDateInfo, Doctor, SlotInfo, UserProfile } from '../../types';

export const WalkInBooking: React.FC = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<UserProfile | null>(null);
  const [createNewMode, setCreateNewMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [dates, setDates] = useState<AvailableDateInfo[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [blockedReason, setBlockedReason] = useState<string | undefined>();
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');

  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listDoctors().then((list) => {
      setDoctors(list);
      if (list.length > 0) setDoctorId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    setLoadingDates(true);
    setSelectedDate('');
    setSelectedTime('');
    getAvailableDates(doctorId, getManilaToday(), 14)
      .then((res) => {
        setDates(res);
        const first = res.find((d) => d.openSlots > 0);
        if (first) setSelectedDate(first.date);
      })
      .finally(() => setLoadingDates(false));
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
      .finally(() => setLoadingSlots(false));
  }, [doctorId, selectedDate]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim().length < 2) {
      toast.error('Enter at least 2 characters to search.');
      return;
    }
    setSearching(true);
    setCreateNewMode(false);
    setSelectedPatient(null);
    try {
      const results = await searchPatients(searchTerm);
      setSearchResults(results);
      setHasSearched(true);
      if (results.length === 0) {
        setCreateNewMode(true);
      }
    } catch {
      toast.error('Failed to search patients.');
    } finally {
      setSearching(false);
    }
  };

  const handleBookWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const chosenDoctor = doctors.find((d) => d.id === doctorId);
    if (!chosenDoctor || !selectedDate || !selectedTime) {
      toast.error('Please select a doctor, date, and time slot.');
      return;
    }

    let patient = selectedPatient;
    if (!patient) {
      if (!createNewMode) {
        toast.error('Please select or create a patient first.');
        return;
      }
      if (newName.trim().length < 2) {
        toast.error('Please enter the patient name.');
        return;
      }
      if (!isValidPhPhone(newPhone)) {
        toast.error('Use Philippine mobile format: 09XXXXXXXXX or +639XXXXXXXXX.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (!patient) {
        patient = await createWalkInPatient({
          name: newName,
          phone: newPhone,
          email: newEmail,
        });
      }

      await bookAppointment({
        patientId: patient.uid,
        doctorId: chosenDoctor.id,
        date: selectedDate,
        timeSlot: selectedTime,
        reason,
        isWalkIn: true,
      });

      toast.success(`Walk-in booked for ${patient.name}.`);
      navigate('/staff/appointments');
    } catch (err: unknown) {
      toast.error(
        err instanceof ApiError && err.code === 'SLOT_TAKEN'
          ? 'That slot was just taken. Please pick another.'
          : err instanceof ApiError && err.code === 'PATIENT_CONFLICT'
          ? 'This patient already has an appointment at this date and time.'
          : err instanceof Error
          ? err.message
          : 'Unable to complete walk-in booking.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        to="/staff/appointments"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to queue
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-900">Walk-in Booking</h1>
      <p className="mt-1 text-sm text-slate-600">
        Find an existing patient or enter a new walk-in patient, then select a slot.
      </p>

      <div className="mt-6 space-y-6 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">1. Patient</h2>
          <form onSubmit={handleSearch} className="mt-2 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, or email (min 2 chars)..."
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-clinic-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPatient(null);
                setCreateNewMode(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              <UserPlus className="h-4 w-4" />
              New patient
            </button>
          </form>

          {hasSearched && searchResults.length > 0 && !createNewMode && (
            <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
              {searchResults.map((p) => (
                <button
                  key={p.uid}
                  type="button"
                  onClick={() => setSelectedPatient(p)}
                  className={`flex w-full items-center justify-between p-3 text-left text-sm transition-colors ${
                    selectedPatient?.uid === p.uid ? 'bg-clinic-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    <p className="font-mono text-xs text-slate-500">
                      {p.phone} {p.email.endsWith('@noemail.local') ? '' : `· ${p.email}`}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-clinic-700">
                    {selectedPatient?.uid === p.uid ? 'Selected' : 'Select'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {createNewMode && (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Full name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Patient name"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Mobile number *
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="09171234567"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleBookWalkIn} className="space-y-5 border-t border-slate-100 pt-5">
          <div>
            <label className="block text-sm font-semibold text-slate-900">2. Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:w-80"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-900">3. Date</label>
            <DatePicker
              dates={dates}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
              loading={loadingDates}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-900">
              4. Time slot
            </label>
            <SlotPicker
              slots={slots}
              selectedTime={selectedTime}
              onSelect={setSelectedTime}
              blockedReason={blockedReason}
              loading={loadingSlots}
            />
          </div>

          <div>
            <div className="flex justify-between">
              <label className="text-sm font-semibold text-slate-900">
                Reason for visit (optional)
              </label>
              <span className="font-mono text-xs tabular-nums text-slate-400">
                {reason.length}/200
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
              placeholder="Optional visit reason..."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !selectedDate || !selectedTime}
              className="rounded-lg bg-clinic-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-clinic-700 disabled:opacity-50"
            >
              {submitting ? 'Booking...' : 'Confirm walk-in booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
