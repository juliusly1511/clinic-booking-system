import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchAppointments } from '../../api/appointments';
import StatusBadge from '../../components/StatusBadge';

export default function DailySchedule() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    fetchAppointments({ date: date || undefined })
      .then((d) => setAppointments(d.appointments || []))
      .catch(() => toast.error('Could not load schedule'));
  }, [date]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Physician Daily Schedule</h1>
          <p className="text-sm text-slate-600">Review patients and record private consultation notes.</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No scheduled consultations for {date}.
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
                  <span className="font-semibold text-slate-900">
                    {appt.timeSlot} — {appt.patientId?.name}
                  </span>
                  <StatusBadge status={appt.status} />
                </div>
                <p className="mt-1 text-sm text-slate-600">Chief complaint: {appt.reason}</p>
              </div>
              <Link
                to={`/doctor/notes/${appt._id}`}
                className="rounded-lg bg-teal-600 px-4 py-2 text-center text-xs font-semibold text-white hover:bg-teal-700"
              >
                Open Visit Notes
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
