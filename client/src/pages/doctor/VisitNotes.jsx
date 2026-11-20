import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchAppointmentById, saveVisitNotes } from '../../api/appointments';
import StatusBadge from '../../components/StatusBadge';

export default function VisitNotes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [notes, setNotes] = useState('');
  const [markCompleted, setMarkCompleted] = useState(true);

  useEffect(() => {
    fetchAppointmentById(id)
      .then((d) => {
        setAppointment(d.appointment);
        setNotes(d.appointment?.notes || '');
      })
      .catch(() => toast.error('Unable to load appointment'));
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await saveVisitNotes(id, { notes, markCompleted });
      toast.success('Consultation notes saved.');
      navigate('/doctor/schedule');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  if (!appointment) return <p className="text-sm text-slate-500">Loading consultation...</p>;

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Clinical Visit Notes</h1>
        <StatusBadge status={appointment.status} />
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Patient: <strong>{appointment.patientId?.name}</strong> ({appointment.date} at {appointment.timeSlot})
      </p>
      <p className="mt-1 text-xs text-slate-500">Chief complaint: {appointment.reason}</p>

      <form onSubmit={handleSave} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Confidential Notes (Doctor-Only)</label>
          <textarea
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record assessment, vitals, and care instructions..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={markCompleted}
            onChange={(e) => setMarkCompleted(e.target.checked)}
          />
          Mark appointment as Completed
        </label>

        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Save Notes
        </button>
      </form>
    </div>
  );
}
