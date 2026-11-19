import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAppointmentById,
  getVisitNote,
  saveVisitNote,
  updateDoctorAppointmentStatus,
} from '../../api/appointments';
import { formatDisplayDate, formatDisplayTime } from '../../lib/dates';
import { StatusBadge } from '../../components/StatusBadge';
import type { Appointment } from '../../types';

export const VisitNotes: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAppointmentById(id)
      .then(async (appt) => {
        setAppointment(appt);
        if (appt.status === 'completed') {
          const n = await getVisitNote(appt.id);
          setNotes(n?.notes || '');
        }
      })
      .catch(() => toast.error('Failed to load appointment.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatus = async (status: 'completed' | 'no_show') => {
    if (!appointment) return;
    try {
      const updated = await updateDoctorAppointmentStatus(appointment.id, status);
      setAppointment(updated);
      if (status === 'no_show') setNotes('');
      toast.success(`Marked as ${status === 'completed' ? 'completed' : 'no-show'}.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to update status.');
    }
  };

  const handleSave = async () => {
    if (!appointment) return;
    setSaving(true);
    try {
      await saveVisitNote(appointment.id, notes);
      toast.success('Visit notes saved.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save notes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-slate-600">Appointment not found.</p>
        <Link to="/doctor/schedule" className="mt-4 inline-block text-clinic-700 underline">
          Back to schedule
        </Link>
      </div>
    );
  }

  const isFuture = new Date(appointment.startsAt).getTime() > Date.now();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        to="/doctor/schedule"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to schedule
      </Link>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{appointment.patientName}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {formatDisplayDate(appointment.date)} ·{' '}
              <span className="font-mono text-xs tabular-nums">
                {formatDisplayTime(appointment.timeSlot)}
              </span>
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-500">Reason for visit</p>
          <p className="mt-1 text-sm text-slate-800">{appointment.reason || 'None'}</p>
        </div>

        <div className="mt-6 flex gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            disabled={isFuture}
            onClick={() => handleStatus('completed')}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Mark completed
          </button>
          <button
            type="button"
            disabled={isFuture}
            onClick={() => handleStatus('no_show')}
            className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            Mark no-show
          </button>
        </div>

        {appointment.status === 'completed' && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900">
                Clinical visit notes
              </label>
              <span className="font-mono text-xs tabular-nums text-slate-400">
                {notes.length}/1000
              </span>
            </div>
            <textarea
              rows={6}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none"
              placeholder="Write clinical notes..."
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-lg bg-clinic-600 px-5 py-2 text-sm font-semibold text-white hover:bg-clinic-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save notes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
