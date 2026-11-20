import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { cancelAppointment, fetchAppointments, rescheduleAppointment } from '../../api/appointments';
import { fetchDoctorSlots } from '../../api/doctors';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newSlots, setNewSlots] = useState([]);
  const [newSlot, setNewSlot] = useState('');

  const load = () => {
    setLoading(true);
    fetchAppointments()
      .then((data) => setAppointments(data.appointments || []))
      .catch(() => toast.error('Could not load appointments'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (!rescheduleTarget || !newDate) return;
    fetchDoctorSlots(rescheduleTarget.doctorId._id, newDate)
      .then((d) => setNewSlots(d.slots || []))
      .catch(() => setNewSlots([]));
  }, [rescheduleTarget, newDate]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelAppointment(cancelTarget._id);
      toast.success('Appointment cancelled.');
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to cancel');
      setCancelTarget(null);
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    try {
      await rescheduleAppointment(rescheduleTarget._id, { date: newDate, timeSlot: newSlot });
      toast.success('Appointment rescheduled.');
      setRescheduleTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to reschedule');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
        <p className="mt-1 text-sm text-slate-600">
          Online cancellations and rescheduling are allowed up to 2 hours before the slot time.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          You have no booked appointments yet.
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div
              key={appt._id}
              className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-slate-900">{appt.doctorId?.userId?.name}</span>
                  <StatusBadge status={appt.status} />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {appt.date} at <strong>{appt.timeSlot} PHT</strong> — {appt.doctorId?.specialty}
                </p>
                <p className="mt-1 text-xs text-slate-500">Reason: {appt.reason}</p>
              </div>

              {appt.status === 'confirmed' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRescheduleTarget(appt);
                      setNewDate(appt.date);
                      setNewSlot('');
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelTarget(appt)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel Appointment?"
        message="This releases your reserved time slot for other patients."
        confirmLabel="Cancel Booking"
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleCancel}
      />

      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleReschedule} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Reschedule Appointment</h3>
            <div>
              <label className="block text-xs font-medium text-slate-700">New Date</label>
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">New Time Slot</label>
              <select
                required
                value={newSlot}
                onChange={(e) => setNewSlot(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select open slot</option>
                {newSlots.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium"
              >
                Close
              </button>
              <button
                type="submit"
                className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
              >
                Save New Time
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
