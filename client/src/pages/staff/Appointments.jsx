import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchAppointments, updateAppointmentStatus } from '../../api/appointments';
import StatusBadge from '../../components/StatusBadge';

export default function StaffAppointments() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAppointments({ date: date || undefined })
      .then((d) => setAppointments(d.appointments || []))
      .catch(() => toast.error('Failed to load clinic queue'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [date]);

  const handleStatus = async (id, status) => {
    try {
      await updateAppointmentStatus(id, status);
      toast.success(`Updated status to ${status.replace('_', ' ')}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reception Daily Queue</h1>
          <p className="text-sm text-slate-600">Check in arriving patients or record no-shows.</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading queue...</p>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No appointments scheduled for {date}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.map((appt) => (
                <tr key={appt._id}>
                  <td className="px-4 py-3 font-medium">{appt.timeSlot}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{appt.patientId?.name}</div>
                    <div className="text-xs text-slate-500">{appt.patientId?.phone}</div>
                  </td>
                  <td className="px-4 py-3">{appt.doctorId?.userId?.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{appt.isWalkIn ? 'Walk-In' : 'Online'}</td>
                  <td className="px-4 py-3"><StatusBadge status={appt.status} /></td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {appt.status === 'confirmed' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatus(appt._id, 'checked_in')}
                          className="rounded bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-700"
                        >
                          Check In
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatus(appt._id, 'no_show')}
                          className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                        >
                          No-Show
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
